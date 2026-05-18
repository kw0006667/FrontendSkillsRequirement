import { LitElement, html } from 'lit'

class FeDemoSuite extends LitElement {
  static properties = {
    demo: { type: String },
    _specificity: { state: true },
    _boxPadding: { state: true },
    _boxBorder: { state: true },
    _stream: { state: true },
    _composerCount: { state: true },
  }

  createRenderRoot() {
    return this
  }

  constructor() {
    super()
    this.demo = 'form'
    this._specificity = 'button.primary:hover'
    this._boxPadding = 24
    this._boxBorder = 12
    this._stream = ''
    this._composerCount = 0
  }

  firstUpdated() {
    if (this.demo === 'canvas') this._drawCanvas()
  }

  updated() {
    if (this.demo === 'canvas') this._drawCanvas()
  }

  render() {
    const demos = {
      form: this._renderFormDemo,
      specificity: this._renderSpecificityDemo,
      box: this._renderBoxDemo,
      resources: this._renderResourceDemo,
      canvas: this._renderCanvasDemo,
      gpu: this._renderGpuDemo,
      streaming: this._renderStreamingDemo,
      composer: this._renderComposerDemo,
    }
    const render = demos[this.demo] ?? this._renderFormDemo
    return render.call(this)
  }

  _shell(title, body) {
    return html`
      <section class="demo-shell">
        <div class="demo-head">
          <h3 class="demo-title">${title}</h3>
          <span class="tag">Interactive</span>
        </div>
        <div class="demo-body">${body}</div>
      </section>
    `
  }

  _renderFormDemo() {
    return this._shell('Constraint Validation Playground', html`
      <form class="demo-row" @submit=${event => event.preventDefault()}>
        <label>Email
          <input type="email" required placeholder="name@example.com" @input=${event => this._reportValidity(event.target)} />
        </label>
        <label>密碼
          <input type="password" minlength="8" required placeholder="至少 8 字元" @input=${event => this._reportValidity(event.target)} />
        </label>
        <button class="demo-button">檢查</button>
      </form>
      <div class="demo-output" data-validity-output>輸入內容後會顯示 ValidityState。</div>
    `)
  }

  _renderSpecificityDemo() {
    const score = calculateSpecificity(this._specificity)
    return this._shell('CSS Specificity Calculator', html`
      <div class="demo-row">
        <label>Selector
          <input .value=${this._specificity} @input=${event => { this._specificity = event.target.value }} />
        </label>
      </div>
      <div class="demo-output">Specificity: ${score.join(', ')} · ${explainSpecificity(score)}</div>
    `)
  }

  _renderBoxDemo() {
    const size = 86 + Number(this._boxPadding) + Number(this._boxBorder)
    return this._shell('Box Model Visualizer', html`
      <div class="demo-row">
        <label>Padding
          <input type="range" min="0" max="48" .value=${String(this._boxPadding)} @input=${event => { this._boxPadding = Number(event.target.value) }} />
        </label>
        <label>Border
          <input type="range" min="0" max="28" .value=${String(this._boxBorder)} @input=${event => { this._boxBorder = Number(event.target.value) }} />
        </label>
      </div>
      <div class="box-demo-frame">
        <div class="box-demo-box" style="width:${size}px;height:${size}px;padding:${this._boxPadding}px;border-width:${this._boxBorder}px"></div>
      </div>
    `)
  }

  _renderResourceDemo() {
    return this._shell('Resource Hint Decision Aid', html`
      <div class="demo-output">
        DNS-only: &lt;link rel="dns-prefetch" href="//cdn.example.com"&gt;<br />
        Early connection: &lt;link rel="preconnect" href="https://cdn.example.com" crossorigin&gt;<br />
        Current navigation critical asset: &lt;link rel="preload" as="font" href="/font.woff2" crossorigin&gt;<br />
        Likely next page: &lt;script type="speculationrules"&gt;{ "prerender": [...] }&lt;/script&gt;
      </div>
    `)
  }

  _renderCanvasDemo() {
    return this._shell('Canvas Pixel Filter', html`
      <div class="demo-row">
        <button class="demo-button" @click=${() => this._drawCanvas('normal')}>Normal</button>
        <button class="demo-button" @click=${() => this._drawCanvas('gray')}>Grayscale</button>
        <button class="demo-button" @click=${() => this._drawCanvas('invert')}>Invert</button>
      </div>
      <canvas class="canvas-demo" width="520" height="240"></canvas>
    `)
  }

  _renderGpuDemo() {
    const webgl = !!document.createElement('canvas').getContext('webgl')
    const webgpu = 'gpu' in navigator
    return this._shell('GPU Capability Detection', html`
      <div class="demo-output">
        WebGL: ${webgl ? 'available' : 'not available'}<br />
        WebGPU: ${webgpu ? 'available' : 'not available'}<br />
        採用策略：先 feature detection，再決定 WebGPU、WebGL fallback 或 Canvas fallback。
      </div>
    `)
  }

  _renderStreamingDemo() {
    return this._shell('Streaming Token Renderer', html`
      <div class="demo-row">
        <button class="demo-button" @click=${this._startStream}>Start local stream</button>
        <button class="demo-button" @click=${() => { this._stream = '' }}>Clear</button>
      </div>
      <div class="demo-output chat-stream">${this._stream || '等待串流輸出...'}</div>
    `)
  }

  _renderComposerDemo() {
    return this._shell('GenAI Composer IME-aware Counter', html`
      <div class="demo-row">
        <textarea class="composer" placeholder="輸入訊息、@mention 或貼上檔案描述" @input=${event => { this._composerCount = event.target.value.length }}></textarea>
      </div>
      <div class="demo-output">字元數：${this._composerCount}。實作送出快捷鍵時，compositionstart 到 compositionend 期間不可攔截 Enter。</div>
    `)
  }

  _reportValidity(input) {
    const output = this.querySelector('[data-validity-output]')
    if (!output) return
    const validity = input.validity
    output.textContent = `valid=${validity.valid}, valueMissing=${validity.valueMissing}, typeMismatch=${validity.typeMismatch}, tooShort=${validity.tooShort}`
  }

  _drawCanvas(mode = 'normal') {
    const canvas = this.querySelector('canvas')
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#0a84ff')
    gradient.addColorStop(0.5, '#2ec7d3')
    gradient.addColorStop(1, '#ffffff')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.beginPath()
    ctx.arc(260, 120, 74, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#102033'
    ctx.font = '700 28px system-ui'
    ctx.fillText('Canvas', 208, 130)

    if (mode === 'normal') return
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < image.data.length; i += 4) {
      const r = image.data[i]
      const g = image.data[i + 1]
      const b = image.data[i + 2]
      if (mode === 'gray') {
        const y = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
        image.data[i] = y
        image.data[i + 1] = y
        image.data[i + 2] = y
      } else {
        image.data[i] = 255 - r
        image.data[i + 1] = 255 - g
        image.data[i + 2] = 255 - b
      }
    }
    ctx.putImageData(image, 0, 0)
  }

  _startStream() {
    const text = 'LLM streaming UI 不應逐 token 直接觸發 layout。更好的做法是把 token 收進 buffer，透過 requestAnimationFrame 批次 flush 到畫面。'
    this._stream = ''
    let index = 0
    const tick = () => {
      this._stream += text.slice(index, index + 3)
      index += 3
      if (index < text.length) setTimeout(tick, 45)
    }
    tick()
  }
}

function calculateSpecificity(selector) {
  const ids = (selector.match(/#[\w-]+/g) ?? []).length
  const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(?:\([^)]*\))?/g) ?? []).length
  const stripped = selector.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|:{1,2}[\w-]+(?:\([^)]*\))?/g, ' ')
  const elements = (stripped.match(/[a-zA-Z][\w-]*/g) ?? []).length + (selector.match(/::[\w-]+/g) ?? []).length
  return [0, ids, classes, elements]
}

function explainSpecificity(score) {
  return `inline=${score[0]}, id=${score[1]}, class/attr/pseudo=${score[2]}, element=${score[3]}`
}

customElements.define('fe-demo-suite', FeDemoSuite)
