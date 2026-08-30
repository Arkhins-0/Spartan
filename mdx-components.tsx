import type { ComponentPropsWithoutRef } from 'react';
import type { MDXComponents } from 'mdx/types';
import { Box, Divider, Link as MuiLink, Typography } from '@mui/material';
import { DocsMuiLink } from '@/components/features/docs/DocsLink';

// Console prose: small heavy headings, 15px body, code on the card surface
// behind a hairline, links in the primary colour that underline on hover.
const PROSE_FONT_SIZE = '0.9375rem';
const FONT_MONO = "var(--font-mono), 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

function MdxLink({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) {
  if (href?.startsWith('/')) {
    return (
      <DocsMuiLink href={href} {...props}>
        {children}
      </DocsMuiLink>
    );
  }

  return (
    <MuiLink href={href} {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </MuiLink>
  );
}

const components: MDXComponents = {
  h1: (props) => <Typography variant="h1" component="h1" sx={{ mb: 2 }} {...props} />,
  h2: (props) => <Typography variant="h2" component="h2" sx={{ mt: 4, mb: 1.5 }} {...props} />,
  h3: (props) => <Typography variant="h3" component="h3" sx={{ mt: 3, mb: 1 }} {...props} />,
  h4: (props) => <Typography variant="h4" component="h4" sx={{ mt: 2.5, mb: 1 }} {...props} />,
  p: (props) => (
    <Typography variant="body1" sx={{ fontSize: PROSE_FONT_SIZE, lineHeight: 1.6, mb: 2 }} {...props} />
  ),
  a: MdxLink,
  hr: () => <Divider sx={{ my: 4 }} />,
  ul: (props) => <Box component="ul" sx={{ pl: 3, mb: 2 }} {...props} />,
  ol: (props) => <Box component="ol" sx={{ pl: 3, mb: 2 }} {...props} />,
  li: (props) => (
    <Typography
      component="li"
      variant="body1"
      sx={{ fontSize: PROSE_FONT_SIZE, lineHeight: 1.6, mb: 0.75 }}
      {...props}
    />
  ),
  blockquote: (props) => (
    <Box
      component="blockquote"
      sx={{
        borderLeft: '3px solid var(--sp-border-input)',
        color: 'text.secondary',
        m: 0,
        mb: 2,
        pl: 2,
      }}
      {...props}
    />
  ),
  table: (props) => (
    <Box sx={{ overflowX: 'auto', mb: 3, border: '1px solid var(--sp-border)', borderRadius: 2 }}>
      <Box
        component="table"
        sx={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.8125rem',
          'th, td': {
            textAlign: 'left',
            px: 1.5,
            py: 1.25,
            borderBottom: '1px solid var(--sp-border)',
            verticalAlign: 'top',
          },
          th: {
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
            bgcolor: 'background.paper',
            whiteSpace: 'nowrap',
          },
          'tbody tr:last-child td': { borderBottom: 0 },
        }}
        {...props}
      />
    </Box>
  ),
  pre: (props) => (
    <Box
      component="pre"
      data-testid="mdx-code-block"
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid var(--sp-border)',
        borderRadius: 2,
        color: 'text.primary',
        fontFamily: FONT_MONO,
        fontSize: '0.8125rem',
        lineHeight: 1.6,
        mb: 3,
        overflowX: 'auto',
        p: 2,
      }}
      {...props}
    />
  ),
  code: ({ className, ...props }: ComponentPropsWithoutRef<'code'>) => {
    const language = className?.replace('language-', '');

    return (
      <Box
        component="code"
        data-language={language}
        sx={{
          bgcolor: className ? 'transparent' : 'action.hover',
          borderRadius: className ? 0 : 0.75,
          color: 'inherit',
          fontFamily: FONT_MONO,
          fontSize: className ? 'inherit' : '0.875em',
          px: className ? 0 : 0.5,
          py: className ? 0 : 0.25,
        }}
        {...props}
      />
    );
  },
};

export function useMDXComponents(): MDXComponents {
  return components;
}
