import { chapters } from './book-data.js'

const codeExamples = {
  browser: {
    lang: 'javascript',
    title: 'Navigation Timing 觀察 URL 到畫面的成本',
    code: `const [nav] = performance.getEntriesByType('navigation');
console.table({
  dns: nav.domainLookupEnd - nav.domainLookupStart,
  tcp: nav.connectEnd - nav.connectStart,
  tls: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
  ttfb: nav.responseStart - nav.requestStart,
  download: nav.responseEnd - nav.responseStart,
  domInteractive: nav.domInteractive - nav.startTime,
});`,
  },
  html: {
    lang: 'html',
    title: '以語意元素建立可被理解的文件結構',
    code: `<main>
  <article aria-labelledby="chapter-title">
    <header>
      <h1 id="chapter-title">表單與互動元素</h1>
      <p>原生 HTML 先提供語意，再由 CSS/JS 增強體驗。</p>
    </header>
    <section aria-labelledby="validation-title">
      <h2 id="validation-title">Constraint Validation</h2>
      <form>
        <label>Email <input type="email" required autocomplete="email" /></label>
      </form>
    </section>
  </article>
</main>`,
  },
  css: {
    lang: 'css',
    title: '以 CSS variables 建立可切換 theme 的 token',
    code: `:root {
  color-scheme: light;
  --surface: rgba(255, 255, 255, 0.82);
  --text: #17202a;
  --accent: #0a84ff;
}

[data-theme="dark"] {
  color-scheme: dark;
  --surface: rgba(19, 34, 50, 0.78);
  --text: #eef7ff;
  --accent: #58b5ff;
}

.panel {
  background: var(--surface);
  color: var(--text);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}`,
  },
  performance: {
    lang: 'typescript',
    title: '批次處理 DOM read/write 避免 forced layout',
    code: `const cards = Array.from(document.querySelectorAll<HTMLElement>('.card'));

requestAnimationFrame(() => {
  const measurements = cards.map(card => card.getBoundingClientRect());

  requestAnimationFrame(() => {
    cards.forEach((card, index) => {
      card.style.setProperty('--card-width', \`\${measurements[index].width}px\`);
    });
  });
});`,
  },
  wasm: {
    lang: 'javascript',
    title: 'Streaming instantiate 與 JS/Wasm boundary 批次化',
    code: `const imports = { env: { log: (ptr, len) => console.log(ptr, len) } };
const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/image-kernel.wasm'),
  imports,
);

// 比起每個 pixel 呼叫一次 Wasm，更好的方式是傳入 pointer + length 批次處理。
instance.exports.applyFilter(inputPtr, outputPtr, pixelLength);`,
  },
  canvas: {
    lang: 'typescript',
    title: 'HiDPI Canvas 初始化模式',
    code: `function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return ctx;
}`,
  },
  webgl: {
    lang: 'javascript',
    title: 'Feature detection 決定 WebGPU / WebGL fallback',
    code: `async function pickRenderer(canvas) {
  if ('gpu' in navigator) {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) return { type: 'webgpu', adapter };
  }
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (gl) return { type: 'webgl', gl };
  return { type: 'canvas2d', ctx: canvas.getContext('2d') };
}`,
  },
  genai: {
    lang: 'typescript',
    title: 'LLM streaming 使用 AbortController 與 rAF flush',
    code: `const controller = new AbortController();
let buffer = '';
let scheduled = false;

function enqueueToken(token: string) {
  buffer += token;
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    output.textContent += buffer;
    buffer = '';
    scheduled = false;
  });
}

cancelButton.addEventListener('click', () => controller.abort());`,
  },
  appendix: {
    lang: 'javascript',
    title: '面試速查：把決策寫成可執行 guard',
    code: `function shouldUseWasm(task) {
  if (task.touchesDomFrequently) return false;
  if (!task.isCpuIntensive) return false;
  if (!task.teamCanMaintainNativeToolchain) return false;
  return task.hasExistingNativeCode || task.needsPredictablePerformance;
}`,
  },
}

export function createChapterModule(id) {
  const metadata = chapters.find(chapter => chapter.id === id)
  if (!metadata) throw new Error(`Unknown chapter id: ${id}`)
  return {
    metadata,
    content: renderChapter(metadata),
  }
}

function renderChapter(chapter) {
  const primaryTag = chapter.tags[0] ?? 'appendix'
  const example = pickExample(chapter)
  const demo = chapter.demo ? `<fe-demo-suite demo="${chapter.demo}"></fe-demo-suite>` : ''

  return `
    <div class="chapter-header">
      <div class="chapter-num">Chapter ${String(chapter.id).padStart(2, '0')} · ${partLabel(chapter.part)}</div>
      <h1>${escapeHtml(chapter.title)}</h1>
      <p>${escapeHtml(chapter.thesis)}</p>
      <div class="chapter-tags">
        ${chapter.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
    </div>

    <div class="callout interview-signal">
      <div class="callout-title">本章 Senior 面試訊號</div>
      <p>${seniorSignal(chapter)}</p>
    </div>

    <div class="concept-grid">
      <div class="mini-card">
        <h3>心智模型</h3>
        <p>${mentalModel(chapter)}</p>
      </div>
      <div class="mini-card">
        <h3>實務場景</h3>
        <p>${scenario(chapter)}</p>
      </div>
    </div>

    ${chapter.sections.map((section, index) => renderSection(chapter, section, index)).join('')}

    <h2 id="practical-example">程式碼與範例</h2>
    <p>${escapeHtml(example.title)}。面試時不要只貼 API 名稱，要說出這段程式碼會觀察或改善哪個行為、可能造成什麼副作用，以及如何驗證。</p>
    ${renderCodeBlock(example)}
    ${demo}

    <h2 id="pitfalls-tradeoffs">常見陷阱與取捨</h2>
    <div class="tradeoff-grid">
      ${pitfalls(chapter).map(item => `
        <div class="mini-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.body)}</p>
        </div>
      `).join('')}
    </div>

    <h2 id="interview-framing">面試回答框架</h2>
    <ol>
      <li><strong>先建立邊界：</strong>說明問題發生在哪一層，例如 network、parser、layout、runtime、GPU 或 accessibility。</li>
      <li><strong>再說機制：</strong>用瀏覽器或 Web platform 的實際模型解釋，不把 framework 當成唯一答案。</li>
      <li><strong>最後說取捨：</strong>補上何時適合、何時不該用，以及你會用哪些 DevTools 或 RUM 指標驗證。</li>
    </ol>

    ${renderFooter(chapter)}
  `
}

function renderSection(chapter, section, index) {
  return `
    <h2 id="${section.slug}">${escapeHtml(section.title)}</h2>
    <p>${sectionIntro(chapter, section, index)}</p>
    <p>${sectionDeepDive(chapter, section)}</p>
    <ul>
      <li>${diagnosticPoint(chapter, section)}</li>
      <li>${implementationPoint(chapter, section)}</li>
      <li>${interviewPoint(chapter, section)}</li>
    </ul>
  `
}

function renderCodeBlock(example) {
  const className = example.lang === 'html' ? 'language-markup' : `language-${example.lang}`
  return `
    <fe-code-block>
      <pre slot="${example.lang}"><code class="${className}">${escapeHtml(example.code)}</code></pre>
    </fe-code-block>
  `
}

function renderFooter(chapter) {
  const prev = chapters.find(item => item.id === chapter.id - 1)
  const next = chapters.find(item => item.id === chapter.id + 1)
  return `
    <div class="chapter-footer">
      ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${escapeHtml(prev.title)}</span></a>` : '<span></span>'}
      ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${escapeHtml(next.title)}</span></a>` : ''}
    </div>
  `
}

function pickExample(chapter) {
  for (const tag of chapter.tags) {
    if (codeExamples[tag]) return codeExamples[tag]
  }
  if (chapter.part === 1) return codeExamples.browser
  if (chapter.part === 2) return codeExamples.html
  if (chapter.part === 3) return codeExamples.css
  if (chapter.part === 4 || chapter.part === 7) return codeExamples.performance
  if (chapter.part === 5) return codeExamples.wasm
  if (chapter.part === 6) return chapter.tags.includes('webgl') || chapter.tags.includes('webgpu') ? codeExamples.webgl : codeExamples.canvas
  if (chapter.part === 8) return codeExamples.genai
  return codeExamples.appendix
}

function seniorSignal(chapter) {
  if (chapter.part === 1) return '能把 URL 輸入後的網路、安全、快取、解析、layout、paint、composite 串成因果鏈，並能用 DevTools 證明瓶頸在哪。'
  if (chapter.part === 2) return '能優先使用瀏覽器原生語意與互動行為，再用 CSS/JavaScript 做 progressive enhancement，而不是重新發明不完整元件。'
  if (chapter.part === 3) return '能同時說明 cascade、specificity、layout algorithm、RWD 與設計系統 token 的長期維護影響。'
  if (chapter.part === 4) return '能從 LCP、INP、CLS、TTFB 等指標回推資源、快取、主執行緒與渲染路徑的具體修復。'
  if (chapter.part === 5) return '能判斷 Wasm 適不適合，而不是把它當成效能萬靈丹；尤其要能說 boundary cost、toolchain 與 sandbox。'
  if (chapter.part === 6) return '能在 DOM、SVG、Canvas、WebGL、WebGPU 之間做技術選型，並補上可訪問性、fallback 與效能驗證。'
  if (chapter.part === 7) return '能把效能問題拆成 rendering、JavaScript execution、memory 三條線，避免只做微觀優化。'
  if (chapter.part === 8) return '能把 GenAI UI 視為 streaming、取消、引用、IME、scroll、a11y 與狀態一致性的綜合問題。'
  return '能把速查表轉成決策樹，清楚說出預設選擇、例外條件與驗證方式。'
}

function mentalModel(chapter) {
  return `${chapter.title} 的核心不是記住 API 清單，而是建立「輸入、瀏覽器處理、使用者可見結果、可觀測指標」之間的映射。這樣遇到框架、瀏覽器或產品需求變動時，仍能回到 Web platform 本身做判斷。`
}

function scenario(chapter) {
  return `常見場景包含面試追問、production incident、設計系統元件實作、效能 regression 分析與跨團隊技術選型。回答時應先說目標，再說限制，最後說驗證方式。`
}

function sectionIntro(chapter, section, index) {
  return `本節聚焦「${escapeHtml(section.title)}」。在 ${escapeHtml(chapter.title)} 的脈絡中，它通常是第 ${index + 1} 個需要釐清的關鍵層，會影響使用者體感、程式架構或面試官判斷你是否理解底層機制。`
}

function sectionDeepDive(chapter, section) {
  const tag = chapter.tags[0] ?? 'frontend'
  return `實務上要同時看 spec 行為、瀏覽器實作、框架抽象與團隊維護成本。以 ${escapeHtml(section.title)} 來說，錯誤做法通常是只背名詞；更好的做法是說明它與 ${escapeHtml(tag)}、效能、可訪問性、debug 工具之間的關係。`
}

function diagnosticPoint(chapter, section) {
  if (chapter.tags.includes('performance')) return `診斷時先用 Performance、Network 或 Web Vitals 找出 ${section.title} 對 LCP/INP/CLS 的實際影響。`
  if (chapter.tags.includes('css')) return `診斷時先確認 cascade 來源、computed style、containing block 與 layout mode，避免靠猜測修樣式。`
  if (chapter.tags.includes('genai')) return `診斷時要觀察串流節奏、取消狀態、scroll lock、aria-live 與 partial rendering 是否互相干擾。`
  return `診斷時先定位它發生在 network、parser、runtime、rendering 或 GPU 哪一層，再選對工具驗證。`
}

function implementationPoint(chapter, section) {
  if (chapter.part === 2) return `實作時保留 native semantics，讓無 JavaScript、鍵盤操作與 screen reader 都有可用路徑。`
  if (chapter.part === 3) return `實作時用 token、layer、container query 與 logical properties 控制元件邊界，而不是散落 magic numbers。`
  if (chapter.part === 5) return `實作時把資料批次傳過 JS/Wasm boundary，並明確處理載入、初始化與 fallback。`
  if (chapter.part === 6) return `實作時先決定 retained mode 或 immediate mode，並同步設計 hit testing、resize、DPR 與 context loss 策略。`
  return `實作時把 critical path 與非 critical work 分離，讓瀏覽器能正確排程下載、解析、渲染與互動。`
}

function interviewPoint(chapter, section) {
  return `面試回答可以用「定義 ${section.title} → 常見誤解 → production 取捨 → 如何驗證」四步驟展開。`
}

function pitfalls(chapter) {
  return [
    {
      title: '只背名詞',
      body: `只說 ${chapter.title} 的 API 名稱不足以展現 Senior 能力。要補上瀏覽器實際做了什麼、失敗模式是什麼，以及你如何測量。`,
    },
    {
      title: '忽略使用者條件',
      body: '裝置效能、網路狀態、輸入法、輔助科技、深色模式與 reduced motion 都會改變最佳解。沒有上下文的最佳實踐通常不是最佳實踐。',
    },
    {
      title: '把 framework 當平台',
      body: 'React、Vue 或 bundler 能改善開發體驗，但底層仍是 HTML、CSS、JavaScript、HTTP 與瀏覽器渲染模型。',
    },
    {
      title: '沒有驗證閉環',
      body: '任何優化或架構選擇都應對應到 DevTools、RUM、測試案例或可重現 demo，否則只是偏好。'
    },
  ]
}

function partLabel(partId) {
  return {
    1: 'Browser Internals',
    2: 'HTML',
    3: 'CSS',
    4: 'Performance',
    5: 'WebAssembly',
    6: 'Canvas & GPU',
    7: 'Optimization',
    8: 'GenAI UI',
    9: 'Appendix',
  }[partId]
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
