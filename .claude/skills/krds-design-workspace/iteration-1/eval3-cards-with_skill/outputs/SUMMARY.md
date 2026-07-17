# Summary

Restyled the hub-spot card list and the related-spot list in `src/app/page.tsx` to use
`krds-react`'s `Badge` component instead of hand-rolled `<span>` text for the rank/category
markers, per the krds-design skill's component catalog.

## Changes

- Imported `Badge` from `krds-react` (file already had `"use client"` from the existing `Select` usage).
- **hubRank badge**: `<Badge variant="filled" color="primary" size="small" rounded>{spot.hubRank}위</Badge>` — a solid blue pill (e.g. "1위") replacing the plain `#1` text.
- **Category display**: `<Badge variant="outline" color="gray" size="small">{lcls} · {mcls}</Badge>` — an outlined gray badge replacing the faint gray text.
- Applied the same pattern to the related-spot list (`RelatedSpotList`) for visual consistency, using `variant="light" color="primary"` for the rank badge to visually subordinate it to the primary card list.
- Card border/selected-state colors switched from Tailwind defaults (`border-gray-200`, `border-blue-600`, `bg-blue-50`, `text-gray-500`) to real KRDS tokens via CSS custom properties (`--krds-color-light-gray-20`, `--krds-color-light-primary-50`, `--krds-color-light-primary-5`, `--krds-color-light-gray-50`), pulled from `references/design-tokens.md` since raw card/container styling has no krds-react component equivalent.

## Verification

- `npm run build` — succeeded (typecheck + production build clean).
- `npm run lint` — passed with no errors.
- Ran `npx next dev -p 3301`, curled the homepage, then used a locally-installed (scratchpad-only, not touching project node_modules) Playwright/Chromium to drive the 시/도→시/군/구 selects for 서울/종로구 against the live data.go.kr API and screenshot the rendered card list — confirmed real `krds-badge` classes in the DOM and visually verified blue filled rank pills and outlined gray category badges across all 30 hub-spot cards. Screenshot saved as `outputs/screenshot.png`. Dev server killed after verification.
