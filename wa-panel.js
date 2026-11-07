/* WhatsApp panel (2026-11-07). Daniel Aguirre Law, served from jsDelivr at a pinned SHA.
   Enhances every link to wa.me/12032138703: a click opens an on-page panel instead of a new
   window. The links stay real wa.me links, so without this script they still work.
   NOTHING IS SENT OR STORED BY THE SITE. The box is a draft; "Continue in WhatsApp" opens
   WhatsApp with the text filled in and the visitor presses Send there. Styles: site.css
   ("WhatsApp panel"). Language: <html lang> / the /es path. */
(function () {
  if (window.__daWaPanel) return;
  window.__daWaPanel = true;

  var NUM = '12032138703';
  var QR_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  var QR_SRI = 'sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU';
  var es = /^es/i.test(document.documentElement.lang || '') || /^\/es(\/|$)/.test(location.pathname);
  var T = es ? {
    title: 'Escriba a Daniel Aguirre Law',
    sub: 'Respondemos en horario de oficina',
    intro: 'Cuéntenos un poco sobre su caso y le responderemos por WhatsApp. Por favor no envíe documentos hasta que hablemos.',
    label: 'Escriba su mensaje (lo enviará en WhatsApp)',
    start: 'Hola, los encontré en su sitio web. ',
    chips: ['Necesito una consulta', 'Pregunta sobre mi green card', 'Pregunta sobre TPS', 'Tengo una cita en corte'],
    go: 'Continuar en WhatsApp',
    qr: '¿Está en una computadora? Escanee este código con la cámara de su teléfono para continuar en WhatsApp.',
    fine: '(203) 213-8703 · Los mensajes no son asesoría legal ni crean una relación abogado–cliente.',
    close: 'Cerrar'
  } : {
    title: 'Message Daniel Aguirre Law',
    sub: 'Replies during office hours',
    intro: "Tell us a little about your case and we'll reply on WhatsApp. Please don't send documents until we talk.",
    label: "Write your message (you'll send it in WhatsApp)",
    start: 'Hi, I found you on your website. ',
    chips: ['I need a consultation', 'Question about my green card', 'Question about TPS', 'I have a court date'],
    go: 'Continue in WhatsApp',
    qr: "On a computer? Scan this code with your phone's camera to continue in WhatsApp.",
    fine: "(203) 213-8703 · Messages are not legal advice and don't create an attorney–client relationship.",
    close: 'Close'
  };
  var GLYPH = '<svg class="wa-panel_go-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.29A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41"/></svg>';

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function isWa(a) { return a && /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(a.href || '') && a.href.indexOf(NUM) > -1; }

  var panel, backdrop, msg, go, qrBox, qrWrap, opener, qrTimer, built = false;

  function link() { return 'https://wa.me/' + NUM + '?text=' + encodeURIComponent(msg.value.trim()); }
  function wantQr() { return window.matchMedia('(min-width: 768px) and (hover: hover)').matches; }
  function drawQr() {
    if (!qrBox || !wantQr()) return;
    if (!window.QRCode) return loadQr();
    qrBox.innerHTML = '';
    try {
      new window.QRCode(qrBox, { text: link(), width: 192, height: 192, colorDark: '#1A2840', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
      qrBox.removeAttribute('title'); /* the library sets title = the URL */
      qrWrap.hidden = false;
    } catch (e) { qrWrap.hidden = true; }
  }
  var qrLoading = false;
  function loadQr() {
    if (qrLoading) return; qrLoading = true;
    var s = document.createElement('script');
    s.src = QR_SRC; s.integrity = QR_SRI; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer';
    s.onload = drawQr; s.onerror = function () { qrWrap.hidden = true; };
    document.head.appendChild(s);
  }
  function refresh() { go.href = link(); clearTimeout(qrTimer); qrTimer = setTimeout(drawQr, 250); }

  function build() {
    built = true;
    backdrop = document.createElement('div');
    backdrop.className = 'wa-panel_backdrop';
    panel = document.createElement('div');
    panel.className = 'wa-panel';
    panel.id = 'wa-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'wa-panel-title');
    panel.setAttribute('data-lenis-prevent', '');
    var chips = T.chips.map(function (c) { return '<button type="button" class="wa-panel_chip">' + esc(c) + '</button>'; }).join('');
    panel.innerHTML =
      '<div class="wa-panel_head"><div class="wa-panel_avatar" aria-hidden="true">DA</div>' +
      '<div><p class="wa-panel_title" id="wa-panel-title">' + esc(T.title) + '</p><span class="wa-panel_sub">' + esc(T.sub) + '</span></div>' +
      '<button type="button" class="wa-panel_close" aria-label="' + esc(T.close) + '">&times;</button></div>' +
      '<div class="wa-panel_body"><p class="wa-panel_intro">' + esc(T.intro) + '</p>' +
      '<label class="wa-panel_label" for="wa-panel-msg">' + esc(T.label) + '</label>' +
      '<textarea class="wa-panel_msg" id="wa-panel-msg" rows="3"></textarea>' +
      '<div class="wa-panel_chips">' + chips + '</div>' +
      '<a class="wa-panel_go" target="_blank" rel="noopener">' + GLYPH + '<span>' + esc(T.go) + '</span></a>' +
      '<div class="wa-panel_qr" hidden><div class="wa-panel_qr-code" role="img" aria-label="QR code"></div><p>' + esc(T.qr) + '</p></div>' +
      '<p class="wa-panel_fine">' + esc(T.fine) + '</p></div>';
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    msg = panel.querySelector('.wa-panel_msg');
    go = panel.querySelector('.wa-panel_go');
    qrWrap = panel.querySelector('.wa-panel_qr');
    qrBox = panel.querySelector('.wa-panel_qr-code');
    msg.value = T.start;
    msg.addEventListener('input', refresh);
    panel.querySelector('.wa-panel_close').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    Array.prototype.forEach.call(panel.querySelectorAll('.wa-panel_chip'), function (b) {
      b.addEventListener('click', function () { msg.value = T.start + b.textContent + '.'; refresh(); });
    });
    go.addEventListener('click', function () { setTimeout(close, 300); });
    refresh();
  }

  function open(a) {
    if (!built) build();
    opener = a;
    panel.classList.add('is-open');
    backdrop.classList.add('is-open');
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="' + NUM + '"]'), function (l) { if (isWa(l)) l.setAttribute('aria-expanded', 'true'); });
    drawQr();
    setTimeout(function () { try { msg.focus({ preventScroll: true }); } catch (e) { msg.focus(); } }, 60);
  }
  function close() {
    if (!panel || !panel.classList.contains('is-open')) return;
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    Array.prototype.forEach.call(document.querySelectorAll('[aria-expanded="true"][href*="' + NUM + '"]'), function (l) { l.setAttribute('aria-expanded', 'false'); });
    if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (e) {} }
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!isWa(a) || (panel && panel.contains(a))) {
      if (panel && panel.classList.contains('is-open') && !panel.contains(e.target)) close();
      return;
    }
    e.preventDefault();
    if (panel && panel.classList.contains('is-open')) close(); else open(a);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  /* Mark the links as panel openers for assistive tech. */
  function tag() {
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="' + NUM + '"]'), function (l) {
      if (isWa(l)) { l.setAttribute('aria-controls', 'wa-panel'); l.setAttribute('aria-expanded', 'false'); l.setAttribute('aria-haspopup', 'dialog'); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tag); else tag();
})();
