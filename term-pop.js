/* term-pop.js — Topicweave term pop-ups for Daniel Aguirre Law (spec: cks-v3/docs/term-links-and-connections-spec.md).
   Term links are real <a> tags in CMS rich text. This script only adds the definition pop-up.
   Data: the hidden .tw-terms block on the page (Topics Collection List: .tw-terms_url text = Canonical Page,
   .tw-terms_name, .tw-terms_def; labels .tw-terms_eyebrow / .tw-terms_more are static text, localized per locale).
   No words are hard-coded here. Namespace .tw-* (the map already owns .popup / .pin-tooltip). */
(function () {
  if (window.__twTermPopInit) return;
  window.__twTermPopInit = true;

  function norm(href) {
    if (!href) return '';
    try { var u = new URL(href, location.href); if (u.origin !== location.origin) return ''; href = u.pathname; }
    catch (e) { return ''; }
    href = href.replace(/^\/[a-z]{2}(-[a-z]{2})?(?=\/)/i, '');   // drop a locale prefix like /es
    return href.replace(/\/+$/, '') || '/';
  }
  function txt(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }

  function init() {
    var data = document.querySelector('.tw-terms');
    if (!data) return;
    var terms = {};
    data.querySelectorAll('.w-dyn-item').forEach(function (it) {
      // URL comes from a text-bound <p> (a CMS Link field bound through the MCP renders href="#").
      var def = txt(it.querySelector('.tw-terms_def'));
      var key = norm(txt(it.querySelector('.tw-terms_url')));
      if (key && key !== '/' && def) terms[key] = { name: txt(it.querySelector('.tw-terms_name')), def: def };
    });
    var here = norm(location.pathname);
    var links = [].filter.call(document.querySelectorAll('.w-richtext a[href]'), function (a) {
      var k = norm(a.getAttribute('href'));
      return terms[k] && k !== here && !a.closest('h1,h2,h3,h4,h5,h6,figure,figcaption,button');
    });
    if (!links.length) return;

    var eyebrow = txt(data.querySelector('.tw-terms_eyebrow')), more = txt(data.querySelector('.tw-terms_more'));
    var css = document.createElement('style');
    css.textContent =
      '.w-richtext a.tw-term{color:#891E2D;text-decoration:underline dotted;text-decoration-color:#A88B5C;text-decoration-thickness:1.5px;text-underline-offset:3px}' +
      '.w-richtext a.tw-term:hover,.w-richtext a.tw-term:focus-visible{color:#6f1824;text-decoration-style:solid}' +
      '.tw-pop{position:fixed;z-index:999;left:0;top:0;box-sizing:border-box;width:max-content;max-width:min(20rem,calc(100vw - 24px));padding:14px 16px 13px;' +
      'background:rgba(252,246,236,0.97);-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4);' +
      'border:1px solid rgba(168,139,92,0.38);border-radius:12px;box-shadow:0 14px 34px rgba(26,40,64,0.18),0 2px 6px rgba(26,40,64,0.08),inset 0 1px 0 rgba(255,255,255,0.85);' +
      'font-family:Inter,sans-serif;color:#1A2840;text-align:left;opacity:0;transform:translateY(4px);pointer-events:none;transition:opacity .16s ease-out,transform .16s ease-out}' +
      '.tw-pop.is-open{opacity:1;transform:none;pointer-events:auto}' +
      '.tw-pop_eyebrow{margin:0 0 6px;font-size:.68rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#1A2840;opacity:.72}' +
      '.tw-pop_name{margin:0 0 6px;font-family:Lora,serif;font-weight:600;font-size:1.06rem;line-height:1.25;color:#1A2840}' +
      '.tw-pop_def{margin:0 0 10px;font-size:.9rem;line-height:1.5;color:#2C3650}' +
      '.tw-pop_more{font-size:.84rem;font-weight:600;color:#891E2D;text-decoration:none}' +
      '.tw-pop_more:hover,.tw-pop_more:focus-visible{text-decoration:underline}' +
      '@media (prefers-reduced-motion:reduce){.tw-pop{transition:none;transform:none}}';
    document.head.appendChild(css);

    var pop = document.createElement('div');
    pop.className = 'tw-pop'; pop.id = 'tw-pop'; pop.setAttribute('role', 'tooltip'); pop.hidden = true;
    pop.innerHTML = '<p class="tw-pop_eyebrow"></p><p class="tw-pop_name"></p><p class="tw-pop_def"></p><a class="tw-pop_more"></a>';
    document.body.appendChild(pop);
    var pEye = pop.children[0], pName = pop.children[1], pDef = pop.children[2], pMore = pop.children[3];
    if (!eyebrow) pEye.style.display = 'none';

    var current = null, closeTimer = 0, lastPointer = 'mouse';
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

    function navBottom() {
      var n = document.querySelector('.navbar8_component');
      var b = n ? n.getBoundingClientRect().bottom : 0;
      return b > 0 ? b : 0;
    }
    function place(a) {
      var r = a.getClientRects()[0] || a.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, m = 12;
      var top = r.bottom + 8;
      if (top + h > innerHeight - m && r.top - h - 8 >= navBottom() + m) top = r.top - h - 8;
      var left = Math.min(Math.max(r.left, m), innerWidth - w - m);
      pop.style.left = Math.round(left) + 'px'; pop.style.top = Math.round(top) + 'px';
    }
    function open(a) {
      clearTimeout(closeTimer);
      if (current === a) return;
      if (current) current.removeAttribute('aria-describedby');
      var t = terms[norm(a.getAttribute('href'))];
      pEye.textContent = eyebrow; pName.textContent = t.name; pDef.textContent = t.def;
      pMore.textContent = (more ? more + ' ' : '') + t.name + ' →';
      pMore.setAttribute('href', a.getAttribute('href'));
      pop.hidden = false; place(a);
      requestAnimationFrame(function () { pop.classList.add('is-open'); });
      a.setAttribute('aria-describedby', 'tw-pop');
      current = a;
    }
    function close() {
      clearTimeout(closeTimer);
      if (!current) return;
      current.removeAttribute('aria-describedby');
      current = null; pop.classList.remove('is-open'); pop.hidden = true;
    }
    function closeSoon() { clearTimeout(closeTimer); closeTimer = setTimeout(close, 140); }

    links.forEach(function (a) {
      a.classList.add('tw-term');
      a.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType || 'mouse'; });
      a.addEventListener('mouseenter', function () { if (canHover.matches) open(a); });
      a.addEventListener('mouseleave', function () { if (canHover.matches) closeSoon(); });
      // A tap focuses the link before its click on some browsers; let the click decide for touch.
      a.addEventListener('focus', function () { if (lastPointer === 'touch' || lastPointer === 'pen') return; open(a); });
      a.addEventListener('blur', function (e) { if (!pop.contains(e.relatedTarget)) closeSoon(); });
      a.addEventListener('click', function (e) {
        // Touch: first tap opens, second tap follows the link.
        if ((lastPointer === 'touch' || lastPointer === 'pen' || !canHover.matches) && current !== a) { e.preventDefault(); open(a); }
      });
    });
    pop.addEventListener('mouseenter', function () { clearTimeout(closeTimer); });
    pop.addEventListener('mouseleave', function () { if (canHover.matches) closeSoon(); });
    pMore.addEventListener('blur', function (e) { if (!current || e.relatedTarget !== current) closeSoon(); });
    document.addEventListener('keydown', function (e) {
      lastPointer = 'keyboard';
      if (e.key === 'Escape' && current) { var a = current; close(); if (pop.contains(document.activeElement)) a.focus(); }
    });
    document.addEventListener('pointerdown', function (e) {
      if (current && !pop.contains(e.target) && !current.contains(e.target)) close();
    }, true);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    if (window.__tenLenis && typeof window.__tenLenis.on === 'function') window.__tenLenis.on('scroll', close);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
