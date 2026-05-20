import { LitElement, html } from 'lit'

const RENDERING_PROPS = [
  { name: 'width / height',   stages: [true, true, true, true],   label: 'Layout + Paint + Composite' },
  { name: 'margin / padding', stages: [true, true, true, true],   label: 'Layout + Paint + Composite' },
  { name: 'background-color', stages: [false, false, true, true], label: 'Paint + Composite only' },
  { name: 'color',            stages: [false, false, true, true], label: 'Paint + Composite only' },
  { name: 'box-shadow',       stages: [false, false, true, true], label: 'Paint + Composite only' },
  { name: 'transform',        stages: [false, false, false, true], label: 'Composite only' },
  { name: 'opacity',          stages: [false, false, false, true], label: 'Composite only' },
  { name: 'filter (GPU)',     stages: [false, false, false, true], label: 'Composite only' },
]

const STAGE_INFO = [
  { icon: '🔄', name: 'Style',     desc: '套用 CSS 規則' },
  { icon: '📐', name: 'Layout',    desc: '計算幾何大小與位置' },
  { icon: '🖌', name: 'Paint',     desc: '生成繪圖指令' },
  { icon: '🧩', name: 'Composite', desc: 'GPU 合成圖層輸出' },
]

const LANDMARK_REGIONS = [
  { tag: 'header',  role: 'banner',          label: '頁首',   announce: '橫幅 landmark，<header>' },
  { tag: 'nav',     role: 'navigation',      label: '主要導覽', announce: '導覽 landmark，主要導覽' },
  { tag: 'main',    role: 'main',            label: '主要內容', announce: '主要 landmark' },
  { tag: 'aside',   role: 'complementary',   label: '側欄補充', announce: '補充性 landmark，相關文章' },
  { tag: 'footer',  role: 'contentinfo',     label: '頁尾',   announce: '內容資訊 landmark' },
]

const DISPLAY_MODES = [
  { mode: 'block',       desc: 'outer: block, inner: flow — container 獨佔一行；子元素各自佔一行。' },
  { mode: 'flex',        desc: 'outer: block, inner: flex — container 獨佔一行；子元素依 flex 橫向排列。' },
  { mode: 'inline-flex', desc: 'outer: inline, inner: flex — container 流入行內，不獨佔一行；子元素依 flex 排列。' },
  { mode: 'grid',        desc: 'outer: block, inner: grid — container 獨佔一行；子元素依 grid auto-columns 排列。' },
  { mode: 'inline-grid', desc: 'outer: inline, inner: grid — container 流入行內；子元素依 grid 排列。' },
]

const SRCSET_IMAGES = [
  { url: 'hero-400.jpg',  w: 400 },
  { url: 'hero-800.jpg',  w: 800 },
  { url: 'hero-1200.jpg', w: 1200 },
  { url: 'hero-1600.jpg', w: 1600 },
]

class FeDemoSuite extends LitElement {
  static properties = {
    demo: { type: String },
    _specificity:    { state: true },
    _boxPadding:     { state: true },
    _boxBorder:      { state: true },
    _stream:         { state: true },
    _composerCount:  { state: true },
    _activeProp:     { state: true },
    // Part II demos
    _activeLandmark: { state: true },
    _displayMode:    { state: true },
    _formDataOutput: { state: true },
    _imeComposing:   { state: true },
    _imeLog:         { state: true },
    _dialogStatus:   { state: true },
    _srcsetWidth:    { state: true },
    _srcsetDpr:      { state: true },
    // Part III CSS demos
    _flexGrow:       { state: true },
    _flexDir:        { state: true },
    _flexJc:         { state: true },
    _flexAi:         { state: true },
    _flexWrap:       { state: true },
    _gridMin:        { state: true },
    _gridMode:       { state: true },
    _cqWidth:        { state: true },
    _themeMode:      { state: true },
    _animProp:       { state: true },
    _animPlaying:    { state: true },
    _cascadeImp:     { state: true },
    _posType:        { state: true },
    _stickyScroll:   { state: true },
    // Part IV Performance demos
    _scriptMode:     { state: true },
    _scriptLog:      { state: true },
    _fontDisplay:    { state: true },
    _fontLoaded:     { state: true },
    _cacheStrategy:  { state: true },
    _cacheLog:       { state: true },
    _vitalsTab:      { state: true },
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
    this._activeLandmark = LANDMARK_REGIONS[0]
    this._displayMode = 'flex'
    this._formDataOutput = ''
    this._imeComposing = false
    this._imeLog = []
    this._dialogStatus = ''
    this._srcsetWidth = 800
    this._srcsetDpr = 2
    // Part III CSS demos
    this._flexGrow = [1, 1, 1]
    // Part IV Performance demos (initialized later in constructor body)
    this._flexDir = 'row'
    this._flexJc = 'flex-start'
    this._flexAi = 'center'
    this._flexWrap = 'nowrap'
    this._gridMin = 140
    this._gridMode = 'auto-fill'
    this._cqWidth = 480
    this._themeMode = 'light'
    this._animProp = 'transform'
    this._animPlaying = false
    this._cascadeImp = 'none'
    this._posType = 'relative'
    this._stickyScroll = 0
    // Part IV Performance demos
    this._scriptMode = 'default'
    this._scriptLog = []
    this._fontDisplay = 'swap'
    this._fontLoaded = false
    this._cacheStrategy = 'cache-first'
    this._cacheLog = []
    this._vitalsTab = 'lcp'
  }

  firstUpdated() {
    if (this.demo === 'canvas') this._drawCanvas()
  }

  updated() {
    if (this.demo === 'canvas') this._drawCanvas()
  }

  render() {
    const demos = {
      form:        this._renderFormDemo,
      specificity: this._renderSpecificityDemo,
      box:         this._renderBoxDemo,
      resources:   this._renderResourceDemo,
      canvas:      this._renderCanvasDemo,
      gpu:         this._renderGpuDemo,
      streaming:   this._renderStreamingDemo,
      composer:    this._renderComposerDemo,
      navtiming:   this._renderNavTimingDemo,
      rendering:   this._renderRenderingDemo,
      landmark:    this._renderLandmarkDemo,
      display:     this._renderDisplayDemo,
      formdata:    this._renderFormDataDemo,
      ime:         this._renderImeDemo,
      dialog:      this._renderDialogDemo,
      srcset:      this._renderSrcsetDemo,
      // Part III CSS demos
      flexbox:        this._renderFlexboxDemo,
      grid:           this._renderGridDemo,
      container:      this._renderContainerDemo,
      cascade:        this._renderCascadeDemo,
      darkmode:       this._renderDarkmodeDemo,
      animation:      this._renderAnimationDemo,
      positioning:    this._renderPositioningDemo,
      // Part IV Performance demos
      'script-loading': this._renderScriptLoadingDemo,
      'font-display':   this._renderFontDisplayDemo,
      'cache-strategy': this._renderCacheStrategyDemo,
      'web-vitals':     this._renderWebVitalsDemo,
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

  // ── existing demos ──────────────────────────────────────────

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

  // ── Part II demos ────────────────────────────────────────────

  _renderLandmarkDemo() {
    const active = this._activeLandmark
    return this._shell('Landmark Regions 導覽地圖', html`
      <p style="font-size:0.84rem;color:var(--color-text-muted);margin-bottom:12px">
        點擊任一 landmark，查看對應的 ARIA role 與 screen reader 宣告方式：
      </p>
      <div class="landmark-layout">
        ${LANDMARK_REGIONS.map(r => html`
          <div class="landmark-block ${active === r ? 'active' : ''}"
               @click=${() => { this._activeLandmark = r }}>
            <code class="landmark-tag">&lt;${r.tag}&gt;</code>
            <span class="landmark-label">${r.label}</span>
            <span class="landmark-role">role="${r.role}"</span>
          </div>
        `)}
      </div>
      <div class="demo-output">
        <strong>&lt;${active.tag}&gt;</strong> → <code>role="${active.role}"</code><br>
        Screen reader 宣告：「${active.announce}」<br>
        <span style="color:var(--color-text-muted);font-size:0.78rem">
          VoiceOver: R 鍵 / NVDA: D 鍵 在 landmark 間跳轉
        </span>
      </div>
    `)
  }

  _renderDisplayDemo() {
    const mode = this._displayMode
    const desc = DISPLAY_MODES.find(d => d.mode === mode)?.desc ?? ''
    const wrapperStyle = mode === 'grid' || mode === 'inline-grid'
      ? `display:${mode};grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:8px`
      : `display:${mode};gap:8px`
    return this._shell('CSS Display Level 3 視覺對比', html`
      <p style="font-size:0.84rem;color:var(--color-text-muted);margin-bottom:10px">
        點擊 display 值，觀察三個 box 在不同 formatting context 下的排列，以及容器本身是否流入行內：
      </p>
      <div class="prop-grid" style="margin-bottom:10px">
        ${DISPLAY_MODES.map(d => html`
          <button class="prop-btn ${mode === d.mode ? 'active' : ''}"
                  @click=${() => { this._displayMode = d.mode }}>${d.mode}</button>
        `)}
      </div>
      <div class="display-demo-frame">
        <span class="display-demo-text">...前方文字&nbsp;</span>
        <div style="${wrapperStyle}">
          <div class="display-demo-box">Box A</div>
          <div class="display-demo-box">Box B</div>
          <div class="display-demo-box">Box C</div>
        </div>
        <span class="display-demo-text">&nbsp;後方文字...</span>
      </div>
      <div class="demo-output"><strong>display: ${mode}</strong> — ${desc}</div>
    `)
  }

  _renderFormDataDemo() {
    return this._shell('FormData 即時檢視器', html`
      <p style="font-size:0.84rem;color:var(--color-text-muted);margin-bottom:10px">
        填寫下方表單，觀察 <code>new FormData(form)</code> 如何即時收集欄位資料（包括 radio、checkbox）：
      </p>
      <form data-formdata-form
            @input=${() => this._syncFormData()}
            @change=${() => this._syncFormData()}
            @submit=${e => e.preventDefault()}
            style="display:grid;gap:10px;margin-bottom:12px">
        <label style="display:grid;gap:4px;font-size:0.84rem;font-weight:700;color:var(--color-text-secondary)">
          姓名
          <input name="name" placeholder="例：王小明" class="demo-input-plain" />
        </label>
        <label style="display:grid;gap:4px;font-size:0.84rem;font-weight:700;color:var(--color-text-secondary)">
          Email
          <input name="email" type="email" placeholder="name@example.com" class="demo-input-plain" />
        </label>
        <div style="display:flex;gap:16px;font-size:0.84rem;font-weight:700;color:var(--color-text-secondary);align-items:center;flex-wrap:wrap">
          職位：
          <label style="font-weight:400;display:flex;align-items:center;gap:6px">
            <input type="radio" name="role" value="frontend"> 前端
          </label>
          <label style="font-weight:400;display:flex;align-items:center;gap:6px">
            <input type="radio" name="role" value="backend"> 後端
          </label>
          <label style="font-weight:400;display:flex;align-items:center;gap:6px">
            <input type="radio" name="role" value="fullstack"> 全端
          </label>
        </div>
        <label style="font-size:0.84rem;display:flex;align-items:center;gap:8px">
          <input type="checkbox" name="newsletter" value="yes">
          <span>訂閱電子報</span>
        </label>
      </form>
      <div class="demo-output" style="font-size:0.8rem;white-space:pre;font-family:var(--font-mono)">${this._formDataOutput || '（尚未填寫任何欄位）'}</div>
    `)
  }

  _renderImeDemo() {
    const composing = this._imeComposing
    const log = this._imeLog
    return this._shell('IME Composition + Enter 攔截', html`
      <p style="font-size:0.84rem;color:var(--color-text-muted);margin-bottom:10px">
        用中文輸入法（注音 / 拼音）打字，觀察 <code>compositionstart</code> / <code>compositionend</code> 事件，以及 Enter 鍵的攔截行為：
      </p>
      <input class="demo-input-plain"
             style="width:100%;margin-bottom:10px;box-sizing:border-box"
             placeholder="嘗試用注音或拼音輸入，再按 Enter..."
             @compositionstart=${() => {
               this._imeComposing = true
               this._imeLog = [...this._imeLog.slice(-5), 'compositionstart — Enter 現在是「選字確認」，不應觸發送出']
             }}
             @compositionend=${() => {
               this._imeComposing = false
               this._imeLog = [...this._imeLog.slice(-5), 'compositionend — 選字完成，Enter 恢復送出語意']
             }}
             @keydown=${e => {
               if (e.key !== 'Enter') return
               e.preventDefault()
               if (e.isComposing || this._imeComposing) {
                 this._imeLog = [...this._imeLog.slice(-5), 'keydown Enter — isComposing=true，已攔截（不觸發送出）']
               } else {
                 this._imeLog = [...this._imeLog.slice(-5), 'keydown Enter — isComposing=false，觸發送出']
               }
             }}
      />
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:0.84rem;color:var(--color-text-secondary)">isComposing：</span>
        <span class="ime-badge ${composing ? 'composing' : 'idle'}">${composing ? 'true（選字中）' : 'false（待機）'}</span>
        <button class="demo-button"
                style="margin-left:auto;padding:0 10px;font-size:0.78rem;min-height:28px"
                @click=${() => { this._imeLog = [] }}>清除記錄</button>
      </div>
      <div class="demo-output" style="font-size:0.78rem;font-family:var(--font-mono);min-height:72px;white-space:pre-wrap">${log.length ? log.join('\n') : '事件記錄會出現在這裡...'}</div>
    `)
  }

  _renderDialogDemo() {
    return this._shell('dialog vs popover 行為對比', html`
      <p style="font-size:0.84rem;color:var(--color-text-muted);margin-bottom:12px">
        點擊按鈕觀察三種 overlay 的差異：backdrop 是否出現、focus 是否被 trap、是否進入 top-layer：
      </p>
      <div class="demo-row" style="margin-bottom:12px">
        <button class="demo-button" @click=${() => {
          this.querySelector('[data-modal-dialog]')?.showModal()
          this._dialogStatus = 'showModal()：backdrop 出現 · Tab 被困在 dialog 內 · ESC 可關閉 · 進入 top-layer'
        }}>showModal()</button>
        <button class="demo-button" @click=${() => {
          this.querySelector('[data-modeless-dialog]')?.show()
          this._dialogStatus = 'show()：無 backdrop · focus 不受 trap · 需手動關閉 · 在正常 stacking context'
        }}>show()</button>
        <button class="demo-button" @click=${() => {
          this.querySelector('[data-popover-panel]')?.showPopover()
          this._dialogStatus = 'showPopover()：點外部自動消失（light dismiss）· 不 trap focus · 進入 top-layer'
        }}>popover="auto"</button>
      </div>

      <dialog data-modal-dialog class="demo-dialog">
        <h3 style="margin:0 0 8px;font-size:1rem">Modal Dialog（showModal）</h3>
        <p style="margin:0 0 12px;font-size:0.84rem;color:var(--color-text-secondary)">
          backdrop 阻擋背景點擊 · Tab 被 trap 在此 · ESC 關閉 · 進入 top-layer
        </p>
        <button class="demo-button" @click=${() => this.querySelector('[data-modal-dialog]').close()}>關閉</button>
      </dialog>

      <dialog data-modeless-dialog class="demo-dialog demo-dialog-modeless">
        <h3 style="margin:0 0 8px;font-size:1rem">Non-modal Dialog（show）</h3>
        <p style="margin:0 0 12px;font-size:0.84rem;color:var(--color-text-secondary)">
          無 backdrop · focus 不受限 · 不在 top-layer · 需手動關閉
        </p>
        <button class="demo-button" @click=${() => this.querySelector('[data-modeless-dialog]').close()}>關閉</button>
      </dialog>

      <div data-popover-panel popover="auto" class="demo-popover">
        <h3 style="margin:0 0 8px;font-size:1rem">Popover（auto）</h3>
        <p style="margin:0;font-size:0.84rem;color:var(--color-text-secondary)">
          點此區域外自動消失（light dismiss）· 不 trap focus · 進入 top-layer
        </p>
      </div>

      <div class="demo-output">${this._dialogStatus || '點擊上方按鈕，觀察 backdrop、focus trap 與關閉行為的差異。'}</div>
    `)
  }

  _renderSrcsetDemo() {
    const vw = this._srcsetWidth
    const dpr = this._srcsetDpr
    const displayWidth = vw >= 960 ? 720 : vw
    const needed = displayWidth * dpr
    const selected = SRCSET_IMAGES.find(img => img.w >= needed) ?? SRCSET_IMAGES[SRCSET_IMAGES.length - 1]
    return this._shell('srcset + sizes 選圖計算機', html`
      <p style="font-size:0.84rem;color:var(--color-text-muted);margin-bottom:12px">
        調整 viewport 寬度與 DPR，觀察瀏覽器如何從 srcset 中選出最適合的圖片：
      </p>
      <div style="display:grid;gap:12px;margin-bottom:14px">
        <label style="display:grid;gap:6px;font-size:0.84rem;color:var(--color-text-secondary);font-weight:700">
          Viewport 寬度：<strong style="color:var(--color-text);font-size:1rem">${vw}px</strong>
          <input type="range" min="320" max="1920" step="10" .value=${String(vw)}
                 @input=${e => { this._srcsetWidth = Number(e.target.value) }} />
        </label>
        <div style="display:flex;align-items:center;gap:10px;font-size:0.84rem;color:var(--color-text-secondary);font-weight:700">
          DPR：
          ${[1, 2, 3].map(d => html`
            <button class="prop-btn ${dpr === d ? 'active' : ''}"
                    @click=${() => { this._srcsetDpr = d }}>${d}×</button>
          `)}
        </div>
      </div>
      <div class="demo-output" style="font-size:0.82rem;line-height:2;font-family:var(--font-mono)">
        srcset: hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w, hero-1600.jpg 1600w<br>
        sizes: (min-width: 960px) 720px, 100vw<br>
        <br>
        步驟 1 sizes 計算 layout 寬度：${vw >= 960 ? '720px（min-width:960px 命中）' : `${vw}px（100vw 命中）`}<br>
        步驟 2 乘以 DPR：&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${displayWidth}px × ${dpr} = <strong>${needed}px</strong><br>
        步驟 3 選最小但 &gt;= ${needed}px：<strong style="color:var(--color-accent)">${selected.url}（${selected.w}w）</strong>
      </div>
    `)
  }

  // ── Part III CSS demos ───────────────────────────────────────

  _renderFlexboxDemo() {
    const [growA, growB, growC] = this._flexGrow
    const totalGrow = growA + growB + growC
    const dir = this._flexDir
    const jc = this._flexJc
    const ai = this._flexAi
    const colors = ['#0a84ff', '#2ec7d3', '#4caf7d']
    const containerStyle = `display:flex;flex-direction:${dir};flex-wrap:${this._flexWrap};justify-content:${jc};align-items:${ai};gap:8px;padding:16px;background:var(--color-bg-soft);border:2px dashed var(--color-border);border-radius:var(--radius-md);min-height:110px;transition:all 0.3s`
    return this._shell('Flexbox 空間分配計算機', html`
      <div style="display:grid;gap:10px;margin-bottom:14px">
        <div class="prop-grid">
          ${['row', 'column'].map(d => html`
            <button class="prop-btn ${dir === d ? 'active' : ''}" @click=${() => { this._flexDir = d }}>flex-direction: ${d}</button>
          `)}
          ${['nowrap', 'wrap'].map(w => html`
            <button class="prop-btn ${this._flexWrap === w ? 'active' : ''}" @click=${() => { this._flexWrap = w }}>flex-wrap: ${w}</button>
          `)}
        </div>
        <div class="prop-grid">
          ${['flex-start', 'center', 'flex-end', 'space-between', 'space-evenly'].map(v => html`
            <button class="prop-btn ${jc === v ? 'active' : ''}" @click=${() => { this._flexJc = v }}>justify: ${v}</button>
          `)}
        </div>
        <div class="prop-grid">
          ${['flex-start', 'center', 'flex-end', 'stretch'].map(v => html`
            <button class="prop-btn ${ai === v ? 'active' : ''}" @click=${() => { this._flexAi = v }}>align: ${v}</button>
          `)}
        </div>
        <div style="display:grid;gap:7px">
          ${['A', 'B', 'C'].map((label, i) => html`
            <div style="display:flex;align-items:center;gap:8px;font-size:0.82rem;font-weight:700">
              <span style="color:${colors[i]};min-width:52px">Item ${label}</span>
              <span style="color:var(--color-text-secondary)">flex-grow:</span>
              ${[0, 1, 2, 3].map(n => html`
                <button class="prop-btn ${this._flexGrow[i] === n ? 'active' : ''}"
                  @click=${() => { this._flexGrow = this._flexGrow.map((g, idx) => idx === i ? n : g) }}>${n}</button>
              `)}
            </div>
          `)}
        </div>
      </div>
      <div style="${containerStyle}">
        ${['A', 'B', 'C'].map((label, i) => html`
          <div style="flex:${this._flexGrow[i]} 1 60px;min-width:0;min-height:${dir === 'row' ? '56px' : '40px'};background:${colors[i]};border-radius:var(--radius-sm);display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.82rem;padding:4px 8px;text-align:center;transition:flex 0.35s ease">
            Item ${label}<br><span style="opacity:0.8;font-weight:400;font-size:0.7rem">grow: ${this._flexGrow[i]}</span>
          </div>
        `)}
      </div>
      <div class="demo-output" style="margin-top:12px;font-size:0.78rem;line-height:1.9;font-family:var(--font-mono)">
        flex-direction: ${dir} · flex-wrap: ${this._flexWrap} · justify-content: ${jc} · align-items: ${ai}<br>
        ${totalGrow > 0
          ? `free space 按 ${growA}:${growB}:${growC} 分配 → A ${Math.round(growA / totalGrow * 100)}% / B ${Math.round(growB / totalGrow * 100)}% / C ${Math.round(growC / totalGrow * 100)}%`
          : 'flex-grow 全為 0：item 維持 basis 大小不伸展，free space 依 justify-content 分配'}
      </div>
    `)
  }

  _renderGridDemo() {
    const mode = this._gridMode
    const min = this._gridMin
    const template = `repeat(${mode}, minmax(${min}px, 1fr))`
    return this._shell('Grid auto-fill vs auto-fit 對比', html`
      <div style="display:grid;gap:12px;margin-bottom:14px">
        <div class="prop-grid">
          ${['auto-fill', 'auto-fit'].map(m => html`
            <button class="prop-btn ${mode === m ? 'active' : ''}" @click=${() => { this._gridMode = m }}>${m}</button>
          `)}
        </div>
        <label style="display:grid;gap:6px;font-size:0.84rem;color:var(--color-text-secondary);font-weight:700">
          最小欄寬：<strong style="color:var(--color-text);font-size:1rem">${min}px</strong>
          <input type="range" min="80" max="240" step="10" .value=${String(min)}
                 @input=${e => { this._gridMin = Number(e.target.value) }} />
        </label>
      </div>
      <div class="grid-demo-frame" style="grid-template-columns:${template}">
        ${[1, 2, 3].map(n => html`<div class="grid-demo-item">Item ${n}</div>`)}
      </div>
      <div class="demo-output" style="margin-top:12px;font-size:0.78rem;line-height:1.9;font-family:var(--font-mono)">
        grid-template-columns: repeat(<strong>${mode}</strong>, minmax(${min}px, 1fr))<br>
        ${mode === 'auto-fill'
          ? 'auto-fill：欄數最大化，空欄依然存在（item 不會被拉伸到超出 minmax max）'
          : 'auto-fit：多出來的空欄 collapse 為 0，item 自動拉伸填滿整列'}
      </div>
    `)
  }

  _renderContainerDemo() {
    const w = this._cqWidth
    const layoutMode = w >= 500 ? 'wide' : w >= 320 ? 'medium' : 'narrow'
    const ruleLabel = {
      wide:   `@container (min-width: 500px) 命中 → 橫向排列`,
      medium: `@container (min-width: 320px) 命中 → 垂直堆疊`,
      narrow: `fallback（無 @container 命中） → 最小化顯示`,
    }[layoutMode]
    return this._shell('Container Query 響應式卡片', html`
      <p style="font-size:0.84rem;color:var(--color-text-muted);margin-bottom:10px">
        拖動滑桿改變<strong>容器</strong>寬度（不是 viewport），觀察卡片如何回應自己的容器：
      </p>
      <label style="display:grid;gap:6px;font-size:0.84rem;color:var(--color-text-secondary);font-weight:700;margin-bottom:14px">
        容器寬度：<strong style="color:var(--color-text);font-size:1rem">${w}px</strong>
        <input type="range" min="180" max="700" step="10" .value=${String(w)}
               @input=${e => { this._cqWidth = Number(e.target.value) }} />
      </label>
      <div style="width:${w}px;max-width:100%;border:2px dashed var(--color-accent);border-radius:var(--radius-md);padding:10px;box-sizing:border-box;container-type:inline-size;overflow:hidden">
        ${layoutMode === 'wide' ? html`
          <div style="display:flex;gap:12px;align-items:center">
            <div style="width:80px;height:80px;border-radius:var(--radius-sm);background:linear-gradient(135deg,#0a84ff,#2ec7d3);flex-shrink:0"></div>
            <div>
              <div style="font-weight:700;margin-bottom:4px;font-size:0.94rem">產品名稱</div>
              <div style="font-size:0.82rem;color:var(--color-text-secondary);margin-bottom:6px">完整描述文字，在寬容器中完整顯示。</div>
              <div style="font-weight:700;color:var(--color-accent)">NT$1,280</div>
            </div>
          </div>
        ` : layoutMode === 'medium' ? html`
          <div>
            <div style="height:60px;border-radius:var(--radius-sm);background:linear-gradient(135deg,#0a84ff,#2ec7d3);margin-bottom:8px"></div>
            <div style="font-weight:700;margin-bottom:4px;font-size:0.9rem">產品名稱</div>
            <div style="font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:6px">垂直堆疊，顯示描述。</div>
            <div style="font-weight:700;color:var(--color-accent);font-size:0.9rem">NT$1,280</div>
          </div>
        ` : html`
          <div style="font-weight:700;font-size:0.86rem">產品名稱 — NT$1,280</div>
        `}
      </div>
      <div class="demo-output" style="margin-top:12px;font-size:0.78rem;line-height:1.9;font-family:var(--font-mono)">
        容器寬度：${w}px<br>
        命中規則：<strong>${ruleLabel}</strong><br>
        <span style="color:var(--color-text-muted)">同一個元件放在側欄（280px）和主區（640px）時，會各自回應自己的容器，而不是 viewport。</span>
      </div>
    `)
  }

  _renderCascadeDemo() {
    const imp = this._cascadeImp
    const layers = ['reset', 'components', 'utilities']
    const layerColors = { reset: '#e8505b', components: '#f5a623', utilities: '#4caf7d' }
    const layerCssColors = { reset: 'red', components: 'blue', utilities: 'green' }
    let winner = 'utilities'
    let winColor = layerColors['utilities']
    let explanation = '後宣告的 layer 優先級更高：utilities（最後宣告）勝出。'
    if (imp !== 'none') {
      winner = imp
      winColor = layerColors[imp]
      explanation = `「${imp}」中有 !important，在作者 origin 內，!important 優先級反轉 layer 順序 → ${imp} 勝出。`
    }
    return this._shell('Cascade Layers 優先順序實驗室', html`
      <p style="font-size:0.84rem;color:var(--color-text-muted);margin-bottom:10px">
        @layer 讓你顯式控制樣式優先順序；後宣告的 layer 優先級更高。加上 !important 後優先順序反轉：
      </p>
      <div style="font-family:var(--font-mono);font-size:0.8rem;background:var(--color-bg-code);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:12px;margin-bottom:12px;line-height:1.8">
        <div style="color:var(--color-text-muted)">@layer reset, components, utilities;</div>
        ${layers.map(l => html`
          <div>
            <span style="color:${layerColors[l]}">@layer ${l}</span>
            <span style="color:var(--color-text-secondary)"> { button { color: ${layerCssColors[l]}${imp === l ? ' <strong>!important</strong>' : ''} } }</span>
            ${l === 'utilities' ? html`<span style="font-size:0.72rem;color:var(--color-accent);margin-left:6px">← 最高優先</span>` : ''}
          </div>
        `)}
      </div>
      <div style="font-size:0.84rem;font-weight:700;color:var(--color-text-secondary);margin-bottom:6px">哪個 layer 加 !important？</div>
      <div class="prop-grid" style="margin-bottom:14px">
        <button class="prop-btn ${imp === 'none' ? 'active' : ''}" @click=${() => { this._cascadeImp = 'none' }}>不加</button>
        ${layers.map(l => html`
          <button class="prop-btn ${imp === l ? 'active' : ''}" @click=${() => { this._cascadeImp = l }}>${l} !important</button>
        `)}
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--color-bg-soft);border-radius:var(--radius-md);margin-bottom:12px">
        <span style="font-size:0.84rem;color:var(--color-text-secondary)">button 最終顏色：</span>
        <button style="padding:6px 16px;border-radius:var(--radius-sm);border:none;background:var(--color-bg);color:${winColor};font-weight:700;font-size:1rem;cursor:default;transition:color 0.3s">
          ${winner} 勝出
        </button>
        <div style="width:18px;height:18px;border-radius:50%;background:${winColor};transition:background 0.3s;flex-shrink:0"></div>
      </div>
      <div class="demo-output" style="font-size:0.78rem;line-height:1.9">${explanation}</div>
    `)
  }

  _renderDarkmodeDemo() {
    const mode = this._themeMode
    const vars = mode === 'dark'
      ? { bg: '#0d1117', surface: '#161b22', text: '#e6edf3', accent: '#58a6ff', border: '#30363d' }
      : { bg: '#ffffff', surface: '#f6f8fa', text: '#1f2328', accent: '#0969da', border: '#d1d9e0' }
    return this._shell('CSS Variables + Dark Mode 主題切換', html`
      <div class="prop-grid" style="margin-bottom:14px">
        ${['light', 'dark'].map(m => html`
          <button class="prop-btn ${mode === m ? 'active' : ''}" @click=${() => { this._themeMode = m }}>
            ${m === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        `)}
      </div>
      <div style="padding:16px;border-radius:var(--radius-md);background:${vars.bg};border:1px solid ${vars.border};transition:background 0.4s,border-color 0.4s">
        <div style="padding:14px;border-radius:var(--radius-sm);background:${vars.surface};margin-bottom:12px;border:1px solid ${vars.border};transition:all 0.4s">
          <div style="font-size:0.9rem;font-weight:700;color:${vars.text};margin-bottom:6px;transition:color 0.4s">通知卡片</div>
          <div style="font-size:0.82rem;color:${vars.text};opacity:0.65;margin-bottom:10px;transition:color 0.4s">CSS 自定義屬性在 runtime 變更，不需要重新載入頁面。</div>
          <button style="padding:6px 14px;border-radius:var(--radius-sm);border:none;background:${vars.accent};color:white;font-weight:700;font-size:0.84rem;cursor:pointer;transition:background 0.4s">
            查看詳情
          </button>
        </div>
      </div>
      <div class="demo-output" style="margin-top:12px;font-size:0.78rem;line-height:1.9;font-family:var(--font-mono)">
        --color-bg: ${vars.bg}<br>
        --color-surface: ${vars.surface}<br>
        --color-text: ${vars.text}<br>
        --color-accent: ${vars.accent}<br>
        <br>
        <span style="color:#4caf7d">✓ CSS variables 在 runtime 改變，子元素自動繼承</span><br>
        <span style="color:#e8505b">✗ Sass/Less 變數是 build-time，無法做到這點</span>
      </div>
    `)
  }

  _renderAnimationDemo() {
    const ANIM_PROPS = [
      { name: 'transform',      stages: [false, false, false, true], safe: true,  anim: 'transform:translateX(72px) rotate(12deg)' },
      { name: 'opacity',        stages: [false, false, false, true], safe: true,  anim: 'opacity:0.1' },
      { name: 'filter (GPU)',   stages: [false, false, false, true], safe: true,  anim: 'filter:hue-rotate(180deg)' },
      { name: 'background',     stages: [false, false, true,  true], safe: false, anim: 'background:#e8505b' },
      { name: 'box-shadow',     stages: [false, false, true,  true], safe: false, anim: 'box-shadow:0 12px 32px rgba(0,0,0,0.5)' },
      { name: 'border-radius',  stages: [false, false, true,  true], safe: false, anim: 'border-radius:50%' },
      { name: 'width',          stages: [true,  true,  true,  true], safe: false, anim: 'width:120px;height:120px' },
      { name: 'margin',         stages: [true,  true,  true,  true], safe: false, anim: 'margin-left:80px' },
    ]
    const prop = ANIM_PROPS.find(p => p.name === this._animProp) ?? ANIM_PROPS[0]
    const playing = this._animPlaying
    const boxStyle = `width:64px;height:64px;border-radius:var(--radius-md);background:var(--color-accent);transition:all 0.5s ease;${playing ? prop.anim : ''}`
    return this._shell('CSS 動畫安全屬性 — 哪些能在 GPU Compositor 執行？', html`
      <p style="font-size:0.84rem;color:var(--color-text-muted);margin-bottom:10px">
        選擇 CSS 屬性，查看它觸發哪些渲染階段。<strong style="color:#4caf7d">transform / opacity / filter</strong> 只在 compositor thread 執行，不阻塞主執行緒：
      </p>
      <div class="prop-grid" style="margin-bottom:12px">
        ${ANIM_PROPS.map(p => html`
          <button class="prop-btn ${this._animProp === p.name ? 'active' : ''}" @click=${() => { this._animProp = p.name; this._animPlaying = false }}>
            ${p.name}
          </button>
        `)}
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        <button class="demo-button" @click=${() => {
          this._animPlaying = true
          setTimeout(() => { this._animPlaying = false }, 700)
        }}>▶ 播放動畫</button>
        <span style="font-size:0.84rem;font-weight:700;color:${prop.safe ? '#4caf7d' : '#f5a623'}">
          ${prop.safe ? '✓ Compositor Only — GPU 加速，不阻塞主執行緒' : '⚠ 觸發 Layout 或 Paint — 謹慎在大量元素上使用'}
        </span>
      </div>
      <div style="display:flex;gap:16px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
        <div style="${boxStyle}"></div>
        <div style="font-size:0.82rem;color:var(--color-text-secondary)">
          正在動畫：<strong>${prop.name}</strong>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        ${STAGE_INFO.map((stage, i) => html`
          ${i > 0 ? html`<span class="pipeline-arrow">→</span>` : ''}
          <div class="pipeline-stage ${prop.stages[i] ? 'triggered' : 'skipped'}">
            <span class="pipeline-stage-icon">${stage.icon}</span>
            <div>
              <div class="pipeline-stage-name">${stage.name}</div>
              <div class="pipeline-stage-desc">${stage.desc}</div>
            </div>
          </div>
        `)}
      </div>
    `)
  }

  _renderPositioningDemo() {
    const pos = this._posType
    const desc = {
      static:   '正常文流，top/left 無效。',
      relative: '相對「自身原始位置」偏移，原始空間保留，不影響其他元素。',
      absolute: '脫離文流，相對「最近的非 static 祖先」定位，原始空間消失。',
      fixed:    '相對「viewport」固定，捲動頁面時不移動。',
      sticky:   '在容器內「黏」在指定位置，超出容器後消失。',
    }[pos]
    return this._shell('CSS Position 視覺對比', html`
      <div class="prop-grid" style="margin-bottom:12px">
        ${['static', 'relative', 'absolute', 'fixed', 'sticky'].map(p => html`
          <button class="prop-btn ${pos === p ? 'active' : ''}" @click=${() => { this._posType = p }}>${p}</button>
        `)}
      </div>
      <div style="position:relative;border:2px dashed var(--color-border);border-radius:var(--radius-md);padding:16px;background:var(--color-bg-soft);height:240px;overflow:${pos === 'sticky' ? 'scroll' : 'hidden'}">
        <div style="width:52px;height:52px;border-radius:var(--radius-sm);background:#9d6af5;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.78rem;text-align:center">Before</div>
        <div style="position:${pos};top:${pos === 'static' ? 'auto' : '8px'};left:${pos === 'static' ? 'auto' : '50%'};width:64px;height:64px;border-radius:var(--radius-sm);background:var(--color-accent);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.78rem;text-align:center;z-index:1;transition:all 0.3s">
          ${pos}
        </div>
        <div style="width:52px;height:52px;border-radius:var(--radius-sm);background:#f5a623;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.78rem;text-align:center">After</div>
      </div>
      <div class="demo-output" style="margin-top:12px;font-size:0.82rem">${desc}</div>
    `)
  }

  // ── Part IV Performance demos ────────────────────────────────

  _renderScriptLoadingDemo() {
    const modes = [
      {
        id: 'default',
        label: '<script>（同步）',
        color: '#e8505b',
        desc: 'Parser 暫停，等 script 下載完並執行完畢，才繼續解析 HTML。',
        timeline: [
          { label: 'HTML 解析', start: 0, end: 20, color: '#4caf7d' },
          { label: '⏸ Parser 阻塞', start: 20, end: 25, color: '#e8505b' },
          { label: 'Script 下載', start: 25, end: 55, color: '#f5a623' },
          { label: 'Script 執行', start: 55, end: 70, color: '#9d6af5' },
          { label: 'HTML 解析（續）', start: 70, end: 100, color: '#4caf7d' },
        ],
      },
      {
        id: 'async',
        label: '<script async>',
        color: '#f5a623',
        desc: '下載與 HTML 解析並行，下載完立即中斷 parser 執行。多個 async script 不保順序。',
        timeline: [
          { label: 'HTML 解析', start: 0, end: 100, color: '#4caf7d' },
          { label: 'Script 下載（並行）', start: 10, end: 40, color: '#f5a623' },
          { label: '⏸ 執行（中斷）', start: 40, end: 55, color: '#9d6af5' },
        ],
      },
      {
        id: 'defer',
        label: '<script defer>',
        color: '#2ec7d3',
        desc: '下載與 HTML 解析並行，等 HTML 完全解析後才按序執行（DOMContentLoaded 前）。',
        timeline: [
          { label: 'HTML 解析', start: 0, end: 75, color: '#4caf7d' },
          { label: 'Script 下載（並行）', start: 10, end: 40, color: '#f5a623' },
          { label: 'DOM 就緒，執行', start: 75, end: 90, color: '#9d6af5' },
        ],
      },
      {
        id: 'module',
        label: '<script type="module">',
        color: '#0a84ff',
        desc: '預設 deferred，嚴格模式，支援頂層 await。下載 module graph（含所有 import）後按序執行。',
        timeline: [
          { label: 'HTML 解析', start: 0, end: 75, color: '#4caf7d' },
          { label: 'Module graph 下載', start: 5, end: 50, color: '#f5a623' },
          { label: 'DOM 就緒，執行', start: 75, end: 92, color: '#9d6af5' },
        ],
      },
    ]
    const active = modes.find(m => m.id === this._scriptMode) ?? modes[0]
    return this._shell('script 載入模式時序對比', html`
      <div class="prop-grid" style="margin-bottom:14px">
        ${modes.map(m => html`
          <button class="prop-btn ${this._scriptMode === m.id ? 'active' : ''}"
                  @click=${() => { this._scriptMode = m.id }}
                  style="font-size:0.76rem;font-family:var(--font-mono)">
            ${m.label}
          </button>
        `)}
      </div>
      <div style="position:relative;height:120px;background:var(--color-bg-soft);border-radius:var(--radius-md);padding:10px 12px;overflow:hidden;margin-bottom:10px">
        ${active.timeline.map((item, i) => html`
          <div style="
            position:absolute;
            left:${item.start}%;
            width:${item.end - item.start}%;
            top:${12 + i * 22}px;
            height:16px;
            background:${item.color};
            border-radius:3px;
            display:flex;
            align-items:center;
            padding:0 5px;
            font-size:0.65rem;
            color:white;
            font-weight:700;
            white-space:nowrap;
            overflow:hidden;
            transition:all 0.4s ease
          ">${item.label}</div>
        `)}
        <div style="position:absolute;bottom:6px;left:12px;right:12px;display:flex;justify-content:space-between;font-size:0.65rem;color:var(--color-text-muted)">
          <span>0%</span><span>時間軸（相對）</span><span>100%</span>
        </div>
      </div>
      <div class="demo-output" style="font-size:0.82rem;line-height:1.7">
        <strong style="color:${active.color}">${active.label}</strong><br>
        ${active.desc}
      </div>
      <div style="margin-top:10px;font-size:0.75rem;color:var(--color-text-muted);line-height:1.7">
        <strong>選型原則：</strong>
        第三方、無依賴腳本（GA、GTM）→ async；
        頁面主邏輯、有依賴 → defer；
        ESM 應用入口 → type="module"（預設 defer）；
        同步 → 僅限 document.write() 等特殊情況，盡量避免。
      </div>
    `)
  }

  _renderFontDisplayDemo() {
    const strategies = [
      {
        id: 'block',
        label: 'block',
        color: '#e8505b',
        blockMs: 3000,
        swapMs: Infinity,
        desc: '文字最多隱藏 3 秒（FOIT）。Web font 下載完後替換。適合：字型對品牌至關重要且載入通常很快。',
        cls: '中等（字型替換後可能有版面跳動）',
      },
      {
        id: 'swap',
        label: 'swap',
        color: '#f5a623',
        blockMs: 100,
        swapMs: Infinity,
        desc: '立即顯示 fallback（FOUT），Web font 下載完後任何時候都替換。適合：接受 FOUT，品牌字型一定要用。',
        cls: '中高（字型替換時位移）',
      },
      {
        id: 'fallback',
        label: 'fallback',
        color: '#2ec7d3',
        blockMs: 100,
        swapMs: 3000,
        desc: '極短暫隱藏（0.1s），顯示 fallback，3 秒內若 web font 就緒才替換，之後放棄。平衡方案。',
        cls: '低（3s 後不換）',
      },
      {
        id: 'optional',
        label: 'optional',
        color: '#4caf7d',
        blockMs: 100,
        swapMs: 0,
        desc: '0.1s 判斷：若字型已在快取則用，否則本次不替換。最安全的 CLS 防護，代價是首次訪問可能用 fallback。',
        cls: '最低（不換字型）',
      },
    ]
    const active = strategies.find(s => s.id === this._fontDisplay) ?? strategies[1]
    const isLoaded = this._fontLoaded
    const sampleStyle = isLoaded
      ? 'font-family: Georgia, serif; font-size: 1.1rem; transition: font-family 0.3s;'
      : 'font-family: system-ui, sans-serif; font-size: 1.1rem;'

    return this._shell('font-display 策略模擬器', html`
      <div class="prop-grid" style="margin-bottom:14px">
        ${strategies.map(s => html`
          <button class="prop-btn ${this._fontDisplay === s.id ? 'active' : ''}"
                  @click=${() => { this._fontDisplay = s.id; this._fontLoaded = false }}>
            ${s.id}
          </button>
        `)}
      </div>
      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);padding:16px;margin-bottom:12px;background:var(--color-bg-soft)">
        <div style="font-size:0.72rem;color:var(--color-text-muted);margin-bottom:8px">
          模擬文字區塊（Web font = Georgia；Fallback = system-ui）：
        </div>
        <div style="${sampleStyle}">
          The quick brown fox jumps over the lazy dog.<br>
          Senior Front-End Engineer 字型優化指南。
        </div>
        <div style="margin-top:10px;font-size:0.75rem;color:var(--color-text-muted)">
          狀態：${isLoaded
            ? html`<span style="color:#4caf7d;font-weight:700">Web font 已載入（Georgia 顯示中）</span>`
            : html`<span style="color:${active.color};font-weight:700">使用 fallback font（system-ui）</span>`}
        </div>
      </div>
      <button class="demo-button" @click=${() => { this._fontLoaded = !this._fontLoaded }}>
        ${isLoaded ? '↺ 模擬重新載入（fallback 狀態）' : '▶ 模擬 Web font 載入完成'}
      </button>
      <div class="demo-output" style="margin-top:12px;font-size:0.8rem;line-height:1.8">
        <strong style="color:${active.color}">font-display: ${active.id}</strong><br>
        ${active.desc}<br>
        <span style="color:var(--color-text-muted)">CLS 風險：${active.cls}</span>
      </div>
    `)
  }

  _renderCacheStrategyDemo() {
    const strategies = [
      {
        id: 'cache-first',
        label: 'Cache-First',
        color: '#4caf7d',
        desc: '先查快取，命中則返回，否則請求網路並更新快取。適合：靜態資源、不常變動的內容。',
        flow: ['查 Cache', '命中？', '→ 返回快取', '未命中 → 請求 Network', '更新快取', '返回結果'],
        pros: ['最快速度', '完全離線可用', '最省頻寬'],
        cons: ['可能返回過時資料', '需要手動 cache bust'],
      },
      {
        id: 'network-first',
        label: 'Network-First',
        color: '#0a84ff',
        desc: '優先請求網路，失敗（超時/離線）才用快取。適合：必須最新的內容，但需要離線 fallback。',
        flow: ['請求 Network', '成功 → 更新快取', '返回新資料', '失敗 → 查 Cache', '返回快取（離線 fallback）'],
        pros: ['資料最新', '有離線 fallback'],
        cons: ['慢網路下體驗差', '消耗更多頻寬'],
      },
      {
        id: 'swr',
        label: 'Stale-While-Revalidate',
        color: '#9d6af5',
        desc: '先返回快取（立即），同時背景更新快取。適合：可接受短暫過期但需要快速響應的內容。',
        flow: ['查 Cache', '命中 → 立即返回快取', '同時 → 背景請求 Network', '更新快取供下次使用'],
        pros: ['立即響應（0 delay）', '最終一致性', '自動後台更新'],
        cons: ['首次返回可能是舊資料', '需要接受最終一致性'],
      },
    ]
    const active = strategies.find(s => s.id === this._cacheStrategy) ?? strategies[2]
    const log = this._cacheLog

    return this._shell('Service Worker 快取策略模擬器', html`
      <div class="prop-grid" style="margin-bottom:14px">
        ${strategies.map(s => html`
          <button class="prop-btn ${this._cacheStrategy === s.id ? 'active' : ''}"
                  @click=${() => { this._cacheStrategy = s.id; this._cacheLog = [] }}>
            ${s.label}
          </button>
        `)}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <button class="demo-button" @click=${() => this._simulateCacheRequest(active, false)}>
          模擬請求（快取命中）
        </button>
        <button class="demo-button" @click=${() => this._simulateCacheRequest(active, true)}>
          模擬請求（快取未命中）
        </button>
        <button class="demo-button" style="background:var(--color-bg-soft);color:var(--color-text)" @click=${() => { this._cacheLog = [] }}>
          清除記錄
        </button>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <div style="font-size:0.75rem;font-weight:700;color:var(--color-text-secondary);margin-bottom:6px">執行流程</div>
          ${active.flow.map((step, i) => html`
            <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;margin-bottom:4px">
              <span style="width:18px;height:18px;border-radius:50%;background:${active.color};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:0.65rem">${i + 1}</span>
              <span>${step}</span>
            </div>
          `)}
        </div>
        <div style="flex:1;min-width:140px">
          <div style="font-size:0.75rem;font-weight:700;color:#4caf7d;margin-bottom:4px">優點</div>
          ${active.pros.map(p => html`<div style="font-size:0.75rem;margin-bottom:3px;color:var(--color-text-secondary)">✓ ${p}</div>`)}
          <div style="font-size:0.75rem;font-weight:700;color:#e8505b;margin-top:8px;margin-bottom:4px">缺點</div>
          ${active.cons.map(c => html`<div style="font-size:0.75rem;margin-bottom:3px;color:var(--color-text-secondary)">✗ ${c}</div>`)}
        </div>
      </div>
      <div class="demo-output" style="font-size:0.75rem;font-family:var(--font-mono);min-height:80px;white-space:pre;line-height:1.8">
        ${log.length ? log.join('\n') : '點擊按鈕模擬請求，觀察快取策略的決策過程...'}
      </div>
    `)
  }

  _simulateCacheRequest(strategy, cacheMiss) {
    const ts = () => new Date().toLocaleTimeString('zh-TW', { hour12: false })
    let log = []

    if (strategy.id === 'cache-first') {
      if (cacheMiss) {
        log = [
          `[${ts()}] Service Worker 攔截請求`,
          `[${ts()}] 查詢 Cache → 未命中`,
          `[${ts()}] 請求 Network...（等待中）`,
          `[${ts()}] Network 回應 200 OK`,
          `[${ts()}] 存入 Cache（供下次使用）`,
          `[${ts()}] 返回 Network 回應給頁面`,
        ]
      } else {
        log = [
          `[${ts()}] Service Worker 攔截請求`,
          `[${ts()}] 查詢 Cache → 命中！`,
          `[${ts()}] 立即返回快取（0ms 等待）`,
        ]
      }
    } else if (strategy.id === 'network-first') {
      if (cacheMiss) {
        log = [
          `[${ts()}] Service Worker 攔截請求`,
          `[${ts()}] 請求 Network...`,
          `[${ts()}] Network 回應 200 OK`,
          `[${ts()}] 存入 Cache（離線備用）`,
          `[${ts()}] 返回最新資料`,
        ]
      } else {
        log = [
          `[${ts()}] Service Worker 攔截請求`,
          `[${ts()}] 請求 Network... 失敗（離線或超時）`,
          `[${ts()}] 查詢 Cache → 命中！`,
          `[${ts()}] 返回快取（離線 fallback）`,
          `[${ts()}] ⚠ 資料可能不是最新的`,
        ]
      }
    } else {
      // SWR
      if (cacheMiss) {
        log = [
          `[${ts()}] Service Worker 攔截請求`,
          `[${ts()}] 查詢 Cache → 未命中`,
          `[${ts()}] 請求 Network...（等待中）`,
          `[${ts()}] Network 回應 200 OK`,
          `[${ts()}] 存入 Cache + 返回給頁面`,
        ]
      } else {
        log = [
          `[${ts()}] Service Worker 攔截請求`,
          `[${ts()}] 查詢 Cache → 命中！`,
          `[${ts()}] 立即返回快取（使用者不等待）`,
          `[${ts()}] 同時：背景請求 Network...`,
          `[${ts()}] Network 回應 → 更新 Cache（下次使用）`,
        ]
      }
    }

    this._cacheLog = log
  }

  _renderWebVitalsDemo() {
    const tabs = [
      { id: 'lcp', label: 'LCP', fullName: 'Largest Contentful Paint', unit: 'ms', good: 2500, poor: 4000, color: '#0a84ff' },
      { id: 'inp', label: 'INP', fullName: 'Interaction to Next Paint', unit: 'ms', good: 200, poor: 500, color: '#9d6af5' },
      { id: 'cls', label: 'CLS', fullName: 'Cumulative Layout Shift', unit: '', good: 0.1, poor: 0.25, color: '#f5a623' },
    ]
    const active = tabs.find(t => t.id === this._vitalsTab) ?? tabs[0]

    const navEntry = typeof performance !== 'undefined' ? performance.getEntriesByType('navigation')[0] : null
    const lcpEntries = typeof PerformanceObserver !== 'undefined'
      ? performance.getEntriesByType('largest-contentful-paint')
      : []
    const lastLcp = lcpEntries[lcpEntries.length - 1]

    const realValues = {
      lcp: lastLcp ? Math.round(lastLcp.startTime) : null,
      inp: null,
      cls: null,
    }

    const exampleValues = {
      lcp: { bad: 4200, ok: 3100, good: 1800, desc: '常見問題：LCP 圖片沒有 fetchpriority="high"，被其他資源搶佔頻寬' },
      inp: { bad: 650, ok: 320, good: 120, desc: '常見問題：點擊事件 handler 中有同步的重計算，阻塞主執行緒 > 200ms' },
      cls: { bad: 0.35, ok: 0.18, good: 0.04, desc: '常見問題：圖片沒有 width/height，或廣告插入在內容之上' },
    }

    const ex = exampleValues[active.id]
    const real = realValues[active.id]

    function ratingLabel(val, good, poor) {
      if (val <= good) return { text: 'Good', color: '#4caf7d' }
      if (val <= poor) return { text: 'Needs Improvement', color: '#f5a623' }
      return { text: 'Poor', color: '#e8505b' }
    }

    function bar(val, good, poor, max, color) {
      const pct = Math.min(100, (val / max) * 100)
      const rating = ratingLabel(val, good, poor)
      return html`
        <div style="display:flex;align-items:center;gap:8px;font-size:0.78rem">
          <div style="flex:1;background:var(--color-bg-soft);border-radius:4px;height:12px;overflow:hidden;position:relative">
            <div style="width:${pct}%;height:100%;background:${rating.color};border-radius:4px;transition:width 0.5s ease"></div>
          </div>
          <span style="color:${rating.color};font-weight:700;min-width:60px">${val}${active.unit}</span>
          <span style="color:${rating.color};font-weight:700;min-width:80px">${rating.text}</span>
        </div>
      `
    }

    const maxVal = { lcp: 5000, inp: 800, cls: 0.5 }[active.id]

    return this._shell('Core Web Vitals 指標可視化', html`
      <div class="prop-grid" style="margin-bottom:14px">
        ${tabs.map(t => html`
          <button class="prop-btn ${this._vitalsTab === t.id ? 'active' : ''}"
                  @click=${() => { this._vitalsTab = t.id }}>
            ${t.label}
          </button>
        `)}
      </div>
      <div style="margin-bottom:14px">
        <div style="font-weight:700;font-size:0.9rem;color:var(--color-text-secondary);margin-bottom:4px">
          ${active.fullName}
        </div>
        <div style="display:flex;gap:16px;font-size:0.75rem;margin-bottom:12px;flex-wrap:wrap">
          <span style="color:#4caf7d">● Good ≤ ${active.good}${active.unit}</span>
          <span style="color:#f5a623">● Needs Improvement ≤ ${active.poor}${active.unit}</span>
          <span style="color:#e8505b">● Poor &gt; ${active.poor}${active.unit}</span>
        </div>
        <div style="display:grid;gap:8px">
          <div style="font-size:0.78rem;color:var(--color-text-muted);margin-bottom:4px">範例值比較：</div>
          <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:2px">差 → ${bar(ex.bad, active.good, active.poor, maxVal)}</div>
          <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:2px">普通 → ${bar(ex.ok, active.good, active.poor, maxVal)}</div>
          <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:2px">好 → ${bar(ex.good, active.good, active.poor, maxVal)}</div>
        </div>
        ${real !== null ? html`
          <div style="margin-top:10px;padding:8px 12px;background:var(--color-bg-soft);border-radius:var(--radius-sm);border-left:3px solid ${active.color}">
            <span style="font-size:0.78rem;color:var(--color-text-secondary)">本頁實測值：</span>
            <strong style="font-size:0.9rem">${real}${active.unit}</strong>
            <span style="font-size:0.75rem;margin-left:6px;color:${ratingLabel(real, active.good, active.poor).color}">
              ${ratingLabel(real, active.good, active.poor).text}
            </span>
          </div>
        ` : html`
          <div style="margin-top:10px;font-size:0.75rem;color:var(--color-text-muted)">
            （本頁的 ${active.label} 數據需要透過 PerformanceObserver 在實際頁面中收集）
          </div>
        `}
      </div>
      <div class="demo-output" style="font-size:0.78rem;line-height:1.8">
        <strong>常見問題：</strong>${ex.desc}
      </div>
    `)
  }

  // ── helpers ──────────────────────────────────────────────────

  _reportValidity(input) {
    const output = this.querySelector('[data-validity-output]')
    if (!output) return
    const validity = input.validity
    output.textContent = `valid=${validity.valid}, valueMissing=${validity.valueMissing}, typeMismatch=${validity.typeMismatch}, tooShort=${validity.tooShort}`
  }

  _syncFormData() {
    const form = this.querySelector('[data-formdata-form]')
    if (!form) return
    const fd = new FormData(form)
    const entries = [...fd.entries()]
    this._formDataOutput = entries.length === 0
      ? '（尚未填寫任何欄位）'
      : 'new FormData(form):\n' + entries.map(([k, v]) => `  "${k}" => "${v}"`).join('\n')
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
