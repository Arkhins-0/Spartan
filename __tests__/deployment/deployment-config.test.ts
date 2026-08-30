import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DOCS_URL } from '@/lib/config/constants';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_AUTH_ALLOWED_HOSTS,
  DEFAULT_UPTIME_TARGETS,
  checkUptimeTargets,
  parseAuthAllowedHosts,
  parseAuthTargetNames,
  parseTimeoutMs,
  parseUptimeTargets,
} from '@/scripts/check-uptime';
import {
  CRON_WORKFLOW_PATH,
  REQUIRED_CRON_JOBS,
  validateDeploymentConfig,
} from '@/scripts/validate-deployment-config';

const rootDir = process.cwd();

async function readText(relativePath: string) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readText(relativePath)) as T;
}

describe('deployment configuration', () => {
  it('passes the deployment readiness validator', async () => {
    await expect(validateDeploymentConfig(rootDir)).resolves.toEqual([]);
  });

  it('configures Vercel for reproducible Next.js production deploys', async () => {
    const vercel = await readJson<{
      framework?: string;
      buildCommand?: string;
      installCommand?: string;
      bunVersion?: string;
      crons?: Array<{ path?: string; schedule?: string }>;
      headers?: Array<{ headers?: Array<{ key?: string }> }>;
    }>('vercel.json');
    const packageJson = await readJson<{ scripts?: Record<string, string> }>('package.json');
    const proxySource = await readText('proxy.ts');

    expect(vercel.framework).toBe('nextjs');
    expect(vercel.buildCommand).toBe('bun run vercel:build');
    expect(vercel.installCommand).toBe('bun install --frozen-lockfile');
    expect(vercel.bunVersion).toBe('1.x');
    expect(packageJson.scripts).toEqual(expect.objectContaining({
      dev: 'bun --bun next dev --turbopack',
      build: 'next build',
      'vercel:build': 'bun scripts/vercel-build.mjs',
      start: 'bun --bun next start',
    }));
    expect(proxySource).toContain('export const config');
    expect(proxySource).toContain('matcher');
    expect(proxySource).not.toMatch(/\bruntime\s*[:=]/u);
    // Scheduled jobs run from GitHub Actions; Vercel Hobby rejects sub-daily crons.
    expect(vercel.crons ?? []).toEqual([]);

    const headerKeys = vercel.headers?.flatMap((group) => group.headers?.map((header) => header.key) ?? []) ?? [];
    expect(headerKeys).toEqual(expect.arrayContaining([
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'Referrer-Policy',
    ]));
  });

  it('schedules every cron route from the GitHub Actions workflow with the CRON_SECRET bearer', async () => {
    const workflow = await readText(CRON_WORKFLOW_PATH);
    const cronRoutes = (await readdir(path.join(rootDir, 'app/api/cron'), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => `/api/cron/${entry.name}`)
      .sort();

    // Every route on disk is covered, and nothing in the workflow is stale.
    expect(REQUIRED_CRON_JOBS.map((job) => job.route).sort()).toEqual(cronRoutes);
    for (const { route, schedule } of REQUIRED_CRON_JOBS) {
      expect(workflow).toContain(`- cron: '${schedule}'`);
      expect(workflow).toContain(`"$TARGET_URL${route}"`);
    }
    expect(workflow).toContain('Authorization: Bearer $CRON_SECRET');
    expect(workflow).toContain('secrets.CRON_SECRET');
    expect(workflow).toContain('workflow_dispatch');
  });

  it('documents the preview migration override environment flag', async () => {
    const envExample = await readText('.env.example');

    expect(envExample).toContain('SPARTAN_RUN_MIGRATIONS_ON_BUILD');
    expect(envExample).toContain('safe, isolated database');
  });

  it('keeps Sport enum value repair separate from column casts and defaults', async () => {
    const enumRepair = await readText('prisma/migrations/20260517000000_repair_public_sport_enum/migration.sql');
    const columnRepair = await readText('prisma/migrations/20260517000001_repair_public_sport_columns/migration.sql');

    expect(enumRepair).toContain('ALTER TYPE public."Sport" ADD VALUE IF NOT EXISTS');
    expect(enumRepair).not.toContain('ALTER TABLE public."Team"');
    expect(enumRepair).not.toContain('ALTER TABLE public."leagues"');

    expect(columnRepair).toContain('ALTER TABLE public."Team"');
    expect(columnRepair).toContain('ALTER TABLE public."leagues"');
    expect(columnRepair).not.toContain('ADD VALUE IF NOT EXISTS');
  });

  it('serves documentation from the app at /docs rather than a separate Pages site', async () => {
    const packageJson = await readJson<{ scripts?: Record<string, string> }>('package.json');

    expect(existsSync(path.join(rootDir, 'app/docs/page.tsx'))).toBe(true);
    expect(existsSync(path.join(rootDir, '.github/workflows/docs-pages.yml'))).toBe(false);
    expect(packageJson.scripts?.['docs:build-pages']).toBeUndefined();
    expect(DOCS_URL).toBe('https://spartan.arkhins.com/docs');
  });

  it('runs scheduled uptime monitoring for the main site', async () => {
    const packageJson = await readJson<{ scripts?: Record<string, string> }>('package.json');
    const deploymentChecksWorkflow = await readText('.github/workflows/deployment-checks.yml');
    const uptimeWorkflow = await readText('.github/workflows/uptime-monitoring.yml');

    expect(packageJson.scripts?.['uptime:check']).toBe('tsx scripts/check-uptime.ts');
    expect(deploymentChecksWorkflow).toContain('scripts/check-uptime.ts');
    expect(deploymentChecksWorkflow).toContain('.github/workflows/uptime-monitoring.yml');
    expect(uptimeWorkflow).toContain('schedule:');
    expect(uptimeWorkflow).toContain('workflow_dispatch');
    expect(uptimeWorkflow).toContain('bun run uptime:check');
    expect(uptimeWorkflow).toContain('UPTIME_CHECK_URLS');
    expect(uptimeWorkflow).toContain('UPTIME_CHECK_AUTH_TARGETS');
    expect(uptimeWorkflow).toContain('UPTIME_CHECK_AUTH_ALLOWED_HOSTS');
    expect(uptimeWorkflow).toContain('secrets.UPTIME_CHECK_TOKEN');
    expect(uptimeWorkflow).toContain('/api/health');
    expect(DEFAULT_UPTIME_TARGETS).toEqual([
      { name: 'main', url: 'https://spartan.arkhins.com' },
    ]);
  });
});

describe('uptime checker', () => {
  it('uses the production site by default', () => {
    expect(parseUptimeTargets('')).toEqual(DEFAULT_UPTIME_TARGETS);
  });

  it('parses named target overrides', () => {
    expect(parseUptimeTargets('main=https://spartan.arkhins.com,docs=https://spartan.arkhins.com/docs')).toEqual([
      { name: 'main', url: 'https://spartan.arkhins.com' },
      { name: 'docs', url: 'https://spartan.arkhins.com/docs' },
    ]);
  });

  it('falls back to the default timeout for invalid values', () => {
    expect(parseTimeoutMs('not-a-number')).toBe(10_000);
    expect(parseTimeoutMs('-1')).toBe(10_000);
    expect(parseTimeoutMs('2500')).toBe(2500);
  });

  it('parses authenticated target names', () => {
    expect([...parseAuthTargetNames('')]).toEqual([]);
    expect([...parseAuthTargetNames('health, Protected Readiness')]).toEqual(['health', 'protected-readiness']);
  });

  it('uses app domains as default authenticated target host allowlist', () => {
    expect([...parseAuthAllowedHosts('')]).toEqual([...DEFAULT_AUTH_ALLOWED_HOSTS]);
    expect([...parseAuthAllowedHosts('SPARTAN.ARKHINS.COM.,docs.example.com')]).toEqual(['spartan.arkhins.com', 'docs.example.com']);
  });

  it('marks healthy responses as passing', async () => {
    const fetcher = vi.fn(async () => new Response('ok', { status: 200, statusText: 'OK' })) as unknown as typeof fetch;

    const [result] = await checkUptimeTargets([{ name: 'main', url: 'https://spartan.arkhins.com' }], {
      fetcher,
      timeoutMs: 1_000,
    });

    expect(result).toMatchObject({
      name: 'main',
      url: 'https://spartan.arkhins.com',
      ok: true,
      status: 200,
      statusText: 'OK',
    });
    expect(fetcher).toHaveBeenCalledWith('https://spartan.arkhins.com', expect.objectContaining({ method: 'GET' }));
  });

  it('sends the uptime token only to explicitly authenticated targets', async () => {
    const fetcher = vi.fn(async () => new Response('ok', { status: 200, statusText: 'OK' })) as unknown as typeof fetch;

    await checkUptimeTargets([
      { name: 'main', url: 'https://spartan.arkhins.com' },
      { name: 'health', url: 'https://spartan.arkhins.com/api/health' },
    ], {
      authTargetNames: parseAuthTargetNames('health'),
      authAllowedHosts: parseAuthAllowedHosts('spartan.arkhins.com'),
      authToken: 'super-secret-token',
      fetcher,
      timeoutMs: 1_000,
    });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'https://spartan.arkhins.com',
      expect.objectContaining({
        headers: expect.not.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'https://spartan.arkhins.com/api/health',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer super-secret-token' }),
      }),
    );
  });

  it('fails authenticated targets before fetch when the token is missing', async () => {
    const fetcher = vi.fn(async () => new Response('ok', { status: 200 })) as unknown as typeof fetch;

    const [result] = await checkUptimeTargets([{ name: 'health', url: 'https://spartan.arkhins.com/api/health' }], {
      authTargetNames: parseAuthTargetNames('health'),
      authAllowedHosts: parseAuthAllowedHosts('spartan.arkhins.com'),
      fetcher,
      timeoutMs: 1_000,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      error: 'missing uptime check token',
    });
  });

  it('does not send the uptime token to authenticated target names on unapproved hosts', async () => {
    const fetcher = vi.fn(async () => new Response('ok', { status: 200 })) as unknown as typeof fetch;

    const [result] = await checkUptimeTargets([{ name: 'health', url: 'https://example.com/api/health' }], {
      authAllowedHosts: parseAuthAllowedHosts('spartan.arkhins.com'),
      authTargetNames: parseAuthTargetNames('health'),
      authToken: 'super-secret-token',
      fetcher,
      timeoutMs: 1_000,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      error: 'authenticated target host is not allowed',
    });
  });

  it('marks non-success responses as failing', async () => {
    const fetcher = vi.fn(async () => new Response('down', { status: 503, statusText: 'Service Unavailable' })) as unknown as typeof fetch;

    const [result] = await checkUptimeTargets([{ name: 'main', url: 'https://spartan.arkhins.com' }], {
      fetcher,
      timeoutMs: 1_000,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });
  });

  it('marks network errors as failing', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('network unavailable');
    }) as unknown as typeof fetch;

    const [result] = await checkUptimeTargets([{ name: 'docs', url: 'https://spartan.arkhins.com/docs' }], {
      fetcher,
      timeoutMs: 1_000,
    });

    expect(result).toMatchObject({
      name: 'docs',
      ok: false,
      error: 'network unavailable',
    });
  });
});