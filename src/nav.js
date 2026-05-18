import { chapters, parts } from './chapters/index.js'

let mobileState = 'closed'
let currentChapterId = null

const SIDEBAR_KEY = 'frontend-book-sidebar-collapsed'
const SECTIONS_KEY = 'frontend-book-sections-collapsed'

export function initNav() {
  buildSidebarNav()
  buildDrawerNav()
  initDesktopControls()
  initMobileControls()
}

function buildSidebarNav() {
  const nav = document.getElementById('sidebar-nav')
  if (!nav) return
  nav.innerHTML = parts.map(part => {
    const links = chapters
      .filter(chapter => chapter.part === part.id)
      .map(buildChapterItem)
      .join('')
    return `<div class="nav-part-label">${part.label}</div><ul>${links}</ul>`
  }).join('')

  nav.querySelectorAll('.nav-chapter-trigger').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.chapter)
      location.hash = `ch${id}`
    })
  })
}

function buildDrawerNav() {
  const nav = document.getElementById('drawer-nav')
  if (!nav) return
  nav.innerHTML = parts.map(part => {
    const links = chapters
      .filter(chapter => chapter.part === part.id)
      .map(chapter => `<a class="drawer-chapter-link" data-chapter="${chapter.id}" href="#ch${chapter.id}">Ch.${String(chapter.id).padStart(2, '0')} — ${chapter.title}</a>`)
      .join('')
    return `<div class="drawer-part-label">${part.label}</div>${links}`
  }).join('')
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMobileState('closed')))
}

function buildChapterItem(chapter) {
  const sections = chapter.sections.map(section => `
    <li>
      <a class="nav-section-link" href="#ch${chapter.id}-${section.slug}" data-chapter="${chapter.id}" data-section="${section.slug}">
        ${section.title}
      </a>
    </li>
  `).join('')

  return `
    <li class="nav-chapter" data-chapter-id="${chapter.id}">
      <button class="nav-chapter-trigger" data-chapter="${chapter.id}" aria-expanded="false">
        <span class="nav-chapter-arrow">›</span>
        <span class="nav-chapter-title">
          <span class="nav-chapter-num">Ch.${String(chapter.id).padStart(2, '0')}</span>
          ${chapter.title}
        </span>
      </button>
      <ul class="nav-sections">${sections}</ul>
    </li>
  `
}

export function setActive(chapterId, sectionSlug = null) {
  currentChapterId = chapterId
  document.querySelectorAll('.nav-chapter').forEach(item => {
    const active = Number(item.dataset.chapterId) === chapterId
    item.classList.toggle('nav-chapter--active', active)
    item.classList.toggle('is-open', active)
    item.querySelector('.nav-chapter-trigger')?.setAttribute('aria-expanded', String(active))
  })
  document.querySelectorAll('.drawer-chapter-link').forEach(link => {
    link.classList.toggle('active', Number(link.dataset.chapter) === chapterId)
  })
  buildSectionsPanel(chapterId)
  setActiveSection(sectionSlug)
}

export function setActiveSection(sectionSlug) {
  document.querySelectorAll('.nav-section-link, .panel-section-link').forEach(link => {
    link.classList.toggle('active', !!sectionSlug && link.dataset.section === sectionSlug)
  })
}

function buildSectionsPanel(chapterId) {
  const nav = document.getElementById('sections-nav')
  const chapter = chapters.find(item => item.id === chapterId)
  if (!nav || !chapter) return
  nav.innerHTML = chapter.sections.map(section => `
    <a class="panel-section-link" href="#ch${chapter.id}-${section.slug}" data-section="${section.slug}">${section.title}</a>
  `).join('')
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (!isDesktop()) setMobileState('closed')
    })
  })
}

function initDesktopControls() {
  const sidebarCollapsed = localStorage.getItem(SIDEBAR_KEY) === 'true'
  const sectionsCollapsed = localStorage.getItem(SECTIONS_KEY) === 'true'
  applySidebarState(sidebarCollapsed)
  applySectionsState(sectionsCollapsed)

  document.getElementById('sidebar-collapse-toggle')?.addEventListener('click', () => {
    applySidebarState(true)
    applySectionsState(false)
  })
  document.getElementById('sidebar-expand-toggle')?.addEventListener('click', () => applySidebarState(false))
  document.getElementById('sections-toggle')?.addEventListener('click', () => {
    if (isDesktop()) applySectionsState(false)
  })
  document.getElementById('sections-close')?.addEventListener('click', () => {
    if (isDesktop()) applySectionsState(true)
  })
}

function initMobileControls() {
  document.getElementById('hamburger')?.addEventListener('click', () => setMobileState(mobileState === 'drawer' ? 'closed' : 'drawer'))
  document.getElementById('drawer-close')?.addEventListener('click', () => setMobileState('closed'))
  document.getElementById('overlay')?.addEventListener('click', () => setMobileState('closed'))
  document.getElementById('sections-toggle')?.addEventListener('click', () => {
    if (!isDesktop()) setMobileState(mobileState === 'sections' ? 'closed' : 'sections')
  })
  document.getElementById('sections-close')?.addEventListener('click', () => {
    if (!isDesktop()) setMobileState('closed')
  })
}

function setMobileState(state) {
  if (isDesktop()) state = 'closed'
  mobileState = state
  document.getElementById('mobile-drawer')?.classList.toggle('open', state === 'drawer')
  document.getElementById('sections-panel')?.classList.toggle('open', state === 'sections')
  document.getElementById('overlay')?.classList.toggle('active', state !== 'closed')
  document.getElementById('hamburger')?.setAttribute('aria-expanded', String(state === 'drawer'))
  document.getElementById('sections-toggle')?.setAttribute('aria-expanded', String(state === 'sections'))
  document.body.style.overflow = state !== 'closed' ? 'hidden' : ''
}

function applySidebarState(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed)
  localStorage.setItem(SIDEBAR_KEY, String(collapsed))
}

function applySectionsState(collapsed) {
  document.body.classList.toggle('desktop-sections-collapsed', collapsed)
  localStorage.setItem(SECTIONS_KEY, String(collapsed))
  if (currentChapterId) buildSectionsPanel(currentChapterId)
}

function isDesktop() {
  return window.matchMedia('(min-width: 900px)').matches
}
