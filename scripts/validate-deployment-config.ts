import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_AUTH_ALLOWED_HOSTS, DEFAULT_UPTIME_TARGETS, UPTIME_CHECK_ENV_NAMES } from './check-uptime';

interface VercelConfig {
  framework?: string;
  buildCommand?: string;
  installCommand?: string;
  bunVersion?: string;
  crons?: Array<{ path?: string; schedule?: string }>;
  headers?: Array<{ source?: string; headers?: Array<{ key?: string; value?: string }> }>;
}

interface PackageJson {
  scripts?: Record<string, string>;
}

const PRISMA_CONFIG_PATH = 'prisma/prisma.config.ts';
const CI_DATABASE_URL_FALLBACK = "DATABASE_URL: ${{ secrets.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/spartan_ci' }}";

const REQUIRED_PRISMA_CONFIG_SCRIPTS: Record<string, string> = {
  postinstall: `prisma generate --config ${PRISMA_CONFIG_PATH}`,
  'db:studio': `prisma studio --config ${PRISMA_CONFIG_PATH}`,
  'db:push': `prisma db push --config ${PRISMA_CONFIG_PATH}`,
  'db:migrate': `prisma migrate dev --config ${PRISMA_CONFIG_PATH}`,
  'db:migrate:deploy': `prisma migrate deploy --config ${PRISMA_CONFIG_PATH}`,
  'db:migrate:reset': `prisma migrate reset --config ${PRISMA_CONFIG_PATH}`,
  'db:generate': `prisma generate --config ${PRISMA_CONFIG_PATH}`,
};

const REQUIRED_BUN_RUNTIME_SCRIPTS: Record<string, string> = {
  dev: 'bun --bun next dev --turbopack',
  build: 'next build',
  'vercel:build': 'bun scripts/vercel-build.mjs',
  start: 'bun --bun next start',
};

const REQUIRED_GENERAL_SCRIPTS = ['type-check', 'lint', 'test', 'validate-env', 'uptime:check'];

async function readJson<T>(rootDir: string, relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8')) as T;
}

function requireCondition(failures: string[], condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
  }
}

/**
 * Scheduled jobs run from GitHub Actions (.github/workflows/cron-jobs.yml), not
 * Vercel Cron — Vercel Hobby plans reject anything more frequent than daily.
 * Each route must have a schedule entry and be curled with the CRON_SECRET bearer.
 */
export const CRON_WORKFLOW_PATH = '.github/workflows/cron-jobs.yml';
export const REQUIRED_CRON_JOBS: ReadonlyArray<{ route: string; schedule: string }> = [
  { route: '/api/cron/rsvp-reminders', schedule: '0 * * * *' },
  { route: '/api/cron/notification-batches', schedule: '0 8 * * *' },
  { route: '/api/cron/event-waitlist', schedule: '*/10 * * * *' },
  { route: '/api/cron/gear-notifications', schedule: '*/15 * * * *' },
  { route: '/api/cron/volunteer-reminders', schedule: '*/15 * * * *' },
];

function workflowSchedulesRoute(workflow: string, route: string, schedule: string): boolean {
  return (
    workflow.includes(`- cron: '${schedule}'`) &&
    workflow.includes(`github.event.schedule == '${schedule}'`) &&
    workflow.includes(`"$TARGET_URL${route}"`)
  );
}

function hasHeader(vercel: VercelConfig, key: string): boolean {
  return Boolean(vercel.headers?.some((group) => group.headers?.some((header) => header.key?.toLowerCase() === key.toLowerCase())));
}

function hasHeaderValue(vercel: VercelConfig, key: string, valueSnippet: string): boolean {
  return Boolean(vercel.headers?.some((group) => group.headers?.some((header) => (
    header.key?.toLowerCase() === key.toLowerCase() && header.value?.includes(valueSnippet)
  ))));
}

function includesAll(value: string, snippets: string[]): boolean {
  return snippets.every((snippet) => value.includes(snippet));
}

function hasCiDatabaseUrlFallback(workflow: string): boolean {
  return workflow.includes(CI_DATABASE_URL_FALLBACK);
}

export async function validateDeploymentConfig(rootDir = process.cwd()): Promise<string[]> {
  const failures: string[] = [];
  const [packageJson, vercel, envExample] = await Promise.all([
    readJson<PackageJson>(rootDir, 'package.json'),
    readJson<VercelConfig>(rootDir, 'vercel.json'),
    readFile(path.join(rootDir, '.env.example'), 'utf8'),
  ]);

  requireCondition(failures, vercel.framework === 'nextjs', 'vercel.json must declare the Next.js framework preset.');
  requireCondition(failures, vercel.buildCommand === 'bun run vercel:build', 'vercel.json buildCommand must be `bun run vercel:build`.');
  requireCondition(failures, vercel.bunVersion === '1.x', 'vercel.json must set bunVersion to `1.x` so Vercel runs functions with Bun.');
  requireCondition(
    failures,
    vercel.installCommand === 'bun install --frozen-lockfile',
    'vercel.json installCommand must use `bun install --frozen-lockfile` for reproducible deploys.',
  );
  requireCondition(
    failures,
    !vercel.crons || vercel.crons.length === 0,
    'vercel.json must not declare crons — Vercel Hobby rejects sub-daily schedules; scheduled jobs run from the GitHub Actions cron workflow.',
  );
  const cronWorkflowPath = path.join(rootDir, CRON_WORKFLOW_PATH);
  if (!existsSync(cronWorkflowPath)) {
    failures.push(`${CRON_WORKFLOW_PATH} must exist to run the /api/cron/* routes on a schedule.`);
  } else {
    const cronWorkflow = await readFile(cronWorkflowPath, 'utf8');
    for (const { route, schedule } of REQUIRED_CRON_JOBS) {
      requireCondition(
        failures,
        workflowSchedulesRoute(cronWorkflow, route, schedule),
        `${CRON_WORKFLOW_PATH} must call ${route} on schedule '${schedule}'.`,
      );
    }
    requireCondition(
      failures,
      cronWorkflow.includes('Authorization: Bearer $CRON_SECRET') && cronWorkflow.includes('secrets.CRON_SECRET'),
      `${CRON_WORKFLOW_PATH} must send the CRON_SECRET bearer token to every cron route.`,
    );
  }

  for (const header of ['Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Content-Security-Policy']) {
    requireCondition(failures, hasHeader(vercel, header), `vercel.json must configure ${header}.`);
  }

  requireCondition(
    failures,
    hasHeaderValue(vercel, 'Content-Security-Policy', "frame-ancestors 'self'"),
    'vercel.json Content-Security-Policy must explicitly restrict frame ancestors.',
  );

  for (const script of REQUIRED_GENERAL_SCRIPTS) {
    requireCondition(failures, Boolean(packageJson.scripts?.[script]), `package.json must define a ${script} script.`);
  }

  for (const [scriptName, expectedCommand] of Object.entries(REQUIRED_BUN_RUNTIME_SCRIPTS)) {
    const actualCommand = packageJson.scripts?.[scriptName];

    requireCondition(failures, Boolean(actualCommand), `package.json must define a ${scriptName} script.`);
    if (actualCommand) {
      requireCondition(
        failures,
        actualCommand === expectedCommand,
        `package.json ${scriptName} must be \`${expectedCommand}\` so Next.js commands run under the Bun runtime.`,
      );
    }
  }

  for (const [scriptName, expectedCommand] of Object.entries(REQUIRED_PRISMA_CONFIG_SCRIPTS)) {
    const actualCommand = packageJson.scripts?.[scriptName];

    requireCondition(failures, Boolean(actualCommand), `package.json must define a ${scriptName} script.`);
    if (actualCommand) {
      requireCondition(
        failures,
        actualCommand === expectedCommand,
        `package.json ${scriptName} must be \`${expectedCommand}\` so Prisma uses the nested config at ${PRISMA_CONFIG_PATH}.`,
      );
    }
  }

  for (const envName of ['DATABASE_URL', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'EMAIL_PROVIDER', 'MAILCHIMP_API_KEY', 'EMAIL_FROM', 'CRON_SECRET']) {
    requireCondition(failures, envExample.includes(`${envName}=`), `.env.example must document ${envName}.`);
  }

  for (const envName of ['SPARTAN_RUN_MIGRATIONS_ON_BUILD', ...Object.values(UPTIME_CHECK_ENV_NAMES)]) {
    requireCondition(failures, envExample.includes(envName), `.env.example must document optional ${envName}.`);
  }

  // Documentation is served by the app itself at /docs (app/docs); there is no
  // separate GitHub Pages site or docs.* domain to validate.
  const deploymentChecksWorkflowPath = path.join(rootDir, '.github', 'workflows', 'deployment-checks.yml');
  const uptimeWorkflowPath = path.join(rootDir, '.github', 'workflows', 'uptime-monitoring.yml');
  const releaseWorkflowPath = path.join(rootDir, '.github', 'workflows', 'release.yml');
  const tagReleaseWorkflowPath = path.join(rootDir, '.github', 'workflows', 'tag-release.yml');
  const uptimeCheckScriptPath = path.join(rootDir, 'scripts', 'check-uptime.ts');
  const healthRoutePath = path.join(rootDir, 'app', 'api', 'health', 'route.ts');
  const proxyPath = path.join(rootDir, 'proxy.ts');

  requireCondition(failures, existsSync(deploymentChecksWorkflowPath), 'Deployment checks workflow is required.');
  requireCondition(failures, existsSync(releaseWorkflowPath), 'Release workflow is required.');
  requireCondition(failures, existsSync(tagReleaseWorkflowPath), 'Tag release workflow is required.');
  requireCondition(failures, existsSync(uptimeWorkflowPath), 'Scheduled uptime monitoring workflow is required.');
  requireCondition(failures, existsSync(uptimeCheckScriptPath), 'Uptime monitoring check script is required.');
  requireCondition(failures, existsSync(healthRoutePath), 'Protected application health endpoint is required.');
  requireCondition(failures, existsSync(proxyPath), 'Next.js proxy.ts is required for security headers, HTTPS enforcement, and rate limiting.');

  for (const workflowPath of [deploymentChecksWorkflowPath, uptimeWorkflowPath, releaseWorkflowPath, tagReleaseWorkflowPath]) {
    if (existsSync(workflowPath)) {
      const workflow = await readFile(workflowPath, 'utf8');
      requireCondition(
        failures,
        hasCiDatabaseUrlFallback(workflow),
        `${path.relative(rootDir, workflowPath)} must provide DATABASE_URL during install so Prisma postinstall generation works in CI.`,
      );
    }
  }

  if (existsSync(deploymentChecksWorkflowPath)) {
    const deploymentChecksWorkflow = await readFile(deploymentChecksWorkflowPath, 'utf8');
    requireCondition(
      failures,
      includesAll(deploymentChecksWorkflow, ['scripts/check-uptime.ts', '.github/workflows/uptime-monitoring.yml', 'bun run deployment:check']),
      'Deployment checks workflow must run readiness checks when uptime monitoring files change.',
    );
  }

  if (existsSync(proxyPath)) {
    const proxySource = await readFile(proxyPath, 'utf8');
    requireCondition(failures, includesAll(proxySource, ['export const config', 'matcher']), 'proxy.ts must export matcher config for route coverage.');
    requireCondition(
      failures,
      !/\bruntime\s*[:=]/u.test(proxySource),
      'proxy.ts must not export a runtime config; Next.js 16 proxy always runs on Node.js and route segment runtime config breaks builds.',
    );
  }

  if (existsSync(uptimeWorkflowPath)) {
    const uptimeWorkflow = await readFile(uptimeWorkflowPath, 'utf8');
    requireCondition(
      failures,
      includesAll(uptimeWorkflow, ['schedule:', 'bun run uptime:check', 'workflow_dispatch', 'UPTIME_CHECK_URLS', 'UPTIME_CHECK_AUTH_TARGETS', 'UPTIME_CHECK_AUTH_ALLOWED_HOSTS', 'secrets.UPTIME_CHECK_TOKEN', '/api/health']),
      'Uptime monitoring workflow must run on a schedule, support manual target overrides, and check the protected health endpoint.',
    );
  }

  requireCondition(
    failures,
    DEFAULT_UPTIME_TARGETS.some((target) => target.url === 'https://spartan.arkhins.com')
      && DEFAULT_AUTH_ALLOWED_HOSTS.has('spartan.arkhins.com')
      && Object.values(UPTIME_CHECK_ENV_NAMES).includes('UPTIME_CHECK_TOKEN'),
    'Uptime monitoring script must default to the public domain and support scoped authenticated checks.',
  );

  if (existsSync(healthRoutePath)) {
    const healthRoute = await readFile(healthRoutePath, 'utf8');
    requireCondition(
      failures,
      includesAll(healthRoute, ['UPTIME_CHECK_TOKEN', 'timingSafeEqual', 'SELECT 1']),
      'Protected application health endpoint must require a token and verify database readiness.',
    );
  }

  return failures;
}

async function main() {
  const failures = await validateDeploymentConfig();

  if (failures.length > 0) {
    console.error('Deployment configuration validation failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Deployment configuration validation passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
