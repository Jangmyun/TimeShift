Built /contact page at src/app/contact/page.tsx using krds-react components:
- TextInput for 이름/이메일 (email type)
- Textarea for 문의 내용 (with showCount/countTotal character counter)
- Button (variant="primary", size="large") as submit control

On submit, console.log logs form data and a confirmation message displays. File is a Client Component ("use client"). Layout follows existing src/app/page.tsx conventions (Tailwind wrapper + KRDS form controls).

Verification:
1. npm run build — succeeded, /contact statically prerendered.
2. npm run lint — passed.
3. npx next dev -p 3102 + curl — page renders correctly with expected Korean labels/placeholders and 제출 button. Dev server killed after.

(Agent could not write this file directly due to a tool restriction on report files; captured from its final report text by the orchestrator.)
