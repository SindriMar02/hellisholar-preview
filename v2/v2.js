// Hellishólar v2: quiet rises, labels drawn onto the photos, condensing header, phone menu, footer wordmark fit.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

  // Hero photo settles in, then its labels draw.
  const hero = document.querySelector('.plate--hero')
  if (hero) {
    const img = hero.querySelector('img')
    const go = () => requestAnimationFrame(() => {
      hero.classList.add('is-in')
      setTimeout(() => hero.classList.add('is-on'), reduce ? 0 : 700)
      setTimeout(() => hero.classList.add('is-drawn'), reduce ? 0 : 2400)
    })
    img.complete ? go() : img.addEventListener('load', go, { once: true })
    setTimeout(go, 2500) // never leave the hero blank on a slow photo
  }

  // One quiet rise, and the labels on the other plates, once each.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      const el = e.target
      if (el.hasAttribute('data-plate')) el.classList.add('is-on')
      else el.classList.add('is-in')
      io.unobserve(el)
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 })
  document.querySelectorAll('[data-rise]').forEach((el) => io.observe(el))
  document.querySelectorAll('[data-plate]:not(.plate--hero)').forEach((el) => {
    const plateIo = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('is-on'); setTimeout(() => el.classList.add('is-drawn'), reduce ? 0 : 1700); plateIo.disconnect() }
    }, { threshold: 0.55 })
    plateIo.observe(el)
  })

  // Header gets its hairline once the page moves.
  const bar = document.querySelector('[data-bar]')
  const onScroll = () => bar.classList.toggle('is-down', scrollY > 24)
  addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  // Phone menu.
  const btn = document.querySelector('[data-menu]')
  const sheet = document.querySelector('[data-sheet]')
  const setMenu = (open) => {
    btn.setAttribute('aria-expanded', String(open))
    if (open) { sheet.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open'))) }
    else { sheet.classList.remove('is-open'); setTimeout(() => { if (btn.getAttribute('aria-expanded') === 'false') sheet.hidden = true }, reduce ? 200 : 450) }
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }
  btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'))
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false) })
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus() } })

  // Footer wordmark fills the width exactly, whatever font lands.
  const word = document.querySelector('[data-fit]')
  let lastW = 0
  const fit = () => {
    if (word.clientWidth === lastW) return
    lastW = word.clientWidth
    const span = word.firstElementChild
    word.style.fontSize = '100px'
    word.style.fontSize = (100 * word.clientWidth / span.offsetWidth).toFixed(2) + 'px'
  }
  new ResizeObserver(() => requestAnimationFrame(fit)).observe(word)
  document.fonts && document.fonts.ready.then(() => { lastW = 0; fit() })

  // ---------- quick-book: no past dates, leave after arrive, stays too small for the party are disabled ----------
  const qb = document.querySelector('[data-qb]')
  if (qb) {
    const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    const day = (s, n) => { const [y, m, d] = s.split('-').map(Number); return iso(new Date(y, m - 1, d + n)) }
    const today = iso(new Date())
    const inp = qb.querySelector('[data-qb-in]'), out = qb.querySelector('[data-qb-out]')
    const unit = qb.querySelector('[name="unit"]'), g = qb.querySelector('[data-qb-g]')
    inp.min = today; out.min = day(today, 1)
    const mark = () => [inp, out].forEach((el) => el.closest('.qb__f').classList.toggle('has-val', !!el.value))
    ;[inp, out].forEach((el) => { el.addEventListener('input', mark); el.addEventListener('change', mark) })
    inp.addEventListener('change', () => {
      if (!inp.value) return
      out.min = day(inp.value, 1)
      if (!out.value || out.value <= inp.value) out.value = day(inp.value, 2)
      mark()
    })
    const fitGuests = () => {
      const n = +g.value
      ;[...unit.options].forEach((o) => { o.disabled = +o.dataset.cap < n })
      if (unit.selectedOptions[0].disabled) { const ok = [...unit.options].find((o) => !o.disabled); if (ok) unit.value = ok.value }
    }
    g.addEventListener('change', fitGuests)
    unit.addEventListener('change', () => { const cap = +unit.selectedOptions[0].dataset.cap; if (+g.value > cap) g.value = String(cap) })
    // empty dates are left out of the link so the booking page simply opens on the calendar
    qb.addEventListener('submit', () => { [inp, out].forEach((el) => { el.disabled = !el.value }); setTimeout(() => { inp.disabled = out.disabled = false }, 0) })
    fitGuests(); mark()
  }

  // ---------- labels on the photos open a small card ----------
  const pinBtns = [...document.querySelectorAll('[data-pin]')]
  const closePins = (except) => pinBtns.forEach((b) => {
    if (b === except) return
    b.setAttribute('aria-expanded', 'false')
    const card = document.getElementById(b.getAttribute('aria-controls'))
    card.classList.remove('is-open'); card.hidden = true
    b.closest('.pin').classList.remove('is-active')
  })
  pinBtns.forEach((b) => {
    const card = document.getElementById(b.getAttribute('aria-controls'))
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const open = b.getAttribute('aria-expanded') !== 'true'
      closePins(b)
      b.setAttribute('aria-expanded', String(open))
      b.closest('.pin').classList.toggle('is-active', open)
      card.hidden = !open
      if (open) requestAnimationFrame(() => card.classList.add('is-open')); else card.classList.remove('is-open')
    })
    card.querySelector('[data-pin-x]').addEventListener('click', (e) => { e.stopPropagation(); closePins(); b.focus() })
    card.addEventListener('click', (e) => e.stopPropagation())
  })
  if (pinBtns.length) {
    document.addEventListener('click', () => closePins())
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { const open = pinBtns.find((b) => b.getAttribute('aria-expanded') === 'true'); if (open) { closePins(); open.focus() } } })
  }

  // ---------- photo lightbox: every framed photo opens large, arrows / swipe / Esc ----------
  const lb = document.querySelector('[data-lb]')
  const shots = [...document.querySelectorAll('main figure.frame img, main .frame img')].filter((im, i, a) => a.indexOf(im) === i)
  if (lb && shots.length && typeof lb.showModal === 'function') {
    const big = (im) => { const set = (im.getAttribute('srcset') || '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); return set[set.length - 1] || im.currentSrc || im.src }
    const lbImg = lb.querySelector('[data-lb-img]'), cap = lb.querySelector('[data-lb-cap]'), count = lb.querySelector('[data-lb-count]')
    let list = [], i = 0, opener = null
    const show = (n) => {
      i = (n + list.length) % list.length
      const im = list[i]
      lbImg.src = big(im); lbImg.alt = im.alt
      cap.textContent = im.alt; count.textContent = list.length > 1 ? (i + 1) + ' / ' + list.length : ''
      lb.classList.toggle('is-single', list.length < 2)
    }
    shots.forEach((im) => {
      const fig = im.closest('.frame')
      fig.classList.add('is-zoomable')
      fig.setAttribute('role', 'button'); fig.tabIndex = 0
      fig.setAttribute('aria-label', (document.documentElement.lang === 'is' ? 'Stækka mynd: ' : 'Enlarge photo: ') + im.alt)
      const open = () => {
        const sec = fig.closest('section') || document
        list = shots.filter((x) => sec.contains(x)); opener = fig
        show(list.indexOf(im)); lb.showModal(); lb.focus(); document.documentElement.classList.add('lb-open')
      }
      fig.addEventListener('click', open)
      fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } })
    })
    lb.querySelector('[data-lb-prev]').addEventListener('click', () => show(i - 1))
    lb.querySelector('[data-lb-next]').addEventListener('click', () => show(i + 1))
    lb.querySelector('[data-lb-x]').addEventListener('click', () => lb.close())
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close() })
    lb.addEventListener('close', () => { document.documentElement.classList.remove('lb-open'); if (opener) opener.focus() })
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1) })
    // swipe: touch events (iOS Safari is dependable with these), mouse drag via pointer events
    let x0 = null
    const swipe = (x) => { if (x0 == null) return; const dx = x - x0; x0 = null; if (Math.abs(dx) > 50 && list.length > 1) show(i + (dx < 0 ? 1 : -1)) }
    let xl = null
    lb.addEventListener('touchstart', (e) => { x0 = xl = e.changedTouches[0].clientX }, { passive: true })
    lb.addEventListener('touchmove', (e) => { xl = e.changedTouches[0].clientX }, { passive: true })
    lb.addEventListener('touchend', (e) => swipe(e.changedTouches[0].clientX))
    lb.addEventListener('touchcancel', () => swipe(xl)) // Safari may cancel a horizontal pan it wanted for itself
    lb.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') x0 = e.clientX })
    lb.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') swipe(e.clientX) })
  }
})()
