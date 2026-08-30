# Spartan Design System — "Console"

Spartan's product UI is built on **MUI v7 + Emotion** (ADR-0004) and themed as a
**monochrome tool**: warm achromatic greys one step apart, depth expressed as a lighter
grey plus a hairline — never a shadow — and one bright accent reserved for the action
that writes. The absence of colour is the point: when something is coloured, it means
something (a status, an error, the primary action).

The whole site is Console: product, auth, docs and the public marketing pages share
`lib/theme.ts`. Marketing pages use the same cards, buttons and tokens — just with the
display type scale (`heroTitle`, `sectionTitle`, `featureTitle`, `marketingBody`) and
more whitespace. There is no second palette anywhere.

## Tokens (lib/theme.ts + app/globals.css)

| Role | Dark ("Night") | Light ("Day") | Reach it as |
|---|---|---|---|
| Page | `#212121` | `#F2F2F2` | `bgcolor: 'background.default'` |
| Card | `#2C2C2C` | `#FFFFFF` | `bgcolor: 'background.paper'` / `<Paper>` / `<Card>` |
| Muted surface (hover, inactive) | `#3C3C3C` | `#E9E9E9` | `'action.hover'`, `'muted.main'`, `var(--sp-surface-muted)` |
| Hairline | 10% white | 10% black | `'divider'` or `border: '1px solid var(--sp-border)'` |
| Input outline | 16% white | 18% black | `var(--sp-border-input)` |
| Text | `#FBFBFB` / `#ADADAD` | `#1A1A1A` / `#6B6B6B` | `'text.primary'` / `'text.secondary'` |
| Write action (`primary`) | yellow `#F7D619` on ink | ink `#1A1A1A` on white | `variant="contained"` |
| Accent (highlight only) | `#F7D619` | `#F7D619` | `'accent.main'` — focus, selection, "unsaved" |
| Status | lifted for dark | AA on white | `success` / `error` / `warning` / `info` |

Rules that follow from the tokens:

- **No shadows.** `theme.shadows` are all `none`; `elevation` paints a hairline instead.
  Never write `boxShadow: '0 4px …'`. If something must separate from the page, put it on
  a card (`Paper`) — the card + hairline pair is the only depth there is.
- **No gradients, no brand hexes.** `#0D47A1`, `#1976D2`, `rgba(13, 71, 161, …)`,
  `linear-gradient(…)` do not belong in product code. Use the roles above.
- **Colour is semantic.** A chip is `default` (grey) unless it reports a status. A count
  is text, not a coloured badge. Icons are `text.secondary` unless active.
- **Marketing pages are scheme-aware too.** No `LightThemeScope` pins, no baked-in white
  or "Fresh Ice" backgrounds, no `.playbook-grid` texture: sections alternate between
  `background.default` and `background.paper` separated by hairlines.
- **Never read `theme.palette.X.main` in JS** for something that renders in both schemes
  (under CSS variables it always returns the LIGHT literal). Use `theme.vars.palette.X.main`
  (a `var(--mui-…)`) in styles, or `(theme.vars || theme).palette…` in theme code. For
  SVG, set `style={{ fill: theme.vars.palette.X.main }}` rather than the `fill` attribute.

## Shape, type, density

- Panels **8px**, controls **6px**, badges/chips **pill**. Nothing sharper, nothing rounder.
- Face: **IBM Plex Sans** (`--font-ui`, next/font). Body 14px, chrome and tables 13px,
  captions/eyebrows 11px. Headings are small and heavy (`h1` 28px/700 … `h6` 15px/600),
  never large and light. Buttons are sentence case.
- `Typography variant="eyebrow"` (11px, 600, tracked uppercase, `text.secondary`) labels
  a group of controls or a rail section.
- Touch: buttons and icon buttons are **44px** minimum (`size="small"` is 36px, for
  toolbars where a 44px row would be the tallest thing on screen). Inputs are 44px.
- Spacing is an 8px scale, but tight: card header `px 2 / py 1.25`, card body `p 2`,
  stacks `spacing 1.5–2`, page gutters `px 1.5` on phones.

## Page anatomy

```tsx
<PageContainer>                                   {/* maxWidth lg, tight gutters */}
  <PageHeader
    icon={<PeopleIcon />}
    title="Roster"
    subtitle="24 players · 3 pending invites"       {/* one line of status or purpose */}
    actions={<LinkButton href="/roster/new" variant="contained">Add player</LinkButton>}
  />
  <Stack spacing={2}>
    <Card>
      <CardHeader title="Skaters" subheader="Sorted by number" />
      <CardContent>…</CardContent>
    </Card>
  </Stack>
</PageContainer>
```

- Every screen opens with **one `PageHeader`** — a card-height toolbar bar with
  icon / title + hint / actions — so the primary action is never more than a glance
  from the title. Do not hand-roll `<Typography variant="h4" component="h1">` titles.
- Group content in `Card`s with a `CardHeader` (13px/600 title, 12px muted subheader,
  hairline underneath). One idea per card.
- Lists of records that have a detail view are **tables** (`TableContainer` + sticky
  head, 13px cells, hairline rows, whole row clickable). They do not swap to cards on
  phones; the container scrolls horizontally. Density comes from stacking two lines in
  one cell (name over meta at 11px muted), not from more columns.
- Filters are a wrapping row of chips/toggles on their own line, so bulk actions can't
  push them off a narrow screen. Bulk actions appear only when something is selected.
- Empty regions use `<EmptyState>` (dashed outline) so an empty screen reads as a
  deliberate placeholder rather than a load failure.
- Forms: labels 14px/500 above fields, one column on phones, `Row`-style two columns from
  `sm`, primary submit `variant="contained"` at the end, cancel as `variant="text"`.

## Shell

- Desktop (`md+`): a floating rail card inset from the page edge, collapsible to an icon
  strip; the document does not scroll — each pane does. Selection is a grey step and a
  heavier label, no coloured bar.
- Phone: top bar (logo, league switcher, theme, account) over a horizontally scrolling
  chip row of **every** destination; nothing hides behind a "more" menu. The active chip
  is `primary` (ink by day, yellow by night) and scrolls itself into view.

## Components to reach for

- `components/ui/PageContainer`, `PageHeader`, `EmptyState` — page anatomy.
- `Card`/`CardHeader`/`CardContent`/`CardActions` from MUI (the theme styles them).
- `LinkButton`, `NextLinkCard` … from `components/ui/NextLinkComposites` inside Server
  Components.
- `useToast()` for feedback; never a hand-rolled Snackbar.
- `lib/storage/client` `uploadToStorage()` for any file upload (S3 / Vercel Blob seam).

## Where the truth lives

- Theme: `lib/theme.ts` (the whole site), type augmentations in
  `lib/theme-augmentations.ts`.
- Scheme tokens the theme reads: `app/globals.css` (`--sp-*`). A `LightThemeScope`
  re-declares them for a pinned subtree.
- Tests that pin the system: `__tests__/lib/theme-color-schemes.test.ts`.
