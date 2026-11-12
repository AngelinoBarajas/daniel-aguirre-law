/* ============================================================
   Daniel Aguirre Law — Case Results Map (homepage hero)
   Ported from hero-mockup.html. Orthographic projection, dotted CONUS territory,
   case pins w/ clusters, hover-to-open glass popups, case-type filter chips, zoom/pan/parallax.

   Loading model (2026-06-05): GitHub-hosted engine, loaded by the HOMEPAGE page-code.
     - This file is RAW JS (NO <script> tags) — jsDelivr serves it from GitHub
       (AngelinoBarajas/daniel-aguirre-law), pinned @<sha>.
     - The homepage loads it with ONE tag in Page Settings -> Before </body>:
         <script src="https://cdn.jsdelivr.net/gh/AngelinoBarajas/daniel-aguirre-law@<sha>/case-results-map.js"></script>
     - Pairs with case-results-map.css — pasted inline (<style>) in Homepage -> Inside <head>.
     - Self-loads its deps (D3 v7 + topojson-client v3) from jsDelivr if absent.
     - Self-boots on DOM ready: boot() finds #mapCanvas, then ensureDeps() -> init().
     - Runtime fetch: us-atlas@3 states-10m.json (CDN, ~114KB). The dot-grid inside-test
       rasterizes the nation once and reads pixels (~7ms) instead of ~22k d3.geoContains.
   Update: edit -> push to GitHub -> new @<sha> -> bump the SHA in the homepage <script src> tag.

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
    // Words by page language (2026-11-03). Webflow sets <html lang="es"> on /es pages.
    // TYPES_ES maps the English case type (the filter key, kept in data-type and the CMS) to the
    // label shown on Spanish pages, so filters keep matching while visitors read Spanish.
    var ES = (document.documentElement.lang || '').toLowerCase().indexOf('es') === 0;
    var TX = ES ? {
      read: 'Ver el caso completo', back: function (n) { return 'Volver a los ' + n + ' casos'; },
      cases: function (n) { return n + ' casos'; }, hint: 'Toque un caso para ver los detalles',
      close: 'Cerrar', down: 'El mapa no está disponible. Revise su conexión.'
    } : {
      read: 'Read full case', back: function (n) { return 'Back to all ' + n + ' cases'; },
      cases: function (n) { return n + ' cases'; }, hint: 'Tap any case to view full details',
      close: 'Close', down: 'Map unavailable — check connection.'
    };
    var TYPES_ES = { 'Asylum': 'Asilo', 'Family-Based': 'Familiar', 'Removal Defense': 'Defensa contra la Deportación',
      'Work Visa': 'Visa de Trabajo', 'Work Authorization': 'Permiso de Trabajo', 'Employment-Based': 'Por Empleo', 'Humanitarian': 'Humanitario',
      'Green Cards & Citizenship': 'Green Card y Ciudadanía' };
    function typeLabel(t) { return (ES && TYPES_ES[t]) || t; }
    // No "Loading map…" text — the map zooms + fades in on its own (entrance animation in draw()).
    setText('loadingMsg', ''); setText('loading-msg', '');

    // ── Case data (CMS-ready) ──────────────────────────────
    // Fallback for pages WITHOUT a CMS source list (/old-home, /reviews as of 2026-11-12).
    // The 15 REAL matters Daniel submitted 2026-11-05 (review #1), same text as the Case Results CMS.
    // Keep in step with the CMS until those pages get their own hidden source list, then empty it.
    var INLINE_CASES = [
      { id:0, lat:33.94, lng:-84.21, type:"Work Authorization", city:"Norcross", state:"GA", year:2026, slug:"#",
        title:"Employment Authorization — Form I-765", outcome:"Work Permit Approved",
        summary:"Our firm successfully assisted a client in obtaining approval of Form I-765, Application for Employment Authorization, allowing the client to obtain authorization to work legally in the United States.",
        es:{ title:"Permiso de Trabajo — Formulario I-765", outcome:"Permiso de Trabajo Aprobado",
          summary:"Nuestra firma ayudó con éxito a un cliente a obtener la aprobación del Formulario I-765, Solicitud de Autorización de Empleo, lo que le permitió obtener autorización para trabajar legalmente en los Estados Unidos." } },
      { id:1, lat:29.62, lng:-95.54, type:"Family-Based", city:"Missouri City", state:"TX", year:2026, slug:"#",
        title:"Removal of Conditions — Form I-751", outcome:"Conditions Removed",
        summary:"Our firm successfully assisted a married couple in obtaining approval of Form I-751, Petition to Remove Conditions on Residence, allowing the beneficiary to secure permanent resident status without conditions.",
        es:{ title:"Eliminación de Condiciones — Formulario I-751", outcome:"Condiciones Eliminadas",
          summary:"Nuestra firma ayudó con éxito a un matrimonio a obtener la aprobación del Formulario I-751, Petición para Eliminar las Condiciones de Residencia, lo que permitió al beneficiario asegurar su residencia permanente sin condiciones." } },
      { id:2, lat:38.96, lng:-77.36, type:"Family-Based", city:"Reston", state:"VA", year:2026, slug:"#",
        title:"Removal of Conditions — Form I-751", outcome:"Conditions Removed",
        summary:"Our firm successfully assisted a married couple in obtaining approval of Form I-751, Petition to Remove Conditions on Residence, allowing the beneficiary to become a lawful permanent resident without conditions.",
        es:{ title:"Eliminación de Condiciones — Formulario I-751", outcome:"Condiciones Eliminadas",
          summary:"Nuestra firma ayudó con éxito a un matrimonio a obtener la aprobación del Formulario I-751, Petición para Eliminar las Condiciones de Residencia, lo que permitió al beneficiario convertirse en residente permanente legal sin condiciones." } },
      { id:3, lat:40.26, lng:-74.27, type:"Family-Based", city:"Freehold", state:"NJ", year:2026, slug:"#",
        title:"Provisional Unlawful Presence Waiver — Form I-601A", outcome:"Waiver Approved",
        summary:"Our firm successfully obtained approval of an I-601A provisional unlawful presence waiver in March 2026, allowing the client to move forward with immigrant visa processing through the National Visa Center and prepare for a consular interview in Ciudad Juárez, Mexico.",
        es:{ title:"Perdón Provisional por Presencia Ilegal — Formulario I-601A", outcome:"Perdón Aprobado",
          summary:"Nuestra firma obtuvo con éxito la aprobación de un perdón provisional por presencia ilegal (I-601A) en marzo de 2026, lo que permitió al cliente avanzar con el trámite de su visa de inmigrante a través del Centro Nacional de Visas (NVC) y prepararse para su entrevista consular en Ciudad Juárez, México." } },
      { id:4, lat:41.46, lng:-72.82, type:"Family-Based", city:"Wallingford", state:"CT", year:2026, slug:"#",
        title:"Adjustment of Status After Military Parole", outcome:"Green Card Granted",
        summary:"Our firm successfully assisted a client in obtaining lawful permanent residence through adjustment of status following military parole. The client's green card was approved in April 2026, marking a significant milestone for the family.",
        es:{ title:"Ajuste de Estatus tras un Parole Militar", outcome:"Green Card Otorgada",
          summary:"Nuestra firma ayudó con éxito a un cliente a obtener la residencia permanente legal mediante el ajuste de estatus tras un parole militar. La green card del cliente fue aprobada en abril de 2026, un logro importante para la familia." } },
      { id:5, lat:41.76, lng:-72.69, type:"Removal Defense", city:"Hartford", state:"CT", year:2026, slug:"#",
        title:"Removal Proceedings — Hartford Immigration Court", outcome:"Proceedings Terminated",
        summary:"Our firm successfully defended a client facing deportation proceedings before the Immigration Court in Hartford, Connecticut. Through effective legal representation and advocacy, we secured a favorable outcome that prevented the client's deportation.",
        es:{ title:"Proceso de Deportación — Corte de Inmigración de Hartford", outcome:"Proceso Terminado",
          summary:"Nuestra firma defendió con éxito a un cliente que enfrentaba un proceso de deportación ante la Corte de Inmigración de Hartford, Connecticut. Gracias a una representación legal eficaz, logramos un resultado favorable que evitó la deportación del cliente." } },
      { id:6, lat:41.18, lng:-73.13, type:"Green Cards & Citizenship", city:"Stratford", state:"CT", year:2026, slug:"#",
        title:"Naturalization — Form N-400", outcome:"Naturalization Approved",
        summary:"Our firm assisted a client with the naturalization process through Form N-400, Application for Naturalization, helping the client pursue the goal of becoming a United States citizen.",
        es:{ title:"Naturalización — Formulario N-400", outcome:"Naturalización Aprobada",
          summary:"Nuestra firma ayudó a un cliente con el proceso de naturalización mediante el Formulario N-400, Solicitud de Naturalización, para alcanzar su meta de convertirse en ciudadano de los Estados Unidos." } },
      { id:7, lat:34.05, lng:-118.24, type:"Green Cards & Citizenship", city:"Los Angeles", state:"CA", year:2026, slug:"#",
        title:"Naturalization — Form N-400", outcome:"Naturalization Approved",
        summary:"Our firm assisted a lawful permanent resident with Form N-400, Application for Naturalization, helping the client obtain United States citizenship.",
        es:{ title:"Naturalización — Formulario N-400", outcome:"Naturalización Aprobada",
          summary:"Nuestra firma ayudó a un residente permanente legal con el Formulario N-400, Solicitud de Naturalización, y el cliente obtuvo la ciudadanía estadounidense." } },
      { id:8, lat:41.62, lng:-72.75, type:"Humanitarian", city:"Berlin", state:"CT", year:2026, slug:"#",
        title:"VAWA Self-Petition", outcome:"VAWA Approved",
        summary:"Our firm assisted a client pursuing lawful permanent residence through the Violence Against Women Act (VAWA), based on a qualifying marriage to a U.S. citizen. Our representation focused on helping the client navigate the immigration process independently and pursue a more secure future.",
        es:{ title:"Autopetición VAWA", outcome:"VAWA Aprobada",
          summary:"Nuestra firma ayudó a un cliente a tramitar la residencia permanente legal mediante la Ley de Violencia contra la Mujer (VAWA), con base en su matrimonio con un ciudadano estadounidense. Nuestra representación se enfocó en ayudar al cliente a avanzar en su proceso migratorio de manera independiente y construir un futuro más seguro." } },
      { id:9, lat:28.29, lng:-81.41, type:"Green Cards & Citizenship", city:"Kissimmee", state:"FL", year:2025, slug:"#",
        title:"Green Card Renewal — Form I-90", outcome:"Green Card Renewed",
        summary:"Our firm assisted a lawful permanent resident with Form I-90, Application to Replace Permanent Resident Card, to renew their green card and maintain current evidence of their permanent resident status.",
        es:{ title:"Renovación de Green Card — Formulario I-90", outcome:"Green Card Renovada",
          summary:"Nuestra firma ayudó a un residente permanente legal con el Formulario I-90, Solicitud para Reemplazar la Tarjeta de Residente Permanente, para renovar su green card y mantener vigente la prueba de su estatus de residente permanente." } },
      { id:10, lat:40.17, lng:-80.25, type:"Work Authorization", city:"Washington", state:"PA", year:2025, slug:"#",
        title:"Employment Authorization — Section 245(i) Adjustment", outcome:"Work Permit Approved",
        summary:"Our firm successfully assisted a client pursuing adjustment of status under Section 245(i) with obtaining employment authorization, allowing the client to work legally in the United States while their immigration process continued.",
        es:{ title:"Permiso de Trabajo — Ajuste bajo la Sección 245(i)", outcome:"Permiso de Trabajo Aprobado",
          summary:"Nuestra firma ayudó con éxito a un cliente que tramitaba el ajuste de estatus bajo la Sección 245(i) a obtener su permiso de trabajo, lo que le permitió trabajar legalmente en los Estados Unidos mientras continuaba su proceso migratorio." } },
      { id:11, lat:41.98, lng:-72.59, type:"Family-Based", city:"Enfield", state:"CT", year:2025, slug:"#",
        title:"Family-Based Petitions — Two Children Abroad", outcome:"Petitions Approved",
        summary:"Our firm successfully assisted a lawful permanent resident in obtaining approval of family-based immigrant visa petitions for two children residing in Syria. The approvals allowed the family to advance to consular processing, bringing them one step closer to reunification in the United States.",
        es:{ title:"Peticiones Familiares — Dos Hijos en el Extranjero", outcome:"Peticiones Aprobadas",
          summary:"Nuestra firma ayudó con éxito a un residente permanente legal a obtener la aprobación de peticiones familiares de visa de inmigrante para sus dos hijos que residen en Siria. Las aprobaciones permitieron que la familia avanzara al proceso consular, un paso más cerca de reunirse en los Estados Unidos." } },
      { id:12, lat:31.03, lng:-96.12, type:"Family-Based", city:"Normangee", state:"TX", year:2025, slug:"#",
        title:"K-1 Fiancé Visa", outcome:"K-1 Visa Approved",
        summary:"Our firm successfully assisted a couple in obtaining a K-1 fiancé visa, allowing the foreign national fiancé to enter the United States and marry their U.S. citizen partner. Following their marriage, our office prepared and filed the adjustment of status application.",
        es:{ title:"Visa K-1 de Prometido", outcome:"Visa K-1 Aprobada",
          summary:"Nuestra firma ayudó con éxito a una pareja a obtener una visa K-1 de prometido, lo que permitió al prometido extranjero entrar a los Estados Unidos y casarse con su pareja ciudadana estadounidense. Después de la boda, nuestra oficina preparó y presentó la solicitud de ajuste de estatus." } },
      { id:13, lat:41.50, lng:-72.90, type:"Work Authorization", city:"Cheshire", state:"CT", year:2024, slug:"#",
        title:"Advance Parole — Travel Authorization", outcome:"Advance Parole Approved",
        summary:"Our firm successfully assisted a client in obtaining approval of Advance Parole, allowing the client to travel internationally for an authorized purpose and seek reentry into the United States while maintaining their immigration process.",
        es:{ title:"Advance Parole — Permiso de Viaje", outcome:"Advance Parole Aprobado",
          summary:"Nuestra firma ayudó con éxito a un cliente a obtener la aprobación de un Advance Parole, lo que le permitió viajar al extranjero por un motivo autorizado y solicitar su reingreso a los Estados Unidos sin afectar su proceso migratorio." } },
      { id:14, lat:41.39, lng:-73.45, type:"Asylum", city:"Danbury", state:"CT", year:2023, slug:"#",
        title:"Asylum — Protection from Deportation", outcome:"Asylum Granted",
        summary:"Our firm successfully represented a client in an asylum case, securing approval in 2023. This favorable outcome granted the client protection from deportation and the opportunity to build a safer, more stable future in the United States.",
        es:{ title:"Asilo — Protección contra la Deportación", outcome:"Asilo Otorgado",
          summary:"Nuestra firma representó con éxito a un cliente en un caso de asilo y obtuvo la aprobación en 2023. Este resultado favorable le otorgó al cliente protección contra la deportación y la oportunidad de construir un futuro más seguro y estable en los Estados Unidos." } }
    ].map(function (c) {
      if (ES && c.es) { c.title = c.es.title; c.outcome = c.es.outcome; c.summary = c.es.summary; }
      return c;
    });
    // CMS source (wired 2026-09-18). A hidden Collection List renders one
    // .case-map_item per case inside a .case-map_source / .case-map_source-cms div.
    // TWO shapes are supported, because the Webflow MCP can bind CMS values to an
    // element's TEXT but NOT to an attribute's value:
    //   a) data-* attributes on the item itself      (hand-authored / original shape)
    //   b) child elements carrying data-field="<key>" (CMS-bound text, the live shape)
    // Attributes win when both are present. Falls back to INLINE_CASES if the list is
    // absent or yields nothing usable, so the map never renders empty.
    function readField(el, data, key) {
      var v = data[key];
      if (v != null && v !== '') return String(v).trim();
      var node = el.querySelector('[data-field="' + key + '"]');
      return node ? node.textContent.trim() : '';
    }
    function getCases() {
      var src = document.querySelectorAll('[class*="case-map_source"] .case-map_item');
      if (!src.length) return INLINE_CASES;
      var out = [];
      for (var i = 0; i < src.length; i++) {
        var el = src[i], d = el.dataset;
        var lat = parseFloat(readField(el, d, 'lat'));
        var lng = parseFloat(readField(el, d, 'lng'));
        // A case with no usable coordinates cannot be plotted. Skip it rather than
        // letting NaN reach the projection, which silently drops the pin anyway.
        if (!isFinite(lat) || !isFinite(lng)) continue;
        out.push({
          id: out.length, lat: lat, lng: lng,
          title: readField(el, d, 'title'), type: readField(el, d, 'type'),
          city: readField(el, d, 'city'), state: readField(el, d, 'state'),
          outcome: readField(el, d, 'outcome'), year: readField(el, d, 'year'),
          summary: readField(el, d, 'summary'), slug: readField(el, d, 'slug') || '#'
        });
      }
      return out.length ? out : INLINE_CASES;
    }
    var CASES = getCases();

    setText('metricCases', CASES.length);
    setText('metricStates', new Set(CASES.map(function (c) { return c.state; })).size);

    // ── Canvas + sizing ────────────────────────────────────
    // alpha:false — draw() always lays down an opaque cream base, so the alpha channel was
    // dead weight in the compositor. Must stay paired with that opaque fill.
    var ctx = canvas.getContext('2d', { alpha: false });
    var zoomResetBtn = byId('zoomReset');
    var isMobile = function () { return window.matchMedia('(max-width: 991px)').matches; };
    var isTouch  = function () { return window.matchMedia('(hover: none)').matches; };
    var W, H, dpr;
    // Cap the backing store. Uncapped, a 3x phone allocated 3840x2478 = 9.5M pixels and every
    // full-canvas fill paid for all of them. This is a decorative map of dots and hairlines —
    // nobody can see the difference between 2x and 3x here, and it is a ~2.25x pixel saving.
    var MAX_DPR_DESKTOP = 2, MAX_DPR_MOBILE = 1.5;
    function resize() {
      var DPR = window.devicePixelRatio || 1;
      dpr = Math.min(DPR, isMobile() ? MAX_DPR_MOBILE : MAX_DPR_DESKTOP);
      // 2026-10-09: snap the CSS size to WHOLE DEVICE PIXELS. At 150% scaling a 1275px wrapper is
      // 1912.5 device px; the backing store truncated to 1912 and the last half pixel blended with
      // the alpha:false canvas's black default - a thin dark line down the right edge on 4K screens.
      // 2026-10-11: the snap also has to hold on the BACKING STORE grid. Phones cap dpr at 1.5 while
      // the screen is 3x, so H*dpr could land on .5, Math.round added a row the fill only half
      // covered, and that row read as a dark bar under the map. Snap to the coarser grid (dpr), and
      // every base fill below now runs 1px past each edge as a second guard.
      var snap = Math.min(DPR, dpr);
      W = Math.floor(wrap.clientWidth * snap) / snap; H = Math.floor(wrap.clientHeight * snap) / snap;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // ── Parallax ──
    var mouseX = 0.5, mouseY = 0.5, pX = 0, pY = 0;
    // PAR = 0 → parallax disabled (2026-07-15): the map is LOCKED in place, so it no longer
    // drifts with the cursor. Restore the gentle mouse-follow by setting PAR back to 8.
    var PAR = 0, SMOOTH = 0.055;
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
      // LOCKED whole-US view (2026-07-15). The map no longer zooms/pans, so it's framed once
      // to show the ENTIRE country + every pin inside the component box. Plain fitExtent with an
      // even margin is the textbook fit: it maxes the scale that still fits the whole nation and
      // centres it (width is the binding constraint at this 1.63 box, so there's a little slack
      // top/bottom — that's the correct, uncropped full-US framing).
      // Replaces the old overscan (ox/oy negative margins) + MAP_FILL 1.28 + centroid recentre,
      // which deliberately oversized the map so coasts bled off-canvas behind the CSS edge fade.
      projection = d3.geoOrthographic().rotate([96, -38]).clipAngle(90).precision(0.4);
      // With CONUS-only geometry (territories removed), the continental US projects at aspect ~1.56,
      // so it nearly fills BOTH axes of the matched box (aspect 1.55 in case-results-map.css) — both
      // bind, unlike before. Small even pad (~3%) → CONUS fills ~91% × 91% of the frame, centred.
      // Bigger pad = smaller map / more breathing room.
      var padX = W * 0.03, padY = H * 0.03;
      projection.fitExtent([[padX, padY], [W - padX, H - padY]], topoNation);
      geoPath = d3.geoPath().projection(projection).context(ctx);
    }

    // ── Static layer cache (2026-09-18 perf) ────────────────────────────────
    // The map has been LOCKED since 2026-07-15 — no zoom, no pan, PAR = 0 — so once the entrance
    // settles (escale hits exactly 1) the transform is the identity and two whole layers are
    // pixel-identical on every single frame:
    //   bgLayer      the cream fill + its centre radial gradient
    //   outlineLayer all 49 CONUS state outlines
    // Re-tessellating states-10m through geoPath 60 times a second, plus allocating a fresh
    // gradient object each frame, was the single largest cost in the loop. Bake both once and
    // blit them. Same trick buildDots() already uses for the inside-test.
    // Rebuilt whenever the projection is (boot + debounced resize).
    var bgLayer = null, outlineLayer = null;
    function buildStaticLayers() {
      var bw = Math.max(1, Math.round(W * dpr)), bh = Math.max(1, Math.round(H * dpr));

      bgLayer = document.createElement('canvas');
      bgLayer.width = bw; bgLayer.height = bh;
      var bctx = bgLayer.getContext('2d', { alpha: false });
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.fillStyle = '#FCF6EC'; bctx.fillRect(-1, -1, W + 2, H + 2);
      var g = bctx.createRadialGradient(W * 0.5, H * 0.50, 0, W * 0.5, H * 0.50, W * 0.55);
      g.addColorStop(0, 'rgba(245,237,217,0.65)'); g.addColorStop(0.6, 'rgba(245,237,217,0.20)'); g.addColorStop(1, 'rgba(252,246,236,0)');
      bctx.fillStyle = g; bctx.fillRect(-1, -1, W + 2, H + 2);

      // Kept transparent and blitted AFTER the dots, so the stacking order is unchanged.
      outlineLayer = document.createElement('canvas');
      outlineLayer.width = bw; outlineLayer.height = bh;
      var lctx = outlineLayer.getContext('2d');
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var lpath = d3.geoPath().projection(projection).context(lctx);
      lctx.strokeStyle = 'rgba(168,139,92,0.38)'; lctx.lineWidth = 0.5;
      topoStates.features.forEach(function (f) { lctx.beginPath(); lpath(f); lctx.stroke(); });
    }
    function buildDots() {
      dots = [];
      // Dot density — bigger steps = fewer dots = faster render. Tune to taste.
      // The dots are texture, not information, so mobile takes a coarser grid: ~5,000 dots
      // becomes ~2,500, and each one costs a beginPath/arc/fill every animated frame.
      var COARSE = isMobile();
      var latStep = COARSE ? 0.42 : 0.30, lngStep = COARSE ? 0.58 : 0.42;
      var minLat = 24.4, maxLat = 49.6, minLng = -125.0, maxLng = -66.8;

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
      // Entrance sweep order: west→east by projected x (delay01 = 0 at the left edge → 1 at the
      // right), plus a little per-dot jitter so the leading edge of the populate wave isn't a
      // razor-straight vertical line. Consumed by the DOT_* window in draw().
      var xMin = Infinity, xMax = -Infinity;
      for (var a = 0; a < dots.length; a++) { var dx0 = dots[a].pt ? dots[a].pt[0] : 0; if (dx0 < xMin) xMin = dx0; if (dx0 > xMax) xMax = dx0; }
      var xRange = (xMax - xMin) || 1;
      for (var b = 0; b < dots.length; b++) {
        var base = dots[b].pt ? (dots[b].pt[0] - xMin) / xRange : 0;
        dots[b].delay01 = clamp01(base + (Math.random() - 0.5) * 0.10);
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
      // Pins pop in west→east too (delay01 by cluster x), so the finale flows with the dot sweep.
      var pxMin = Infinity, pxMax = -Infinity;
      for (var q = 0; q < CLUSTERS.length; q++) { var cxv = CLUSTERS[q].x; if (cxv < pxMin) pxMin = cxv; if (cxv > pxMax) pxMax = cxv; }
      var pxRange = (pxMax - pxMin) || 1;
      for (var w = 0; w < CLUSTERS.length; w++) { CLUSTERS[w].delay01 = clamp01((CLUSTERS[w].x - pxMin) / pxRange); }
    }
    function curvatureScale(x, y) { var cx = W*0.5, cy = H*0.5, Rx = W*0.62, Ry = H*0.85, nx = (x-cx)/Rx, ny = (y-cy)/Ry, d2 = nx*nx+ny*ny; if (d2 >= 1) return 0.78; return 0.78 + 0.22 * Math.sqrt(1 - d2); }

    // ── Render ──
    var tick = 0, animId = null, activeId = null, animStart = 0, mapPaused = false;

    // ── Idle stop (2026-09-18 perf) ─────────────────────────────────────────
    // Before this, the loop ran forever at 60fps whenever the map was on screen — ~5,000 dot
    // arcs + 49 re-tessellated state outlines per frame — competing with Lenis for the main
    // thread exactly while someone scrolled past. The IntersectionObserver only ever covered
    // the NOT-visible case, which is not the one that hurt.
    //
    // Nothing on this map moves on its own once the entrance finishes: the ambient dot and pin
    // breathing only reads as motion when a person is actually looking at it. So the loop now
    // runs while the entrance plays, while the pointer is over the canvas, or while a popup is
    // open — and otherwise stops dead. Scrolling past therefore costs zero frames, which is why
    // no separate scroll-pause hook was needed.
    var pointerOver = false;
    var EN_TOTAL;   // assigned below, once EN exists
    function isAnimating() {
      if (!animStart) return true;                     // first frame not drawn yet
      // prefers-reduced-motion now means what it says. The old loop still ran the ambient
      // breathing forever under it — it only skipped the entrance. Now it paints one frame per
      // state change (filter, active pin) and is otherwise completely still.
      if (REDUCE_MOTION) return false;
      var el = ((window.performance && performance.now) ? performance.now() : Date.now()) - animStart;
      if (el < EN_TOTAL) return true;                  // entrance still playing
      return pointerOver || activeId !== null;
    }
    // Single entry point for waking the loop. Safe to call from any handler, any number of
    // times — it no-ops if a frame is already queued or the map is scrolled out of view.
    function requestDraw() { if (!animId && !mapPaused) animId = requestAnimationFrame(draw); }

    // ── Cinematic entrance (one-shot on first render) ───────────────────────
    // Three beats: (1) the whole map pushes in (escale) while the state outlines
    // fade up — structure first; (2) the dots POPULATE in a staggered west→east
    // sweep, each with a small pop; (3) the case pins pop in as the finale.
    // Per-element timing is keyed off `elapsed` (ms since first frame). All windows
    // clamp to their final state, so after ~1.7s it's a normal static render forever.
    // Honors prefers-reduced-motion → everything snaps to final, no motion.
    var REDUCE_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var EN = {
      MAP_DUR:   700,                          // whole-group push-in (escale) settle
      OUT_START: 100, OUT_DUR: 520,            // state outlines fade (the structural first beat)
      DOT_START: 240, DOT_SWEEP: 600, DOT_DUR: 360,  // dots: start + x-spread window + each dot's own fade/pop
      PIN_START: 820, PIN_SWEEP: 400, PIN_DUR: 440   // pins: start + x-spread window + each pin's own pop
    };
    EN_TOTAL = EN.PIN_START + EN.PIN_SWEEP + EN.PIN_DUR;   // 1660ms — the last pin has landed
    function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
    function easeOutCubic(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }
    // easeOutBack overshoots just past 1 then settles exactly to 1 → the "pop".
    function easeOutBack(t) { t = clamp01(t); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

    function draw() {
      animId = null;
      // Entrance timing — see the EN config + easing helpers above. `elapsed` = ms since the first
      // frame; REDUCE_MOTION jumps it far past the end so everything renders in its final state.
      var nowT = (window.performance && performance.now) ? performance.now() : Date.now();
      if (!animStart) animStart = nowT;
      var elapsed = REDUCE_MOTION ? 1e9 : (nowT - animStart);
      // tick drives the ambient spotlight/pin breathing. It used to be `tick += 0.016`, which
      // assumed a locked 60fps and made the animation speed frame-rate dependent — and would
      // now also stall whenever the idle stop paused the loop. Absolute seconds instead.
      tick = nowT / 1000;
      var entranceDone = elapsed >= EN_TOTAL;
      var escale = 0.94 + 0.06 * easeOutCubic(elapsed / EN.MAP_DUR);   // quick, subtle push-in for depth
      var outlineEase = easeOutCubic((elapsed - EN.OUT_START) / EN.OUT_DUR);
      if (canvasMouseX !== -9999) { if (canvasMouseSmoothX === -9999) { canvasMouseSmoothX = canvasMouseX; canvasMouseSmoothY = canvasMouseY; } else { canvasMouseSmoothX += (canvasMouseX - canvasMouseSmoothX) * CURSOR_LERP; canvasMouseSmoothY += (canvasMouseY - canvasMouseSmoothY) * CURSOR_LERP; } }
      else { canvasMouseSmoothX = -9999; canvasMouseSmoothY = -9999; }
      if (zoom <= 1.01 && panX === 0 && panY === 0) { pX += (((mouseX - 0.5) * PAR) - pX) * SMOOTH; pY += (((mouseY - 0.5) * PAR) - pY) * SMOOTH; } else { pX *= 0.9; pY *= 0.9; }

      // Post-entrance the gradient's centre no longer moves (PAR = 0), so the baked layer is
      // exact. During the entrance it is still drawn live — that path runs for ~1.7s, once.
      if (entranceDone && bgLayer) {
        ctx.drawImage(bgLayer, 0, 0, W, H);
      } else {
        ctx.fillStyle = '#FCF6EC'; ctx.fillRect(-1, -1, W + 2, H + 2);
        var cg = ctx.createRadialGradient(W*0.5+pX*0.12, H*0.50+pY*0.12, 0, W*0.5, H*0.50, W*0.55);
        cg.addColorStop(0, 'rgba(245,237,217,0.65)'); cg.addColorStop(0.6, 'rgba(245,237,217,0.20)'); cg.addColorStop(1, 'rgba(252,246,236,0)');
        ctx.fillStyle = cg; ctx.fillRect(-1, -1, W + 2, H + 2);
      }

      ctx.save();
      ctx.translate(W/2 + panX + pX, H/2 + panY + pY); ctx.scale(zoom * escale, zoom * escale); ctx.translate(-W/2, -H/2);

      // ── Beat 2: dotted territory populates in a staggered west→east sweep ──
      // Each dot gates on its own window (DOT_START + delay01*DOT_SWEEP); dOn fades it in,
      // dPop gives it a small overshoot pop as it lands.
      var BASE_R = 0.85, BASE_A = 0.32;
      for (var k = 0; k < dots.length; k++) {
        var d = dots[k]; d.phase += d.spd; d.slowPhase += d.slowSpd;
        var pt = d.pt; if (!pt) continue;   // precomputed in buildDots (no per-frame projection)
        var dT = (elapsed - (EN.DOT_START + d.delay01 * EN.DOT_SWEEP)) / EN.DOT_DUR;
        var dOn = easeOutCubic(dT); if (dOn <= 0) continue;   // not yet populated → skip drawing
        var dPop = easeOutBack(dT);
        var prox = 0, cdx = pt[0] - canvasMouseSmoothX, cdy = pt[1] - canvasMouseSmoothY, cd2 = cdx*cdx + cdy*cdy;
        if (cd2 < PROX_R_SQ) { var u = 1 - Math.sqrt(cd2) / PROX_R; prox = u * u * (3 - 2 * u); }
        var pulse = 0.5 + 0.5 * Math.sin(d.phase), slowMod = 0.78 + 0.22 * Math.sin(d.slowPhase), cs = curvatureScale(pt[0], pt[1]);
        var r = BASE_R * cs * ((0.85 + pulse * 0.30) * (1 + prox * 0.35)) * (W / 950) * dPop;
        var alpha = Math.min(0.72, BASE_A * cs * ((0.78 + pulse * 0.22) * slowMod * (1 + prox * 0.85))) * dOn;
        ctx.beginPath(); ctx.arc(pt[0], pt[1], r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(105,80,32,' + alpha + ')'; ctx.fill();
      }
      // ── Beat 1: state outlines fade up first (structure before the dots fill in) ──
      // Once settled this is a single blit of outlineLayer instead of 49 geoPath tessellations
      // of states-10m geometry per frame. The transform is the identity by then (zoom 1, pan 0,
      // PAR 0, escale exactly 1), so drawing it in screen space is pixel-exact.
      if (entranceDone && outlineLayer) {
        ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.drawImage(outlineLayer, 0, 0, W, H);
        ctx.restore();
      } else {
        ctx.globalAlpha = clamp01(outlineEase);
        ctx.strokeStyle = 'rgba(168,139,92,0.38)'; ctx.lineWidth = 0.5 / zoom;
        topoStates.features.forEach(function (f) { ctx.beginPath(); geoPath(f); ctx.stroke(); });
        ctx.globalAlpha = 1.0;
      }

      // ── Beat 3: spotlights + pins pop in last, staggered west→east ──
      for (var s = 0; s < CLUSTERS.length; s++) {
        var clS = CLUSTERS[s], sA = easeOutCubic((elapsed - (EN.PIN_START + clS.delay01 * EN.PIN_SWEEP)) / EN.PIN_DUR);
        if (sA <= 0) continue;
        ctx.globalAlpha = sA * (clusterMatches(clS) ? 1.0 : 0.18);
        drawSpotlight(clS.x, clS.y, tick + clS.cases[0].id * 0.5, clS.id === activeId);
      }
      ctx.globalAlpha = 1.0;
      for (var p = 0; p < CLUSTERS.length; p++) {
        var clP = CLUSTERS[p], pT = (elapsed - (EN.PIN_START + clP.delay01 * EN.PIN_SWEEP)) / EN.PIN_DUR;
        var pA = easeOutCubic(pT); if (pA <= 0) continue;
        var pScale = easeOutBack(pT);
        ctx.save();
        ctx.globalAlpha = pA * (clusterMatches(clP) ? 1.0 : 0.22);
        ctx.translate(clP.x, clP.y); ctx.scale(pScale, pScale); ctx.translate(-clP.x, -clP.y);   // pop around the pin center
        drawPin(clP.x, clP.y, clP.id === activeId, tick + clP.cases[0].id * 0.5, clP.cases.length);
        ctx.restore();
      }
      ctx.globalAlpha = 1.0;

      ctx.restore();

      // Edge vignette REMOVED (2026-07-15). The locked whole-US fitExtent keeps the entire
      // country inside the frame, so there's no overscan bleed to fade — the map now has crisp
      // edges. (Previously a screen-space radial gradient feathered the coasts that overspilled.)

      // Keep going only while something is actually moving — see the idle-stop note above.
      // mapPaused (the IntersectionObserver) still wins over everything: scrolled out of view
      // means no frames regardless.
      if (!mapPaused && isAnimating()) animId = requestAnimationFrame(draw);
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
    // PORTAL the popup + tooltip to the top level (a fixed, full-viewport layer on <body>) so NO
    // map container can clip them. Their direct parent .case-map_canvas-wrap is overflow:hidden
    // (it must be — it clips the map canvas), which was cutting off tall popups at the canvas edge.
    // The portal carries the .case-map class so every `.case-map .popup-*` / `.pin-tooltip-*` rule
    // + CSS var still applies. position{Popup,Tooltip}() already work unchanged because the portal
    // sits at viewport 0,0 (its rect left/top = 0, offsetWidth = viewport), so their parent-relative
    // math resolves to viewport coords.
    (function () {
      var portal = document.createElement('div');
      portal.className = 'case-map da-popup-portal';
      document.body.appendChild(portal);
      if (popup) portal.appendChild(popup);
      if (pinTooltip) portal.appendChild(pinTooltip);
    })();
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
      requestDraw();
    });
    // Hover is decided PER EVENT from the pointer that moved, not once from `(hover: none)`.
    // 2026-10-09: some Windows setups (touch-capable 4K screen, pen) report hover:none with a
    // mouse attached, which switched hover off entirely — pins opened only on click. A finger
    // reports pointerType 'touch' and is ignored here; its tap still opens a pin via 'click'.
    {
      canvas.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        if (dragging) return;
        var s = canvasCoords(e.clientX, e.clientY), w = screenToWorld(s.x, s.y);
        canvasMouseX = w.x; canvasMouseY = w.y;
        pointerOver = true; requestDraw();   // wake the loop: the cursor drives the dot proximity glow
        var hit = findHit(w.x, w.y, 24 / zoom);
        canvas.style.cursor = hit ? 'pointer' : 'default';
        if (hit) { cancelHoverClose(); if (hit.id !== activeId) openCluster(hit); }
        else if (activeId && !popupIsHovered) scheduleHoverClose();
      });
      canvas.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'touch') return;
        canvasMouseX = -9999; canvasMouseY = -9999; pointerOver = false;
        if (activeId && !popupIsHovered) scheduleHoverClose();
        requestDraw();   // one last frame to clear the proximity glow, then the loop idles out
      });
      if (popup) {
        popup.addEventListener('mouseenter', function () { popupIsHovered = true; cancelHoverClose(); });
        popup.addEventListener('mouseleave', function () { popupIsHovered = false; scheduleHoverClose(); });
      }
    }

    // Zoom + pan + pinch + dbl-click-reset handlers REMOVED (2026-07-15). The map is LOCKED to a
    // static whole-US view — no wheel-zoom, no drag-pan, no pinch, no page-scroll interception.
    // Pins stay fully interactive: hover-preview + click-for-details fire through the canvas
    // 'mousemove'/'click' listeners above (a mobile tap still dispatches a click, so tapping a pin
    // opens its popup). `zoom` stays 1 and `panX/panY` stay 0, so all worldToScreen/hit-test math
    // is an identity transform. (setZoomAt/clampPan/resetView remain defined but idle.)

    // Filter chips
    // Chips follow the cases (2026-11-12): a chip whose type has no case is hidden, and a type
    // with cases but no chip gets one, cloned from an existing chip so it keeps the Webflow class.
    (function syncChips() {
      var have = {}; CASES.forEach(function (c) { if (c.type) have[c.type] = true; });
      var existing = document.querySelectorAll('.filter_chip');
      if (!existing.length) return;
      var shown = {}, rows = [];
      Array.prototype.forEach.call(existing, function (ch) {
        if (rows.indexOf(ch.parentNode) < 0) rows.push(ch.parentNode);
        var t = ch.dataset.type;
        if (t === 'all') return;
        if (!have[t]) { ch.hidden = true; ch.style.display = 'none'; } else { shown[t] = true; }
      });
      Object.keys(have).forEach(function (t) {
        if (shown[t]) return;
        rows.forEach(function (row) {
          var src = row.querySelector('.filter_chip:not([data-type="all"])');
          if (!src) return;
          var n = src.cloneNode(true);
          n.hidden = false; n.style.display = ''; n.classList.remove('is-active');
          n.dataset.type = t; n.textContent = typeLabel(t);
          row.appendChild(n);
        });
      });
    })();
    var chips = document.querySelectorAll('.filter_chip');
    for (var ci = 0; ci < chips.length; ci++) {
      chips[ci].addEventListener('click', function () {
        if (this.classList.contains('is-active')) return;
        for (var cj = 0; cj < chips.length; cj++) chips[cj].classList.remove('is-active');
        this.classList.add('is-active');
        activeFilter = this.dataset.type;
        closePopup();
        requestDraw();   // the loop may be idle; the filter changes every cluster's alpha
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
      positionPopup(cl.x, cl.y); popup.classList.add('visible'); popupOpenY = window.scrollY || 0;
    }
    function renderSingleCase(c) {
      var back = (currentCluster && currentCluster.cases.length > 1) ? '<button class="popup-back" onclick="window.__daMap.backToClusterList()">' + SVG_BACK + '<span>' + TX.back(currentCluster.cases.length) + '</span></button>' : '';
      popupBody.innerHTML = back +
        '<div class="popup-head"><span class="popup-type">' + escHtml(typeLabel(c.type)) + '</span><button class="popup-close" onclick="window.__daMap.closePopup()" aria-label="' + TX.close + '">&times;</button></div>' +
        '<div class="popup-title">' + escHtml(c.title) + '</div>' +
        '<div class="popup-location">' + SVG_LOC + '<span>' + escHtml(c.city) + ', ' + escHtml(c.state) + ' &middot; ' + c.year + '</span></div>' +
        '<div class="popup-outcome"><div class="check-mark">&check;</div><span>' + escHtml(c.outcome) + '</span></div>' +
        '<div class="popup-summary">' + escHtml(c.summary) + '</div><div class="popup-divider"></div>' +
        '<a class="popup-link" href="' + escHtml(c.slug) + '"><span>' + TX.read + '</span>' + SVG_ARROW + '</a>';
    }
    function renderClusterList(cl) {
      var rows = cl.cases.map(function (c) {
        return '<div class="popup-cluster-row" onclick="window.__daMap.drillIntoCase(' + c.id + ')"><div class="popup-cluster-row-head"><span class="popup-cluster-row-type">' + escHtml(typeLabel(c.type)) + '</span><span class="popup-cluster-row-year">' + c.year + '</span></div><div class="popup-cluster-row-title">' + escHtml(c.title) + '</div><div class="popup-cluster-row-outcome"><span class="check-mark">&check;</span><span>' + escHtml(c.outcome) + '</span></div></div>';
      }).join('');
      popupBody.innerHTML = '<div class="popup-head"><div class="popup-cluster-meta"><span class="popup-type popup-type-cluster">' + TX.cases(cl.cases.length) + '</span><div class="popup-cluster-location">' + escHtml(cl.cases[0].city) + ', ' + escHtml(cl.cases[0].state) + '</div></div><button class="popup-close" onclick="window.__daMap.closePopup()" aria-label="' + TX.close + '">&times;</button></div><div class="popup-cluster-hint">' + TX.hint + '</div><div class="popup-cluster-list">' + rows + '</div>';
    }
    function drillIntoCase(caseId) { var c = null; for (var i = 0; i < CASES.length; i++) if (CASES[i].id === caseId) c = CASES[i]; if (!c) return; renderSingleCase(c); if (currentCluster) positionPopup(currentCluster.x, currentCluster.y); }
    function backToClusterList() { if (!currentCluster) return; renderClusterList(currentCluster); positionPopup(currentCluster.x, currentCluster.y); }
    function positionPopup(worldX, worldY) {
      if (isMobile() || worldX == null || !popup) return;
      var sp = worldToScreen(worldX, worldY), cR = canvas.getBoundingClientRect(), sx = cR.width / W, sy = cR.height / H;
      // Pin position in VIEWPORT coords. We position the popup against the viewport (not the map
      // cell) so a tall popup (e.g. the cluster card) never clips at the cell/section edge — it
      // flips above the pin and, if still too tall, clamps inside the viewport.
      var vx = sp.x * sx + cR.left, vy = sp.y * sy + cR.top, parent = popup.parentElement, pR = parent.getBoundingClientRect();
      var pw = popup.offsetWidth || 290, ph = popup.offsetHeight || 240;
      var Mtop = 80, Mbot = 14, Mside = 10, vh = window.innerHeight, vw = window.innerWidth; // Mtop clears the navbar
      var vTop = vy - ph - 22;                              // prefer ABOVE the pin
      if (vTop < Mtop) vTop = vy + 22;                      // not enough room above -> go below
      if (vTop + ph > vh - Mbot) vTop = vh - Mbot - ph;     // clamp so the bottom stays on-screen
      if (vTop < Mtop) vTop = Mtop;                         // ...but never under the navbar
      var vLeft = vx - pw / 2;                              // centre on the pin, clamp horizontally
      if (vLeft < Mside) vLeft = Mside;
      if (vLeft + pw > vw - Mside) vLeft = vw - pw - Mside;
      popup.style.opacity = '0';
      popup.style.left = (vLeft - pR.left) + 'px';          // back to offset-parent–relative (absolute)
      popup.style.top = (vTop - pR.top) + 'px';
      popup.style.opacity = '';
    }
    function closePopup() { if (!popup) return; popup.classList.remove('visible'); activeId = null; currentCluster = null; requestDraw(); }
    // 2026-10-11: close an open popup once the PAGE scrolls 60px from where it opened. The popup
    // lives in a fixed layer (portaled to escape the map's clip), so on a phone it stayed on screen
    // while the map scrolled away under it. 60px of slack so a nudge does not dismiss it; scrolling
    // the cluster list INSIDE the popup does not move the page, so it never triggers this.
    var popupOpenY = 0;
    window.addEventListener('scroll', function () {
      if (!popup || !popup.classList.contains('visible')) return;
      if (Math.abs((window.scrollY || 0) - popupOpenY) > 60) closePopup();
    }, { passive: true });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (zoom > 1) resetView(); else closePopup(); } });
    window.__daMap = {
      closePopup: closePopup, drillIntoCase: drillIntoCase, backToClusterList: backToClusterList,
      // Health check — the render loop is now idle most of the time by design, so "is it broken
      // or is it just resting?" needs an answer that does not depend on watching pixels.
      // A good steady state is: cachedLayers true, frameQueued false, animating false.
      stats: function () {
        return {
          cases: CASES.length, dots: dots.length, clusters: CLUSTERS.length,
          dpr: dpr, canvas: { w: W, h: H },
          cachedLayers: !!(bgLayer && outlineLayer),
          animating: isAnimating(), frameQueued: animId !== null,
          offscreenPaused: mapPaused, pointerOver: pointerOver,
          activeCluster: activeId, filter: activeFilter, reduceMotion: REDUCE_MOTION
        };
      }
    };

    // ── Boot ──
    (async function boot() {
      try {
        var us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
        var allStates = topojson.feature(us, us.objects.states);
        // CONUS + DC ONLY (2026-07-15). us-atlas ships 56 features: 50 states + DC + 5 territories
        // (Puerto Rico, USVI, Guam, American Samoa, N. Mariana Is.). Keep FIPS ≤ 56 and drop AK(02)
        // + HI(15) → the 48 contiguous states + DC. CRITICAL: the territories were being merged into
        // the "nation" that fitExtent frames — American Samoa (lng −170) / Guam (+145) blew the
        // projected bounds wide open, shrinking CONUS to ~44% width and shoving it right; Puerto
        // Rico/USVI also rendered as stray dots SE of Florida. Excluding them makes CONUS ~2× bigger,
        // re-centres it, and removes the stray marks.
        var isConus = function (id) { return +id <= 56 && id !== '02' && id !== '15'; };
        topoStates = { type: 'FeatureCollection', features: allStates.features.filter(function (f) { return isConus(f.id); }) };
        topoNation = topojson.merge(us, us.objects.states.geometries.filter(function (g) { return isConus(g.id); }));
        resize(); buildProjection(); buildStaticLayers(); buildDots(); reprojectCases(); buildClusters();
        var resizeTimer;
        window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { resize(); buildProjection(); buildStaticLayers(); buildDots(); reprojectCases(); buildClusters(); clampPan(); requestDraw(); }, 120); });
        var msg = byId('loadingMsg') || byId('loading-msg'); if (msg) { msg.style.opacity = '0'; setTimeout(function () { msg.style.display = 'none'; }, 400); }
        if (animId) cancelAnimationFrame(animId);
        draw();
        // Pause the render loop while the map is off-screen (frees the main thread for
        // smooth scrolling elsewhere on the page). rootMargin keeps it warm just before
        // it scrolls back in so there's no visible cold-start.
        if (typeof IntersectionObserver !== 'undefined') {
          var visIO = new IntersectionObserver(function (entries) {
            var vis = entries[0].isIntersecting;
            if (vis && mapPaused) { mapPaused = false; requestDraw(); }
            else if (!vis && !mapPaused) { mapPaused = true; if (animId) { cancelAnimationFrame(animId); animId = null; } }
          }, { rootMargin: '200px 0px 200px 0px', threshold: 0 });
          visIO.observe(wrap);
        }
      } catch (err) {
        console.error('Case map load error:', err);
        var m = byId('loadingMsg') || byId('loading-msg'); if (m) m.textContent = TX.down;
      }
    })();
  }

  function boot() {
    if (!document.getElementById('mapCanvas')) return;
    ensureDeps().then(init).catch(function (err) {
      console.error('Case map deps failed:', err);
      var m = document.getElementById('loadingMsg') || document.getElementById('loading-msg'); if (m) m.textContent = (document.documentElement.lang || '').toLowerCase().indexOf('es') === 0 ? 'El mapa no está disponible. Revise su conexión.' : 'Map unavailable — check connection.';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
