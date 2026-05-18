const STORAGE_KEY = 'frontend-book-theme'

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(saved ?? (prefersDark ? 'dark' : 'light'))
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme ?? 'light'
  const next = current === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  localStorage.setItem(STORAGE_KEY, next)
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  const light = document.getElementById('prism-light')
  const dark = document.getElementById('prism-dark')
  if (light) light.disabled = theme === 'dark'
  if (dark) dark.disabled = theme !== 'dark'
}
