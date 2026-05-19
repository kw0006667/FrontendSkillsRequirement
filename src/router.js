import { chapters } from './chapters/index.js'
import { setActive, setActiveSection } from './nav.js'

const HASH_RE = /^ch(\d+)(?:-(.+))?$/

let currentChapterId = null
let scrollCleanup = null

export function initRouter() {
  window.addEventListener('hashchange', handleHash)
  handleHash()
}

async function handleHash() {
  const hash = location.hash.slice(1)
  const match = hash.match(HASH_RE)
  if (!match) {
    showHome()
    return
  }

  const chapterId = Number(match[1])
  const sectionSlug = match[2] ?? null

  if (!chapters.some(chapter => chapter.id === chapterId)) {
    showHome()
    return
  }

  if (chapterId !== currentChapterId) {
    await loadChapter(chapterId, sectionSlug)
  } else if (sectionSlug) {
    scrollToSection(sectionSlug)
  }
}

async function loadChapter(id, sectionSlug) {
  const overlay = document.getElementById('loading-overlay')
  overlay?.classList.add('visible')
  if (scrollCleanup) scrollCleanup()

  try {
    const mod = await import(`./chapters/ch${String(id).padStart(2, '0')}.js`)
    const article = document.getElementById('chapter-content')
    if (!article) return

    article.innerHTML = mod.content
    currentChapterId = id
    wrapTables(article)
    addCopyButtons(article)

    if (window.Prism) window.Prism.highlightAllUnder(article)
    renderMermaid(article)

    setActive(id, sectionSlug)
    scrollCleanup = initSectionSync(mod.metadata.sections)

    if (sectionSlug) {
      requestAnimationFrame(() => scrollToSection(sectionSlug))
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }

    document.title = `${mod.metadata.title} — Frontend Interview Book`
  } catch (error) {
    console.error(error)
    document.getElementById('chapter-content').innerHTML = `
      <div class="empty-state">
        <h1>章節載入失敗</h1>
        <p>請重新整理頁面，或回到首頁重新進入章節。</p>
      </div>
    `
  } finally {
    overlay?.classList.remove('visible')
  }
}

function showHome() {
  const article = document.getElementById('chapter-content')
  const home = document.getElementById('home-screen')
  if (article && home) {
    article.innerHTML = ''
    home.style.display = ''
    article.appendChild(home)
  }
  currentChapterId = null
  if (scrollCleanup) scrollCleanup()
  document.title = 'Frontend Interview Book — Senior Front-End Engineer 完整學習書'
}

function scrollToSection(slug) {
  const target = document.getElementById(slug)
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  setActiveSection(slug)
}

function initSectionSync(sections = []) {
  const headings = sections.map(section => document.getElementById(section.slug)).filter(Boolean)
  if (!headings.length) return () => {}

  const onScroll = () => {
    const marker = window.scrollY + window.innerHeight * 0.25
    let active = headings[0]
    for (const heading of headings) {
      if (heading.offsetTop <= marker) active = heading
    }
    if (active) setActiveSection(active.id)
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  return () => window.removeEventListener('scroll', onScroll)
}

function renderMermaid(container) {
  const nodes = Array.from(container.querySelectorAll('.mermaid'))
  if (!nodes.length) return

  const doRender = () => {
    window.__mermaid.run({ nodes }).then(() => {
      requestAnimationFrame(() => initDiagramZoom(container))
    })
  }

  if (window.__mermaid) { doRender(); return }
  let attempts = 0
  const retry = () => {
    if (window.__mermaid) doRender()
    else if (attempts++ < 20) setTimeout(retry, 150)
  }
  setTimeout(retry, 150)
}

function initDiagramZoom(container) {
  container.querySelectorAll('.diagram-wrap').forEach(wrap => {
    const svg = wrap.querySelector('svg')
    if (!svg || wrap.dataset.zoomInit) return
    wrap.dataset.zoomInit = '1'

    // Natural dimensions from viewBox or attributes
    const vb = svg.viewBox.baseVal
    const naturalW = (vb && vb.width) || parseFloat(svg.getAttribute('width') || '0') || 640
    const naturalH = (vb && vb.height) || parseFloat(svg.getAttribute('height') || '0') || 400

    // Fix SVG size so transform-origin math is predictable
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    svg.style.width = `${naturalW}px`
    svg.style.height = `${naturalH}px`
    svg.style.maxWidth = 'none'
    svg.style.display = 'block'
    svg.style.transformOrigin = '0 0'

    // Initial scale: fit to wrap width
    const availW = wrap.clientWidth - 32
    const initialScale = availW > 0 ? Math.min(1, availW / naturalW) : 1

    let scale = initialScale, tx = 0, ty = 0

    wrap.style.height = `${Math.ceil(naturalH * initialScale) + 40}px`

    function apply() {
      svg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
    }
    apply()

    // Wheel zoom towards cursor
    wrap.addEventListener('wheel', e => {
      e.preventDefault()
      const rect = wrap.getBoundingClientRect()
      const ox = e.clientX - rect.left
      const oy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const newScale = Math.max(0.15, Math.min(8, scale * factor))
      tx = ox - (ox - tx) * (newScale / scale)
      ty = oy - (oy - ty) * (newScale / scale)
      scale = newScale
      apply()
    }, { passive: false })

    // Drag pan
    let dragging = false, sx = 0, sy = 0, stx = 0, sty = 0
    wrap.addEventListener('mousedown', e => {
      if (e.button !== 0) return
      dragging = true; sx = e.clientX; sy = e.clientY; stx = tx; sty = ty
      wrap.classList.add('is-dragging')
    })
    window.addEventListener('mousemove', e => {
      if (!dragging) return
      tx = stx + e.clientX - sx
      ty = sty + e.clientY - sy
      apply()
    })
    window.addEventListener('mouseup', () => {
      if (!dragging) return
      dragging = false
      wrap.classList.remove('is-dragging')
    })

    // Pinch zoom
    let lastPinchDist = 0
    wrap.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
      }
    }, { passive: true })
    wrap.addEventListener('touchmove', e => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      scale = Math.max(0.15, Math.min(8, scale * d / lastPinchDist))
      lastPinchDist = d
      apply()
    }, { passive: false })

    // Zoom controls overlay
    const controls = document.createElement('div')
    controls.className = 'diagram-zoom-controls'
    controls.innerHTML = `
      <button class="diagram-zoom-btn" data-z="in" title="Zoom in">+</button>
      <button class="diagram-zoom-btn" data-z="reset" title="Reset">↺</button>
      <button class="diagram-zoom-btn" data-z="out" title="Zoom out">−</button>
    `
    controls.addEventListener('click', e => {
      const btn = e.target.closest('[data-z]')
      if (!btn) return
      const z = btn.dataset.z
      if (z === 'in') scale = Math.min(8, scale * 1.25)
      else if (z === 'out') scale = Math.max(0.15, scale / 1.25)
      else { scale = initialScale; tx = 0; ty = 0 }
      apply()
    })
    wrap.appendChild(controls)
  })
}

function wrapTables(container) {
  container.querySelectorAll('table').forEach(table => {
    if (table.parentElement?.classList.contains('table-wrap')) return
    const wrapper = document.createElement('div')
    wrapper.className = 'table-wrap'
    table.parentNode.insertBefore(wrapper, table)
    wrapper.appendChild(table)
  })
}

function addCopyButtons(container) {
  container.querySelectorAll('pre[class*="language-"]:not(fe-code-block pre)').forEach(pre => {
    if (pre.querySelector('.standalone-copy-btn')) return
    const button = document.createElement('button')
    button.className = 'code-copy-btn standalone-copy-btn'
    button.textContent = '複製'
    button.addEventListener('click', async () => {
      const didCopy = await copyText(pre.querySelector('code')?.textContent ?? '')
      if (!didCopy) return
      button.textContent = '已複製'
      setTimeout(() => { button.textContent = '複製' }, 1600)
    })
    pre.appendChild(button)
  })
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall back for local previews or embedded browsers that block Clipboard API writes.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-1000px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}
