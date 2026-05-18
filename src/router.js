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
      await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '')
      button.textContent = '已複製'
      setTimeout(() => { button.textContent = '複製' }, 1600)
    })
    pre.appendChild(button)
  })
}
