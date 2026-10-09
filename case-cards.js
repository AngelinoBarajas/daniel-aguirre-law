/* CASE CARDS (Addition 01, 2026-10-09) - served from jsDelivr (repo: case-cards.js), linked in /case-results FOOTER.
   1. Groups each card's tags into labelled rows by Topic Category (carried in a hidden
      bound <p class="case-card_cat">, because the MCP cannot bind CMS values to attributes).
   2. Builds "Similar Results": the 2 other cards sharing the most tags, as in-page links.
   Words live in the dictionary below so the /es locale gets Spanish without code changes.
   ES strings are UNREVIEWED drafts. */
(function () {
  if (window.__daCaseCards) return; window.__daCaseCards = true;
  var es = (document.documentElement.lang || '').toLowerCase().indexOf('es') === 0;
  var L = es ? {
    'Who We Help': 'A quién ayudó', 'Pathways & Filings': 'Trámites', 'What We Watch For': 'Qué cuidamos',
    'Practice Areas': 'Área de práctica', 'Immigration Concepts': 'Conceptos', 'Signature Expertise': 'Experiencia'
  } : {
    'Who We Help': 'Who it helped', 'Pathways & Filings': 'Filings', 'What We Watch For': 'What we watched for',
    'Practice Areas': 'Practice area', 'Immigration Concepts': 'Concepts', 'Signature Expertise': 'Expertise'
  };
  var ORDER = ['Who We Help', 'Practice Areas', 'Pathways & Filings', 'What We Watch For', 'Signature Expertise', 'Immigration Concepts'];

  function slug(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
  function text(el) { return el ? (el.textContent || '').trim() : ''; }

  function init() {
    var cards = [].slice.call(document.querySelectorAll('.case-card'));
    if (!cards.length) return;
    var data = cards.map(function (card, i) {
      var title = text(card.querySelector('.case-card_title'));
      if (!card.id) card.id = 'case-' + (slug(title) || i);
      var tags = [], groups = {}, seen = [];
      [].slice.call(card.querySelectorAll('.case-card_tags .w-dyn-item')).forEach(function (item) {
        var chip = item.querySelector('.topic_chip'); if (!chip) return;
        var name = text(chip), cat = text(item.querySelector('.case-card_cat')) || '__none';
        tags.push(name);
        if (!groups[cat]) { groups[cat] = []; seen.push(cat); }
        groups[cat].push(chip);
      });
      /* 1. grouped rows */
      var box = card.querySelector('.case-card_tags');
      if (box && seen.length) {
        seen.sort(function (a, b) { var x = ORDER.indexOf(a), y = ORDER.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
        var frag = document.createDocumentFragment();
        seen.forEach(function (cat) {
          var row = document.createElement('div'); row.className = 'case-card_group';
          if (L[cat]) { var lab = document.createElement('p'); lab.className = 'case-card_group-label'; lab.textContent = L[cat]; row.appendChild(lab); }
          groups[cat].forEach(function (chip) { row.appendChild(chip); });
          frag.appendChild(row);
        });
        var list = box.querySelector('.w-dyn-list'); if (list) list.style.display = 'none';
        box.appendChild(frag); box.setAttribute('data-grouped', '1');
      }
      return { card: card, title: title, type: text(card.querySelector('.case-card_type')), tags: tags };
    });
    /* 2. similar results: most shared tags, same case type breaks ties */
    data.forEach(function (d) {
      var scored = data.filter(function (o) { return o !== d; }).map(function (o) {
        var shared = o.tags.filter(function (t) { return d.tags.indexOf(t) > -1; }).length;
        return { o: o, s: shared ? shared + (o.type === d.type ? 0.5 : 0) : 0 };
      }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 2);
      var wrap = d.card.querySelector('.case-card_similar-links'); if (!wrap) return;
      scored.forEach(function (x) {
        var a = document.createElement('a'); a.className = 'case-card_similar-link';
        a.href = '#' + x.o.card.id; a.textContent = x.o.title; wrap.appendChild(a);
      });
    });
    /* 3. "Show more" on phones: first 6 cards, the rest behind a button. CSS only hides the
       extras below 768px, so desktop always shows every card and the button stays hidden. */
    var grid = document.querySelector('.results-cases_grid'), LIMIT = 6, expand = function () {};
    var extra = cards.slice(LIMIT);
    if (grid && extra.length) {
      extra.forEach(function (c) { c.classList.add('is-extra'); });
      grid.classList.add('is-collapsed');
      var more = es ? 'Ver los ' + cards.length + ' casos' : 'Show all ' + cards.length + ' matters';
      var less = es ? 'Ver menos' : 'Show fewer';
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'button is-secondary case-cards_more';
      btn.textContent = more; btn.setAttribute('aria-expanded', 'false');
      var setOpen = function (open) {
        grid.classList.toggle('is-collapsed', !open);
        btn.textContent = open ? less : more; btn.setAttribute('aria-expanded', String(open));
      };
      expand = function () { setOpen(true); };
      btn.addEventListener('click', function () {
        var open = grid.classList.contains('is-collapsed');
        setOpen(open);
        if (!open) {   /* collapsing from far down the page: return to the grid */
          var y = 0, n = grid; while (n) { y += n.offsetTop; n = n.offsetParent; }
          y -= 140;
          if (window.__tenLenis && window.__tenLenis.scrollTo) window.__tenLenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
        }
      });
      grid.parentNode.insertBefore(btn, grid.nextSibling);
    }
    /* in-page jump: measure layout (offsetTop), not a rect, so reveal transforms cannot skew it */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.case-card_similar-link'); if (!a) return;
      var t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
      e.preventDefault();
      if (t.classList.contains('is-extra')) expand();   /* a similar case may be behind "Show more" */
      var y = 0, n = t; while (n) { y += n.offsetTop; n = n.offsetParent; }
      y -= 140;
      if (window.__tenLenis && window.__tenLenis.scrollTo) window.__tenLenis.scrollTo(y); else window.scrollTo({ top: y, behavior: 'smooth' });
      document.querySelectorAll('.case-card.is-target').forEach(function (c) { c.classList.remove('is-target'); });
      t.classList.add('is-target'); setTimeout(function () { t.classList.remove('is-target'); }, 2200);
      if (history.replaceState) history.replaceState(null, '', '#' + t.id);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
