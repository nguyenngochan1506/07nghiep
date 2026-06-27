---
version: alpha
name: 07nghiep
description: Professional job-board design system for role-based hiring workflows.
colors:
  background: "oklch(0.985 0.006 235)"
  foreground: "oklch(0.18 0.055 250)"
  card: "oklch(0.997 0.003 235)"
  card-foreground: "oklch(0.18 0.055 250)"
  popover: "oklch(0.997 0.003 235)"
  popover-foreground: "oklch(0.18 0.055 250)"
  primary: "oklch(0.32 0.10 245)"
  primary-foreground: "oklch(0.985 0.006 235)"
  secondary: "oklch(0.94 0.025 235)"
  secondary-foreground: "oklch(0.28 0.09 245)"
  muted: "oklch(0.94 0.01 235)"
  muted-foreground: "oklch(0.46 0.035 245)"
  accent: "oklch(0.94 0.055 58)"
  accent-foreground: "oklch(0.30 0.08 52)"
  destructive: "oklch(0.58 0.22 27)"
  border: "oklch(0.88 0.015 235)"
  input: "oklch(0.88 0.015 235)"
  ring: "oklch(0.68 0.18 52)"
  success: "oklch(0.65 0.15 145)"
  warning: "oklch(0.75 0.15 85)"
  brand-navy: "oklch(0.26 0.085 245)"
  brand-navy-foreground: "oklch(0.985 0.006 235)"
  brand-orange: "oklch(0.68 0.18 52)"
  brand-orange-foreground: "oklch(0.16 0.035 50)"
  brand-cyan: "oklch(0.62 0.12 215)"
  surface-wash: "oklch(0.96 0.018 235)"
typography:
  body-md:
    fontFamily: "Inter Variable"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Inter Variable"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  heading-lg:
    fontFamily: "Inter Variable"
    fontSize: "2.25rem"
    fontWeight: 650
    lineHeight: 1.1
  heading-md:
    fontFamily: "Inter Variable"
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.2
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
  badge-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.sm}"
  input-default:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  popover-default:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    rounded: "{rounded.lg}"
  muted-panel:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.lg}"
  accent-callout:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.lg}"
  badge-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
  divider:
    backgroundColor: "{colors.border}"
    textColor: "{colors.foreground}"
  focus-ring:
    backgroundColor: "{colors.ring}"
    textColor: "{colors.brand-orange-foreground}"
  field-surface:
    backgroundColor: "{colors.input}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  candidate-cta:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.brand-orange-foreground}"
    rounded: "{rounded.md}"
  candidate-shell:
    backgroundColor: "{colors.brand-navy}"
    textColor: "{colors.brand-navy-foreground}"
    rounded: "{rounded.lg}"
  candidate-info-strip:
    backgroundColor: "{colors.surface-wash}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
  candidate-cyan-marker:
    backgroundColor: "{colors.brand-cyan}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
---

## Overview

07nghiep should feel like a focused hiring workspace, not a marketing site. Candidate, employer,
and admin surfaces share one utilitarian visual language: calm blue-tinted background, strong
information hierarchy, compact controls, and clear status indicators.

The implemented source of truth is `packages/ui/src/styles/globals.css`. This document mirrors those
tokens so agents can audit UI decisions before changing application screens.

## Colors

Use semantic Tailwind tokens from the shared UI package. `primary` is the logo-aligned navy used for
trust surfaces, active navigation, headings, and links. `brand-orange` is the momentum/action color
from the logo; use it for high-value candidate actions such as search, apply, and profile completion.
`secondary` supports quiet blue-tinted surfaces such as filters, summary panels, and selected
navigation. `accent` is the soft orange hover/callout surface, not a broad page background.

Do not introduce gradients or raw Tailwind color names. Status states must use `success`, `warning`,
`destructive`, `Badge` variants, or existing semantic tokens. Cyan appears only as a small directional
marker or data accent, reflecting the logo highlight.

Dark mode is supported through the CSS variables in `packages/ui/src/styles/globals.css`; avoid
manual `dark:` color overrides in app code unless a component primitive requires transition logic.

## Typography

Use Inter Variable everywhere via `--font-sans`. Product screens should keep headings compact and
scannable. Large hero type is appropriate only on public entry pages; dashboards, list pages, and
detail pages should use tighter headings and denser metadata.

## Layout

Candidate pages should prioritize repeat use:

- Search, filters, and result counts must stay near the list they control.
- Cards should expose title, company, location, work mode, salary, and action state without forcing
  detail-page navigation.
- Detail pages should use a two-column desktop rhythm: primary description on the left, action and
  summary panels on the right.
- Mobile pages should keep controls stacked and full-width with no horizontal overflow.
- Orange CTAs should be visible but scarce: one primary orange action per workflow region.

## Elevation & Depth

Use subtle borders and `shadow-sm` from shared card styles. Avoid nested cards unless an item is a
true repeated entity, modal content, or framed tool. Page bands may use `bg-secondary/20` or
`bg-muted/30`, but the core reading surfaces should remain `bg-background` and `bg-card`.

## Shapes

The default card shape is `rounded-xl`, buttons and inputs are `rounded-md`, badges are `rounded-sm`,
and pill controls are `rounded-full`. Keep shapes consistent within one page; avoid mixing large
rounded panels with tiny dense controls unless the hierarchy requires it.

## Components

Use shared `@07nghiep/ui` components first. Prefer `Button`, `Badge`, `Card`, `Input`, `Select`,
`Sheet`, `Separator`, and `Skeleton` over custom styled markup. Use lucide icons inside buttons with
`data-icon`. Keep app-specific components thin and data-focused.

## Do's and Don'ts

Do make candidate workflows scan-friendly, with action state visible.

Do use semantic tokens such as `bg-background`, `bg-card`, `text-muted-foreground`, `border-border`,
`bg-primary`, `text-primary`, `bg-brand-orange`, and `text-brand-orange-foreground`.

Do preserve route, tRPC, auth, and TanStack Query behavior during visual refactors.

Don't introduce gradients, raw brand colors, one-off status colors, or decorative blobs.

Don't turn logged-in workspaces into landing pages. Public home can be visual; dashboard, jobs,
applications, messages, and profile surfaces should be operational first.
