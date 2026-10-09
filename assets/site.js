/* Hellishólar spec prototype behaviour. No libraries.
   Reveals follow our Vale rebuild (line split + 50% observer + .15 s stagger); everything else is new:
   grouped dropdown nav, drawer, accordion, the OSM grounds map, the booking widget (SNDR request-mode pattern),
   the book page and the staff view. The booking data is a stand-in: rates are Hellishólar's own Godo rates read
   2026-10-09, availability is deterministic sample data, requests stay in this browser (localStorage). */
(function () {
  'use strict';
  var body = document.body;
  var LANG = body.dataset.lang || 'en';
  var IS = LANG === 'is';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- reveals ---------- */
  function splitLines(el) {
    var html = el.innerHTML.trim().replace(/<(em|b)>([^<]*)<\/\1>/g, function (m, tag, inner) { return inner.trim().split(/\s+/).map(function (w) { return '<' + tag + '>' + w + '</' + tag + '>'; }).join(' '); });
    var words = html.match(/(<[^>]+>[^<\s]*<\/[^>]+>[^\s<]*|[^\s]+)/g) || [];
    var host = el.closest('.headline') || el.parentNode;
    var max = host.getBoundingClientRect().width; // measured before emptying: an empty span has no width
    el.innerHTML = '';
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;';
    el.appendChild(probe);
    var lines = [], line = '';
    words.forEach(function (w) {
      var cand = line ? line + ' ' + w : w;
      probe.innerHTML = cand;
      if (line && probe.getBoundingClientRect().width > max + 1) { lines.push(line); line = w; } else line = cand;
    });
    if (line) lines.push(line);
    probe.remove();
    lines.forEach(function (t, i) {
      var m = document.createElement('span'); m.className = 'lines__mask';
      var l = document.createElement('span'); l.className = 'lines__line'; l.style.transitionDelay = (0.15 * i) + 's';
      l.innerHTML = t; m.appendChild(l); el.appendChild(m);
    });
  }
  function initReveals() {
    var els = $$('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) return;
    $$('[data-reveal="lines"]').forEach(function (el) { el.style.display = 'block'; splitLines(el); });
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) return; // already on screen at load: no hide, no flash
      el.classList.add('is-hidden');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.remove('is-hidden'); io.unobserve(en.target); } });
    }, { threshold: 0.2 });
    els.forEach(function (el) { if (el.classList.contains('is-hidden')) io.observe(el); });
  }

  /* ---------- nav dropdowns + drawer ---------- */
  function initNav() {
    $$('[data-dd]').forEach(function (g) {
      var btn = $('.bar__group-btn', g);
      btn.addEventListener('click', function () {
        var open = !g.classList.contains('is-open');
        $$('[data-dd].is-open').forEach(function (o) { o.classList.remove('is-open'); $('.bar__group-btn', o).setAttribute('aria-expanded', 'false'); });
        g.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open));
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-dd]')) $$('[data-dd].is-open').forEach(function (o) { o.classList.remove('is-open'); $('.bar__group-btn', o).setAttribute('aria-expanded', 'false'); });
    });
    // Menu: the bar's button morphs to an X and stays on top; the panel slides down under the bar, links stagger in.
    var drawer = $('#menu'), btn = $('[data-open-menu]'), y = 0, isOpen = false, timer;
    var label = btn ? $('.bar__menu-label', btn) : null;
    function open() {
      clearTimeout(timer); isOpen = true; y = window.scrollY; drawer.hidden = false; drawer.scrollTop = 0;
      body.style.position = 'fixed'; body.style.top = -y + 'px'; body.style.left = '0'; body.style.right = '0';
      body.classList.add('is-menu-open');
      void drawer.offsetHeight; drawer.classList.add('is-open'); // reflow first so the panel transitions from closed
      btn.setAttribute('aria-expanded', 'true'); if (label) label.textContent = btn.dataset.close;
    }
    function close(restore) {
      if (!isOpen) return; isOpen = false;
      drawer.classList.remove('is-open'); body.classList.remove('is-menu-open');
      btn.setAttribute('aria-expanded', 'false'); if (label) label.textContent = btn.dataset.open;
      body.style.position = ''; body.style.top = ''; body.style.left = ''; body.style.right = '';
      window.scrollTo(0, y);
      timer = setTimeout(function () { drawer.hidden = true; }, reduce ? 0 : 260);
      if (restore !== false) btn.focus();
    }
    if (btn) btn.addEventListener('click', function (e) { isOpen ? close(e.detail === 0) : open(); }); // focus ring only after keyboard use
    $$('#menu a').forEach(function (a) { a.addEventListener('click', function () { close(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && isOpen) { // focus loops between the menu button and the panel
        var f = [btn].concat($$('a[href], button', drawer)), firstEl = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
      if (e.key !== 'Escape') return;
      if (isOpen) close();
      $$('[data-dd].is-open').forEach(function (o) { o.classList.remove('is-open'); $('.bar__group-btn', o).setAttribute('aria-expanded', 'false'); });
    });
    window.addEventListener('pageshow', function () { if (isOpen) close(false); });
  }


  /* ---------- masthead dock (home): the bar's own wordmark, big and centred on the .mast slot at the top,
     lands in its bar seat as the slot scrolls up. Logo-dock pattern from our Orkureiturinn build:
     measure() invalidates the memo (a resize changes the geometry while k stays 1), the menu forces the
     docked seat, bfcache/visibility re-measure. Reduced motion: no dock, the slot shows a static word. ---------- */
  var dock = { measure: function () {}, tick: function () {} };
  function initDock() {
    var mast = $('[data-mast]'), word = $('.bar__word'), bar = $('.bar');
    if (!mast || !word || !bar) return;
    if (reduce) { body.classList.add('mast--static'); return; }
    var slot = $('.mast__word', mast), a = .5, l0, rest, sc = 1, span = 1, lastK = -1, ready = false;
    function measure() {
      word.style.transform = 'none';
      // an inline-block span, not a Range: WebKit returns a zero rect for a Range over visibility:hidden text,
      // which made sc 0 and the big word scale to nothing on iOS (docked state, sc^0, still looked fine)
      var w = word.getBoundingClientRect(), r = slot.getBoundingClientRect(), g = slot.firstElementChild.getBoundingClientRect(), y = window.scrollY;
      if (!w.width || !r.width || !g.width) { ready = false; word.style.transform = ''; bar.classList.remove('is-landing'); return; }
      sc = g.width / w.width;
      // anchor: the seat's own alignment (centred on desktop, left on phones), so the word shrinks toward its seat
      a = getComputedStyle(word.parentNode).alignItems === 'flex-start' ? 0 : .5;
      l0 = { cx: w.left + w.width * a, bottom: w.bottom, left: w.left, w: w.width };
      rest = { cx: g.left + g.width * a, bottom: r.bottom + y }; // document coordinates: glyph run's anchor, line box bottom
      span = Math.max(1, mast.getBoundingClientRect().bottom + y - bar.offsetHeight);
      ready = true; lastK = -1; tick(true);
    }
    function apply(k) {
      if (k < .0005) { word.style.transform = ''; bar.classList.remove('is-landing'); return; }
      bar.classList.add('is-landing');
      // scale is geometric (sc^k), so it shrinks evenly to the eye and never outgrows the space above it.
      // The bottom edge rides the slot 1:1 (word and photo move as one, no detaching); only over the last
      // HANDOFF of the travel does it blend into the bar seat, smoothstepped so there is no corner.
      var y = window.scrollY, s = Math.pow(sc, k), H = .22;
      var e = k >= H ? 1 : (function (t) { return t * t * (3 - 2 * t); })(k / H);
      var cx = l0.cx + (rest.cx - l0.cx) * k, bottom = l0.bottom + (rest.bottom - y - l0.bottom) * e;
      var tx = cx - s * l0.w * a - l0.left, ty = bottom - l0.bottom;
      word.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
    }
    function tick(force) {
      if (!ready) return;
      var k = body.classList.contains('is-menu-open') ? 0 : Math.min(1, Math.max(0, 1 - window.scrollY / span));
      if (force === true || Math.abs(k - lastK) > .0005) { apply(k); lastK = k; }
    }
    var queued = false;
    window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; tick(); }); } }, { passive: true });
    var rt; function later() { clearTimeout(rt); rt = setTimeout(measure, 60); }
    window.addEventListener('resize', later);
    // the webfont can swap in after fonts.ready has already resolved (cold network on iOS): the glyph widths change and a
    // stale measurement left the big word mis-scaled or gone. Re-measure whenever either word's box changes size.
    if (window.ResizeObserver) { var ro = new ResizeObserver(later); ro.observe(slot.firstElementChild); ro.observe(word); }
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', later);
    window.addEventListener('load', later);
    window.addEventListener('pageshow', function (e) { if (e.persisted) measure(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { lastK = -1; tick(); } });
    // menu open/close: glide between the big word and the bar seat instead of jumping
    new MutationObserver(function (m) {
      var was = / is-menu-open /.test(' ' + (m[0].oldValue || '') + ' '), now = body.classList.contains('is-menu-open');
      if (was === now) return;
      word.classList.add('is-gliding'); lastK = -1; tick();
      clearTimeout(word._g); word._g = setTimeout(function () { word.classList.remove('is-gliding'); }, 650);
    }).observe(body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    dock = { measure: measure, tick: tick };
    measure();
  }

  /* ---------- page transitions: leave fade where cross-document view transitions are unsupported ---------- */
  function initLeave() {
    if (reduce || ('onpagereveal' in window)) return; // browsers with @view-transition handle it in CSS
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.hash && u.pathname === location.pathname || /^(mailto|tel):/.test(a.getAttribute('href'))) return;
      e.preventDefault(); body.classList.add('is-leaving');
      setTimeout(function () { location.href = a.href; }, 220);
    });
    window.addEventListener('pageshow', function () { body.classList.remove('is-leaving'); });
  }

  /* ---------- stagger groups for the card/list reveals ---------- */
  function tagReveals() {
    var groups = ['.stays', '.grounds__cards', '.gallery', '.food', '.rail', '.acc', '.facts', '.foot__cols', '.summary__why', '.camp__media', '.staff__top'];
    groups.forEach(function (g) {
      $$(g).forEach(function (wrap) {
        Array.prototype.slice.call(wrap.children).forEach(function (el, i) {
          if (el.hasAttribute('data-reveal')) return;
          el.setAttribute('data-reveal', 'up'); el.style.setProperty('--i', Math.min(i, 6));
        });
      });
    });
    $$('.heading__lede, .split__lede, .grounds__lede, .page-head__lede, .quote__inner, .notice__card').forEach(function (el) { if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', 'fade'); });
  }

  /* ---------- accordion ---------- */
  function initAccordions() {
    $$('.acc__head').forEach(function (b) {
      b.addEventListener('click', function () {
        var item = b.closest('.acc__item'), open = !item.classList.contains('is-open');
        item.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* ---------- grounds map ---------- */
  function initGrounds() {
    $$('.grounds').forEach(function (sec) {
      var places = $$('.place', sec), zones = $$('.zone', sec), tags = $$('.grounds__tag', sec);
      function pick(k, scroll) {
        places.forEach(function (p) { var on = p.dataset.place === k; p.classList.toggle('is-active', on); p.setAttribute('aria-selected', String(on)); if (on && scroll && window.innerWidth < 1024) p.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'start' }); });
        zones.forEach(function (z) { z.classList.toggle('is-active', z.dataset.zone === k); });
        tags.forEach(function (t) { t.classList.toggle('is-active', t.dataset.tag === k); });
      }
      places.forEach(function (p) {
        p.addEventListener('click', function () { pick(p.dataset.place); });
        p.addEventListener('mouseenter', function () { if (window.matchMedia('(hover: hover)').matches) pick(p.dataset.place); });
      });
      zones.forEach(function (z) {
        z.addEventListener('click', function () { pick(z.dataset.zone, true); });
        z.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(z.dataset.zone, true); } });
        z.addEventListener('mouseenter', function () { if (window.matchMedia('(hover: hover)').matches) pick(z.dataset.zone); });
      });
      var first = sec.closest('[data-page="golf"]') ? 'golf' : 'hotel';
      pick(first);
    });
  }

  /* ---------- booking model ---------- */
  var DAY = 864e5;
  var CAP = { 'hotel-twin': 2, 'hotel-single': 1, studio: 2, 'cottage-1': 3, 'cottage-2': 6 };
  // ISK a night for two guests, +1,900 per extra guest in cottages: Hellishólar's own Godo rates read 2026-10-09 on
  // sample dates (Oct, Nov, Dec 2026; Jan, Feb, Mar, Apr, May, Jun, Aug, Sep 2027). July showed no availability,
  // so July gets no price and the reply carries it.
  function nightly(unit, d, guests) {
    var m = d.getMonth() + 1;
    if (m === 7) return null;
    var summer = m >= 5 && m <= 9, early = m <= 4; // Jan to Apr matched March; Oct to Dec matched November
    var extra = Math.max(0, guests - 2) * 1900;
    switch (unit) {
      case 'hotel-twin': return summer ? 40500 : 25200;
      case 'hotel-single': return summer ? 28800 : early ? 20700 : 22500;
      case 'studio': return summer ? 36000 : early ? 18000 : 22500;
      case 'cottage-1': return (summer ? 40500 : 22500) + extra;
      case 'cottage-2': return (summer ? (m === 8 ? 63000 : 49500) : early ? 27000 : 36000) + extra;
    }
    return null;
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  function full(unit, d) { return hash(unit + key(d)) % 100 < 13; } // sample data
  function sod(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function add(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function key(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function isk(n) { return IS ? n.toLocaleString('de-DE') + ' kr.' : 'ISK ' + n.toLocaleString('en-US'); }
  var W = IS ? {
    wd: ['Má', 'Þr', 'Mi', 'Fi', 'Fö', 'La', 'Su'], mo: ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'],
    pickArrive: 'Veldu komudaginn', pickLeave: 'Veldu nú brottfarardaginn', nights: function (n) { return n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? 'nótt' : 'nætur'); },
    fullNote: 'Ein af þessum nóttum er full. Prófaðu aðrar dagsetningar eða annan stað.', total: 'Samtals', summer: 'Ekkert verð er komið fyrir þessar nætur á bókunarsíðunni. Móttakan svarar með verðinu.',
    tooMany: function (n) { return 'Hér gista mest ' + n + '. Veldu stærra hús eða færri gesti.'; }, pickDates: 'Veldu komu- og brottfarardag.', full: 'fullt', guests: 'gestir', guest: 'gestur',
    unit: { 'hotel-twin': 'Tveggja manna hótelherbergi', 'hotel-single': 'Eins manns hótelherbergi', studio: 'Stúdíó sumarhús', 'cottage-1': 'Sumarhús, eitt svefnherbergi', 'cottage-2': 'Sumarhús, tvö svefnherbergi' },
    arrive: 'Koma', leave: 'Brottför', stay: 'Dvöl', place: 'Staður', who: 'Gestir', bfast: 'Morgunverður', bfastAsk: 'Óskað, verð staðfest í svari', price: 'Verð', onReply: 'Staðfest í svari',
    dayLong: function (d) { return ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur'][d.getDay()] + ' ' + d.getDate() + '. ' + this.mo[d.getMonth()]; },
    short: function (d) { return d.getDate() + '. ' + this.mo[d.getMonth()].slice(0, 3); }
  } : {
    wd: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], mo: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    pickArrive: 'Pick the night you arrive', pickLeave: 'Now pick the morning you leave', nights: function (n) { return n + ' night' + (n === 1 ? '' : 's'); },
    fullNote: 'One of those nights is full. Try other dates or another place.', total: 'Total', summer: 'No rate is open for these nights on the booking page yet. The front desk replies with the price.',
    tooMany: function (n) { return 'This one sleeps ' + n + '. Pick a bigger place or fewer guests.'; }, pickDates: 'Pick the day you arrive and the day you leave.', full: 'full', guests: 'guests', guest: 'guest',
    unit: { 'hotel-twin': 'Hotel twin room', 'hotel-single': 'Hotel single room', studio: 'Studio cottage', 'cottage-1': 'One-bedroom cottage', 'cottage-2': 'Two-bedroom cottage' },
    arrive: 'Arrive', leave: 'Leave', stay: 'Stay', place: 'Place', who: 'Guests', bfast: 'Breakfast', bfastAsk: 'Requested, price in the reply', price: 'Price', onReply: 'Confirmed in the reply',
    dayLong: function (d) { return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()] + ' ' + d.getDate() + ' ' + this.mo[d.getMonth()]; },
    short: function (d) { return d.getDate() + ' ' + this.mo[d.getMonth()].slice(0, 3); }
  };
  function quote(s) {
    if (!s.start || !s.end) return null;
    var total = 0, open = true, anyFull = false;
    for (var d = s.start; d < s.end; d = add(d, 1)) {
      if (full(s.unit, d)) anyFull = true;
      var n = nightly(s.unit, d, s.guests);
      if (n == null) open = false; else total += n;
    }
    return { nights: Math.round((s.end - s.start) / DAY), total: open ? total : null, anyFull: anyFull };
  }

  /* ---------- booking widget ---------- */
  /* THE STAY PICKER, ported from our SNDR booking picker (Riverbank StayPicker.tsx, audited on a real iPhone):
       1. three-rule click machine: a third click restarts, no clear button to explain;
       2. past blocked, booked nights struck, a range CROSSING a booked night restarts there and says why;
       3. a booked night is still a legal CHECKOUT, so the crossing test runs over [start, end-1];
       4. hover preview on fine pointers only (iOS fires mouseover before click);
       5. always six rows, opens on a bookable month, two months only when the card can hold them. */
  var X = IS ? {
    booked: 'bókað', addDate: 'Veldu dag', taken: function (d) { return W.short(d) + ' er þegar bókað. Gráu næturnar eru uppteknar.'; },
    crossed: function (d) { return 'Bókuð nótt er á milli þessara daga, svo þetta er ný koma ' + W.short(d) + '. Veldu brottfarardaginn.'; },
    hint: 'Veldu komudaginn, svo brottfarardaginn.', now: 'Veldu nú brottfarardaginn', selected: function (n) { return W.nights(n) + ' valdar'; },
    sleeps: function (n) { return 'Fyrir allt að ' + n; }, per: function (n) { return ' × ' + W.nights(n); }
  } : {
    booked: 'booked', addDate: 'Add date', taken: function (d) { return W.short(d) + ' is already taken. The nights in grey are booked.'; },
    crossed: function (d) { return 'A booked night sits between those dates, so this is a new arrival on ' + W.short(d) + '. Pick the morning you leave.'; },
    hint: 'Pick the night you arrive, then the morning you leave.', now: 'Now pick the morning you leave', selected: function (n) { return W.nights(n) + ' selected'; },
    sleeps: function (n) { return 'Sleeps up to ' + n; }, per: function (n) { return ' × ' + W.nights(n); }
  };
  function initWidget(form) {
    var today = sod(new Date());
    var q = new URLSearchParams(location.search);
    var s = { unit: 'hotel-twin', start: null, end: null, hover: null, guests: 2 };
    var qu = q.get('unit'); if (CAP[qu]) s.unit = qu;
    var qi = parse(q.get('in')), qo = parse(q.get('out'));
    if (qi && qo && qi >= today && qo > qi) { s.start = qi; s.end = qo; }
    var qg = parseInt(q.get('g'), 10); if (qg >= 1 && qg <= 6) s.guests = Math.min(qg, CAP[s.unit]);
    var left = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    var first = new Date(today.getFullYear(), today.getMonth(), 1);
    var month = s.start ? new Date(s.start.getFullYear(), s.start.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth() + (left < 7 ? 1 : 0), 1);
    var last = new Date(today.getFullYear(), today.getMonth() + 17, 1);
    var grids = $('[data-cal-months]', form), live = $('[data-cal-live]', form), noteEl = $('[data-cal-note]', form), read = $('[data-cal-read]', form);
    var sum = $('[data-sum]', form), err = $('[data-err]', form), out = $('[data-guests]', form);
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    $$('input[name="unit"]', form).forEach(function (r) { r.checked = r.value === s.unit; });

    function crosses(a, b) { for (var d = a; d < b; d = add(d, 1)) if (full(s.unit, d)) return true; return false; }
    function note(text) { noteEl.textContent = text || ''; noteEl.hidden = !text; }
    function monthHTML(m, idx) {
      var lead = (m.getDay() + 6) % 7, firstCell = add(m, -lead), h = '';
      var previewTo = s.end || (s.start && s.hover && s.hover > s.start ? s.hover : null);
      for (var i = 0; i < 42; i++) {
        var d = add(firstCell, i), inMonth = d.getMonth() === m.getMonth(), past = d < today, tk = !past && full(s.unit, d);
        var cls = 'stay__d';
        if (!inMonth) cls += ' is-out';
        if (past) cls += ' is-past';
        if (tk) cls += ' is-taken';
        if (s.start && key(d) === key(s.start)) cls += ' is-start';
        if (s.end && key(d) === key(s.end)) cls += ' is-end';
        if (s.start && previewTo && d > s.start && d < previewTo) cls += ' is-in';
        if (!s.end && previewTo && key(d) === key(previewTo)) cls += ' is-preview';
        if (key(d) === key(today)) cls += ' is-today';
        var pressed = (s.start && key(d) === key(s.start)) || (s.end && key(d) === key(s.end));
        h += '<button type="button" class="' + cls + '" data-d="' + key(d) + '"' + (past ? ' disabled' : '') + ' aria-label="' + W.dayLong(d) + (tk ? ', ' + X.booked : '') + '"' + (pressed ? ' aria-pressed="true"' : '') + '>' + d.getDate() + '</button>';
      }
      return '<div class="stay__m' + (idx ? ' stay__m2' : '') + '"><p class="stay__cap">' + W.mo[m.getMonth()] + ' ' + m.getFullYear() + '</p><div class="stay__wd" aria-hidden="true">' + W.wd.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div><div class="stay__g' + (s.end ? ' has-end' : '') + '">' + h + '</div></div>';
    }
    function render() {
      grids.innerHTML = monthHTML(month, 0) + monthHTML(new Date(month.getFullYear(), month.getMonth() + 1, 1), 1);
      live.textContent = W.mo[month.getMonth()] + ' ' + month.getFullYear();
      $('[data-cal-prev]', form).disabled = month <= first;
      $('[data-cal-next]', form).disabled = month >= last;
      var ci = $('[data-ci]', form), co = $('[data-co]', form);
      ci.textContent = s.start ? W.short(s.start) : X.addDate; ci.classList.toggle('is-empty', !s.start);
      co.textContent = s.end ? W.short(s.end) : X.addDate; co.classList.toggle('is-empty', !s.end);
      read.innerHTML = s.start && s.end ? '<span>' + X.selected(Math.round((s.end - s.start) / DAY)) + '</span>'
        : s.start ? '<strong>' + W.short(s.start) + '</strong><span>' + X.now + '</span>' : '<span>' + X.hint + '</span>';
      summarize();
    }
    function summarize() {
      err.hidden = true;
      var cap = CAP[s.unit];
      $('[data-sleeps]', form).textContent = X.sleeps(cap);
      out.textContent = s.guests;
      $('[data-step="-1"]', form).disabled = s.guests <= 1;
      $('[data-step="1"]', form).disabled = s.guests >= cap;
      var qv = quote(s), html = '';
      if (qv) {
        if (qv.total != null) {
          var per = Math.round(qv.total / qv.nights), even = true;
          for (var d = s.start; d < s.end; d = add(d, 1)) if (nightly(s.unit, d, s.guests) !== per) even = false;
          html = (even ? '<div class="bk-quote__row"><span>' + isk(per) + X.per(qv.nights) + '</span><span>' + isk(qv.total) + '</span></div>'
              : '<div class="bk-quote__row"><span>' + W.nights(qv.nights) + '</span><span>' + isk(qv.total) + '</span></div>') +
            '<div class="bk-quote__row bk-quote__total"><span>' + W.total + '</span><span>' + isk(qv.total) + '</span></div>';
        } else html = '<p class="bk-quote__note">' + W.summer + '</p>';
      }
      sum.innerHTML = html; sum.hidden = !html;
      form.dispatchEvent(new CustomEvent('stay:change', { detail: { s: s, q: qv, ok: !!qv && !qv.anyFull && s.guests <= cap } }));
    }
    function pick(d) {
      if (d < today) return;
      if (full(s.unit, d) && (!s.start || s.end)) { note(X.taken(d)); return; }
      if (!s.start || s.end || d <= s.start) { s.start = d; s.end = null; note(''); }
      else if (crosses(s.start, d)) { s.start = d; s.end = null; note(X.crossed(d)); }
      else { s.end = d; note(''); }
      s.hover = null; render();
    }
    grids.addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]'); if (!b || b.disabled) return;
      var k = b.dataset.d; pick(parse(k));
      var again = grids.querySelector('[data-d="' + k + '"]'); if (again) again.focus({ preventScroll: true });
    });
    grids.addEventListener('mouseover', function (e) {
      if (!fine.matches || !s.start || s.end) return; // touch fires mouseover before click; re-rendering would swallow the tap
      var b = e.target.closest('[data-d]'); if (!b) return;
      var d = parse(b.dataset.d); if (!s.hover || key(d) !== key(s.hover)) { s.hover = d; render(); }
    });
    grids.addEventListener('mouseleave', function () { if (s.hover) { s.hover = null; render(); } });
    $('[data-cal-prev]', form).addEventListener('click', function () { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); render(); });
    $('[data-cal-next]', form).addEventListener('click', function () { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); render(); });
    $$('[data-focus-cal]', form).forEach(function (b) { b.addEventListener('click', function () { var t = grids.querySelector('.stay__d:not(:disabled)'); if (t) { t.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); t.focus({ preventScroll: true }); } }); });
    $$('input[name="unit"]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        s.unit = r.value; s.guests = Math.min(s.guests, CAP[s.unit]);
        // a range picked against another unit's calendar must not silently survive
        if (s.start && s.end && crosses(s.start, s.end)) { s.start = s.end = null; note(''); }
        render();
      });
    });
    $$('[data-step]', form).forEach(function (b) {
      b.addEventListener('click', function () { s.guests = Math.min(CAP[s.unit], Math.max(1, s.guests + parseInt(b.dataset.step, 10))); summarize(); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var qv = quote(s);
      if (!qv) { err.textContent = W.pickDates; err.hidden = false; return; }
      location.href = form.getAttribute('action') + '?unit=' + s.unit + '&in=' + key(s.start) + '&out=' + key(s.end) + '&g=' + s.guests;
    });
    form.stay = s;
    render();
  }

  /* ---------- book page ---------- */
  var STORE = 'hh-requests';
  function readStore() { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch (e) { return []; } }
  function writeStore(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) { /* private mode: the flow still completes */ } }
  function initBookPage() {
    var flow = $('[data-bookflow]'); if (!flow) return;
    var wForm = $('[data-booking-page]'), dForm = $('[data-details-form]'), sumBody = $('[data-summary-body]'), steps = $$('[data-steps] li');
    var latest = { ok: false };
    function step(i) { steps.forEach(function (li, k) { li.toggleAttribute('aria-current', k === i); li.classList.toggle('is-done', k < i); if (k === i) li.setAttribute('aria-current', 'step'); }); }
    function line(a, b) { return '<p class="summary__line"><span>' + a + '</span><span>' + b + '</span></p>'; }
    wForm.addEventListener('stay:change', function (e) {
      var s = e.detail.s, q = e.detail.q; latest = e.detail;
      var h = line(W.place, W.unit[s.unit]);
      if (s.start) h += line(W.arrive, W.short(s.start));
      if (s.end) h += line(W.leave, W.short(s.end));
      h += line(W.who, String(s.guests));
      if (q) h += '<p class="summary__line summary__total"><span>' + W.total + '</span><span>' + (q.total != null ? isk(q.total) : W.onReply) + '</span></p>';
      sumBody.innerHTML = h;
      step(e.detail.ok ? 1 : 0);
    });
    dForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = [];
      var name = $('#d-name'), email = $('#d-email');
      [[name, name.value.trim().length < 2], [email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())]].forEach(function (p) {
        p[0].setAttribute('aria-invalid', String(p[1])); $('#' + p[0].id + '-err').hidden = !p[1]; if (p[1]) bad.push(p[0]);
      });
      var dErr = $('[data-dates-err]'); dErr.hidden = latest.ok;
      if (!latest.ok) { $('#book').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
      if (bad.length) { bad[0].focus(); return; }
      var s = latest.s, q = latest.q;
      var btn = $('[data-send]'); btn.disabled = true; btn.textContent = IS ? 'Sendi' : 'Sending';
      var ref = 'HH-' + String(10000 + (hash(name.value + Date.now()) % 89999));
      var list = readStore();
      list.unshift({ ref: ref, unit: s.unit, in: key(s.start), out: key(s.end), guests: s.guests, name: name.value.trim(), email: email.value.trim(),
        phone: $('#d-phone').value.trim(), note: $('#d-note').value.trim(), breakfast: $('[name="breakfast"]', dForm).checked, total: q.total, status: 'new', created: Date.now(), lang: LANG });
      writeStore(list.slice(0, 30));
      setTimeout(function () {
        flow.hidden = true;
        var done = $('[data-done]'); done.hidden = false;
        $('[data-done-text]').textContent = IS ? 'Tilvísunin þín er ' + ref + '. Móttakan staðfestir í tölvupósti. Ekkert er rukkað fyrr en þá.' : 'Your reference is ' + ref + '. The front desk confirms by email. Nothing is charged until then.';
        step(2); window.scrollTo(0, 0); done.focus();
      }, reduce ? 0 : 450);
    });
  }

  /* ---------- simple request forms ---------- */
  function initForms() {
    $$('[data-form]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var bad = [];
        $$('[required]', f).forEach(function (i) {
          var v = i.value.trim(), wrong = !v || (i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
          i.setAttribute('aria-invalid', String(wrong));
          var er = $('#' + i.id + '-err'); if (er) er.hidden = !wrong;
          if (wrong) bad.push(i);
        });
        if (bad.length) { bad[0].focus(); return; }
        var msg = $('[data-done-msg]', f); msg.hidden = false; msg.focus(); f.reset();
      });
    });
  }

  /* ---------- staff view ---------- */
  function initStaff() {
    var root = $('[data-staff]'); if (!root) return;
    var today = sod(new Date());
    var L = IS ? { sample: 'Dæmi', fresh: 'Ný', ok: 'Staðfest', no: 'Hafnað', accept: 'Staðfesta', decline: 'Hafna', undo: 'Afturkalla', none: 'Enginn enn', arrive: ' koma í dag' } :
      { sample: 'Sample', fresh: 'New', ok: 'Confirmed', no: 'Declined', accept: 'Confirm', decline: 'Decline', undo: 'Undo', none: 'Nobody yet', arrive: ' arriving today' };
    var samples = [
      { ref: 'HH-20417', unit: 'cottage-2', in: key(today), out: key(add(today, 2)), guests: 4, name: 'Sigrún Ólafsdóttir', email: 'sigrun@example.is', total: null, status: 'ok', sample: true },
      { ref: 'HH-20419', unit: 'hotel-twin', in: key(add(today, 3)), out: key(add(today, 4)), guests: 2, name: 'Tomasz Nowak', email: 'tomasz@example.pl', total: null, status: 'new', sample: true },
      { ref: 'HH-20422', unit: 'studio', in: key(add(today, 9)), out: key(add(today, 11)), guests: 2, name: 'Léa Fournier', email: 'lea@example.fr', total: null, status: 'new', sample: true },
      { ref: 'HH-20402', unit: 'cottage-1', in: key(add(today, 15)), out: key(add(today, 18)), guests: 3, name: 'Grímur Hallsson', email: 'grimur@example.is', total: null, status: 'no', sample: true },
    ];
    samples.forEach(function (r) { var q = quote({ unit: r.unit, start: parse(r.in), end: parse(r.out), guests: r.guests }); r.total = q && q.total; });
    var saved = readStore().map(function (r) { if (r.status === 'new' || r.status === 'ok' || r.status === 'no') return r; r.status = 'new'; return r; });
    var rows = saved.concat(samples);
    var tb = $('[data-rows]', root);
    function chip(r) { return '<span class="chip chip--' + (r.status === 'ok' ? 'ok' : r.status === 'no' ? 'no' : 'new') + '">' + (r.status === 'ok' ? L.ok : r.status === 'no' ? L.no : L.fresh) + '</span>' + (r.sample ? '<span class="chip chip--sample">' + L.sample + '</span>' : ''); }
    function draw() {
      tb.innerHTML = rows.map(function (r, i) {
        var a = parse(r.in), b = parse(r.out), n = Math.round((b - a) / DAY);
        var acts = r.status === 'new' ? '<button class="btn btn--solid" type="button" data-act="ok" data-i="' + i + '">' + L.accept + '</button><button class="btn btn--outline-dark" type="button" data-act="no" data-i="' + i + '">' + L.decline + '</button>' :
          '<button class="btn btn--outline-dark" type="button" data-act="new" data-i="' + i + '">' + L.undo + '</button>';
        return '<tr><td class="staff__who"><b>' + esc(r.name) + '</b><small>' + esc(r.ref) + ' · ' + esc(r.email) + '</small></td><td>' + W.unit[r.unit] + '</td><td>' + W.short(a) + (IS ? ' til ' : ' to ') + W.short(b) + '<br><small>' + W.nights(n) + '</small></td><td>' + r.guests + '</td><td>' + (r.total != null ? isk(r.total) : W.onReply) + '</td><td>' + chip(r) + '</td><td><div class="staff__acts">' + acts + '</div></td></tr>';
      }).join('');
      $('[data-empty]', root).hidden = rows.length > 0;
      var arr = rows.filter(function (r) { return r.in === key(today) && r.status !== 'no'; });
      $('[data-arrivals]', root).textContent = arr.length ? arr.length + L.arrive : L.none;
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    tb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var r = rows[+b.dataset.i]; r.status = b.dataset.act;
      if (!r.sample) writeStore(rows.filter(function (x) { return !x.sample; }));
      draw();
    });
    draw();
    // sample occupancy grid
    var occ = $('[data-occ]', root), types = ['hotel-twin', 'studio', 'cottage-1', 'cottage-2'];
    var head = '<div class="occ__row"><span></span>' + Array.from({ length: 14 }, function (_, i) { var d = add(today, i); return '<span class="occ__head">' + d.getDate() + '</span>'; }).join('') + '</div>';
    occ.innerHTML = head + types.map(function (t) {
      return '<div class="occ__row"><span>' + W.unit[t] + '</span>' + Array.from({ length: 14 }, function (_, i) { var l = 1 + hash(t + i + key(today)) % 3; return '<span class="occ__cell" data-l="' + l + '" title="' + ['', 'low', 'half', 'full'][l] + '"></span>'; }).join('') + '</div>';
    }).join('');
  }

  /* ---------- boot ---------- */
  function boot() {
    tagReveals(); initDock(); initNav(); initLeave(); initAccordions(); initGrounds(); initForms(); initStaff();
    $$('form[data-booking]').forEach(initWidget);
    initBookPage();
    var go = function () { dock.measure(); initReveals(); body.classList.remove('is-loading'); };
    if (document.fonts && document.fonts.ready) { var done = false; document.fonts.ready.then(function () { if (!done) { done = true; go(); } }); setTimeout(function () { if (!done) { done = true; go(); } }, 1200); } else go();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
