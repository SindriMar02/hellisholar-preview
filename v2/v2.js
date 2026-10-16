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
      if (e.isIntersecting) { el.classList.add('is-on'); plateIo.disconnect() }
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
})()
