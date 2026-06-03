/* ============================================================
   Daniel Aguirre Law — Case Results Globe (homepage hero)
   Ported from hero-mockup.html. Orthographic globe (sphere + graticule)
   sitting right-of-canvas, dotted CONUS territory, case pins w/ clusters,
   hover-to-open glass popups, case-type filter chips, zoom/pan/parallax.

   Loading model (510 Visuals method):
     - Lazy-loaded by site init.js via lazyOn('.section_hero', <jsDelivr URL>).
     - Self-loads its deps (D3 v7 + topojson-client v3) from jsDelivr if absent.
     - Runtime fetch: us-atlas@3 states-10m.json (CDN, ~114KB). The dot-grid inside-test
       rasterizes the nation once and reads pixels (~7ms) instead of ~22k d3.geoContains
       calls (~12s) — that was the slow-load cause.
   Host: cdn.jsdelivr.net/gh/<owner>/<repo>@<sha>/case-results-map.js
   (use @main while iterating; pin @<sha> in init.js's lazyOn() before publish).

   Adaptations vs the standalone mockup:
     - IIFE + init guard; self-loads deps; boots on DOM ready or on injection.
     - Active pins use brand red #891e2d (not the mockup's #83202F).
     - Wheel-zoom gated to Ctrl/⌘ so normal page scroll passes through the hero.
     - Inline popup handlers namespaced under window.__daMap (no globals leaked).
     - CASES is CMS-ready: getCases() reads a hidden .case-map_source list if present,
       else falls back to the inline array. (Wire the CMS source later.)
   ============================================================ */
(function () {
  if (window.__daCaseMapInit) return;
  window.__daCaseMapInit = true;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Failed to load ' + src)); };
      (document.head || document.body).appendChild(s);
    });
  }
  function ensureDeps() {
    var chain = Promise.resolve();
    if (typeof window.d3 === 'undefined') chain = chain.then(function () { return loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js'); });
    if (typeof window.topojson === 'undefined') chain = chain.then(function () { return loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js'); });
    return chain;
  }

  function init() {
    var canvas = document.getElementById('mapCanvas');
    var wrap   = document.getElementById('canvasWrap');
    if (!canvas || !wrap) return;

    function byId(id) { return document.getElementById(id); }
    function setText(id, t) { var el = byId(id); if (el) el.textContent = t; }
    // No "Loading map…" text — the map zooms + fades in on its own (entrance animation in draw()).
    setText('loadingMsg', ''); setText('loading-msg', '');

    // ── Case data (CMS-ready) ──────────────────────────────
    var INLINE_CASES = [
      { id:0,  lat:34.05, lng:-118.24, title:"Family Reunification — H-4 Dependent Visa",        type:"Family-Based",       city:"Los Angeles", state:"CA", outcome:"Visa Approved",        year:2024, summary:"Spouse and two children reunited after a 3-year separation caused by administrative delays and a Request for Evidence.",                                  slug:"/cases/family-reunification-la" },
      { id:7,  lat:34.05, lng:-118.24, title:"Asylum — Salvadoran Family Fleeing Gang Violence", type:"Asylum",             city:"Los Angeles", state:"CA", outcome:"Asylum Granted",       year:2024, summary:"Family of four secured asylum after presenting country-conditions evidence on MS-13 retaliation; previous counsel had filed late.",                        slug:"/cases/asylum-la-salvadoran" },
      { id:8,  lat:34.05, lng:-118.24, title:"H-1B Cap Petition — Software Engineer",            type:"Work Visa",          city:"Los Angeles", state:"CA", outcome:"Petition Approved",    year:2023, summary:"Selected in lottery and approved on first review for a senior engineer transitioning from F-1 OPT at a Series B startup.",                                 slug:"/cases/h1b-la-engineer" },
      { id:9,  lat:34.05, lng:-118.24, title:"Removal Defense — 22-Year Resident",               type:"Removal Defense",    city:"Los Angeles", state:"CA", outcome:"Cancellation Granted", year:2023, summary:"Cancellation of removal granted for a long-term resident with two U.S.-citizen children after demonstrating exceptional and extremely unusual hardship.",  slug:"/cases/removal-la-longterm" },
      { id:1,  lat:40.71, lng:-74.01,  title:"Asylum Application — Central American Family",      type:"Asylum",             city:"New York",    state:"NY", outcome:"Asylum Granted",       year:2023, summary:"Asylum granted to a family fleeing gang-based persecution after the judge reversed an initial denial on appeal.",                                          slug:"/cases/asylum-ny" },
      { id:2,  lat:41.85, lng:-87.65,  title:"Employment Authorization — DACA Renewal",          type:"Work Authorization", city:"Chicago",     state:"IL", outcome:"EAD Renewed",          year:2024, summary:"Successful renewal for a DACA recipient facing lapse in work authorization during university enrollment.",                                                slug:"/cases/ead-chicago" },
      { id:3,  lat:25.77, lng:-80.19,  title:"Removal Defense — Emergency Stay Granted",         type:"Removal Defense",    city:"Miami",       state:"FL", outcome:"Deportation Halted",   year:2024, summary:"Emergency stay obtained for a 14-year resident with three U.S.-born children, pending full merits appeal.",                                                slug:"/cases/removal-miami" },
      { id:4,  lat:29.76, lng:-95.37,  title:"EB-2 National Interest Waiver",                    type:"Employment-Based",   city:"Houston",     state:"TX", outcome:"Green Card Approved",  year:2023, summary:"NIW petition approved for a medical researcher whose public health work was certified as substantially beneficial to the U.S.",                            slug:"/cases/eb2-niw-houston" },
      { id:5,  lat:47.61, lng:-122.33, title:"TN Visa — Canadian Tech Professional",             type:"Work Visa",          city:"Seattle",     state:"WA", outcome:"TN Status Granted",    year:2024, summary:"Canadian software engineer granted TN status at port of entry after a prior CBP denial due to documentation deficiencies.",                               slug:"/cases/tn-visa-seattle" },
      { id:6,  lat:33.75, lng:-84.39,  title:"U-Visa — Crime Victim Certification",              type:"Humanitarian",       city:"Atlanta",     state:"GA", outcome:"U-Visa Approved",      year:2023, summary:"Obtained law enforcement certification and USCIS approval of U nonimmigrant status for a domestic violence survivor.",                                    slug:"/cases/uvisa-atlanta" },
      { id:10, lat:33.45, lng:-112.07, title:"DACA — Reopened After Initial Denial",             type:"Work Authorization", city:"Phoenix",     state:"AZ", outcome:"Status Reinstated",    year:2024, summary:"Motion to reopen succeeded for a DACA recipient whose renewal was wrongly denied for missing employment-history records.",                                slug:"/cases/daca-phoenix" },
      { id:11, lat:32.78, lng:-96.80,  title:"I-130 — Petition for Aging Parents",               type:"Family-Based",       city:"Dallas",      state:"TX", outcome:"Green Cards Approved", year:2023, summary:"Both parents (ages 71 and 68) approved for permanent residence after consular processing in Mexico City; affidavits of support handled in-house.",        slug:"/cases/i130-dallas" },
      { id:12, lat:42.36, lng:-71.06,  title:"VAWA Self-Petition — Domestic Abuse Survivor",     type:"Humanitarian",       city:"Boston",      state:"MA", outcome:"Petition Approved",    year:2024, summary:"VAWA self-petition approved for a survivor whose abusive U.S.-citizen spouse had threatened immigration consequences as a control tactic.",               slug:"/cases/vawa-boston" },
      { id:13, lat:39.74, lng:-104.99, title:"TPS Extension — Venezuelan Designation",           type:"Humanitarian",       city:"Denver",      state:"CO", outcome:"TPS Extended",         year:2024, summary:"Re-registered TPS protection plus EAD extension for a family of three under the Venezuela 2023 designation.",                                              slug:"/cases/tps-denver" },
      { id:14, lat:44.98, lng:-93.27,  title:"Refugee Family Reunification — Form I-730",        type:"Humanitarian",       city:"Minneapolis", state:"MN", outcome:"Family Reunited",      year:2023, summary:"Spouse and three minor children of a Somali refugee approved for derivative status and travel after 4 years of separation.",                               slug:"/cases/i730-minneapolis" },
    ];
    // Future CMS: render a hidden list of .case-map_item elements with data-* attrs
    // inside a .case-map_source div; this reader will pick them up automatically.
    function getCases() {
      var src = document.querySelectorAll('.case-map_source .case-map_item');
      if (!src.length) return INLINE_CASES;
      var out = [];
      for (var i = 0; i < src.length; i++) {
        var el = src[i], d = el.dataset;
        out.push({
          id: i, lat: parseFloat(d.lat), lng: parseFloat(d.lng),
          title: d.title || '', type: d.type || '', city: d.city || '', state: d.state || '',
          outcome: d.outcome || '', year: d.year || '', summary: d.summary || '', slug: d.slug || '#'
        });
      }
      return out;
    }
    var CASES = getCases();

    setText('metricCases', CASES.length);
    setText('metricStates', new Set(CASES.map(function (c) { return c.state; })).size);

    // ── Canvas + sizing ────────────────────────────────────
    var ctx = canvas.getContext('2d');
    var zoomResetBtn = byId('zoomReset');
    var isMobile = function () { return window.matchMedia('(max-width: 991px)').matches; };
    var isTouch  = function () { return window.matchMedia('(hover: none)').matches; };
    var W, H, dpr;
    function resize() {
      dpr = window.devicePixelRatio || 1;
      W = wrap.clientWidth; H = wrap.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // ── Parallax ──
    var mouseX = 0.5, mouseY = 0.5, pX = 0, pY = 0;
    var PAR = 8, SMOOTH = 0.055;
    if (!isTouch()) document.addEventListener('mousemove', function (e) { mouseX = e.clientX / window.innerWidth; mouseY = e.clientY / window.innerHeight; });

    var canvasMouseX = -9999, canvasMouseY = -9999, canvasMouseSmoothX = -9999, canvasMouseSmoothY = -9999;
    var PROX_R = 70, PROX_R_SQ = PROX_R * PROX_R, CURSOR_LERP = 0.07;

    // ── Zoom + pan ──
    var zoom = 1, panX = 0, panY = 0;
    var MIN_ZOOM = 1, MAX_ZOOM = 4;
    function clampPan() {
      // Draggable at ANY zoom — the map overscans past the canvas, so there's always room
      // to pan. Bounds grow with zoom.
      var maxX = W * (0.30 + (zoom - 1) * 0.6);
      var maxY = H * (0.22 + (zoom - 1) * 0.6);
      panX = Math.max(-maxX, Math.min(maxX, panX));
      panY = Math.max(-maxY, Math.min(maxY, panY));
    }
    function setZoomAt(newZoom, screenX, screenY) {
      newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      if (newZoom < 1.005) { resetView(); return; }
      if (newZoom === zoom) return;
      var r = newZoom / zoom;
      panX = panX * r + (screenX - W/2) * (1 - r);
      panY = panY * r + (screenY - H/2) * (1 - r);
      zoom = newZoom; clampPan();
      if (zoomResetBtn) zoomResetBtn.classList.toggle('is-visible', zoom > 1.01);
    }
    function resetView() { zoom = 1; panX = 0; panY = 0; if (zoomResetBtn) zoomResetBtn.classList.remove('is-visible'); }
    function worldToScreen(wx, wy) { return { x: (wx - W/2) * zoom + W/2 + panX + pX, y: (wy - H/2) * zoom + H/2 + panY + pY }; }
    function screenToWorld(sx, sy) { return { x: (sx - W/2 - panX - pX) / zoom + W/2, y: (sy - H/2 - panY - pY) / zoom + H/2 }; }

    // ── Projection (orthographic globe, right-of-canvas) ──
    var projection, geoPath, topoStates, topoNation, dots = [];
    var CLUSTERS = [];
    var activeFilter = 'all';
    function clusterMatches(cl) { return activeFilter === 'all' || cl.cases.some(function (c) { return c.type === activeFilter; }); }

    function buildProjection() {
      // Flat whole-US map, centred inside the component box (the map IS the right
      // column now). Head-on orthographic reads flat for CONUS; fitExtent guarantees
      // the entire country is visible with a small margin all around.
      projection = d3.geoOrthographic().rotate([96, -38]).clipAngle(90).precision(0.4);
      // OVERSCAN: negative fit margins scale the US UP so it fills the canvas and bleeds
      // past the edges (the radial mask in CSS softens the bleed). This is the reliable
      // size lever. Bigger ox/oy = bigger map. ox = width fill, oy = height fill.
      var ox = W * 0.18, oy = H * 0.08;
      projection.fitExtent([[-ox, -oy], [W + ox, H + oy]], topoNation);
      // Re-centre on the projected centroid (CONUS visual mass leans east) so it sits
      // balanced in the canvas.
      var tmpPath = d3.geoPath().projection(projection);
      var c = tmpPath.centroid(topoNation);
      if (c && isFinite(c[0]) && isFinite(c[1])) {
        var tr = projection.translate();
        // Vertical centre biased UP (0.37 instead of 0.5) so the map sits higher and
        // doesn't overlap the filter chips on load. Lower this number to raise it more.
        projection.translate([tr[0] + (W / 2 - c[0]), tr[1] + (H * 0.37 - c[1])]);
      }
      geoPath = d3.geoPath().projection(projection).context(ctx);
    }
    function buildDots() {
      dots = [];
      // Dot density — bigger steps = fewer dots = faster render. Tune to taste.
      var latStep = 0.30, lngStep = 0.42, minLat = 24.4, maxLat = 49.6, minLng = -125.0, maxLng = -66.8;

      // FAST inside-test: rasterize the nation once to an offscreen canvas (equirectangular
      // over the bbox) and read pixel alpha — ~7ms vs ~12s for ~22k d3.geoContains calls.
      var RW = 700, RH = Math.max(1, Math.round(RW * (maxLat - minLat) / (maxLng - minLng)));
      var oc = document.createElement('canvas'); oc.width = RW; oc.height = RH;
      var octx = oc.getContext('2d');
      function toRX(lng) { return (lng - minLng) / (maxLng - minLng) * RW; }
      function toRY(lat) { return (maxLat - lat) / (maxLat - minLat) * RH; }
      octx.fillStyle = '#000'; octx.beginPath();
      function addRing(r) { for (var k = 0; k < r.length; k++) { var x = toRX(r[k][0]), y = toRY(r[k][1]); if (k === 0) octx.moveTo(x, y); else octx.lineTo(x, y); } octx.closePath(); }
      if (topoNation.type === 'Polygon') topoNation.coordinates.forEach(addRing);
      else if (topoNation.type === 'MultiPolygon') topoNation.coordinates.forEach(function (poly) { poly.forEach(addRing); });
      octx.fill('evenodd');
      var px = octx.getImageData(0, 0, RW, RH).data;
      function insideAt(lng, lat) {
        var x = Math.floor(toRX(lng)), y = Math.floor(toRY(lat));
        if (x < 0 || y < 0 || x >= RW || y >= RH) return false;
        return px[(y * RW + x) * 4 + 3] > 128;
      }

      var latCount = Math.ceil((maxLat - minLat) / latStep) + 1, lngCount = Math.ceil((maxLng - minLng) / lngStep) + 1;
      for (var i = 0; i < latCount; i++) {
        var lat = minLat + i * latStep;
        for (var j = 0; j < lngCount; j++) {
          var lng = minLng + j * lngStep;
          if (!insideAt(lng, lat)) continue;
          // Precompute the projected position ONCE — zoom/pan/parallax are ctx transforms
          // applied at draw time, so the base projected point is constant. Avoids ~thousands
          // of projection() calls every animation frame.
          var pp = projection([lng, lat]);
          dots.push({ lat: lat, lng: lng, pt: pp, phase: Math.random() * Math.PI * 2, spd: 0.004 + Math.random() * 0.008, slowPhase: Math.random() * Math.PI * 2, slowSpd: 0.0006 + Math.random() * 0.0018 });
        }
      }
    }
    function reprojectCases() { CASES.forEach(function (c) { var pt = projection([c.lng, c.lat]); c.px = pt ? { x: pt[0], y: pt[1] } : null; }); }
    function buildClusters() {
      CLUSTERS = [];
      var CLUSTER_RSQ = 14 * 14, used = new Set();
      for (var i = 0; i < CASES.length; i++) {
        if (used.has(i)) continue;
        var c = CASES[i]; if (!c.px) continue;
        var group = [c]; used.add(i);
        for (var j = i + 1; j < CASES.length; j++) { if (used.has(j)) continue; var c2 = CASES[j]; if (!c2.px) continue; var dx = c.px.x - c2.px.x, dy = c.px.y - c2.px.y; if (dx*dx + dy*dy < CLUSTER_RSQ) { group.push(c2); used.add(j); } }
        var cx = group.reduce(function (s, g) { return s + g.px.x; }, 0) / group.length;
        var cy = group.reduce(function (s, g) { return s + g.px.y; }, 0) / group.length;
        CLUSTERS.push({ x: cx, y: cy, cases: group, id: 'c' + group.map(function (g) { return g.id; }).join('-') });
      }
    }
    function curvatureScale(x, y) { var cx = W*0.5, cy = H*0.5, Rx = W*0.62, Ry = H*0.85, nx = (x-cx)/Rx, ny = (y-cy)/Ry, d2 = nx*nx+ny*ny; if (d2 >= 1) return 0.78; return 0.78 + 0.22 * Math.sqrt(1 - d2); }

    // ── Render ──
    var tick = 0, animId = null, activeId = null, animStart = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H); tick += 0.016;
      // Entrance animation — the map zooms in (0.90→1) and fades in (0→1) once on first render.
      var nowT = (window.performance && performance.now) ? performance.now() : Date.now();
      if (!animStart) animStart = nowT;
      var ease = 1 - Math.pow(1 - Math.min(1, (nowT - animStart) / 1100), 3); // easeOutCubic
      var escale = 0.90 + 0.10 * ease;
      if (canvasMouseX !== -9999) { if (canvasMouseSmoothX === -9999) { canvasMouseSmoothX = canvasMouseX; canvasMouseSmoothY = canvasMouseY; } else { canvasMouseSmoothX += (canvasMouseX - canvasMouseSmoothX) * CURSOR_LERP; canvasMouseSmoothY += (canvasMouseY - canvasMouseSmoothY) * CURSOR_LERP; } }
      else { canvasMouseSmoothX = -9999; canvasMouseSmoothY = -9999; }
      if (zoom <= 1.01 && panX === 0 && panY === 0) { pX += (((mouseX - 0.5) * PAR) - pX) * SMOOTH; pY += (((mouseY - 0.5) * PAR) - pY) * SMOOTH; } else { pX *= 0.9; pY *= 0.9; }

      ctx.fillStyle = '#FCF6EC'; ctx.fillRect(0, 0, W, H);
      var cg = ctx.createRadialGradient(W*0.5+pX*0.12, H*0.50+pY*0.12, 0, W*0.5, H*0.50, W*0.55);
      cg.addColorStop(0, 'rgba(245,237,217,0.65)'); cg.addColorStop(0.6, 'rgba(245,237,217,0.20)'); cg.addColorStop(1, 'rgba(252,246,236,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(W/2 + panX + pX, H/2 + panY + pY); ctx.scale(zoom * escale, zoom * escale); ctx.translate(-W/2, -H/2);
      ctx.globalAlpha = ease; // fade the map content in during entrance

      // Dotted territory
      var BASE_R = 0.85, BASE_A = 0.32;
      for (var k = 0; k < dots.length; k++) {
        var d = dots[k]; d.phase += d.spd; d.slowPhase += d.slowSpd;
        var pt = d.pt; if (!pt) continue;   // precomputed in buildDots (no per-frame projection)
        var prox = 0, cdx = pt[0] - canvasMouseSmoothX, cdy = pt[1] - canvasMouseSmoothY, cd2 = cdx*cdx + cdy*cdy;
        if (cd2 < PROX_R_SQ) { var u = 1 - Math.sqrt(cd2) / PROX_R; prox = u * u * (3 - 2 * u); }
        var pulse = 0.5 + 0.5 * Math.sin(d.phase), slowMod = 0.78 + 0.22 * Math.sin(d.slowPhase), cs = curvatureScale(pt[0], pt[1]);
        var r = BASE_R * cs * ((0.85 + pulse * 0.30) * (1 + prox * 0.35)) * (W / 950);
        var alpha = Math.min(0.72, BASE_A * cs * ((0.78 + pulse * 0.22) * slowMod * (1 + prox * 0.85)));
        ctx.beginPath(); ctx.arc(pt[0], pt[1], r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(105,80,32,' + alpha + ')'; ctx.fill();
      }
      // State outlines
      ctx.strokeStyle = 'rgba(168,139,92,0.38)'; ctx.lineWidth = 0.5 / zoom;
      topoStates.features.forEach(function (f) { ctx.beginPath(); geoPath(f); ctx.stroke(); });

      for (var s = 0; s < CLUSTERS.length; s++) { ctx.globalAlpha = ease * (clusterMatches(CLUSTERS[s]) ? 1.0 : 0.18); drawSpotlight(CLUSTERS[s].x, CLUSTERS[s].y, tick + CLUSTERS[s].cases[0].id * 0.5, CLUSTERS[s].id === activeId); }
      ctx.globalAlpha = 1.0;
      for (var p = 0; p < CLUSTERS.length; p++) { ctx.globalAlpha = ease * (clusterMatches(CLUSTERS[p]) ? 1.0 : 0.22); drawPin(CLUSTERS[p].x, CLUSTERS[p].y, CLUSTERS[p].id === activeId, tick + CLUSTERS[p].cases[0].id * 0.5, CLUSTERS[p].cases.length); }
      ctx.globalAlpha = 1.0;

      ctx.restore();

      // Edge vignette — drawn in SCREEN space (after restore) so it fades the map into the
      // cream page on ALL sides at ANY zoom level (no hard rectangular cut). Robust: it's
      // painted pixels, not a CSS mask, so it can't be defeated by a selector/cache issue.
      ctx.save();
      ctx.translate(W * 0.5, H * 0.5);
      ctx.scale(W, H);
      var vg = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.62);
      vg.addColorStop(0.00, 'rgba(252,246,236,0)');
      vg.addColorStop(0.55, 'rgba(252,246,236,0)');
      vg.addColorStop(1.00, 'rgba(252,246,236,1)');
      ctx.fillStyle = vg;
      ctx.fillRect(-0.6, -0.6, 1.2, 1.2);
      ctx.restore();

      animId = requestAnimationFrame(draw);
    }

    function drawSpotlight(x, y, t, active) {
      var breath = 0.78 + 0.22 * Math.sin(t * 0.7), baseAlpha = (active ? 0.60 : 0.32) * breath;
      var baseW = active ? 8 : 6, topW = active ? 30 : 22, height = active ? 95 : 65;
      var grad = ctx.createLinearGradient(x, y, x, y - height);
      grad.addColorStop(0, 'rgba(191,163,116,' + baseAlpha + ')'); grad.addColorStop(0.30, 'rgba(191,163,116,' + (baseAlpha*0.50) + ')'); grad.addColorStop(0.65, 'rgba(191,163,116,' + (baseAlpha*0.18) + ')'); grad.addColorStop(1, 'rgba(191,163,116,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(x - baseW/2, y); ctx.lineTo(x + baseW/2, y); ctx.lineTo(x + topW/2, y - height); ctx.lineTo(x - topW/2, y - height); ctx.closePath(); ctx.fill();
      var baseR = active ? 16 : 12, baseG = ctx.createRadialGradient(x, y, 0, x, y, baseR);
      baseG.addColorStop(0, 'rgba(191,163,116,' + (0.40*breath) + ')'); baseG.addColorStop(1, 'rgba(191,163,116,0)');
      ctx.fillStyle = baseG; ctx.beginPath(); ctx.arc(x, y, baseR, 0, Math.PI * 2); ctx.fill();
    }
    function drawPin(x, y, active, t, count) {
      var isCluster = count > 1, col = active ? '#891e2d' : '#1A2840';
      var r = isCluster ? 8.5 : (active ? 5.5 : 4.5), ringW = isCluster ? 2.6 : 2.2;
      var haloC = active ? '137,30,45' : '26,40,64';
      var pulseT = (t * 0.20) % 1;
      if (pulseT < 0.80) { var pr = (r + ringW) + pulseT * (active ? 26 : (isCluster ? 22 : 18)); var pa = (1 - pulseT / 0.80) * (active ? 0.45 : (isCluster ? 0.32 : 0.24)); ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(' + haloC + ',' + pa + ')'; ctx.lineWidth = 0.9; ctx.stroke(); }
      var breath = 0.5 + 0.5 * Math.sin(t * 0.20 + 1.0), haloR = r + ringW + (active ? 18 : (isCluster ? 16 : 12)), haloA = (active ? 0.42 : (isCluster ? 0.28 : 0.22)) * (0.55 + breath * 0.45);
      var haloG = ctx.createRadialGradient(x, y, r * 0.6, x, y, haloR); haloG.addColorStop(0, 'rgba(' + haloC + ',' + haloA + ')'); haloG.addColorStop(1, 'rgba(' + haloC + ',0)');
      ctx.fillStyle = haloG; ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r + ringW, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r + ringW, 0, Math.PI * 2); ctx.strokeStyle = active ? 'rgba(137,30,45,0.40)' : 'rgba(26,40,64,0.32)'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
      if (isCluster) { ctx.fillStyle = '#FFFFFF'; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(count), x, y + 0.5); }
    }

    // ── Interaction ──
    var popup = byId('popup'), pinTooltip = byId('pinTooltip'), pinTooltipType = byId('pinTooltipType'), pinTooltipOut = byId('pinTooltipOutcome');
    var dragging = false, dragStart = null, dragMoved = false, pinchStart = null, currentCluster = null, hoveredId = null;
    function shortOutcome(s) { var parts = String(s).trim().split(/\s+/); return parts[parts.length - 1]; }
    function canvasCoords(clientX, clientY) { var r = canvas.getBoundingClientRect(); return { x: (clientX - r.left) * (W / r.width), y: (clientY - r.top) * (H / r.height) }; }
    function findHit(worldX, worldY, hitR) { var hit = null, best = hitR; for (var i = 0; i < CLUSTERS.length; i++) { var cl = CLUSTERS[i], dx = cl.x - worldX, dy = cl.y - worldY, d = Math.sqrt(dx*dx + dy*dy); if (d < best) { best = d; hit = cl; } } return hit; }

    function positionTooltip(cl) {
      if (!pinTooltip) return;
      var sp = worldToScreen(cl.x, cl.y), cR = canvas.getBoundingClientRect(), sx = cR.width / W, sy = cR.height / H;
      var vx = sp.x * sx + cR.left, vy = sp.y * sy + cR.top, parent = pinTooltip.parentElement, pR = parent.getBoundingClientRect();
      var pinX = vx - pR.left, pinY = vy - pR.top, tw = pinTooltip.offsetWidth || 130, th = pinTooltip.offsetHeight || 30;
      var left = pinX - tw / 2, top = pinY - th - 18, wW = parent.offsetWidth;
      if (left < 6) left = 6; if (left + tw > wW - 6) left = wW - tw - 6; if (top < 6) top = pinY + 18;
      pinTooltip.style.left = left + 'px'; pinTooltip.style.top = top + 'px';
    }
    function hideTooltip() { if (pinTooltip) pinTooltip.classList.remove('visible'); hoveredId = null; }

    // Hover-open popup
    var hoverCloseTimer = null, popupIsHovered = false;
    function scheduleHoverClose() { clearTimeout(hoverCloseTimer); hoverCloseTimer = setTimeout(function () { if (!popupIsHovered) closePopup(); }, 120); }
    function cancelHoverClose() { clearTimeout(hoverCloseTimer); }

    canvas.addEventListener('click', function (e) {
      if (dragMoved) return;
      var s = canvasCoords(e.clientX, e.clientY), w = screenToWorld(s.x, s.y), hit = findHit(w.x, w.y, (isTouch() ? 28 : 24) / zoom);
      if (hit) { cancelHoverClose(); if (hit.id !== activeId) openCluster(hit); } else closePopup();
    });
    if (!isTouch()) {
      canvas.addEventListener('mousemove', function (e) {
        if (dragging) return;
        var s = canvasCoords(e.clientX, e.clientY), w = screenToWorld(s.x, s.y);
        canvasMouseX = w.x; canvasMouseY = w.y;
        var hit = findHit(w.x, w.y, 24 / zoom);
        canvas.style.cursor = hit ? 'pointer' : 'grab';
        if (hit) { cancelHoverClose(); if (hit.id !== activeId) openCluster(hit); }
        else if (activeId && !popupIsHovered) scheduleHoverClose();
      });
      canvas.addEventListener('mouseleave', function () { canvasMouseX = -9999; canvasMouseY = -9999; if (activeId && !popupIsHovered) scheduleHoverClose(); });
      if (popup) {
        popup.addEventListener('mouseenter', function () { popupIsHovered = true; cancelHoverClose(); });
        popup.addEventListener('mouseleave', function () { popupIsHovered = false; scheduleHoverClose(); });
      }
    }

    canvas.addEventListener('mousedown', function (e) { dragStart = { x: e.clientX, y: e.clientY, panX: panX, panY: panY }; dragging = true; dragMoved = false; });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
      if (dragMoved) { closePopup(); var r = canvas.getBoundingClientRect(); panX = dragStart.panX + dx * (W / r.width); panY = dragStart.panY + dy * (H / r.height); clampPan(); canvas.style.cursor = 'grabbing'; }
    });
    window.addEventListener('mouseup', function () { if (!dragging) return; dragging = false; if (dragMoved) setTimeout(function () { dragMoved = false; }, 60); canvas.style.cursor = 'grab'; });

    // Wheel zoom gated to Ctrl/⌘ so the page still scrolls over the hero
    canvas.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault(); closePopup();
      var s = canvasCoords(e.clientX, e.clientY), factor = e.deltaY < 0 ? 1.14 : 1 / 1.14;
      setZoomAt(zoom * factor, s.x, s.y);
    }, { passive: false });

    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) { closePopup(); var dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY; pinchStart = { dist: Math.sqrt(dx*dx + dy*dy), zoom: zoom, midX: (e.touches[0].clientX + e.touches[1].clientX) / 2, midY: (e.touches[0].clientY + e.touches[1].clientY) / 2, panX: panX, panY: panY }; }
      else if (e.touches.length === 1) { dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: panX, panY: panY }; dragging = true; dragMoved = false; }
    }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinchStart) {
        e.preventDefault();
        var dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY, dist = Math.sqrt(dx*dx + dy*dy);
        var newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStart.zoom * (dist / pinchStart.dist))), s = canvasCoords(pinchStart.midX, pinchStart.midY), r = newZoom / pinchStart.zoom;
        panX = pinchStart.panX * r + (s.x - W/2) * (1 - r); panY = pinchStart.panY * r + (s.y - H/2) * (1 - r); zoom = newZoom; clampPan(); if (zoomResetBtn) zoomResetBtn.classList.toggle('is-visible', zoom > 1.01);
      } else if (e.touches.length === 1 && dragging) {
        e.preventDefault(); var dx2 = e.touches[0].clientX - dragStart.x, dy2 = e.touches[0].clientY - dragStart.y;
        if (Math.abs(dx2) > 3 || Math.abs(dy2) > 3) { dragMoved = true; closePopup(); var r2 = canvas.getBoundingClientRect(); panX = dragStart.panX + dx2 * (W / r2.width); panY = dragStart.panY + dy2 * (H / r2.height); clampPan(); }
      }
    }, { passive: false });
    canvas.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinchStart = null; if (e.touches.length === 0) { dragging = false; if (dragMoved) setTimeout(function () { dragMoved = false; }, 60); } });
    canvas.addEventListener('dblclick', function (e) { e.preventDefault(); resetView(); });
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', resetView);

    // Filter chips
    var chips = document.querySelectorAll('.filter_chip');
    for (var ci = 0; ci < chips.length; ci++) {
      chips[ci].addEventListener('click', function () {
        if (this.classList.contains('is-active')) return;
        for (var cj = 0; cj < chips.length; cj++) chips[cj].classList.remove('is-active');
        this.classList.add('is-active');
        activeFilter = this.dataset.type;
        closePopup();
      });
    }

    // ── Popup ──
    var popupBody = byId('popup-body');
    var SVG_LOC = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>';
    var SVG_ARROW = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
    var SVG_BACK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    function escHtml(s) { return String(s).replace(/[&<>"']/g, function (m) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]; }); }

    function openCluster(cl) {
      activeId = cl.id; hideTooltip();
      if (cl.cases.length === 1) { currentCluster = null; renderSingleCase(cl.cases[0]); } else { currentCluster = cl; renderClusterList(cl); }
      positionPopup(cl.x, cl.y); popup.classList.add('visible');
    }
    function renderSingleCase(c) {
      var back = (currentCluster && currentCluster.cases.length > 1) ? '<button class="popup-back" onclick="window.__daMap.backToClusterList()">' + SVG_BACK + '<span>Back to all ' + currentCluster.cases.length + ' cases</span></button>' : '';
      popupBody.innerHTML = back +
        '<div class="popup-head"><span class="popup-type">' + escHtml(c.type) + '</span><button class="popup-close" onclick="window.__daMap.closePopup()" aria-label="Close">&times;</button></div>' +
        '<div class="popup-title">' + escHtml(c.title) + '</div>' +
        '<div class="popup-location">' + SVG_LOC + '<span>' + escHtml(c.city) + ', ' + escHtml(c.state) + ' &middot; ' + c.year + '</span></div>' +
        '<div class="popup-outcome"><div class="check-mark">&check;</div><span>' + escHtml(c.outcome) + '</span></div>' +
        '<div class="popup-summary">' + escHtml(c.summary) + '</div><div class="popup-divider"></div>' +
        '<a class="popup-link" href="' + escHtml(c.slug) + '"><span>Read full case</span>' + SVG_ARROW + '</a>';
    }
    function renderClusterList(cl) {
      var rows = cl.cases.map(function (c) {
        return '<div class="popup-cluster-row" onclick="window.__daMap.drillIntoCase(' + c.id + ')"><div class="popup-cluster-row-head"><span class="popup-cluster-row-type">' + escHtml(c.type) + '</span><span class="popup-cluster-row-year">' + c.year + '</span></div><div class="popup-cluster-row-title">' + escHtml(c.title) + '</div><div class="popup-cluster-row-outcome"><span class="check-mark">&check;</span><span>' + escHtml(c.outcome) + '</span></div></div>';
      }).join('');
      popupBody.innerHTML = '<div class="popup-head"><div class="popup-cluster-meta"><span class="popup-type popup-type-cluster">' + cl.cases.length + ' cases</span><div class="popup-cluster-location">' + escHtml(cl.cases[0].city) + ', ' + escHtml(cl.cases[0].state) + '</div></div><button class="popup-close" onclick="window.__daMap.closePopup()" aria-label="Close">&times;</button></div><div class="popup-cluster-hint">Tap any case to view full details</div><div class="popup-cluster-list">' + rows + '</div>';
    }
    function drillIntoCase(caseId) { var c = null; for (var i = 0; i < CASES.length; i++) if (CASES[i].id === caseId) c = CASES[i]; if (!c) return; renderSingleCase(c); if (currentCluster) positionPopup(currentCluster.x, currentCluster.y); }
    function backToClusterList() { if (!currentCluster) return; renderClusterList(currentCluster); positionPopup(currentCluster.x, currentCluster.y); }
    function positionPopup(worldX, worldY) {
      if (isMobile() || worldX == null || !popup) return;
      var sp = worldToScreen(worldX, worldY), cR = canvas.getBoundingClientRect(), sx = cR.width / W, sy = cR.height / H;
      var vx = sp.x * sx + cR.left, vy = sp.y * sy + cR.top, parent = popup.parentElement, pR = parent.getBoundingClientRect();
      var pinX = vx - pR.left, pinY = vy - pR.top, pw = popup.offsetWidth || 290; popup.style.opacity = '0';
      var ph = popup.offsetHeight || 240, left = pinX - pw / 2, top = pinY - ph - 22, wW = parent.offsetWidth;
      if (left < 6) left = 6; if (left + pw > wW - 6) left = wW - pw - 6; if (top < 6) top = pinY + 22;
      popup.style.left = left + 'px'; popup.style.top = top + 'px'; popup.style.opacity = '';
    }
    function closePopup() { if (!popup) return; popup.classList.remove('visible'); activeId = null; currentCluster = null; }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (zoom > 1) resetView(); else closePopup(); } });
    window.__daMap = { closePopup: closePopup, drillIntoCase: drillIntoCase, backToClusterList: backToClusterList };

    // ── Boot ──
    (async function boot() {
      try {
        var us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
        var allStates = topojson.feature(us, us.objects.states);
        topoStates = { type: 'FeatureCollection', features: allStates.features.filter(function (f) { return f.id !== '02' && f.id !== '15'; }) };
        topoNation = topojson.merge(us, us.objects.states.geometries.filter(function (g) { return g.id !== '02' && g.id !== '15'; }));
        resize(); buildProjection(); buildDots(); reprojectCases(); buildClusters();
        var resizeTimer;
        window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { resize(); buildProjection(); buildDots(); reprojectCases(); buildClusters(); clampPan(); }, 120); });
        var msg = byId('loadingMsg') || byId('loading-msg'); if (msg) { msg.style.opacity = '0'; setTimeout(function () { msg.style.display = 'none'; }, 400); }
        if (animId) cancelAnimationFrame(animId);
        draw();
      } catch (err) {
        console.error('Case map load error:', err);
        var m = byId('loadingMsg') || byId('loading-msg'); if (m) m.textContent = 'Map unavailable — check connection.';
      }
    })();
  }

  function boot() {
    if (!document.getElementById('mapCanvas')) return;
    ensureDeps().then(init).catch(function (err) {
      console.error('Case map deps failed:', err);
      var m = document.getElementById('loadingMsg') || document.getElementById('loading-msg'); if (m) m.textContent = 'Map unavailable — check connection.';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
