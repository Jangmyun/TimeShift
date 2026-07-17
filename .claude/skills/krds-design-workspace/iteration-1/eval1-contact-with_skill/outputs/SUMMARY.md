# Contact Page (/contact)

Created `src/app/contact/page.tsx`, a new client component page rendering a KRDS-styled
contact form: 이름 (`TextInput`), 이메일 (`TextInput` type="email"), 문의 내용 (`Textarea`,
multi-line with `showCount`/`countTotal`), and a submit `Button` (variant="primary",
size="large"). On submit, `preventDefault` is called and the form data is logged via
`console.log("문의하기 제출:", data)` — no backend call yet, per the request. A brief
success message is shown after submit using KRDS color tokens
(`--krds-color-light-primary-50`) as a styling fallback for the one bit of custom markup
(the confirmation text and page heading), per the skill's guidance to use real design
tokens instead of arbitrary Tailwind colors.

Components used: `TextInput`, `Textarea`, `Button` from `krds-react` — the exact catalog
matches for single-line inputs, a multi-line textarea, and a form action button. The file
starts with `"use client"` since it imports from `krds-react` (required per the skill's
gotcha #1).

## Verification

- `npm run build`: succeeded, `/contact` listed as a static route, no TS errors.
- `npm run lint`: passed with no warnings/errors.
- Dev server on port 3101: `GET /contact` returned 200; response HTML contained
  `krds-input` and `krds-btn` classes confirming krds-react styling is applied (not raw
  unstyled HTML). Server was killed after the check.
