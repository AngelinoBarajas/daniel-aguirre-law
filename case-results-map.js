/* ============================================================
   CASE RESULTS MAP — component CSS  (HOMEPAGE ONLY)
   Paste into: Webflow -> Homepage -> Page Settings -> Custom Code -> Inside <head> tag.
   Pairs with case-results-map.js (Homepage -> Before </body>). Self-contained: every CSS
   var it uses is scoped to .case-map. Moved out of site-wide code.css on 2026-06-05 so the
   map's styles only load on the homepage (the only page with the map).
   ============================================================ */
<style>
.case-map {
  --map-bg: #FCF6EC;
  --panel-edge: rgba(168,139,92,0.22);
  --tan: #A88B5C;
  --tan-warm: #BFA374;
  --tan-line: rgba(168,139,92,0.40);
  --navy: #1A2840;
  --navy-mid: #2C3D5C;
  --burgundy: #891E2D;          /* brand red (active) */
  --burgundy-soft: rgba(137,30,45,0.08);
  --burgundy-bd: rgba(137,30,45,0.22);
  --success: #1D5C3A;
  --success-soft: rgba(29,92,58,0.10);
  --success-bd: rgba(29,92,58,0.30);
  --text-mid: #4A5470;
  --text-soft: rgba(26,40,64,0.50);
  position: relative;
  width: 100%;
}

/* Canvas area — aspect-ratio gives it a guaranteed height in any container.
   Tune the ratio to change the map's height vs its column width. */
.case-map .case-map_canvas-wrap { position: relative; width: 100%; aspect-ratio: 1.5 / 1; overflow: hidden; background: transparent; touch-action: auto; }
.case-map .map_canvas {
  position: absolute; inset: 0; width: 100%; height: 100%; display: block;
  user-select: none; -webkit-user-select: none;
  /* Edge fade removed (2026-07-15) — the map is now locked to a whole-US fitExtent view
     (case-results-map.js buildProjection) that keeps every coast + pin inside the frame, so
     there's no overscan bleed to feather. No mask = crisp full-country edges. */
}
.case-map .map_loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: Lora, serif; font-size: 1rem; font-style: italic; color: var(--text-soft); background: var(--map-bg); z-index: 10; transition: opacity 0.4s; }

/* Contained hero mode — the map sits in the RIGHT columns of a 12-col-aligned grid as a
   WIDE RECTANGLE (not full-bleed 100svh). The hero is content-height. Add `is-fill` to the
   .case-map root. Pairs with the .hero_layout containment below.
   History: the old version forced `min-height:100svh` → a near-square canvas the wide US
   couldn't fill (width-fit + vertical slack = the map floated small). A fixed aspect-ratio
   rectangle matches the US shape and the design target. Tune the ratio to taste. */
.case-map.is-fill { min-height: 0; display: flex; flex-direction: column; }
.case-map.is-fill .case-map_canvas-wrap { aspect-ratio: 1.55 / 1; flex: none; min-height: 0; }
/* Aspect 1.55 (2026-07-15): matched to CONUS's TRUE projected aspect (~1.56) now that the
   territories are excluded from the geometry (case-results-map.js). CONUS fills ~91% × 91% of the
   box, centred. (Earlier 2.2 was a wrong guess from bounds that still included the far-Pacific
   territories — those made the "nation" look ultra-wide; with them gone the country is only ~1.56
   wide.) Master framing lever: lower this toward ~1.5 = a hair wider; raise = more side margin.
   Pairs with padX/padY 0.03 in the engine. */
/* Hint sits BOTTOM-LEFT inside the map (per the Figma nav-cue placement), and the chips ride
   in normal flow below the map (the base .hero_filters rule governs — no absolute float). */
.case-map.is-fill .map_hint { left: 6%; right: auto; transform: none; bottom: 16px; top: auto; }
.case-map.is-fill .hero_filters { position: static; left: auto; right: auto; bottom: auto; top: auto; padding: 1rem 0 0; }
/* Hero layout — matches the Figma (node 12:2): a 12-col grid, ~1668px content width (≈135px
   side margins at 1920), content in the LEFT 4 cols + map in the RIGHT 8 cols. `width:
   min(100% - 5rem, 1668px)` keeps real side margins at EVERY width (a fixed max-width would go
   full-bleed again below 1668px). Replaced the old full-bleed `minmax(42rem,1fr)` grid.
   Tune: 1668px (overall width / margins) · 4fr 8fr (text vs map split) · 2rem (column gap). */
.section_hero .hero_layout {
  width: min(100% - 5rem, 1668px);
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
  grid-template-columns: 4fr 8fr !important;
  column-gap: 2rem;
  align-items: center;
  padding-top: 2rem;
  padding-bottom: 2rem;
}
/* Filter-chip entrance — staggered fade + rise. Runs on load (chips are static markup) ~0.65s
   in, so it follows the hero text/map entrance. Honors reduced-motion (below). */
@keyframes daChipIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
/* Desktop polish (≥992px):
   1) Pull the hero content to the container's LEFT edge — Designer puts an 80px left padding on
      .hero_content that left a dead band; removing it aligns the copy with the navbar logo and
      widens the text column. Lift the block ~70px.
   2) Filter chips: a single row under the map, LEFT-aligned to the map's nav-hint (the "Hover a
      pin" cue sits at left:6% of the map column, so the chips get padding-left:6% to line up with
      it). Smaller chips (see .filter_chip below). They stay in normal flow below the canvas.
   Mobile (≤991) stacks and keeps Designer's padding + static chips. */
@media (min-width: 992px) {
  .section_hero .hero_content { padding-left: 0 !important; transform: translateY(-70px); }
  .section_hero .case-map.is-fill .hero_filters { justify-content: flex-start; padding: 1rem 0 0 6%; }
  .section_hero .case-map.is-fill .hero_filters > * { opacity: 0; animation: daChipIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
  .section_hero .hero_filters > *:nth-child(1) { animation-delay: 0.65s; }
  .section_hero .hero_filters > *:nth-child(2) { animation-delay: 0.71s; }
  .section_hero .hero_filters > *:nth-child(3) { animation-delay: 0.77s; }
  .section_hero .hero_filters > *:nth-child(4) { animation-delay: 0.83s; }
  .section_hero .hero_filters > *:nth-child(5) { animation-delay: 0.89s; }
  .section_hero .hero_filters > *:nth-child(6) { animation-delay: 0.95s; }
  .section_hero .hero_filters > *:nth-child(7) { animation-delay: 1.01s; }
  .section_hero .hero_filters > *:nth-child(8) { animation-delay: 1.07s; }
  .section_hero .hero_filters > *:nth-child(9) { animation-delay: 1.13s; }
}
@media (prefers-reduced-motion: reduce) {
  .section_hero .hero_filters > * { opacity: 1 !important; animation: none !important; transform: none !important; }
}
@media (max-width: 991px) {
  .case-map.is-fill { min-height: 0; width: 100%; margin-left: 0; }
  .case-map.is-fill .case-map_canvas-wrap { flex: none; aspect-ratio: 1.3 / 1; }
  .case-map.is-fill .map_hint { left: 14px; right: auto; transform: none; bottom: 14px; }
  .case-map.is-fill .hero_filters { position: static; bottom: auto; padding: 1rem 0 0; }
  /* Stack: text over map, full width. */
  .section_hero .hero_layout { grid-template-columns: 1fr !important; width: calc(100% - 3rem); column-gap: 0; padding-top: 0; padding-bottom: 0; }
}

/* Controls (absolute within the canvas area) */
.case-map .map_zoom-reset { position: absolute; bottom: 14px; right: 14px; width: 38px; height: 38px; border-radius: 8px; border: 1px solid var(--panel-edge); background: rgba(255,255,255,0.92); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); color: var(--navy); cursor: pointer; display: none; align-items: center; justify-content: center; z-index: 50; box-shadow: 0 2px 6px rgba(26,40,64,0.10); transition: background 0.15s, transform 0.15s; }
.case-map .map_zoom-reset.is-visible { display: flex; }
.case-map .map_zoom-reset:hover { background: #fff; transform: translateY(-1px); }
.case-map .map_hint { position: absolute; bottom: 14px; left: 14px; display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.7rem; border-radius: 100px; background: rgba(255,255,255,0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); font-size: 0.6875rem; font-weight: 500; letter-spacing: 0.04em; color: var(--text-soft); z-index: 30; pointer-events: none; }

/* Filter chips (optional — render below the map; delete the div in the markup if unwanted) */
.case-map .hero_filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 1rem 0 0; }
.case-map .hero_filters-label { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.20em; text-transform: uppercase; color: var(--text-soft); margin-right: 0.4rem; }
.case-map .filter_chip { display: inline-flex; align-items: center; padding: 0.34rem 0.78rem; border-radius: 100px; background: rgba(255,255,255,0.55); border: 1px solid rgba(168,139,92,0.28); font-family: Inter, sans-serif; font-size: 0.7rem; font-weight: 500; letter-spacing: 0.02em; color: var(--text-mid); cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s; white-space: nowrap; }
.case-map .filter_chip:hover { background: rgba(255,255,255,0.88); color: var(--navy); border-color: rgba(168,139,92,0.55); transform: translateY(-1px); }
.case-map .filter_chip.is-active { background: var(--navy); color: var(--map-bg); border-color: var(--navy); }
.case-map .filter_chip.is-active:hover { background: var(--navy-mid); border-color: var(--navy-mid); color: var(--map-bg); }

/* Popup + tooltip PORTAL — the JS (case-results-map.js) moves #popup and #pinTooltip onto this
   top-level, fixed, full-viewport, click-through layer so NO map container can clip them. Their
   real parent `.case-map_canvas-wrap` is overflow:hidden (it must clip the map canvas), which was
   cutting off tall popups (e.g. the LA cluster) at the canvas edge. The layer carries `.case-map`
   so every `.popup-*` / `.pin-tooltip-*` style + CSS var still applies; we just override
   `.case-map`'s relative/100% box into a fixed overlay. */
.da-popup-portal { position: fixed !important; inset: 0 !important; width: auto !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; background: none !important; pointer-events: none !important; z-index: 9999 !important; }

/* Popup — glass card */
.case-map .popup { position: absolute; width: 290px; background: rgba(252,246,236,0.55); backdrop-filter: blur(20px) saturate(1.6); -webkit-backdrop-filter: blur(20px) saturate(1.6); border-radius: 14px; border: 1px solid rgba(255,255,255,0.55); box-shadow: 0 18px 48px rgba(26,40,64,0.22), 0 4px 12px rgba(26,40,64,0.08), inset 0 1px 0 rgba(255,255,255,0.85); pointer-events: none; opacity: 0; transform: translateY(8px) scale(0.97); transition: opacity 0.22s cubic-bezier(0.34,1.15,0.64,1), transform 0.22s cubic-bezier(0.34,1.15,0.64,1); z-index: 200; overflow: hidden; touch-action: pan-y; }
.case-map .popup.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.case-map .popup-rule { height: 2px; background: linear-gradient(90deg, transparent, var(--tan), var(--tan-warm), var(--tan), transparent); opacity: 0.7; }
.case-map .popup-body { padding: 14px 16px 16px; }
.case-map .popup-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.case-map .popup-type { font-size: 9.5px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: var(--burgundy); background: var(--burgundy-soft); border: 1px solid var(--burgundy-bd); padding: 4px 10px; border-radius: 100px; align-self: flex-start; }
.case-map .popup-close { width: 24px; height: 24px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.55); background: rgba(255,255,255,0.45); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; color: var(--text-soft); transition: all 0.15s; pointer-events: auto; line-height: 1; }
.case-map .popup-close:hover { background: rgba(255,255,255,0.85); color: var(--navy); }
.case-map .popup-title { font-family: Inter, sans-serif; font-size: 16px; font-weight: 600; color: var(--navy); line-height: 1.3; margin-bottom: 6px; letter-spacing: -0.01em; }
.case-map .popup-location { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-soft); margin-bottom: 12px; }
.case-map .popup-outcome { display: flex; align-items: center; gap: 8px; background: var(--success-soft); border: 1px solid var(--success-bd); color: var(--success); font-size: 11.5px; font-weight: 600; padding: 8px 11px; border-radius: 6px; margin-bottom: 12px; }
.case-map .check-mark { width: 16px; height: 16px; border: 1.5px solid var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 9px; color: var(--success); }
.case-map .popup-summary { font-size: 12.5px; color: var(--text-mid); line-height: 1.6; margin-bottom: 14px; padding-left: 10px; border-left: 2px solid var(--tan-line); }
.case-map .popup-divider { height: 1px; background: rgba(168,139,92,0.30); margin-bottom: 12px; }
.case-map .popup-link { display: flex; align-items: center; justify-content: space-between; background: var(--navy); color: rgba(252,246,236,0.95); font-size: 11.5px; font-weight: 500; letter-spacing: 0.04em; padding: 10px 14px; border-radius: 6px; text-decoration: none; transition: background 0.15s; }
.case-map .popup-link:hover { background: var(--navy-mid); }
.case-map .popup-cluster-meta { display: flex; flex-direction: column; gap: 5px; }
.case-map .popup-type-cluster { align-self: flex-start; color: var(--burgundy); background: var(--burgundy-soft); border-color: var(--burgundy-bd); }
.case-map .popup-cluster-location { font-family: Inter, sans-serif; font-size: 1rem; font-weight: 600; color: var(--navy); line-height: 1.2; letter-spacing: -0.005em; }
.case-map .popup-cluster-hint { font-size: 11px; color: var(--text-soft); font-style: italic; margin: 4px 0 12px; }
/* Let the cluster list grow to show ALL its cases when there's room — cap it only by the viewport
   (so the popup never exceeds the screen; the JS then clamps its position to fit). At a normal
   desktop height the 4-case LA cluster shows in full with no scroll; on short screens it scrolls. */
.case-map .popup-cluster-list { display: flex; flex-direction: column; gap: 8px; max-height: calc(100vh - 210px); overflow-y: auto; padding-right: 2px; }
.case-map .popup-cluster-list::-webkit-scrollbar { width: 4px; }
.case-map .popup-cluster-list::-webkit-scrollbar-thumb { background: rgba(168,139,92,0.30); border-radius: 2px; }
.case-map .popup-cluster-row { background: rgba(255,255,255,0.40); border: 1px solid rgba(255,255,255,0.45); border-radius: 8px; padding: 10px 12px; cursor: pointer; transition: background 0.15s, transform 0.15s; pointer-events: auto; }
.case-map .popup-cluster-row:hover { background: rgba(255,255,255,0.78); transform: translateX(2px); }
.case-map .popup-cluster-row-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.case-map .popup-cluster-row-type { font-size: 8.5px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--burgundy); }
.case-map .popup-cluster-row-year { font-size: 10px; font-weight: 500; color: var(--text-soft); }
.case-map .popup-cluster-row-title { font-family: Inter, sans-serif; font-size: 13.5px; font-weight: 600; color: var(--navy); line-height: 1.3; margin-bottom: 6px; letter-spacing: -0.005em; }
.case-map .popup-cluster-row-outcome { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--success); font-weight: 600; }
.case-map .popup-cluster-row-outcome .check-mark { width: 13px; height: 13px; font-size: 8px; border-color: var(--success); color: var(--success); }
.case-map .popup-back { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; padding: 0 0 12px 0; margin: 0; font-family: Inter, sans-serif; font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-soft); cursor: pointer; pointer-events: auto; transition: color 0.15s; }
.case-map .popup-back:hover { color: var(--navy); }

/* Pin hover tooltip */
.case-map .pin-tooltip { position: absolute; background: rgba(252,246,236,0.92); backdrop-filter: blur(10px) saturate(1.5); -webkit-backdrop-filter: blur(10px) saturate(1.5); border: 1px solid rgba(255,255,255,0.55); border-radius: 8px; padding: 6px 9px; pointer-events: none; opacity: 0; transform: translateY(4px); transition: opacity 0.15s ease-out, transform 0.15s ease-out; z-index: 90; display: flex; align-items: center; gap: 8px; white-space: nowrap; box-shadow: 0 6px 16px rgba(26,40,64,0.16), 0 1px 4px rgba(26,40,64,0.06), inset 0 1px 0 rgba(255,255,255,0.85); }
.case-map .pin-tooltip.visible { opacity: 1; transform: translateY(0); }
.case-map .pin-tooltip-type { font-size: 9px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--burgundy); }
.case-map .pin-tooltip-outcome { font-size: 9.5px; font-weight: 600; letter-spacing: 0.10em; text-transform: uppercase; color: var(--success); background: var(--success-soft); border: 1px solid var(--success-bd); padding: 3px 8px; border-radius: 100px; }
.case-map .pin-tooltip-outcome.is-meta { color: var(--navy); background: rgba(168,139,92,0.10); border-color: rgba(168,139,92,0.30); }

/* Mobile — slightly taller map box; popup becomes a bottom sheet */
@media (max-width: 767px) {
  .case-map .case-map_canvas-wrap { aspect-ratio: 1.2 / 1; }
  .case-map .popup { position: fixed; left: 12px !important; right: 12px !important; width: auto !important; bottom: 12px; top: auto !important; background: rgba(252,246,236,0.65); backdrop-filter: blur(24px) saturate(1.6); -webkit-backdrop-filter: blur(24px) saturate(1.6); transform: translateY(20px) scale(1); box-shadow: 0 -8px 32px rgba(26,40,64,0.18), 0 -2px 8px rgba(26,40,64,0.08), inset 0 1px 0 rgba(255,255,255,0.85); }
  .case-map .popup.visible { transform: translateY(0) scale(1); }
  .case-map .popup-cluster-list { max-height: 50vh; }
}
</style>
