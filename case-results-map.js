/* ============================================================
   Daniel Aguirre Law — Case Results Map (homepage hero, right column)
   Adapted from case-results-map-poc.html for Webflow.

   Loading model (510 Visuals method):
     - This file is lazy-loaded by the site init.js via lazyOn('.case-map', <jsDelivr URL>)
       when the map nears the viewport. The Webflow Embed holds ONLY markup — no script tags.
     - It self-loads its own deps (D3 v7 + topojson-client v3) from jsDelivr if absent.
     - Runtime fetch: us-atlas@3 states-10m.json (CDN).

   Host this file: cdn.jsdelivr.net/gh/<owner>/<repo>@<sha>/case-results-map.js
   (use @main while iterating; pin a 7-char @<sha> in init.js's lazyOn() before publish).

   Differences from the POC:
     - Trimmed to JUST the map (no stats strip, section heading, card chrome, legend).
       DOM refs for those are null-guarded so nothing throws if absent.
     - Init-guarded; self-loads D3/topojson, then boots.
     - Scoped to a single `.case-map` root (single-instance assumption).
     - Wheel-zoom requires Ctrl/⌘ so the page still scrolls over the hero.
     - Active pins use brand red #891e2d; canvas labels use Inter.
   ============================================================ */
(function () {
  if (window.__daCaseMapInit) return;
  window.__daCaseMapInit = true;

  // ── Self-load deps (510 method: this file is lazy-loaded; it pulls its own libs) ──
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
    var root = document.querySelector('.case-map');
    if (!root) return;

    // ── Optional-DOM helpers (trimmed UI elements may not exist) ──
    function byId(id) { return document.getElementById(id); }
    function setText(id, txt) { var el = byId(id); if (el) el.textContent = txt; }

    // ═══════════════════════════════════════════════════
    //  CASE DATA — 15 cases, including a 4-case cluster in LA
    //  (Later: swap to a Webflow CMS source. Inline for now.)
    // ═══════════════════════════════════════════════════
    const CASES = [
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

    // Optional stat counters (only animate if present in DOM)
    const uniqueStates = [...new Set(CASES.map(c => c.state))];
    animCount('total-cases', CASES.length);
    animCount('states-count', uniqueStates.length);
    setText('case-badge', CASES.length + ' Cases Nationwide');
    function animCount(id, target) {
      const el = byId(id); if (!el) return;
      let n = 0;
      const t = setInterval(() => { n = Math.min(n + 1, target); el.textContent = n; if (n >= target) clearInterval(t); }, 50);
    }

    // ═══════════════════════════════════════════════════
    //  CANVAS + DEVICE SIZING
    // ═══════════════════════════════════════════════════
    const canvas = byId('mapCanvas');
    const ctx    = canvas.getContext('2d');
    const wrap   = byId('canvasWrap');
    const zoomResetBtn = byId('zoomReset');
    const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
    const isTouch  = () => window.matchMedia('(hover: none)').matches;
    let W, H, dpr;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      // Fill the wrap's actual box (it's now an absolute bg layer, not a ratio-sized card).
      W = wrap.clientWidth || 1;
      H = wrap.clientHeight || Math.round(W * 0.6);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // ── Parallax (desktop only, not when zoomed) ──
    let mouseX = 0.5, mouseY = 0.5, pX = 0, pY = 0;
    const PAR = 8, SMOOTH = 0.055;
    if (!isTouch()) {
      document.addEventListener('mousemove', e => { mouseX = e.clientX / window.innerWidth; mouseY = e.clientY / window.innerHeight; });
    }

    // ── Smoothed cursor for dot-field bloom ──
    let canvasMouseX = -9999, canvasMouseY = -9999;
    let canvasMouseSmoothX = -9999, canvasMouseSmoothY = -9999;
    const PROX_R = 70, PROX_R_SQ = PROX_R * PROX_R, CURSOR_LERP = 0.07;

    // ── Zoom + pan ──
    let zoom = 1, panX = 0, panY = 0;
    const MIN_ZOOM = 1, MAX_ZOOM = 4;
    function clampPan() {
      if (zoom <= 1.005) { panX = 0; panY = 0; return; }
      const maxX = W * (zoom - 1) / (2 * zoom);
      const maxY = H * (zoom - 1) / (2 * zoom);
      panX = Math.max(-maxX, Math.min(maxX, panX));
      panY = Math.max(-maxY, Math.min(maxY, panY));
    }
    function setZoomAt(newZoom, screenX, screenY) {
      newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      if (newZoom < 1.005) { resetView(); return; }
      if (newZoom === zoom) return;
      const r = newZoom / zoom;
      panX = panX * r + (screenX - W/2) * (1 - r);
      panY = panY * r + (screenY - H/2) * (1 - r);
      zoom = newZoom; clampPan();
      if (zoomResetBtn) zoomResetBtn.classList.toggle('visible', zoom > 1.01);
    }
    function resetView() { zoom = 1; panX = 0; panY = 0; if (zoomResetBtn) zoomResetBtn.classList.remove('visible'); }

    function worldToScreen(wx, wy) { return { x: (wx - W/2) * zoom + W/2 + panX + pX, y: (wy - H/2) * zoom + H/2 + panY + pY }; }
    function screenToWorld(sx, sy) { return { x: (sx - W/2 - panX - pX) / zoom + W/2, y: (sy - H/2 - panY - pY) / zoom + H/2 }; }

    // ═══════════════════════════════════════════════════
    //  D3 PROJECTION
    // ═══════════════════════════════════════════════════
    let projection, geoPath, topoStates, topoNation, dots = [];
    let CLUSTERS = [];
    function buildProjection() {
      projection = d3.geoOrthographic().rotate([96, -38]).clipAngle(90).precision(0.4);
      // OVERSCAN > 0 makes the US bigger than the canvas so it fills the frame and
      // bleeds past the edges (the edge-fade mask in CSS dissolves the overflow).
      // Bump this up for an even bigger default map.
      var OVERSCAN = 0.16;
      var ox = W * OVERSCAN, oy = H * OVERSCAN;
      projection.fitExtent([[-ox, -oy], [W + ox, H + oy]], topoNation);
      const tmpPath = d3.geoPath().projection(projection);
      const c = tmpPath.centroid(topoNation);
      if (c && isFinite(c[0]) && isFinite(c[1])) {
        const tr = projection.translate();
        projection.translate([tr[0] + (W / 2 - c[0]), tr[1] + (H / 2 - c[1])]);
      }
      geoPath = d3.geoPath().projection(projection).context(ctx);
    }

    // ── Dot grid ──
    function buildDots() {
      dots = [];
      const latStep = 0.22, lngStep = 0.30;
      const minLat = 24.4, maxLat = 49.6, minLng = -125.0, maxLng = -66.8;
      const latCount = Math.ceil((maxLat - minLat) / latStep) + 1;
      const lngCount = Math.ceil((maxLng - minLng) / lngStep) + 1;
      const inside = new Uint8Array(latCount * lngCount);
      for (let i = 0; i < latCount; i++) {
        const lat = minLat + i * latStep;
        for (let j = 0; j < lngCount; j++) {
          const lng = minLng + j * lngStep;
          if (d3.geoContains(topoNation, [lng, lat])) inside[i * lngCount + j] = 1;
        }
      }
      for (let i = 0; i < latCount; i++) for (let j = 0; j < lngCount; j++) {
        if (!inside[i * lngCount + j]) continue;
        dots.push({
          lat: minLat + i * latStep, lng: minLng + j * lngStep,
          phase: Math.random() * Math.PI * 2, spd: 0.004 + Math.random() * 0.008,
          slowPhase: Math.random() * Math.PI * 2, slowSpd: 0.0006 + Math.random() * 0.0018,
        });
      }
    }

    function reprojectCases() {
      CASES.forEach(c => { const pt = projection([c.lng, c.lat]); c.px = pt ? { x: pt[0], y: pt[1] } : null; });
    }
    function buildClusters() {
      CLUSTERS = [];
      const CLUSTER_RSQ = 14 * 14;
      const used = new Set();
      for (let i = 0; i < CASES.length; i++) {
        if (used.has(i)) continue;
        const c = CASES[i]; if (!c.px) continue;
        const group = [c]; used.add(i);
        for (let j = i + 1; j < CASES.length; j++) {
          if (used.has(j)) continue;
          const c2 = CASES[j]; if (!c2.px) continue;
          const dx = c.px.x - c2.px.x, dy = c.px.y - c2.px.y;
          if (dx*dx + dy*dy < CLUSTER_RSQ) { group.push(c2); used.add(j); }
        }
        const cx = group.reduce((s, g) => s + g.px.x, 0) / group.length;
        const cy = group.reduce((s, g) => s + g.px.y, 0) / group.length;
        CLUSTERS.push({ x: cx, y: cy, cases: group, id: 'c' + group.map(g => g.id).join('-') });
      }
    }

    function curvatureScale(x, y) {
      const cx = W * 0.5, cy = H * 0.5, Rx = W * 0.62, Ry = H * 0.85;
      const nx = (x - cx) / Rx, ny = (y - cy) / Ry, d2 = nx*nx + ny*ny;
      if (d2 >= 1) return 0.78;
      return 0.78 + 0.22 * Math.sqrt(1 - d2);
    }

    // ═══════════════════════════════════════════════════
    //  RENDER LOOP
    // ═══════════════════════════════════════════════════
    let tick = 0, animId = null, activeId = null;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      tick += 0.016;
      if (canvasMouseX !== -9999) {
        if (canvasMouseSmoothX === -9999) { canvasMouseSmoothX = canvasMouseX; canvasMouseSmoothY = canvasMouseY; }
        else { canvasMouseSmoothX += (canvasMouseX - canvasMouseSmoothX) * CURSOR_LERP; canvasMouseSmoothY += (canvasMouseY - canvasMouseSmoothY) * CURSOR_LERP; }
      } else { canvasMouseSmoothX = -9999; canvasMouseSmoothY = -9999; }

      if (zoom <= 1.01) {
        pX += (((mouseX - 0.5) * PAR) - pX) * SMOOTH;
        pY += (((mouseY - 0.5) * PAR) - pY) * SMOOTH;
      } else { pX *= 0.9; pY *= 0.9; }

      // Background — warm cream + soft radial glow
      ctx.fillStyle = '#FCF6EC';
      ctx.fillRect(0, 0, W, H);
      const cg = ctx.createRadialGradient(W*0.5+pX*0.12, H*0.50+pY*0.12, 0, W*0.5, H*0.50, W*0.55);
      cg.addColorStop(0, 'rgba(245,237,217,0.65)');
      cg.addColorStop(0.6, 'rgba(245,237,217,0.20)');
      cg.addColorStop(1, 'rgba(252,246,236,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(W/2 + panX + pX, H/2 + panY + pY);
      ctx.scale(zoom, zoom);
      ctx.translate(-W/2, -H/2);

      const BASE_R = 0.85, BASE_A = 0.32;
      for (const d of dots) {
        d.phase += d.spd; d.slowPhase += d.slowSpd;
        const pt = projection([d.lng, d.lat]); if (!pt) continue;
        let prox = 0;
        const cdx = pt[0] - canvasMouseSmoothX, cdy = pt[1] - canvasMouseSmoothY, cd2 = cdx*cdx + cdy*cdy;
        if (cd2 < PROX_R_SQ) { const u = 1 - Math.sqrt(cd2) / PROX_R; prox = u * u * (3 - 2 * u); }
        const pulse = 0.5 + 0.5 * Math.sin(d.phase);
        const slowMod = 0.78 + 0.22 * Math.sin(d.slowPhase);
        const cs = curvatureScale(pt[0], pt[1]);
        const sizeMul = (0.85 + pulse * 0.30) * (1 + prox * 0.35);
        const alphaMul = (0.78 + pulse * 0.22) * slowMod * (1 + prox * 0.85);
        const r = BASE_R * cs * sizeMul * (W / 950);
        const alpha = Math.min(0.72, BASE_A * cs * alphaMul);
        ctx.beginPath(); ctx.arc(pt[0], pt[1], r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(105,80,32,${alpha})`; ctx.fill();
      }

      ctx.strokeStyle = 'rgba(168,139,92,0.38)';
      ctx.lineWidth = 0.5 / zoom;
      topoStates.features.forEach(f => { ctx.beginPath(); geoPath(f); ctx.stroke(); });

      for (const cl of CLUSTERS) drawSpotlight(cl.x, cl.y, tick + cl.cases[0].id * 0.5, cl.id === activeId);
      for (const cl of CLUSTERS) drawPin(cl.x, cl.y, cl.id === activeId, tick + cl.cases[0].id * 0.5, cl.cases.length);

      ctx.restore();
      animId = requestAnimationFrame(draw);
    }

    function drawSpotlight(x, y, t, active) {
      const breath = 0.78 + 0.22 * Math.sin(t * 0.7);
      const baseAlpha = (active ? 0.60 : 0.32) * breath;
      const baseW = active ? 8 : 6, topW = active ? 30 : 22, height = active ? 95 : 65;
      const grad = ctx.createLinearGradient(x, y, x, y - height);
      grad.addColorStop(0, `rgba(191,163,116,${baseAlpha})`);
      grad.addColorStop(0.30, `rgba(191,163,116,${baseAlpha * 0.50})`);
      grad.addColorStop(0.65, `rgba(191,163,116,${baseAlpha * 0.18})`);
      grad.addColorStop(1, 'rgba(191,163,116,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(x - baseW/2, y); ctx.lineTo(x + baseW/2, y); ctx.lineTo(x + topW/2, y - height); ctx.lineTo(x - topW/2, y - height); ctx.closePath(); ctx.fill();
      const baseR = active ? 16 : 12;
      const baseG = ctx.createRadialGradient(x, y, 0, x, y, baseR);
      baseG.addColorStop(0, `rgba(191,163,116,${0.40 * breath})`); baseG.addColorStop(1, 'rgba(191,163,116,0)');
      ctx.fillStyle = baseG; ctx.beginPath(); ctx.arc(x, y, baseR, 0, Math.PI * 2); ctx.fill();
    }

    function drawPin(x, y, active, t, count) {
      const isCluster = count > 1;
      const col = active ? '#891e2d' : '#1A2840';          // active = brand red
      const r = isCluster ? 8.5 : (active ? 5.5 : 4.5);
      const ringW = isCluster ? 2.6 : 2.2;
      const haloC = active ? '137,30,45' : '26,40,64';      // brand red rgb when active
      const pulseT = (t * 0.20) % 1;
      if (pulseT < 0.80) {
        const pr = (r + ringW) + pulseT * (active ? 26 : (isCluster ? 22 : 18));
        const pa = (1 - pulseT / 0.80) * (active ? 0.45 : (isCluster ? 0.32 : 0.24));
        ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${haloC},${pa})`; ctx.lineWidth = 0.9; ctx.stroke();
      }
      const breath = 0.5 + 0.5 * Math.sin(t * 0.20 + 1.0);
      const haloR = r + ringW + (active ? 18 : (isCluster ? 16 : 12));
      const haloA = (active ? 0.42 : (isCluster ? 0.28 : 0.22)) * (0.55 + breath * 0.45);
      const haloG = ctx.createRadialGradient(x, y, r * 0.6, x, y, haloR);
      haloG.addColorStop(0, `rgba(${haloC},${haloA})`); haloG.addColorStop(1, `rgba(${haloC},0)`);
      ctx.fillStyle = haloG; ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r + ringW, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r + ringW, 0, Math.PI * 2);
      ctx.strokeStyle = active ? 'rgba(137,30,45,0.40)' : 'rgba(26,40,64,0.32)'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
      if (isCluster) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '600 11px Inter, sans-serif';            // brand body font
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(count), x, y + 0.5);
      }
    }

    // ═══════════════════════════════════════════════════
    //  INTERACTION
    // ═══════════════════════════════════════════════════
    const popup = byId('popup');
    const pinTooltip = byId('pinTooltip');
    const pinTooltipType = byId('pinTooltipType');
    const pinTooltipOut = byId('pinTooltipOutcome');
    let hoveredId = null;
    function shortOutcome(s) { const parts = String(s).trim().split(/\s+/); return parts[parts.length - 1]; }

    function showTooltip(cl) {
      if (isTouch() || !pinTooltip) return;
      if (popup.classList.contains('visible')) return;
      if (cl.cases.length > 1) { pinTooltipType.textContent = cl.cases.length + ' cases'; pinTooltipOut.textContent = cl.cases[0].city; pinTooltipOut.classList.add('is-meta'); }
      else { const c = cl.cases[0]; pinTooltipType.textContent = c.type; pinTooltipOut.textContent = shortOutcome(c.outcome); pinTooltipOut.classList.remove('is-meta'); }
      positionTooltip(cl); pinTooltip.classList.add('visible');
    }
    function hideTooltip() { if (pinTooltip) pinTooltip.classList.remove('visible'); hoveredId = null; }
    function positionTooltip(cl) {
      if (!pinTooltip) return;
      const wR = wrap.getBoundingClientRect(), cR = canvas.getBoundingClientRect();
      const sp = worldToScreen(cl.x, cl.y); const sx = cR.width / W, sy = cR.height / H;
      const pinX = sp.x * sx + (cR.left - wR.left), pinY = sp.y * sy + (cR.top - wR.top);
      const tw = pinTooltip.offsetWidth || 130, th = pinTooltip.offsetHeight || 30;
      let left = pinX - tw / 2, top = pinY - th - 18; const wW = wrap.offsetWidth;
      if (left < 6) left = 6; if (left + tw > wW - 6) left = wW - tw - 6; if (top < 6) top = pinY + 18;
      pinTooltip.style.left = left + 'px'; pinTooltip.style.top = top + 'px';
    }

    let dragging = false, dragStart = null, dragMoved = false, pinchStart = null, currentCluster = null;
    function canvasCoords(clientX, clientY) { const r = canvas.getBoundingClientRect(); return { x: (clientX - r.left) * (W / r.width), y: (clientY - r.top) * (H / r.height) }; }
    function findHit(worldX, worldY, hitR) {
      let hit = null, best = hitR;
      for (const cl of CLUSTERS) { const dx = cl.x - worldX, dy = cl.y - worldY, d = Math.sqrt(dx*dx + dy*dy); if (d < best) { best = d; hit = cl; } }
      return hit;
    }

    canvas.addEventListener('click', e => {
      if (dragMoved) return;
      const s = canvasCoords(e.clientX, e.clientY), w = screenToWorld(s.x, s.y);
      const hit = findHit(w.x, w.y, (isTouch() ? 28 : 24) / zoom);
      if (hit) { if (activeId === hit.id) closePopup(); else openCluster(hit); } else closePopup();
    });

    // Hover-to-open (510 globe behavior): hovering a pin opens its full popup and
    // marks it active (the pin enlarges + turns red). Leaving the pin closes after a
    // short delay; moving onto the popup cancels the close so it stays interactive.
    let hoverCloseTimer = null;
    function scheduleHoverClose() { clearTimeout(hoverCloseTimer); hoverCloseTimer = setTimeout(closePopup, 240); }
    function cancelHoverClose() { clearTimeout(hoverCloseTimer); hoverCloseTimer = null; }
    popup.addEventListener('mouseenter', cancelHoverClose);
    popup.addEventListener('mouseleave', scheduleHoverClose);

    if (!isTouch()) {
      canvas.addEventListener('mousemove', e => {
        if (dragging) return;
        const s = canvasCoords(e.clientX, e.clientY), w = screenToWorld(s.x, s.y);
        canvasMouseX = w.x; canvasMouseY = w.y;
        const hit = findHit(w.x, w.y, 24 / zoom);
        canvas.style.cursor = hit ? 'pointer' : (zoom > 1 ? 'grab' : 'default');
        if (hit) {
          cancelHoverClose();
          if (hit.id !== activeId) openCluster(hit);   // open full popup on hover
        } else if (activeId) {
          scheduleHoverClose();                          // moved off the pin — close shortly
        }
      });
      canvas.addEventListener('mouseleave', () => {
        canvasMouseX = -9999; canvasMouseY = -9999;
        if (activeId) scheduleHoverClose();
      });
    }

    canvas.addEventListener('mousedown', e => { dragStart = { x: e.clientX, y: e.clientY, panX, panY }; dragging = true; dragMoved = false; });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
      if (dragMoved && zoom > 1) {
        closePopup();
        const r = canvas.getBoundingClientRect();
        panX = dragStart.panX + dx * (W / r.width); panY = dragStart.panY + dy * (H / r.height);
        clampPan(); canvas.style.cursor = 'grabbing';
      }
    });
    window.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; if (dragMoved) setTimeout(() => { dragMoved = false; }, 60); canvas.style.cursor = zoom > 1 ? 'grab' : 'default'; });

    // Wheel zoom — ONLY with Ctrl/⌘ so normal page scroll passes through the hero.
    canvas.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault(); closePopup();
      const s = canvasCoords(e.clientX, e.clientY);
      const factor = e.deltaY < 0 ? 1.14 : 1 / 1.14;
      setZoomAt(zoom * factor, s.x, s.y);
    }, { passive: false });

    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        closePopup();
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStart = { dist: Math.sqrt(dx*dx + dy*dy), zoom, midX: (e.touches[0].clientX + e.touches[1].clientX) / 2, midY: (e.touches[0].clientY + e.touches[1].clientY) / 2, panX, panY };
      } else if (e.touches.length === 1) { dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX, panY }; dragging = true; dragMoved = false; }
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinchStart) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY, dist = Math.sqrt(dx*dx + dy*dy);
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStart.zoom * (dist / pinchStart.dist)));
        const s = canvasCoords(pinchStart.midX, pinchStart.midY), r = newZoom / pinchStart.zoom;
        panX = pinchStart.panX * r + (s.x - W/2) * (1 - r); panY = pinchStart.panY * r + (s.y - H/2) * (1 - r);
        zoom = newZoom; clampPan(); if (zoomResetBtn) zoomResetBtn.classList.toggle('visible', zoom > 1.01);
      } else if (e.touches.length === 1 && dragging && zoom > 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - dragStart.x, dy = e.touches[0].clientY - dragStart.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) { dragMoved = true; closePopup(); const r = canvas.getBoundingClientRect(); panX = dragStart.panX + dx * (W / r.width); panY = dragStart.panY + dy * (H / r.height); clampPan(); }
      }
    }, { passive: false });
    canvas.addEventListener('touchend', e => { if (e.touches.length < 2) pinchStart = null; if (e.touches.length === 0) { dragging = false; if (dragMoved) setTimeout(() => { dragMoved = false; }, 60); } });

    canvas.addEventListener('dblclick', e => { e.preventDefault(); resetView(); });
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', resetView);

    // ═══════════════════════════════════════════════════
    //  POPUP
    // ═══════════════════════════════════════════════════
    const popupBody = byId('popup-body');
    const SVG_LOC = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>';
    const SVG_ARROW = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
    const SVG_BACK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    function escHtml(s) { return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

    function openCluster(cl) {
      activeId = cl.id; hideTooltip();
      if (cl.cases.length === 1) { currentCluster = null; renderSingleCase(cl.cases[0]); }
      else { currentCluster = cl; renderClusterList(cl); }
      positionPopup(cl.x, cl.y); popup.classList.add('visible');
    }
    function renderSingleCase(c) {
      const fromCluster = currentCluster && currentCluster.cases.length > 1;
      const back = fromCluster ? `<button class="popup-back" onclick="window.__daMap.backToClusterList()">${SVG_BACK}<span>Back to all ${currentCluster.cases.length} cases</span></button>` : '';
      popupBody.innerHTML = back + `
        <div class="popup-head">
          <span class="popup-type">${escHtml(c.type)}</span>
          <button class="popup-close" onclick="window.__daMap.closePopup()" aria-label="Close">&times;</button>
        </div>
        <div class="popup-title">${escHtml(c.title)}</div>
        <div class="popup-location">${SVG_LOC}<span>${escHtml(c.city)}, ${escHtml(c.state)} &middot; ${c.year}</span></div>
        <div class="popup-outcome"><div class="check-mark">&check;</div><span>${escHtml(c.outcome)}</span></div>
        <div class="popup-summary">${escHtml(c.summary)}</div>
        <div class="popup-divider"></div>
        <a class="popup-link" href="${escHtml(c.slug)}"><span>Read full case</span>${SVG_ARROW}</a>`;
      setText('active-label', `${c.city}, ${c.state} · ${c.type}`);
    }
    function renderClusterList(cl) {
      const rows = cl.cases.map(c => `
        <div class="popup-cluster-row" onclick="window.__daMap.drillIntoCase(${c.id})">
          <div class="popup-cluster-row-head"><span class="popup-cluster-row-type">${escHtml(c.type)}</span><span class="popup-cluster-row-year">${c.year}</span></div>
          <div class="popup-cluster-row-title">${escHtml(c.title)}</div>
          <div class="popup-cluster-row-outcome"><span class="check-mark">&check;</span><span>${escHtml(c.outcome)}</span></div>
        </div>`).join('');
      popupBody.innerHTML = `
        <div class="popup-head">
          <div class="popup-cluster-meta"><span class="popup-type popup-type-cluster">${cl.cases.length} cases</span><div class="popup-cluster-location">${escHtml(cl.cases[0].city)}, ${escHtml(cl.cases[0].state)}</div></div>
          <button class="popup-close" onclick="window.__daMap.closePopup()" aria-label="Close">&times;</button>
        </div>
        <div class="popup-cluster-hint">Tap any case to view full details</div>
        <div class="popup-cluster-list">${rows}</div>`;
      setText('active-label', `${cl.cases[0].city}, ${cl.cases[0].state} · ${cl.cases.length} cases`);
    }
    function drillIntoCase(caseId) { const c = CASES.find(cc => cc.id === caseId); if (!c) return; renderSingleCase(c); if (currentCluster) positionPopup(currentCluster.x, currentCluster.y); }
    function backToClusterList() { if (!currentCluster) return; renderClusterList(currentCluster); positionPopup(currentCluster.x, currentCluster.y); }
    function positionPopup(worldX, worldY) {
      if (isMobile() || worldX == null) return;
      const wR = wrap.getBoundingClientRect(), cR = canvas.getBoundingClientRect();
      const sp = worldToScreen(worldX, worldY); const sx = cR.width / W, sy = cR.height / H;
      const pinX = sp.x * sx + (cR.left - wR.left), pinY = sp.y * sy + (cR.top - wR.top);
      const pw = popup.offsetWidth || 290; popup.style.opacity = '0';
      const ph = popup.offsetHeight || 240;
      let left = pinX - pw / 2, top = pinY - ph - 22; const wW = wrap.offsetWidth;
      if (left < 6) left = 6; if (left + pw > wW - 6) left = wW - pw - 6; if (top < 6) top = pinY + 22;
      popup.style.left = left + 'px'; popup.style.top = top + 'px'; popup.style.opacity = '';
    }
    function closePopup() {
      popup.classList.remove('visible'); activeId = null; currentCluster = null;
      setText('active-label', isTouch() ? 'Tap a pin to view case details' : 'Select a pin to view case details');
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (zoom > 1) resetView(); else closePopup(); } });

    // Expose handlers for inline onclick (namespaced — no globals leaked beyond __daMap)
    window.__daMap = { closePopup, drillIntoCase, backToClusterList };

    // ═══════════════════════════════════════════════════
    //  BOOT
    // ═══════════════════════════════════════════════════
    (async function boot() {
      try {
        const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
        const allStates = topojson.feature(us, us.objects.states);
        topoStates = { type: 'FeatureCollection', features: allStates.features.filter(f => f.id !== '02' && f.id !== '15') };
        topoNation = topojson.merge(us, us.objects.states.geometries.filter(g => g.id !== '02' && g.id !== '15'));
        resize(); buildProjection(); buildDots(); reprojectCases(); buildClusters();
        let resizeTimer;
        window.addEventListener('resize', () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => { resize(); buildProjection(); buildDots(); reprojectCases(); buildClusters(); clampPan(); }, 120);
        });
        const msg = byId('loading-msg'); if (msg) { msg.style.opacity = '0'; setTimeout(() => msg.style.display = 'none', 400); }
        setText('active-label', isTouch() ? 'Tap a pin to view case details' : 'Select a pin to view case details');
        if (animId) cancelAnimationFrame(animId);
        draw();
      } catch (err) {
        console.error('Case map load error:', err);
        const msg = byId('loading-msg'); if (msg) msg.textContent = 'Map unavailable — check connection.';
      }
    })();
  }

  function boot() {
    if (!document.querySelector('.case-map')) return; // page has no map — bail
    ensureDeps().then(init).catch(function (err) {
      console.error('Case map deps failed:', err);
      var msg = document.getElementById('loading-msg'); if (msg) msg.textContent = 'Map unavailable — check connection.';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
