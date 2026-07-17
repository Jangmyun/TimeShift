# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TimeShift (타임시프트) — a Korean tourism-congestion service that recommends *when* to visit a
tourist spot instead of suggesting a different spot. Built for the 2026 관광데이터 활용 공모전
(tourism data contest), 웹·앱 구현 부문 지정과제 2번. Full requirements are in `PRD_TimeShift.md` —
read it before implementing any feature; this doc only covers engineering setup.

The app is a Next.js (App Router) project scaffolded fresh for this contest. As of this writing,
F1 (region select → hub tourist-spot list), F2 (30-day congestion forecast chart), and F3
(related/alternative spot recommendations with category filter) are implemented end-to-end —
all three activate together when a hub spot card is clicked. F4–F7 are not yet built.

## Commands

```bash
npm run dev      # start dev server (Turbopack) at http://localhost:3000
npm run build    # production build — also the fastest way to typecheck the whole app
npm run start    # run a production build
npm run lint     # eslint (flat config, eslint.config.mjs)
```

There is no test runner configured yet. If tests are added, update this section.

## Architecture

- **Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4.** Path alias `@/*` → `src/*`.
- **UI kit: `krds-react`** — the official React component library for KRDS (Korea Responsive
  Design System — 대한민국 정부 디지털 서비스 디자인 시스템), maintained by NIA (`krds-uiux` on npm).
  Import components from `"krds-react"`; the CSS is imported once, globally, in
  `src/app/layout.tsx` (`import "krds-react/dist/index.css"`). Do not hand-roll UI primitives
  (buttons, form fields, modals, tables, etc.) that KRDS already provides — check
  `node_modules/krds-react/dist/components/` for what's available before building custom.
- **Critical gotcha:** the `krds-react` bundle ships with no `"use client"` directives, even
  though its components use hooks and context internally. Any Server Component that imports from
  `krds-react` will fail at build time with `createContext is not a function`. Any file/component
  that uses `krds-react` components must itself start with `"use client"`, or must be a child
  rendered from a client-component boundary. This is a library limitation, not a bug in this repo.

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
  call). `src/lib/tourapi/congestion.ts`'s `fetchCongestion` fetches the whole 시/군/구 and filters
  client-side by exact `tAtsNm` string match against the hub spot's `hubTatsNm` — there's no shared
  ID between the hub-spot API and the congestion API, only the name. If a spot's name differs even
  slightly between the two APIs, the match silently returns an empty series; if F3/F5 need the same
  linkage, expect the same name-matching caveat there.
- `findRecommendedWindow` picks the lowest-average 3-day sliding window (not just the single lowest
  day) as "추천 방문 시기", matching the PRD's "최저 구간" (구간 = window, not a point) language.
  `CongestionChart` (`src/components/CongestionChart.tsx`) is a dependency-free inline SVG line
  chart — no charting library is installed; keep using this component for consistency rather than
  introducing e.g. recharts for one more chart.
- **`TarRlteTarService1`/`areaBasedList1` (F3) also has no per-spot filter** and returns every base
  spot's related list for the whole 시/군/구 in one call (baseYm-gated, same lookback pattern as
  F1). Unlike F2's congestion API, though, its `tAtsCd` field uses the *same code space* as F1's
  `hubTatsCd` (verified live: 경복궁's `hubTatsCd` from `/api/hub-spots` equals its `tAtsCd` in this
  API) — so `src/lib/tourapi/relatedSpots.ts` filters by exact code match, not name matching. Don't
  "fix" this to use name matching by copying the F2 pattern; the two related-data APIs behave
  differently on purpose here. Category filtering (관광지/숙박/음식 대분류, `rlteCtgryLclsNm`) is done
  client-side in `RelatedSpotList` (`src/app/page.tsx`) against the already-fetched ~50-item list —
  no separate category API call.

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
  fallbacks rather than breaking the flow.
