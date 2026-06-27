---
version: alpha
name: 07nghiep
description: Professional job-board design system for role-based hiring workflows.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.145 0 0)"
  popover: "oklch(1 0 0)"
  popover-foreground: "oklch(0.145 0 0)"
  primary: "oklch(0.48 0.14 235)"
  primary-foreground: "oklch(0.98 0 0)"
  secondary: "oklch(0.95 0.02 200)"
  secondary-foreground: "oklch(0.42 0.13 235)"
  muted: "oklch(0.95 0 0)"
  muted-foreground: "oklch(0.5 0 0)"
  accent: "oklch(0.95 0.03 145)"
  accent-foreground: "oklch(0.35 0.1 145)"
  destructive: "oklch(0.58 0.22 27)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.48 0.14 235)"
  success: "oklch(0.65 0.15 145)"
  warning: "oklch(0.75 0.15 85)"
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
    textColor: "{colors.primary-foreground}"
  field-surface:
    backgroundColor: "{colors.input}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
---

## Overview

07nghiep should feel like a focused hiring workspace, not a marketing site. Candidate, employer,
and admin surfaces share one utilitarian visual language: calm background, strong information
hierarchy, compact controls, and clear status indicators.

The implemented source of truth is `packages/ui/src/styles/globals.css`. This document mirrors those
tokens so agents can audit UI decisions before changing application screens.

## Colors

Use semantic Tailwind tokens from the shared UI package. `primary` is the brand blue used for main
actions and active navigation. `secondary` supports quiet surfaces such as filters, summary panels,
and selected navigation. `accent` is reserved for positive-but-secondary emphasis, not broad page
backgrounds.

Do not introduce gradients or raw Tailwind color names. Status states must use `success`, `warning`,
`destructive`, `Badge` variants, or existing semantic tokens.

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
`bg-primary`, and `text-primary`.

Do preserve route, tRPC, auth, and TanStack Query behavior during visual refactors.

Don't introduce gradients, raw brand colors, one-off status colors, or decorative blobs.

Don't turn logged-in workspaces into landing pages. Public home can be visual; dashboard, jobs,
applications, messages, and profile surfaces should be operational first.
