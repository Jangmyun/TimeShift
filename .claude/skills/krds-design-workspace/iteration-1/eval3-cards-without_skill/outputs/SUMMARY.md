Imported Badge alongside existing Select. Hub spot cards: replaced "#rank" text with
<Badge color="primary" variant="filled" rounded>{rank}위</Badge>, category text with
<Badge color="gray" variant="outline">. Related spot cards: same pattern with color="secondary"
for rank badges. Removed a no-op "krds-card" className that referenced no actual CSS rule
(grepped globals.css and krds-react's CSS, found none). Kept existing Tailwind border/selection
styling on the card container since krds-react has no Card component (checked node_modules).

Verification: build succeeded, lint passed. Drove the live page with headless Chrome DevTools
Protocol (no new deps), selected 서울/종로구, confirmed via screenshot that badges render
correctly across all 30 cards.

(Agent could not write this file directly due to a tool restriction on report files; captured
from its final report text by the orchestrator.)
