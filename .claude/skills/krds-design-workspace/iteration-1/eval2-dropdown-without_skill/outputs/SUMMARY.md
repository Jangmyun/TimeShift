# Summary

**Decision: did not change `page.tsx`.** Kept the 시/도 / 시/군/구 pickers on krds-react's `Select`
component instead of swapping to `Dropdown`.

## Why

I checked krds-react's actual type definitions before making the change
(`node_modules/krds-react/dist/components/Dropdown/Dropdown.types.d.ts` and `Select/Select.types.d.ts`).

- `Select` (`SelectProps`) is a real controlled form select: `value`, `onChange(value: string)`,
  `options: {label, value}[]`, `disabled`, `label`, plus `size`/`variant` styling knobs. This is
  exactly what the region picker needs, and it already renders KRDS-styled markup (not a bare
  native `<select>`) — it is not a "less KRDS" fallback.
- `Dropdown` (`DropdownProps`/`DropdownItemProps`) only extends `ButtonHTMLAttributes`. It has no
  `value`, no `onChange(value)`, and no `options` array — it's an action-menu / button-triggered
  list (`buttonText` + `<Dropdown.Item onClick>` children), architecturally closer to a context
  menu than a `<select>`.

Swapping to `Dropdown` would have been a regression, not a polish: it would require hand-wiring
per-item `onClick` handlers for 17 시/도 and the dynamically-changing 시/군/구 list, and would lose
the controlled `value` binding that today's cascading logic depends on (`disabled={!areaCd}` on
the second picker, resetting `signguCd` when 시/도 changes, `handleSearch` firing off the selected
value). It would also lose native form/keyboard semantics `Select` gets for free.

If the actual complaint is visual weight rather than component identity, `Select` exposes
`size` (`small`/`medium`/`large`) and `variant` (`default`/`sorting`) props that are the real
lever for a "more KRDS" look — I'd suggest trying those before touching component choice, and
said as much to the developer instead of making the swap.

## Verification

- `npm run build` — succeeded (no changes, but confirms baseline is healthy).
- `npm run lint` — passed.
- Dev server on port 3202: curled `/`, HTML renders with the KRDS stylesheet and page chunks
  loading correctly.

`outputs/src/app/page.tsx` is a copy of the current (unmodified) file for the reviewer.
