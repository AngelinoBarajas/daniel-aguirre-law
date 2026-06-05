/* ============================================================
   SITE-WIDE JS — STARTER SCAFFOLD
   Base init choreography for any 510-class site.
   Paste into: Webflow → Project Settings → Custom Code → Footer (before </body>).
   Load order matters: GSAP/Lenis CDN tags first, then the init scripts.
   Derived from 510 Visuals production code, stripped of project-specific components
   (globe / inspo / cta38 / contact / navbar / footer reveals live per-project).
   ============================================================ */

<!-- ===== Library CDNs (jsDelivr immutable; use @<sha> for project-pinned forks) ===== -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js"></script>

<script>
/* Mouse trail — physically remove the embed on ≤991px OR when cursor-FX is toggled
   off, BEFORE Unicorn init. CSS display:none alone still lets Unicorn spin up the
   WebGL scene + rAF (GPU/battery cost). Removing it from DOM prevents the SDK
   finding it. No-op on projects without a .unicorn-mouse-trail_component. */
(function () {
  var fxOff = false;
  try {
    var v = localStorage.getItem('ten:fxOff');
    if (v === '1') fxOff = true;
    else if (v === null && window.matchMedia('(prefers-reduced-motion: reduce)').matches) fxOff = true;
  } catch (_) {}
  var smallScreen = window.matchMedia('(max-width: 991px)').matches;
  if (!smallScreen && !fxOff) return;
  var trail = document.querySelector('.unicorn-mouse-trail_component');
  if (trail && trail.parentNode) trail.parentNode.removeChild(trail);
})();
</script>

<script>
/* Cursor FX toggle — desktop-only floating button above back-to-top.
   Only injected when a mouse-trail container exists, so it's a no-op on projects
   without one. Persists to localStorage; defaults OFF under prefers-reduced-motion.
   Toggling reloads so the trail-removal IIFE re-evaluates cleanly. */
(function () {
  if (window.__tenFxToggleInit) return;
  window.__tenFxToggleInit = true;
  if (!window.matchMedia('(min-width: 992px)').matches) return;
  if (!document.querySelector('.unicorn-mouse-trail_component')) return;

  var STORAGE_KEY = 'ten:fxOff';
  function readFxOff() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (v === '1') return true;
      if (v === '0') return false;
    } catch (_) {}
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function writeFxOff(off) { try { localStorage.setItem(STORAGE_KEY, off ? '1' : '0'); } catch (_) {} }

  var off = readFxOff();
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fx-toggle' + (off ? ' is-off' : '');
  btn.setAttribute('aria-label', off ? 'Turn cursor effects on' : 'Turn cursor effects off');
  btn.setAttribute('aria-pressed', off ? 'true' : 'false');
  btn.innerHTML = '<svg class="fx-toggle_icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4l5 16 3-7 7-3z"/><line class="fx-toggle_strike" x1="3" y1="21" x2="21" y2="3"/></svg><span class="fx-toggle_label">FX</span>';
  document.body.appendChild(btn);
  setTimeout(function () { btn.classList.add('is-visible'); }, 1500);

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    var next = !readFxOff();
    writeFxOff(next);
    btn.classList.toggle('is-off', next);
    btn.setAttribute('aria-pressed', next ? 'true' : 'false');
    btn.setAttribute('aria-label', next ? 'Turn cursor effects on' : 'Turn cursor effects off');
    setTimeout(function () { window.location.reload(); }, 180);
  });
})();
</script>

<script type="text/javascript">
/* Unicorn Studio — per-embed addScene loader.
   Uses UnicornStudio.addScene({ element, projectId }) per [data-us-project] embed
   instead of UnicornStudio.init()'s DOM scan, which is BROKEN on Android Chrome +
   some Windows Chrome builds (marks embeds initialized but never mounts canvases).
   Defers HERO_SETTLE_DELAY(900ms) past load so heavy GL compile doesn't saturate
   the main thread during the hero animation window. Emits `ten:unicorn-ready`.
   No-op on pages with no [data-us-project] embeds. */
!(function () {
  if (window.__tenUnicornInitScript) return;
  window.__tenUnicornInitScript = true;

  function emitReady() {
    if (window.__tenUnicornReady) return;
    window.__tenUnicornReady = true;
    try { window.dispatchEvent(new Event('ten:unicorn-ready')); } catch (e) {}
  }
  function mountAll() {
    if (!window.UnicornStudio || typeof UnicornStudio.addScene !== 'function') { emitReady(); return; }
    var embeds = document.querySelectorAll('[data-us-project]');
    if (!embeds.length) { emitReady(); return; }
    var promises = [];
    for (var i = 0; i < embeds.length; i++) {
      var el = embeds[i];
      var pid = el.getAttribute('data-us-project');
      if (!pid) continue;
      el.removeAttribute('data-us-initialized');
      try {
        var p = UnicornStudio.addScene({ element: el, projectId: pid });
        if (p && typeof p.then === 'function') promises.push(p.catch(function () {}));
      } catch (e) {}
    }
    if (promises.length && typeof Promise !== 'undefined' && Promise.all) Promise.all(promises).then(emitReady, emitReady);
    else emitReady();
    setTimeout(emitReady, 6000);
  }
  var HERO_SETTLE_DELAY = 900;
  function scheduleMount() {
    setTimeout(function () { requestAnimationFrame(function () { requestAnimationFrame(mountAll); }); }, HERO_SETTLE_DELAY);
  }
  function kickoff() {
    if (document.readyState === 'complete') scheduleMount();
    else window.addEventListener('load', scheduleMount);
  }
  function loadSDK() {
    window.UnicornStudio = { isInitialized: !1 };
    var i = document.createElement('script');
    i.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/dist/unicornStudio.umd.js';
    i.onload = kickoff;
    (document.head || document.body).appendChild(i);
  }
  /* Only load the Unicorn SDK if this page actually has an embed. */
  if (!document.querySelector('[data-us-project]')) return;
  if (window.UnicornStudio && typeof window.UnicornStudio.addScene === 'function') kickoff();
  else loadSDK();
})();
</script>

<script>
/* Unicorn Studio — resize + addScene recovery on scroll-in.
   On viewport intersection: if canvas exists → scene.resize() (fixes 0-size bugs)
   and add .is-ready; if canvas missing → addScene() ONCE per embed (recovery).
   No init() calls (broken scan). One-shot guard prevents duplicate-canvas cascades. */
window.Webflow = window.Webflow || [];
window.Webflow.push(function () {
  if (typeof IntersectionObserver === 'undefined') return;
  function hasLiveCanvas(embed) { return !!embed.querySelector('canvas'); }
  function refreshScene(embed) {
    if (!window.UnicornStudio || !UnicornStudio.scenes) return;
    var id = embed.getAttribute('data-us-project');
    var scene = UnicornStudio.scenes.find(function (s) { return s.projectId === id; });
    if (scene && typeof scene.resize === 'function') scene.resize();
  }
  function markReady(embed) { embed.classList.add('is-ready'); }
  function recoverEmbed(embed) {
    if (hasLiveCanvas(embed)) { markReady(embed); refreshScene(embed); return; }
    if (embed.__tenAddSceneTried) return;
    if (!window.UnicornStudio || typeof UnicornStudio.addScene !== 'function') return;
    embed.__tenAddSceneTried = true;
    var pid = embed.getAttribute('data-us-project');
    if (!pid) return;
    embed.removeAttribute('data-us-initialized');
    try {
      var p = UnicornStudio.addScene({ element: embed, projectId: pid });
      if (p && typeof p.then === 'function') p.then(function () { if (hasLiveCanvas(embed)) { markReady(embed); refreshScene(embed); } }, function () {});
    } catch (e) {}
  }
  setTimeout(function () {
    var embeds = document.querySelectorAll('[data-us-project]');
    if (!embeds.length) return;
    var io = new IntersectionObserver(function (entries) {
      for (var j = 0; j < entries.length; j++) if (entries[j].isIntersecting) recoverEmbed(entries[j].target);
    }, { threshold: 0.01, rootMargin: '300px' });
    for (var i = 0; i < embeds.length; i++) io.observe(embeds[i]);
  }, 3000);
});
</script>

<script>
/* Unicorn Studio — auto scene.resize() on container dimension change
   (breakpoint shifts, rotation, devtools, layout changes). Debounced 150ms/embed. */
window.Webflow = window.Webflow || [];
window.Webflow.push(function () {
  if (window.__tenUnicornResizeInit) return;
  window.__tenUnicornResizeInit = true;
  function resizeSceneFor(embed) {
    if (!window.UnicornStudio || !UnicornStudio.scenes) return;
    var id = embed.getAttribute('data-us-project'); if (!id) return;
    var scene = UnicornStudio.scenes.find(function (s) { return s.projectId === id; });
    if (scene && typeof scene.resize === 'function') scene.resize();
  }
  var pending = {};
  function queueResize(embed) {
    var id = embed.getAttribute('data-us-project'); if (!id) return;
    if (pending[id]) clearTimeout(pending[id]);
    pending[id] = setTimeout(function () { resizeSceneFor(embed); delete pending[id]; }, 150);
  }
  if (typeof ResizeObserver !== 'undefined') {
    setTimeout(function () {
      var embeds = document.querySelectorAll('[data-us-project]'); if (!embeds.length) return;
      var ro = new ResizeObserver(function (entries) { for (var i = 0; i < entries.length; i++) queueResize(entries[i].target); });
      for (var i = 0; i < embeds.length; i++) ro.observe(embeds[i]);
    }, 3500);
  }
  var winResizeTO;
  window.addEventListener('resize', function () {
    clearTimeout(winResizeTO);
    winResizeTO = setTimeout(function () {
      var embeds = document.querySelectorAll('[data-us-project]');
      for (var i = 0; i < embeds.length; i++) resizeSceneFor(embeds[i]);
    }, 200);
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () {
      var embeds = document.querySelectorAll('[data-us-project]');
      for (var i = 0; i < embeds.length; i++) resizeSceneFor(embeds[i]);
    }, 300);
  });
});
</script>

<script>
/* Lenis smooth scroll — hooks ScrollTrigger.update() + auto-refreshes on doc height
   change (fixes stale measurements after late-loading media/CMS pushes height).
   Exposes window.__tenLenis and window.__tenRefreshIfHeightChanged. */
(function () {
  if (window.__tenLenisInit) return;
  window.__tenLenisInit = true;
  if (typeof Lenis === 'undefined') return;
  var lenis = new Lenis({
    duration: 0.9,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smooth: true, smoothTouch: false, syncTouch: false
  });
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  lenis.on('scroll', function () { if (window.ScrollTrigger) ScrollTrigger.update(); });
  if (window.gsap) gsap.ticker.lagSmoothing(500, 33);
  window.__tenLenis = lenis;

  function refreshAll() { if (lenis.resize) lenis.resize(); if (window.ScrollTrigger) ScrollTrigger.refresh(); }
  var lastH = document.documentElement.scrollHeight;
  function refreshIfHeightChanged() {
    var h = document.documentElement.scrollHeight;
    if (Math.abs(h - lastH) < 20) return;
    lastH = h; refreshAll();
  }
  window.__tenRefreshIfHeightChanged = refreshIfHeightChanged;
  if ('ResizeObserver' in window) {
    var roDebounce = null;
    var ro = new ResizeObserver(function () { clearTimeout(roDebounce); roDebounce = setTimeout(refreshIfHeightChanged, 120); });
    ro.observe(document.body);
  }
  /* Safety nets, delayed past hero entrance (~1.4s) so a forced reflow doesn't land mid-animation. */
  window.addEventListener('load', function () {
    setTimeout(refreshIfHeightChanged, 2000);
    setTimeout(refreshIfHeightChanged, 3500);
  });
})();
</script>

<script>
/* Back-to-top button — injected into <body> */
(function () {
  if (window.__tenBackToTopInit) return;
  window.__tenBackToTopInit = true;
  var btn = document.createElement('a');
  btn.className = 'back-to-top'; btn.href = '#';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '<svg class="back-to-top_arrow" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg><span class="back-to-top_label">Top</span>';
  document.body.appendChild(btn);
  window.addEventListener('scroll', function () { btn.classList.toggle('is-visible', window.scrollY > 400); }, { passive: true });
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    if (window.__tenLenis) window.__tenLenis.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
</script>

<script>
/* Generic IO entrance reveal — opt-in via [data-animate="fade-up"].
   Resting state is visible (CSS), so missing JS never hides content. Add the
   attribute to any element; it fades+rises in once on scroll-in. Respects
   prefers-reduced-motion. For bespoke timelines use the gsap-animator skill instead. */
window.Webflow = window.Webflow || [];
window.Webflow.push(function () {
  if (window.__tenFadeUpInit) return;
  window.__tenFadeUpInit = true;
  var els = document.querySelectorAll('[data-animate="fade-up"]');
  if (!els.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || typeof IntersectionObserver === 'undefined') return;
  gsap.set(els, { opacity: 0, y: 24 });
  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e.isIntersecting) {
        var delay = parseFloat(e.target.getAttribute('data-delay')) || 0;
        gsap.to(e.target, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: delay });
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  for (var i = 0; i < els.length; i++) io.observe(els[i]);
});
</script>

<script>
/* Homepage hero — staggered entrance for the text + buttons (fade + rise on load).
   Targets the eyebrow / heading / paragraph / buttons inside .section_hero. Failsafe:
   if GSAP is missing the content just stays visible (no opacity:0 in CSS). */
window.Webflow = window.Webflow || [];
window.Webflow.push(function () {
  if (window.__daHeroIntroInit) return;
  window.__daHeroIntroInit = true;
  if (!window.gsap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var sec = document.querySelector('.section_hero');
  if (!sec) return;
  function firstOf(sels) { for (var i = 0; i < sels.length; i++) { var el = sec.querySelector(sels[i]); if (el) return el; } return null; }
  var items = [];
  var eyebrow = firstOf(['.text-style-tagline', '.text-style-eyebrow', '.eyebrow']); if (eyebrow) items.push(eyebrow);
  var heading = firstOf(['.heading-style-h1', 'h1']); if (heading) items.push(heading);
  var para = firstOf(['.text-size-medium', '.text-size-large', '.text-size-regular']); if (para) items.push(para);
  var bg = sec.querySelector('.button-group');
  if (bg) items.push(bg);
  else { var bs = sec.querySelectorAll('.button'); for (var b = 0; b < bs.length; b++) items.push(bs[b]); }
  if (!items.length) return;
  gsap.set(items, { opacity: 0, y: 24 });
  gsap.to(items, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.12, delay: 0.15 });
});
</script>

<script>
/* Lazy-load heavy WebGL / Three.js scripts only when their section nears viewport.
   Keeps hero entrance smooth; pages without the trigger selectors never load them.
   Add lazyOn(selector, src) calls per project inside run(). Use jsDelivr @<sha>. */
(function () {
  if (window.__tenLazyWebGLInit) return;
  window.__tenLazyWebGLInit = true;
  function loadScript(src) { var s = document.createElement('script'); s.src = src; document.body.appendChild(s); }
  function lazyOn(selector, src) {
    var targets = document.querySelectorAll(selector);
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) { loadScript(src); return; }
    var loaded = false;
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting && !loaded) { loaded = true; loadScript(src); io.disconnect(); return; }
      }
    }, { rootMargin: '400px 0px 400px 0px', threshold: 0 });
    for (var j = 0; j < targets.length; j++) io.observe(targets[j]);
  }
  function run() {
    /* No site-wide lazy-loaded scripts right now. The Case Results Map moved to the homepage's
       OWN page-level custom code on 2026-06-05 (inline CSS + JS — see
       builds/homepage-map-page-code.md), so it no longer loads here.
       Add lazyOn('.selector', 'https://cdn.jsdelivr.net/gh/<owner>/<repo>@<sha>/file.js')
       calls here for any future heavy WebGL/embed that should defer until near-viewport. */
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
</script>
