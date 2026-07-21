# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TimeShift (타임시프트) — a Korean tourism-congestion service that recommends _when_ to visit a
tourist spot instead of suggesting a different spot. Built for the 2026 관광데이터 활용 공모전
(tourism data contest), 웹·앱 구현 부문 지정과제 2번. Full requirements are in `PRD_TimeShift.md` —
read it before implementing any feature; this doc only covers engineering setup.

The app is a Next.js (App Router) project scaffolded fresh for this contest. As of this writing,
F1 (region select → hub tourist-spot list), F2 (30-day congestion forecast chart), and F3
(related/alternative spot recommendations with category filter) are implemented end-to-end —
all three activate together when a hub spot card is clicked. F4–F7 are not yet built.

## Commands

```bash
npm run dev        # start dev server (Turbopack) at http://localhost:3000
npm run build      # production build — also the fastest way to typecheck the whole app
npm run start      # run a production build
npm run lint       # eslint (flat config, eslint.config.mjs)
npm test           # vitest run (component + unit tests, jsdom)
npm run test:watch # vitest watch mode
```

**Testing (Vitest + React Testing Library + jsdom).** Config in `vitest.config.ts`
(`@vitejs/plugin-react`, `@/*`→`src/*` alias, `css: false`), globals off — import
`{ describe, it, expect, vi }` from `"vitest"` in each spec. `vitest.setup.ts` registers
jest-dom matchers via `import "@testing-library/jest-dom/vitest"`; because that setup file is
in the tsconfig include, the matcher type augmentation applies project-wide, so `npm run build`
type-checks specs without a separate `types` entry. Tests live next to source as `*.test.ts(x)`
(`src/**`). Existing coverage: `CongestionChart` (SVG chart states), `SpotMap` (no-key fallback —
`vi.stubEnv` forces the empty-key path), `SiteFooter` (krds-react renders in jsdom),
`SpotDetailCard` (conditional image/homepage, overview 더보기 toggle), `RelatedSpotList` (category
+ keyword filtering, callback wiring), and `findRecommendedWindow` (pure logic). krds-react renders
fine under jsdom (the RSC `createContext` limitation only bites at Next build time, not in the
client-React test env). Two mocking notes: `SpotMap`'s Kakao SDK path needs `window.kakao` mocked
(only the fallback branch is covered so far); `next/image` is `vi.mock`ed to a plain `<img>` in
`SpotDetailCard.test.tsx` since the optimizer loader isn't available outside the Next runtime. The
presentational cards (`SpotDetailCard`, `RelatedSpotList`) were pulled out of `page.tsx` into their
own `src/components/*` files precisely so they're renderable in isolation — keep new
testable-in-isolation UI as its own component rather than inlining it in the page.

## Architecture

- **Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4.** Path alias `@/*` → `src/*`.
- **UI kit: `krds-react`** — the official React component library for KRDS (Korea Responsive
  Design System — 대한민국 정부 디지털 서비스 디자인 시스템), maintained by NIA (`krds-uiux` on npm).
  Import components from `"krds-react"`; the CSS is imported once, globally, in
  `src/app/globals.css` via a cascade layer (see the CSS-layering gotcha below). Do not hand-roll
  UI primitives (buttons, form fields, modals, tables, etc.) that KRDS already provides — check
  `node_modules/krds-react/dist/components/` for what's available before building custom.
- **Critical CSS-layering gotcha (do not "simplify" `globals.css` back to a plain import):**
  `krds-react/dist/index.css` ships an _unlayered_ reset — `body,div,p,main,section,header,…{
margin:0;padding:0}` — and in CSS an unlayered rule beats **any** `@layer`. Tailwind v4 puts its
  utilities in `@layer utilities`, so a plain `import "krds-react/dist/index.css"` silently
  nullifies every Tailwind spacing utility (`p-*`, `m-*`, `mx-*`, `py-*`, `gap` still works) —
  padding/margins render as `0` app-wide and the UI looks cramped/unstyled even though the classes
  are present. Fix (already in place): `globals.css` declares `@layer krds, theme, components,
utilities;` then imports KRDS into the lowest layer (`@import "krds-react/dist/index.css"
layer(krds);`) and pulls in Tailwind _without_ preflight (`tailwindcss/theme.css` +
  `tailwindcss/utilities.css` only — preflight would clobber the lower-layer KRDS components).
  KRDS's `html{font-size:62.5%}` / `body{Pretendard GOV}` base is re-asserted unlayered at the
  bottom of `globals.css` so it survives regardless of layer order. Beware: `*/` sequences inside
  a `/* … */` comment (e.g. writing `p-*/m-*`) prematurely close the comment and break the build.
- **Critical gotcha:** the `krds-react` bundle ships with no `"use client"` directives, even
  though its components use hooks and context internally. Any Server Component that imports from
  `krds-react` will fail at build time with `createContext is not a function`. Any file/component
  that uses `krds-react` components must itself start with `"use client"`, or must be a child
  rendered from a client-component boundary. This is a library limitation, not a bug in this repo.
- **When redesigning or adding UI, invoke the `krds-design` skill** (`.claude/skills/krds-design/`)
  rather than guessing component props or hand-styling from screenshots — it documents the
  Select-vs-Dropdown trap, has an auto-generated prop catalog for all 42 components
  (`references/component-catalog.md`), and the real KRDS color/typography tokens
  (`references/design-tokens.md`) for markup with no component equivalent (e.g. card containers).
  Regenerate both reference files after bumping the `krds-react` version (see the skill for the
  commands). `.claude/skills/krds-design-workspace/` holds this skill's own eval runs — it's test
  scaffolding, not part of the product; ESLint already ignores it (`eslint.config.mjs`).

## Public-data API integration (data.go.kr)

- `.env` holds, per API, three vars: `<PREFIX>_ENDPOINT` (base URL, no operation path),
  `<PREFIX>_KEY_ENCODED`, and `<PREFIX>_KEY_DECODED`. data.go.kr issues both an already
  URL-encoded key and a decoded key for the same 일반 인증키; use the **decoded** key whenever the
  caller builds the query string via `URLSearchParams` (it double-encodes otherwise) — see
  `src/lib/tourapi/client.ts`'s `callTourApi`. `.env.example` documents which var is which and is
  the only `.env*` file committed to git.
- `callTourApi<T>(endpoint, serviceKey, operation, params)` is the single low-level fetch helper
  for every data.go.kr TourAPI-family call: it appends `serviceKey`/`MobileOS`/`MobileApp`/`_type=json`,
  parses the `{ response: { header, body } }` envelope, throws `TourApiError` on non-`0000`
  `resultCode`, and normalizes `body.items` (which the API returns as `""` when empty, a single
  object when there's one result, or an array otherwise) into a plain array.
- **These TourAPI-family services use 법정동코드 (areaCd 2-digit / signguCd 5-digit), not
  TourAPI's own `areaCode2` region codes** — the two numbering systems look similar but are
  different (e.g. TourAPI's `areaCode2` calls 서울 area code `"1"`, but the hub/congestion/related
  services need `areaCd="11"`). `src/lib/regions.ts` hardcodes the full 법정동코드 시/도-시/군/구
  table (verified against a live call: `areaCd=11&signguCd=11110` → 종로구) since there's no
  confirmed public endpoint for this table under the project's registered API keys. If a region
  is added/renamed, update that file directly.
- Congestion/hub-spot data is published with a lag — `fetchHubSpots` (`src/lib/tourapi/hubSpots.ts`)
  starts from the current month and walks backward (`shiftYm`) until it finds a month with data,
  because querying the current calendar month reliably returns an empty result set. Reuse this
  lookback pattern for F2's `tatsCnctrRatedList` rather than assuming the latest month has data.
- `src/app/api/hub-spots/route.ts` is the pattern for exposing a public-data call to the client:
  validate the region code against `src/lib/regions.ts` before calling out, map `TourApiError` to a
  502 with the upstream `resultCode`, and return `{ items: [], baseYm: null }`-shaped "no data yet"
  responses (PRD §10 risk: not every region has coverage) rather than treating an empty result as
  an error.
- **`tatsCnctrRatedList` (F2) has no per-spot filter parameter.** It only accepts `areaCd`/`signguCd`
  and returns every tourist spot in that 시/군/구 for the next 30 days in one shot (confirmed:
  ~113 spots × 30 days = 3390 rows for 종로구, `numOfRows` isn't capped so it's fetched in a single
  call). It also takes **no date/month parameter** — it always returns today→+29 days and rejects
  `baseYmd` with `resultCode:10 INVALID_REQUEST_PARAMETER_ERROR`, so (unlike hub-spots/related-spots)
  there is no `baseYm` lookback to a previous month; "no data" is never fixable by shifting month.
  `src/lib/tourapi/congestion.ts`'s `fetchCongestion` fetches the whole 시/군/구 and joins to the hub
  spot **by name** (no shared ID exists between the two APIs). The two APIs spell the same place
  differently (hub `팔각정북악스카이` ↔ congestion `북악스카이 팔각정`; `국립현대미술관/서울관` ↔
  `국립현대미술관 서울`), so a plain exact match silently drops ~⅔ of spots. `resolveCongestionName`
  handles this **precision-first**: exact → normalized-exact → anagram → normalized-substring, and
  only when the candidate is unique (ambiguous → no match, to avoid showing a _different_ spot's
  data like `국립민속박물관`→`국립고궁박물관`). Measured on 종로구's 100 hub spots: 27 exact → 32 with
  the resolver, 0 false positives; the rest are genuinely absent from the congestion dataset (mostly
  hotels/숙박). If you loosen the resolver, re-measure false positives — wrong data is worse than an
  empty series. F3/F5 use code-based linkage instead and don't share this caveat.
- `findRecommendedWindow` picks the lowest-average 3-day sliding window (not just the single lowest
  day) as "추천 방문 시기", matching the PRD's "최저 구간" (구간 = window, not a point) language.
  `CongestionChart` (`src/components/CongestionChart.tsx`) is a dependency-free inline SVG line
  chart — no charting library is installed; keep using this component for consistency rather than
  introducing e.g. recharts for one more chart.
- **`TarRlteTarService1`/`areaBasedList1` (F3) also has no per-spot filter** and returns every base
  spot's related list for the whole 시/군/구 in one call (baseYm-gated, same lookback pattern as
  F1). Unlike F2's congestion API, though, its `tAtsCd` field uses the _same code space_ as F1's
  `hubTatsCd` (verified live: 경복궁's `hubTatsCd` from `/api/hub-spots` equals its `tAtsCd` in this
  API) — so `src/lib/tourapi/relatedSpots.ts` filters by exact code match, not name matching. Don't
  "fix" this to use name matching by copying the F2 pattern; the two related-data APIs behave
  differently on purpose here. Category filtering (관광지/숙박/음식 대분류, `rlteCtgryLclsNm`) is done
  client-side in `RelatedSpotList` (`src/app/page.tsx`) against the already-fetched ~50-item list —
  no separate category API call.
- **`KorService2` `searchKeyword2`/`detailCommon2` (F2 상세 보강, 무료 — `TOURAPI_DETAIL_*`).**
  `src/lib/tourapi/detail.ts`'s `fetchSpotDetail` enriches the *selected hub spot* with 대표이미지·
  개요·홈페이지·주소. The hub/congestion/related services share no `contentId` with TourAPI, so it
  resolves by name: `searchKeyword2(hubTatsNm)` → candidates, then picks the one **nearest to the
  hub's `mapX/mapY`** (coord disambiguation) and confirms `detailCommon2` for overview/homepage.
  Three non-obvious guards, each earning its keep — don't remove them: (1) **exact-title preference**
  before coord-nearest, because `searchKeyword2("경복궁")` also returns same-coord events like
  "경복궁 별빛야행" that a pure nearest-pick would grab; (2) **slash-keyword variants** — hub names
  disambiguate branches with `/` ("국립현대미술관/서울관") but TourAPI uses spaces, so it retries
  `/`→space then the pre-slash head, and coord-nearest then selects the right branch (→"국립현대미술관
  서울"); (3) a **`MAX_MATCH_KM` (2.5km) distance guard** that returns `null` rather than show a
  wrong far-away same-name place (enrichment follows F2's "wrong data is worse than none"). Also
  normalize `firstimage` `http://`→`https://` (the CDN mixes both; `next.config.ts` only whitelists
  `https` `tong.visitkorea.or.kr` for `next/image`). This is pure enrichment: `fetchSpotDetail`
  swallows all errors to `null`, `/api/spot-detail` always returns 200 `{ detail }`, and the F2 card
  renders only when `detail` is non-null — a miss never blocks the core flow, so it has no static
  fallback snapshot (unlike hub/congestion/related).

## PRD-driven architecture (per `PRD_TimeShift.md`)

The product flow is: region select → hub tourist-spot list (F1) → congestion forecast chart (F2)
→ free-text NL filtering (F4) → related/alternative spot recommendations + map (F3, F7) → LLM
narrative summary + incentive-badge mockup (F5, F6).

Key external dependencies to keep in mind when implementing:

- **공공데이터 API 인증키 (data.go.kr)** for three separate 한국관광공사 APIs (hub spots
  `areaBasedList1`, congestion-rate forecast `tatsCnctrRatedList`, related spots also via
  `areaBasedList1`/`searchKeyword1`) plus TourAPI `detailCommon2`/`detailImage2` for
  detail/image enrichment. All public-data calls must fix `_type=json`.
- **LLM API (Anthropic/OpenAI)** for F4 (NL condition parsing → category/keyword filters) and F5
  (narrative course summary generation). Must be called server-side only (API Route) — never
  expose the key to the client. Same rule applies to the public-data API keys.
- **카카오맵 SDK** for F7, embedded client-side.
- F6 (incentive badges) is a static UI mockup only — no backend logic, no real coupon/payment
  integration (explicitly out of scope for the MVP).
- Data coverage is not guaranteed for every region — the PRD calls out that congestion/related-spot
  data may not exist for all `areaCd`/`signguCd` combinations, so any region-facing feature needs a
  "no data yet" fallback state rather than assuming API coverage is uniform nationwide.
- Because this is a competition demo, public-data API failures should degrade to cached/static JSON
  fallbacks rather than breaking the flow. This is implemented in `src/lib/tourapi/fallback.ts` +
  `src/lib/tourapi/fallback/*.json`: snapshots of two regions — 서울 종로구 (`11`/`11110`) and
  부산 해운대구 (`26`/`26350`) — each with hub list, per-spot congestion series (`hubTatsNm`→series),
  and per-code related spots (`hubTatsCd`→items). Two regions is deliberate: PRD §9's success metric
  requires "정상 동작 확인 in ≥2 regions", which must hold even under the API-outage path (§10). Each
  `fetch*` helper wraps its `callTourApi` in try/catch and, **only when the upstream call throws**
  (network/`TourApiError`; an empty result is a legitimate "no data yet" state and is _not_ a
  fallback trigger), returns the cached data. Every helper now returns `source: "live" | "fallback"`
  which the routes pass through (the client currently ignores it — degradation is silent). Regions
  other than the two snapshots have no fallback and still 502. To add a region, re-capture its
  snapshot the same way these were: with the dev server up, hit the live routes for the new
  `areaCd`/`signguCd` — `/api/hub-spots`, then `/api/congestion?spotName=…` per hub spot, then
  `/api/related-spots?tAtsCd=…` per hub spot — which already apply the processing
  (`resolveCongestionName` for congestion, `tAtsCd` filter for related), and write the three JSON
  files in the `HubFallback`/`CongestionFallback`/`RelatedFallback` shapes (see the capture script in
  the F7/fallback work). Then register it in `fallback.ts`'s `HUB`/`CONGESTION`/`RELATED` maps. These
  JSON files load server-side only (client components import _types_ from the tourapi libs, so the
  data is never bundled to the browser).
