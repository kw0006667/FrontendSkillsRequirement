import { LitElement, html } from 'lit'

const SUPPORTED = ['html', 'css', 'javascript', 'typescript']

class FeCodeBlock extends LitElement {
  static properties = {
    _lang: { state: true },
    _copied: { state: true },
  }

  createRenderRoot() {
    return this
  }

  constructor() {
    super()
    this._lang = 'typescript'
    this._copied = false
  }

  connectedCallback() {
    super.connectedCallback()
    this.updateComplete.then(() => {
      const first = SUPPORTED.find(lang => this.querySelector(`[slot="${lang}"]`))
      this._lang = this.querySelector(`[slot="${this._lang}"]`) ? this._lang : first
      this._syncVisibility()
      if (window.Prism) window.Prism.highlightAllUnder(this)
    })
  }

  updated() {
    this._syncVisibility()
  }

  render() {
    const languages = SUPPORTED.filter(lang => this.querySelector(`[slot="${lang}"]`))
    return html`
      <div class="code-tabs">
        ${languages.map(lang => html`
          <button class="code-tab ${this._lang === lang ? 'active' : ''}" @click=${() => this._setLanguage(lang)}>
            ${labelFor(lang)}
          </button>
        `)}
        <button class="code-copy-btn" @click=${this._copy}>${this._copied ? '已複製' : '複製'}</button>
      </div>
    `
  }

  _setLanguage(lang) {
    this._lang = lang
    this.updateComplete.then(() => {
      this._syncVisibility()
      if (window.Prism) window.Prism.highlightAllUnder(this)
    })
  }

  _syncVisibility() {
    SUPPORTED.forEach(lang => {
      const el = this.querySelector(`[slot="${lang}"]`)
      if (el) el.style.display = lang === this._lang ? 'block' : 'none'
    })
  }

  async _copy() {
    const code = this.querySelector(`[slot="${this._lang}"] code`)
    if (!code) return
    const didCopy = await copyText(code.textContent ?? '')
    if (!didCopy) return
    this._copied = true
    setTimeout(() => { this._copied = false }, 1600)
  }
}

function labelFor(lang) {
  return {
    html: 'HTML',
    css: 'CSS',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
  }[lang]
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the textarea-based fallback for restricted browser contexts.
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

customElements.define('fe-code-block', FeCodeBlock)
