import { LitElement, html } from 'lit'

const RENDERING_PROPS = [
  { name: 'width / height',   stages: [true, true, true, true],   label: 'Layout + Paint + Composite' },
  { name: 'margin / padding', stages: [true, true, true, true],   label: 'Layout + Paint + Composite' },
  { name: 'background-color', stages: [false, false, true, true], label: 'Paint + Composite only' },
  { name: 'color',            stages: [false, false, true, true], label: 'Paint + Composite only' },
  { name: 'box-shadow',       stages: [false, false, true, true], label: 'Paint + Composite only' },
  { name: 'transform',        stages: [false, false, false, true], label: 'Composite only ✓' },
  { name: 'opacity',          stages: [false, false, false, true], label: 'Composite only ✓' },
  { name: 'filter (GPU)',     stages: [false, false, false, true], label: 'Composite only ✓' },
]

const STAGE_INFO = [
  { icon: '🔄', name: 'Style',     desc: '套用 CSS 規則' },
  { icon: '📐', name: 'Layout',    desc: '計算幾何大小與位置' },
  { icon: '🖌', name: 'Paint',     desc: '生成繪圖指令' },
  { icon: '🧩', name: 'Composite', desc: 'GPU 合成圖層輸出' },
]

class FeDemoSuite extends LitElement {
  static properties = {
    demo: { type: String },
    _specificity: { state: true },
    _boxPadding: { state: true },
    _boxBorder: { state: true },
    _stream: { state: true },
    _composerCount: { state: true },
    _activeProp: { state: true },
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
    this._activeProp = RENDERING_PROPS[0]
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
      navtiming: this._renderNavTimingDemo,
      rendering: this._renderRenderingDemo,
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

  _renderNavTimingDemo() {
    const [nav] = performance.getEntriesByType('navigation')
    if (!nav) {
      return this._shell('Navigation Timing API', html`
        <div class="demo-output">Navigation Timing 資料不可用（可能在 iframe 中）。</div>
      `)
    }
    const tls = nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0
    const rows = [
      { stage: 'DNS Lookup',    ms: nav.domainLookupEnd - nav.domainLookupStart, color: '#0a84ff' },
      { stage: 'TCP Connect',   ms: nav.connectEnd - nav.connectStart - tls,     color: '#2ec7d3' },
      { stage: 'TLS Handshake', ms: tls,                                         color: '#9d6af5' },
      { stage: 'TTFB',          ms: nav.responseStart - nav.requestStart,        color: '#f5a623' },
      { stage: 'HTML Download', ms: nav.responseEnd - nav.responseStart,         color: '#4caf7d' },
      { stage: 'DOM Interactive', ms: nav.domInteractive - nav.startTime,        color: '#e8505b' },
      { stage: 'DOM Complete',  ms: nav.domComplete - nav.startTime,             color: '#8d6e4b' },
    ]
    const maxMs = Math.max(...rows.map(r => r.ms), 1)
    return this._shell('Navigation Timing API — 本頁實際數據', html`
      <div class="timing-bars">
        ${rows.map(r => html`
          <div class="timing-row">
            <span class="timing-label">${r.stage}</span>
            <div class="timing-bar" style="width:${Math.max(Math.round(r.ms / maxMs * 100), r.ms > 0 ? 2 : 0)}%;background:${r.color}"></div>
            <span class="timing-value">${Math.round(r.ms)} ms</span>
          </div>
        `)}
      </div>
      <div class="demo-output" style="margin-top:12px;font-size:0.78rem">
        提示：localhost 上 DNS/TLS 顯示 0ms 是正常的，它們已被 OS 快取或不需要 TLS。
        把 <code>nav.domInteractive</code> 和 <code>nav.domComplete</code> 相比，
        差距大時代表有 defer/async 腳本在 DOM 解析後繼續執行。
      </div>
    `)
  }

  _renderRenderingDemo() {
    const active = this._activeProp
    return this._shell('Rendering Pipeline — 哪些 CSS 操作觸發哪些階段', html`
      <p style="font-size:0.84rem;color:var(--color-text-muted);margin-bottom:10px">
        點擊 CSS 屬性，查看它會觸發哪些 rendering 階段：
      </p>
      <div class="prop-grid">
        ${RENDERING_PROPS.map(p => html`
          <button class="prop-btn ${active === p ? 'active' : ''}" @click=${() => { this._activeProp = p }}>
            ${p.name}
          </button>
        `)}
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        ${STAGE_INFO.map((stage, i) => html`
          ${i > 0 ? html`<span class="pipeline-arrow">→</span>` : ''}
          <div class="pipeline-stage ${active.stages[i] ? 'triggered' : 'skipped'}">
            <span class="pipeline-stage-icon">${stage.icon}</span>
            <div>
              <div class="pipeline-stage-name">${stage.name}</div>
              <div class="pipeline-stage-desc">${stage.desc}</div>
            </div>
          </div>
        `)}
      </div>
      <div class="demo-output" style="margin-top:12px">
        <strong>${active.name}</strong> → ${active.label}
      </div>
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
