const panel = document.getElementById('filters-panel')
const bar = document.getElementById('filter-scrollbar')
const track = document.getElementById('filter-scroll-track')
const thumb = document.getElementById('filter-scroll-thumb')
const up = document.getElementById('filter-scroll-up')
const down = document.getElementById('filter-scroll-down')

if (panel && bar && track && thumb) {
  let dragging = false
  let startY = 0
  let startTop = 0
  let idleTimer = 0

  const metrics = () => {
    const maxScroll = Math.max(0, panel.scrollHeight - panel.clientHeight)
    const trackHeight = track.clientHeight
    const ratio = panel.scrollHeight ? panel.clientHeight / panel.scrollHeight : 1
    const thumbHeight = Math.max(42, Math.min(trackHeight, trackHeight * ratio))
    const maxTop = Math.max(0, trackHeight - thumbHeight)
    const top = maxScroll ? (panel.scrollTop / maxScroll) * maxTop : 0
    return { maxScroll, trackHeight, thumbHeight, maxTop, top }
  }

  const wake = () => {
    bar.classList.remove('is-idle')
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => bar.classList.add('is-idle'), 1200)
  }

  const update = () => {
    const m = metrics()
    bar.classList.toggle('is-hidden', m.maxScroll < 3)
    thumb.style.height = `${m.thumbHeight}px`
    thumb.style.transform = `translateY(${m.top}px)`
    const now = m.maxScroll ? Math.round((panel.scrollTop / m.maxScroll) * 100) : 0
    thumb.setAttribute('aria-valuenow', String(now))
    up.disabled = panel.scrollTop <= 0
    down.disabled = panel.scrollTop >= m.maxScroll - 1
  }

  const scrollBy = (amount) => panel.scrollBy({ top: amount, behavior: 'smooth' })
  up?.addEventListener('click', () => { wake(); scrollBy(-Math.max(180, panel.clientHeight * .58)) })
  down?.addEventListener('click', () => { wake(); scrollBy(Math.max(180, panel.clientHeight * .58)) })
  panel.addEventListener('scroll', () => { update(); wake() }, { passive: true })

  track.addEventListener('pointerdown', (event) => {
    if (event.target === thumb) return
    const rect = track.getBoundingClientRect()
    const m = metrics()
    const desiredTop = Math.max(0, Math.min(m.maxTop, event.clientY - rect.top - m.thumbHeight / 2))
    panel.scrollTop = m.maxTop ? (desiredTop / m.maxTop) * m.maxScroll : 0
    update(); wake()
  })

  thumb.addEventListener('pointerdown', (event) => {
    dragging = true
    startY = event.clientY
    startTop = metrics().top
    thumb.setPointerCapture?.(event.pointerId)
    event.preventDefault(); wake()
  })
  thumb.addEventListener('pointermove', (event) => {
    if (!dragging) return
    const m = metrics()
    const top = Math.max(0, Math.min(m.maxTop, startTop + event.clientY - startY))
    panel.scrollTop = m.maxTop ? (top / m.maxTop) * m.maxScroll : 0
    update(); wake()
  })
  const stop = (event) => {
    if (!dragging) return
    dragging = false
    try { thumb.releasePointerCapture?.(event.pointerId) } catch {}
  }
  thumb.addEventListener('pointerup', stop)
  thumb.addEventListener('pointercancel', stop)

  thumb.addEventListener('keydown', (event) => {
    const step = Math.max(80, panel.clientHeight * .2)
    if (event.key === 'ArrowUp') { panel.scrollTop -= step; event.preventDefault() }
    else if (event.key === 'ArrowDown') { panel.scrollTop += step; event.preventDefault() }
    else if (event.key === 'PageUp') { panel.scrollTop -= panel.clientHeight * .82; event.preventDefault() }
    else if (event.key === 'PageDown') { panel.scrollTop += panel.clientHeight * .82; event.preventDefault() }
    else if (event.key === 'Home') { panel.scrollTop = 0; event.preventDefault() }
    else if (event.key === 'End') { panel.scrollTop = panel.scrollHeight; event.preventDefault() }
    update(); wake()
  })

  new ResizeObserver(update).observe(panel)
  new MutationObserver(update).observe(panel, { childList: true, subtree: true, attributes: true })
  window.addEventListener('resize', update)
  requestAnimationFrame(() => { update(); wake() })
}
