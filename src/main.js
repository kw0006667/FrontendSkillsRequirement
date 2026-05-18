import './components/fe-code-block.js'
import './components/fe-demo-suite.js'

import { initNav } from './nav.js'
import { initRouter } from './router.js'
import { initTheme, toggleTheme } from './theme.js'

initTheme()

document.addEventListener('DOMContentLoaded', () => {
  initNav()
  initRouter()
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme)
  document.getElementById('theme-toggle-mobile')?.addEventListener('click', toggleTheme)
})
