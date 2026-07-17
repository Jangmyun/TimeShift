---
name: krds-design
description: Apply or convert a React/Next.js UI to KRDS (대한민국 정부 디지털 서비스 디자인 시스템 / Korea Design System, krds.go.kr) using the official krds-react component library. Use this whenever the user asks to make a screen "KRDS답게", "정부 디자인 시스템에 맞게", or "government design system" compliant, asks to redesign/restyle a page or component to match KRDS, mentions krds-react, or is building a public-sector/government-facing Korean web service and hasn't specified a design system yet. Also consult this when adding a new UI element (button, form field, table, modal, etc.) to a codebase that already has krds-react installed, even if the user doesn't say "KRDS" explicitly — reach for the matching krds-react component instead of hand-rolling one.
---

# KRDS design conversion (krds-react)

KRDS is Korea's official cross-government design system (published at krds.go.kr). For a
React/Next.js codebase, "apply KRDS" almost always means: install `krds-react` (the official NIA
component library) and swap hand-rolled or generic UI (raw `<button>`, `<select>`, a third-party
component library, ad-hoc Tailwind cards) for the matching krds-react component, so the app
inherits KRDS's colors, typography, spacing, and accessibility behavior for free instead of
approximating them by eye.

Resist the urge to eyeball KRDS's look from screenshots and reproduce it with plain Tailwind
classes — krds-react already encodes the real design tokens and interaction/accessibility
behavior (focus states, ARIA attributes, keyboard nav) that a hand-rolled clone will miss. Reach
for the library first; only fall back to raw tokens (see step 4) for markup that has no
krds-react equivalent.

## Step 0 — confirm krds-react is installed and wired up

```bash
npm ls krds-react 2>/dev/null || npm install krds-react
```

It needs `react`/`react-dom` >= 18.2 (fine on React 19). Then, once per app, import the compiled
CSS globally — in a Next.js App Router project that's the root layout. **Import order matters:**
load your own global stylesheet (Tailwind's `globals.css`, etc.) *first* and `krds-react`'s CSS
*last*, so KRDS's `html`/`body` base rules win over the other framework's reset:

```tsx
// src/app/layout.tsx
import "./globals.css";          // Tailwind preflight etc. — first
import "krds-react/dist/index.css"; // KRDS base rules must win — last
```

Only import the KRDS CSS once at the root; per-page re-imports are redundant.

**This CSS quietly sets three global things that will make the app "look like KRDS isn't applied
at all" if another stylesheet fights them — verify all three after wiring it up (a quick way:
`getComputedStyle(document.documentElement).fontSize`, `...(document.body).fontFamily`, and the
body background under a dark-mode OS):**

1. **`html { font-size: 62.5% }` (so `1rem = 10px`).** Every KRDS component's rem token assumes
   this. It also silently shrinks *your* rem-based utility classes: Tailwind's `text-2xl`
   (1.5rem) renders at **15px, not 24px**, and `max-w-3xl` becomes 480px, not 768px — the whole
   custom layout looks tiny and cramped, which reads as "unstyled." Don't override the root back
   to 16px (that balloons every KRDS component — body text becomes 27px). Instead, size your own
   non-KRDS chrome (page headings, section padding, max-widths) with **px-based values**
   (`text-[24px]`, `max-w-[768px]`, arbitrary Tailwind values are px and immune to the root), and
   leave KRDS components on their rem basis.
2. **`body { font-family: "Pretendard GOV" }`.** A stray `body { font-family: Arial }` (Next.js's
   default `create-next-app` `globals.css` ships one, plus a Geist `next/font` setup) overrides it
   and the whole app loses its KRDS typographic identity. Remove the competing `font-family` and
   drop the unused web-font wiring rather than layering a second font on top.
3. **Light/dark.** KRDS components render in their light palette by default (there's a
   `[data-krds-mode]` opt-in for high-contrast, not an automatic dark theme). If your `globals.css`
   has a `@media (prefers-color-scheme: dark)` block (again, `create-next-app` ships one) it flips
   only the page background/text to dark while every KRDS widget stays light — a broken two-tone
   look. For a government-service UI, commit to the light/white theme: delete that media-query
   block and set the background white explicitly, rather than half-supporting dark.

## Step 1 — critical gotchas (learned the hard way; don't relearn these)

1. **Every file that uses a krds-react component must be a Client Component.** The package ships
   no `"use client"` directives even though its components use hooks/context internally. Importing
   `krds-react` into a Server Component compiles fine but crashes at request/build time with
   `TypeError: createContext is not a function`. Add `"use client"` as the first line of any file
   (or a wrapping component) that imports from `"krds-react"`.
2. **Only import from the package root** — `import { X } from "krds-react"`. Deep paths like
   `krds-react/dist/components/Select` look tempting (that's literally where the file lives) but
   `package.json`'s `exports` map only allows `"."`, `"./dist/index.css"` (or the `"./styles"`
   alias), and a few asset globs. A deep import fails to resolve at build time.
3. **`Dropdown` is not a `<select>`.** It's an action-menu / button-triggered-list component
   (`buttonText` prop + `<Dropdown.Item onClick>` children as compound children) — closer to a
   context menu. For an actual form select (options array, controlled `value`, `onChange(value)`),
   use **`Select`** instead. Confusing the two is the single most common mistake when converting a
   region/category picker — always check `references/component-catalog.md` before wiring one up.
4. **Don't guess prop names.** krds-react's prop shapes are sometimes close-but-not-quite what
   you'd expect from a similar shadcn/MUI/Ant component. Before writing JSX for a component,
   open `references/component-catalog.md` (below) and read its actual `Props` interface — every
   component's full `.d.ts` is in there, extracted from the installed package.

## Step 2 — map the existing UI to krds-react components

Read through the screen/component being converted and match each UI element to its krds-react
equivalent rather than porting Tailwind-styled markup verbatim. `references/component-catalog.md`
has full prop signatures for all 42 components; common ones:

| If the UI has... | Use |
| --- | --- |
| A clickable action button | `Button` |
| A native `<select>` / picker with options | `Select` (not `Dropdown` — see gotcha 3) |
| A button that opens a menu/action list | `Dropdown` |
| Text input / textarea | `TextInput`, `Textarea` |
| Checkbox / radio group | `Checkbox`, `Radio` |
| Date picker | `DateInput`, `Calendar` |
| A status pill / label chip | `Badge`, `Tag` |
| Tabbed content | `Tab` |
| A modal/dialog | `Modal` |
| Page-level header/footer/nav chrome | `Header`, `Footer`, `Masthead`, `MainMenu`, `SideNavigation`, `Breadcrumb` |
| A data table | `Table` |
| Paginated list controls | `Pagination` |
| Multi-step progress indicator | `StepIndicator` |
| Loading state | `Spinner` |
| Inline validation/error banner | `CriticalAlert`, `ContextualHelp` |
| Tooltip / help text on hover | `Tooltip`, `HelpPanel` |
| File picker | `FileUpload` |
| Toggle switch | `ToggleSwitch` |
| Expand/collapse section | `Accordion`, `Disclosure` |

If nothing in the catalog matches (a genuinely custom layout element, a page background, a section
divider), don't force a component onto it — style it with the design tokens from step 4 instead so
it still reads as KRDS-native.

## Step 3 — verify props against the real types, not memory

Open `references/component-catalog.md` and search for the component name before writing its JSX.
It's the full `.d.ts` for every component, generated from the package actually installed in this
repo — more reliable than recalling prop names from a previous project or a different krds-react
version. If a prop you expect isn't there, it genuinely doesn't exist; look for the nearest
alternative in the same file rather than passing an unrecognized prop (TypeScript will catch it,
but check first to save a build-error round-trip).

## Step 4 — styling gaps with real tokens, not guessed colors

When some markup has no krds-react component (custom page sections, a hero background, spacing
between unrelated blocks), pull actual values from `references/design-tokens.md` instead of
picking a Tailwind default (`bg-blue-600`) or an eyeballed hex code. That file has the real KRDS
color scales (primary/secondary/gray, each a 5–95 tint/shade ramp), desktop/mobile typography
sizes, and radius tokens, extracted from the installed package's compiled CSS. Using the real
`--krds-color-light-primary-*` values (or their hex equivalents) keeps custom markup visually
consistent with the krds-react components sitting next to it — a plausible-looking but
slightly-off blue is the kind of mismatch that's obvious in a side-by-side but easy to introduce
by guessing.

## Step 5 — actually look at it

This is a visual task — a clean diff that type-checks doesn't mean it looks right. After
converting a screen, run the dev server and check the rendered page yourself (a browser screenshot
via Playwright/Puppeteer if available, or ask the user to look) rather than reporting done from
the code alone. Things that only show up visually: a `Select` rendering unstyled because its CSS
import got lost, spacing that's technically KRDS tokens but visually cramped, a component used in
a context KRDS didn't design it for. Check both that it renders (no hydration/`use client` errors
in the console) and that it actually resembles KRDS's look (compare against krds.go.kr or the
Storybook at krds.go.kr/storybook/react if unsure about a specific component's intended
appearance).

## Keeping the reference files current

`references/component-catalog.md` and `references/design-tokens.md` are snapshots generated from
whatever `krds-react` version is installed in *this* repo. If `npm install krds-react` bumps the
version (new components, changed props, new tokens), regenerate both before relying on them:

```bash
node .claude/skills/krds-design/scripts/extract-component-catalog.mjs
node .claude/skills/krds-design/scripts/extract-design-tokens.mjs
```

Both scripts read from `node_modules/krds-react` in the current directory (or a path passed as the
first argument) and overwrite the corresponding reference file. Don't hand-edit the reference
files — they're marked auto-generated and will drift from the installed package if edited directly.
