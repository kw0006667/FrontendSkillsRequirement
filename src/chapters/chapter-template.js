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

const chapterExamples = {
  1: {
    lang: 'javascript',
    title: '把一次 navigation 拆成可討論的瓶頸',
    useCase: '電商首頁首屏變慢時，先把 DNS、TCP/TLS、TTFB、下載、DOM interactive 分開看，避免把所有延遲都歸咎於前端框架。',
    code: `const [nav] = performance.getEntriesByType('navigation');
const paint = Object.fromEntries(
  performance.getEntriesByType('paint').map(entry => [entry.name, entry.startTime]),
);

console.table({
  dns: nav.domainLookupEnd - nav.domainLookupStart,
  connection: nav.connectEnd - nav.connectStart,
  ttfb: nav.responseStart - nav.requestStart,
  htmlDownload: nav.responseEnd - nav.responseStart,
  domInteractive: nav.domInteractive,
  firstPaint: paint['first-paint'],
  firstContentfulPaint: paint['first-contentful-paint'],
});`,
  },
  2: {
    lang: 'javascript',
    title: '用 PerformanceObserver 對照 parser、layout 與 long task',
    useCase: '內容頁在插入第三方 widget 後互動卡住，可先收集 long task 與 layout shift，再回到 Performance panel 找 main thread stack。',
    code: `const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    console.log(entry.entryType, entry.name, Math.round(entry.startTime), Math.round(entry.duration));
  }
});

observer.observe({
  type: 'longtask',
  buffered: true,
});

new PerformanceObserver(list => {
  for (const shift of list.getEntries()) {
    if (!shift.hadRecentInput) console.log('layout shift', shift.value, shift.sources);
  }
}).observe({ type: 'layout-shift', buffered: true });`,
  },
  3: {
    lang: 'html',
    title: '可被搜尋引擎與輔助科技理解的文章結構',
    useCase: '知識庫或文件站常需要 SEO、目錄、跳轉錨點與 screen reader 都一致，因此 heading hierarchy 不能只拿來調字級。',
    code: `<main>
  <article aria-labelledby="article-title">
    <header>
      <p>Frontend Architecture</p>
      <h1 id="article-title">Caching 策略設計</h1>
      <p>比較 HTTP cache、Service Worker 與 application cache 的責任邊界。</p>
    </header>
    <nav aria-label="章節目錄">
      <ol>
        <li><a href="#http-cache">HTTP Cache</a></li>
        <li><a href="#service-worker">Service Worker</a></li>
      </ol>
    </nav>
    <section id="http-cache" aria-labelledby="http-cache-title">
      <h2 id="http-cache-title">HTTP Cache</h2>
      <p>用 Cache-Control 管理 freshness 與 revalidation。</p>
    </section>
  </article>
</main>`,
  },
  4: {
    lang: 'typescript',
    title: '用原生 constraint validation 建立可漸進增強的表單',
    useCase: '結帳、註冊與後台設定表單需要鍵盤、密碼管理器、自動填入與無 JavaScript fallback，先用 native form 再加上客製互動。',
    code: `const form = document.querySelector<HTMLFormElement>('#checkout')!;

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const payload = Object.fromEntries(new FormData(form));
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) form.querySelector('[role="alert"]')!.textContent = '付款資料需要重新確認';
});`,
  },
  5: {
    lang: 'html',
    title: '用 dialog 與 popover 減少自製 overlay 的風險',
    useCase: '設計系統中的確認視窗、命令選單與工具提示若完全自製，常漏掉 focus trap、Esc、top layer 與返回焦點。',
    code: `<button commandfor="filters" command="show-popover">篩選</button>
<div id="filters" popover>
  <label><input type="checkbox" name="stock" /> 只看有庫存</label>
  <button commandfor="filters" command="hide-popover">套用</button>
</div>

<dialog id="confirm-delete">
  <form method="dialog">
    <p>確定刪除這筆資料？</p>
    <button value="cancel">取消</button>
    <button value="confirm">刪除</button>
  </form>
</dialog>`,
  },
  6: {
    lang: 'css',
    title: '用 cascade layer 管理 reset、元件與覆寫順序',
    useCase: '大型產品常同時有設計系統、頁面樣式與實驗功能，layer 可以把覆寫規則制度化，減少 !important 蔓延。',
    code: `@layer reset, tokens, components, utilities;

@layer tokens {
  :root {
    --space-3: 0.75rem;
    --color-action: #1769ff;
  }
}

@layer components {
  .button {
    padding: var(--space-3) 1rem;
    background: var(--color-action);
  }
}

@layer utilities {
  .hidden {
    display: none;
  }
}`,
  },
  7: {
    lang: 'css',
    title: '用 container query 讓卡片回應自己的容器',
    useCase: '同一個產品卡可能出現在首頁三欄、搜尋結果列表與側欄推薦，元件應該看容器寬度而不是只看 viewport。',
    code: `.product-card {
  container-type: inline-size;
  display: grid;
  gap: 0.75rem;
}

@container (min-width: 34rem) {
  .product-card {
    grid-template-columns: 12rem 1fr;
    align-items: start;
  }
}

.product-card__media {
  aspect-ratio: 4 / 3;
  object-fit: cover;
}`,
  },
  8: {
    lang: 'css',
    title: '把使用者偏好納入響應式設計',
    useCase: '企業儀表板或長時間使用的工具不能只做斷點，也要尊重 dark mode、reduced motion 與輸入裝置差異。',
    code: `:root {
  color-scheme: light dark;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

@media (hover: hover) and (pointer: fine) {
  .row-action {
    opacity: 0;
  }
  .data-row:hover .row-action {
    opacity: 1;
  }
}`,
  },
  9: {
    lang: 'css',
    title: '用 token 與低 specificity selector 降低維護成本',
    useCase: '設計系統要允許產品線覆寫主題，但不能讓每個頁面都用更長 selector 互相壓制。',
    code: `@layer theme, component;

@layer theme {
  :root {
    --card-bg: white;
    --card-border: #d7dde8;
  }
}

@layer component {
  :where(.card) {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
  }
}`,
  },
  10: {
    lang: 'javascript',
    title: '把非首屏互動拆成 on-demand module',
    useCase: '後台列表首屏只需要資料與篩選，匯出 Excel、圖表或富文字編輯器可等使用者打開時再載入。',
    code: `const exportButton = document.querySelector('#export-report');

exportButton.addEventListener('click', async () => {
  exportButton.disabled = true;
  const [{ exportCsv }, rows] = await Promise.all([
    import('./export-csv.js'),
    fetch('/api/report').then(response => response.json()),
  ]);

  exportCsv(rows);
  exportButton.disabled = false;
});`,
  },
  11: {
    lang: 'css',
    title: '用 font-display 與 metric override 降低字型造成的 CLS',
    useCase: '品牌字型在慢網路下常造成 FOIT 或文字跳動，內容型網站通常應優先穩定閱讀與版面。',
    code: `@font-face {
  font-family: 'Brand Sans';
  src: url('/fonts/brand-sans.woff2') format('woff2');
  font-display: optional;
  size-adjust: 102%;
  ascent-override: 92%;
  descent-override: 24%;
  line-gap-override: 0%;
}

body {
  font-family: 'Brand Sans', system-ui, sans-serif;
}`,
  },
  12: {
    lang: 'html',
    title: '用 picture、srcset 與固定比例保護 LCP 與 CLS',
    useCase: '商品詳情頁的主圖通常是 LCP 候選，必須讓瀏覽器提早知道尺寸、格式與優先級。',
    code: `<picture>
  <source type="image/avif" srcset="/hero-800.avif 800w, /hero-1400.avif 1400w" />
  <source type="image/webp" srcset="/hero-800.webp 800w, /hero-1400.webp 1400w" />
  <img
    src="/hero-800.jpg"
    srcset="/hero-800.jpg 800w, /hero-1400.jpg 1400w"
    sizes="(min-width: 960px) 720px, 100vw"
    width="1400"
    height="900"
    fetchpriority="high"
    alt="產品主視覺"
  />
</picture>`,
  },
  13: {
    lang: 'html',
    title: '只對確定會用到的 critical resource 下 hint',
    useCase: '登入頁若一定會呼叫 API domain，可 preconnect；但不該 preload 每個可能用到的實驗腳本。',
    code: `<link rel="preconnect" href="https://api.example.com" crossorigin />
<link rel="preload" href="/fonts/brand-sans.woff2" as="font" type="font/woff2" crossorigin />

<script type="speculationrules">
{
  "prerender": [
    { "source": "list", "urls": ["/dashboard"] }
  ]
}
</script>`,
  },
  14: {
    lang: 'javascript',
    title: 'Service Worker 用 stale-while-revalidate 快取非關鍵資料',
    useCase: '文件站、商品分類與設定資料可先顯示快取再背景更新，但購物車、權限與付款狀態不能用同一策略。',
    code: `self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/catalog')) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open('catalog-v1');
  const cached = await cache.match(request);
  const fresh = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || fresh;
}`,
  },
  15: {
    lang: 'javascript',
    title: '把 Web Vitals 轉成可上報的 RUM event',
    useCase: 'Lighthouse 分數只能代表測試環境；真正要改善體感，需要把真實使用者的 LCP、INP、CLS 與頁面脈絡送到分析系統。',
    code: `function reportMetric(name, value, attribution = {}) {
  navigator.sendBeacon('/rum', JSON.stringify({
    name,
    value,
    path: location.pathname,
    connection: navigator.connection?.effectiveType,
    attribution,
  }));
}

new PerformanceObserver(list => {
  const entries = list.getEntries();
  const lcp = entries.at(-1);
  if (lcp) reportMetric('LCP', lcp.startTime, { element: lcp.element?.tagName });
}).observe({ type: 'largest-contentful-paint', buffered: true });`,
  },
  16: {
    lang: 'javascript',
    title: '建立 Wasm module、instance、memory 的基本邊界',
    useCase: '導入既有 C/C++ 演算法前，先釐清 JS 負責 I/O 與 UI，Wasm 負責密集計算，兩邊透過 memory 傳資料。',
    code: `const memory = new WebAssembly.Memory({ initial: 16, maximum: 64 });
const imports = { env: { memory } };

const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/kernel.wasm'),
  imports,
);

const bytes = new Uint8Array(memory.buffer, 0, 1024);
bytes.set(await file.arrayBuffer().then(buffer => new Uint8Array(buffer).slice(0, 1024)));
instance.exports.process(0, bytes.length);`,
  },
  17: {
    lang: 'javascript',
    title: '以 lazy init 控制 Wasm toolchain 的載入成本',
    useCase: '影像編輯器不該在首頁就載入完整 Emscripten runtime；等使用者進入編輯流程再初始化。',
    code: `let wasmModulePromise;

export async function getImageKernel() {
  wasmModulePromise ||= import('./pkg/image_kernel.js').then(async mod => {
    await mod.default();
    return mod;
  });
  return wasmModulePromise;
}

document.querySelector('#enhance').addEventListener('click', async () => {
  const kernel = await getImageKernel();
  kernel.enhance_current_image();
});`,
  },
  18: {
    lang: 'javascript',
    title: '用 typed array 批次跨越 JS/Wasm boundary',
    useCase: '逐 pixel 呼叫 Wasm function 會輸在 boundary cost；實務上應把整段資料放進 linear memory 後一次處理。',
    code: `const memory = instance.exports.memory;
const inputPtr = instance.exports.alloc(imageData.data.byteLength);
const wasmBytes = new Uint8ClampedArray(memory.buffer, inputPtr, imageData.data.byteLength);

wasmBytes.set(imageData.data);
instance.exports.apply_filter(inputPtr, imageData.width, imageData.height);

imageData.data.set(wasmBytes);
ctx.putImageData(imageData, 0, 0);
instance.exports.free(inputPtr, imageData.data.byteLength);`,
  },
  19: {
    lang: 'typescript',
    title: '把 Wasm 媒體處理放進 Worker 避免阻塞 UI',
    useCase: '瀏覽器端壓縮圖片、轉檔或套濾鏡常會吃 CPU；主執行緒只負責進度與取消。',
    code: `const worker = new Worker(new URL('./image-worker.ts', import.meta.url), { type: 'module' });

worker.postMessage({ type: 'process', file, options: { maxWidth: 1600 } });
worker.addEventListener('message', event => {
  if (event.data.type === 'progress') progress.value = event.data.percent;
  if (event.data.type === 'done') preview.src = URL.createObjectURL(event.data.blob);
});

cancelButton.addEventListener('click', () => {
  worker.postMessage({ type: 'cancel' });
});`,
  },
  20: {
    lang: 'javascript',
    title: '檢查 SharedArrayBuffer 前置條件再啟用 Wasm threads',
    useCase: '多執行緒 Wasm 需要 cross-origin isolation；若 CDN header 沒設好，必須降級到單執行緒而不是讓功能白屏。',
    code: `function canUseWasmThreads() {
  return crossOriginIsolated && typeof SharedArrayBuffer === 'function';
}

const workerCount = canUseWasmThreads()
  ? Math.max(1, navigator.hardwareConcurrency - 1)
  : 1;

await initWasmRuntime({
  threads: workerCount,
  fallbackReason: workerCount === 1 ? 'no-shared-array-buffer' : null,
});`,
  },
  21: {
    lang: 'typescript',
    title: 'Canvas immediate mode 需要自己管理場景與 hit testing',
    useCase: '白板、流程圖或標註工具不能只畫圖，還要能知道使用者點到哪個物件並同步提供可訪問性替代路徑。',
    code: `type Shape = { id: string; x: number; y: number; width: number; height: number; label: string };
const shapes: Shape[] = [];

canvas.addEventListener('pointerdown', event => {
  const rect = canvas.getBoundingClientRect();
  const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const hit = [...shapes].reverse().find(shape =>
    point.x >= shape.x && point.x <= shape.x + shape.width &&
    point.y >= shape.y && point.y <= shape.y + shape.height
  );
  if (hit) selectShape(hit.id);
});`,
  },
  22: {
    lang: 'javascript',
    title: '把 Canvas 控制權轉移給 Worker',
    useCase: '即時圖表或筆刷預覽若和輸入、React render 搶主執行緒，OffscreenCanvas 可讓渲染節奏獨立。',
    code: `const canvas = document.querySelector('canvas');
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker('/renderer-worker.js', { type: 'module' });

worker.postMessage({
  type: 'init',
  canvas: offscreen,
  dpr: window.devicePixelRatio,
}, [offscreen]);

window.addEventListener('resize', () => {
  worker.postMessage({ type: 'resize', width: canvas.clientWidth, height: canvas.clientHeight });
});`,
  },
  23: {
    lang: 'javascript',
    title: '最小 WebGL draw call：資料、shader、狀態缺一不可',
    useCase: '排查 WebGL 黑畫面時，要逐步確認 context、shader compile、attribute 綁定、viewport 與 draw call。',
    code: `const gl = canvas.getContext('webgl2');
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.05, 0.08, 0.12, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

const vertices = new Float32Array([0, 0.8, -0.8, -0.6, 0.8, -0.6]);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

gl.useProgram(program);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
gl.drawArrays(gl.TRIANGLES, 0, 3);`,
  },
  24: {
    lang: 'javascript',
    title: '用 instancing 降低大量相同物件的 draw call 成本',
    useCase: '地圖 marker、粒子、資料點若一個物件一個 draw call，CPU 會先卡住；instancing 能把差異資料變成 attribute。',
    code: `const offsets = new Float32Array(instanceCount * 2);
gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.DYNAMIC_DRAW);

gl.enableVertexAttribArray(offsetLocation);
gl.vertexAttribPointer(offsetLocation, 2, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(offsetLocation, 1);

gl.drawArraysInstanced(gl.TRIANGLES, 0, vertexCount, instanceCount);`,
  },
  25: {
    lang: 'javascript',
    title: 'WebGPU compute pipeline 的基本形狀',
    useCase: '瀏覽器端向量搜尋、影像濾鏡或小型模型推論可用 compute shader，但需要明確管理 buffer 與 adapter fallback。',
    code: `const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
if (!device) throw new Error('WebGPU unavailable');

const input = device.createBuffer({
  size: 1024 * 4,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const pass = device.createCommandEncoder().beginComputePass();
pass.setPipeline(pipeline);
pass.setBindGroup(0, bindGroup);
pass.dispatchWorkgroups(32);
pass.end();`,
  },
  26: {
    lang: 'typescript',
    title: '把使用者畫的遮罩轉成 AI 編輯請求的一部分',
    useCase: 'inpainting、ControlNet 或背景移除工具常需要 Canvas 收集筆刷輸入，再把 mask 與 prompt 一起送到後端。',
    code: `async function submitInpaintRequest(canvas: HTMLCanvasElement, prompt: string) {
  const maskBlob = await new Promise<Blob>(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/png');
  });

  const body = new FormData();
  body.set('prompt', prompt);
  body.set('mask', maskBlob, 'mask.png');
  body.set('strength', '0.75');

  return fetch('/api/generate/inpaint', { method: 'POST', body });
}`,
  },
  27: {
    lang: 'typescript',
    title: '分離 DOM read/write 避免 forced synchronous layout',
    useCase: '拖拉排序、展開列表與 resize handler 很容易一邊讀 layout 一邊寫 style，導致每一列都觸發 layout。',
    code: `const rows = [...document.querySelectorAll<HTMLElement>('.row')];

requestAnimationFrame(() => {
  const heights = rows.map(row => row.offsetHeight);

  requestAnimationFrame(() => {
    rows.forEach((row, index) => {
      row.style.setProperty('--measured-height', heights[index] + 'px');
    });
  });
});`,
  },
  28: {
    lang: 'typescript',
    title: '長任務切片，讓輸入事件有機會插隊',
    useCase: '搜尋結果排序、Markdown 解析或資料清洗若一次跑完，INP 會變差；可以分批處理並在批次間 yield。',
    code: `async function processLargeList(items: Item[]) {
  const result = [];
  for (let index = 0; index < items.length; index += 250) {
    result.push(...items.slice(index, index + 250).map(normalizeItem));

    if ('scheduler' in window) {
      await scheduler.yield();
    } else {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  return result;
}`,
  },
  29: {
    lang: 'typescript',
    title: '用 AbortController 統一清理 listener、fetch 與訂閱',
    useCase: 'SPA route 切換後仍持續收到事件或請求回來更新舊畫面，是常見 retained path 來源。',
    code: `export function mountSearchPage(root: HTMLElement) {
  const controller = new AbortController();
  const { signal } = controller;

  window.addEventListener('resize', updateLayout, { signal });
  root.querySelector('input')!.addEventListener('input', onSearch, { signal });
  fetch('/api/search/bootstrap', { signal }).then(loadBootstrapData);

  return () => {
    controller.abort();
    root.replaceChildren();
  };
}`,
  },
  30: {
    lang: 'typescript',
    title: 'Streaming fetch 搭配 TextDecoder 逐段渲染',
    useCase: 'LLM 回答若等整包完成才顯示，體感延遲很高；但逐 token 更新也要批次 flush，避免 layout 與 scroll 抖動。',
    code: `const response = await fetch('/api/chat', { method: 'POST', body, signal });
const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  enqueueToken(decoder.decode(value, { stream: true }));
}

function enqueueToken(text: string) {
  buffer += text;
  requestAnimationFrame(flushBufferedTokens);
}`,
  },
  31: {
    lang: 'typescript',
    title: 'Chat composer 同時處理 IME、附件與送出狀態',
    useCase: '中文輸入法 composition 中按 Enter 不應送出；有附件上傳或串流中也要清楚管理 disable、取消與 optimistic state。',
    code: `let composing = false;

textarea.addEventListener('compositionstart', () => { composing = true; });
textarea.addEventListener('compositionend', () => { composing = false; });

textarea.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.shiftKey || composing) return;
  event.preventDefault();
  if (sendButton.disabled) return;
  submitMessage({
    text: textarea.value,
    attachments: attachmentStore.pendingFiles(),
  });
});`,
  },
  32: {
    lang: 'typescript',
    title: '把 HTTP status 轉成前端可執行的控制流程',
    useCase: 'API contract 不應只回傳錯誤字串；前端要根據 401、403、409、422、429 做不同 UX。',
    code: `async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (response.status === 401) return redirectToLogin();
  if (response.status === 403) throw new Error('你沒有權限執行這個操作');
  if (response.status === 409) throw new Error('資料已被其他人更新，請重新整理');
  if (response.status === 422) return showFieldErrors(await response.json());
  if (response.status === 429) return scheduleRetry(response.headers.get('Retry-After'));
  if (!response.ok) throw new Error('服務暫時不可用');
  return response.json();
}`,
  },
  33: {
    lang: 'javascript',
    title: '用工具化方式拆解 specificity，而不是繼續加 selector',
    useCase: '樣式衝突發生時，先找 cascade layer、source order 與 specificity；最後才考慮是否需要增加權重。',
    code: `function specificity(selector) {
  const ids = (selector.match(/#[\\w-]+/g) || []).length;
  const classes = (selector.match(/\\.[\\w-]+|\\[[^\\]]+\\]|:(?!where)[\\w-]+/g) || []).length;
  const elements = (selector.replace(/:[\\w-]+\\([^)]*\\)/g, '').match(/(^|\\s|>|\\+)\\w+/g) || []).length;
  return [ids, classes, elements];
}

console.log(specificity('.card[data-state="open"] :where(button)'));`,
  },
  34: {
    lang: 'typescript',
    title: '把 resource hint 決策寫成明確條件',
    useCase: '效能 review 時可以用函式檢查每個 hint 是否有理由，避免 preload 變成新瓶頸。',
    code: `function recommendHint(resource: Resource) {
  if (resource.isCurrentNavigationCritical && resource.discoveredLate) return 'preload';
  if (resource.origin !== location.origin && resource.usedOnMostVisits) return 'preconnect';
  if (resource.isLikelyNextPage && resource.hasHighConfidence) return 'prerender';
  if (resource.isPossibleButUncertain) return 'prefetch';
  return 'none';
}`,
  },
  35: {
    lang: 'typescript',
    title: '用限制條件選 Wasm toolchain',
    useCase: 'Rust、Emscripten、AssemblyScript 或 .NET Wasm 的選擇，應該由既有程式碼、runtime 成本、團隊能力與 bundle budget 決定。',
    code: `function chooseWasmToolchain(input: ProjectConstraints) {
  if (input.existingCppCodebase) return 'Emscripten';
  if (input.teamKnowsRust && input.needsSmallBindings) return 'Rust + wasm-bindgen';
  if (input.teamKnowsCSharp && input.acceptsRuntimeCost) return '.NET / Blazor WebAssembly';
  if (input.typescriptLikeSyntax && input.simpleComputeKernel) return 'AssemblyScript';
  return 'JavaScript first, revisit Wasm after profiling';
}`,
  },
  36: {
    lang: 'typescript',
    title: '依互動與節點規模選 DOM、SVG、Canvas、WebGL 或 WebGPU',
    useCase: '資料視覺化、流程圖、地圖與影像工具的技術選型，不能只看喜好；要看可訪問性、物件數量、GPU 需求與 fallback。',
    code: `function pickGraphicsStack(requirement: GraphicsRequirement) {
  if (requirement.needsNativeA11y && requirement.nodeCount < 1000) return 'DOM or SVG';
  if (requirement.nodeCount < 20000 && requirement.needsPreciseHitTesting) return 'Canvas 2D with scene index';
  if (requirement.needs3D || requirement.nodeCount >= 20000) return 'WebGL via engine';
  if (requirement.needsComputeShader && requirement.browserAllowsFallback) return 'WebGPU with fallback';
  return 'SVG for inspectable vector UI';
}`,
  },
  37: {
    lang: 'typescript',
    title: '把 Core Web Vitals checklist 轉成可追蹤任務',
    useCase: '效能優化要避免「感覺變快」，每個修復項都應對應 metric、假設與驗證方式。',
    code: `const webVitalsPlan = [
  { metric: 'LCP', hypothesis: 'hero image discovered too late', fix: 'preload + explicit dimensions' },
  { metric: 'INP', hypothesis: 'filter interaction blocks main thread', fix: 'split task + virtualize rows' },
  { metric: 'CLS', hypothesis: 'ad slot has no reserved height', fix: 'reserve aspect-ratio placeholder' },
];

for (const item of webVitalsPlan) {
  createTicket({ ...item, owner: 'frontend-platform', verifyWith: 'RUM p75 by route' });
}`,
  },
  38: {
    lang: 'typescript',
    title: '把 Senior signal 轉成面試評估 rubrics',
    useCase: '面試或自我檢查時，不只看是否背得出 API，而是看能否說出邊界、取捨、失敗模式與驗證。',
    code: `const rubric = {
  platformModel: 0,
  tradeoffReasoning: 0,
  productionDebugging: 0,
  accessibilityAndPerformance: 0,
  verificationPlan: 0,
};

function scoreAnswer(answer: InterviewAnswer) {
  return Object.entries(rubric).reduce((total, [key]) => {
    return total + (answer.evidence.includes(key) ? 1 : 0);
  }, 0);
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

    <div class="concept-grid concept-grid-expanded">
      <div class="mini-card">
        <h3>心智模型</h3>
        <p>${mentalModel(chapter)}</p>
      </div>
      <div class="mini-card">
        <h3>實務場景</h3>
        <p>${scenario(chapter)}</p>
      </div>
      <div class="mini-card">
        <h3>Production 訊號</h3>
        <p>${productionSignal(chapter)}</p>
      </div>
      <div class="mini-card">
        <h3>驗證方式</h3>
        <p>${validationPlan(chapter)}</p>
      </div>
    </div>

    <h2 id="topic-map">核心議題地圖</h2>
    <p>${topicMapIntro(chapter)}</p>
    <table class="issue-map">
      <thead>
        <tr>
          <th>議題</th>
          <th>需要回答的問題</th>
          <th>真實場景</th>
          <th>可交付成果</th>
        </tr>
      </thead>
      <tbody>
        ${chapter.sections.map(section => renderTopicRow(chapter, section)).join('')}
      </tbody>
    </table>

    ${chapter.sections.map((section, index) => renderSection(chapter, section, index)).join('')}

    <h2 id="practical-example">程式碼與範例</h2>
    <p><strong>${escapeHtml(example.title)}。</strong>${escapeHtml(example.useCase ?? '這段範例示範如何把概念落到可觀測、可維護的程式碼。')}</p>
    ${renderCodeBlock(example)}
    <div class="example-notes">
      <div>
        <h3>如何解讀這段程式碼</h3>
        <ul>
          ${exampleReadingNotes(chapter).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      <div>
        <h3>如何驗證</h3>
        <ul>
          ${exampleVerificationNotes(chapter).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    </div>
    ${demo}

    <h2 id="real-world-applications">真實場景應用</h2>
    <div class="application-grid">
      ${realWorldApplications(chapter).map(item => `
        <div class="mini-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.body)}</p>
        </div>
      `).join('')}
    </div>

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
    <div class="section-lab">
      <div>
        <h3>真實應用</h3>
        <p>${sectionApplication(chapter, section)}</p>
      </div>
      <div>
        <h3>落地檢查</h3>
        <ul>
          ${sectionChecks(chapter, section).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    </div>
    <ul class="section-takeaways">
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
  if (chapterExamples[chapter.id]) return chapterExamples[chapter.id]
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

function productionSignal(chapter) {
  if (chapter.part === 1) return '頁面白屏、TTFB 飆高、redirect chain、TLS 或 DNS 異常、第三方 script 阻塞 parser，最後都會出現在載入瀑布與主執行緒時間線上。'
  if (chapter.part === 2) return '常見症狀是鍵盤無法操作、screen reader 讀不出狀態、表單自動填入失效、SEO 結構混亂，或 hydration 後才有基本互動。'
  if (chapter.part === 3) return 'CSS 問題通常表現為樣式難以覆寫、RWD 斷點失控、文字溢出、layout shift、深色模式破版與設計 token 失去一致性。'
  if (chapter.part === 4) return '真實指標會呈現 LCP 慢、INP 高、CLS 抖動、cache 命中率差、critical request chain 過長或低階裝置首屏無法互動。'
  if (chapter.part === 5) return 'Wasm 導入失敗常不是單次運算慢，而是初始化成本高、bundle 過大、JS/Wasm boundary 太頻繁或 fallback 沒有設計。'
  if (chapter.part === 6) return '圖形應用常見事故包含 DPR 模糊、context loss、hit testing 錯誤、GPU memory 成長、fallback 空白與可訪問性完全缺席。'
  if (chapter.part === 7) return '效能 regression 會以掉幀、互動延遲、記憶體持續上升與長任務堆疊出現，必須回到 trace、heap snapshot 與 RUM 找因果。'
  if (chapter.part === 8) return 'GenAI UI 的失敗通常是取消失效、token 抖動、引用對不上、IME 誤送、scroll lock 錯誤與 partial state 無法復原。'
  return 'Appendix 的價值在於把判斷標準落成 checklist、決策樹與面試 rubrics，讓回答能重複使用且可驗證。'
}

function validationPlan(chapter) {
  if (chapter.tags.includes('css')) return '用 DevTools Computed、Layout、Rendering overlay、視覺回歸測試與不同 writing mode 驗證，而不是只在單一螢幕目測。'
  if (chapter.tags.includes('performance')) return '用 Lighthouse 建立 baseline，再用 Performance trace、Network waterfall、Web Vitals RUM 與低階裝置重現驗證改善是否成立。'
  if (chapter.tags.includes('wasm')) return '量測 Wasm 初始化時間、memory 成長、boundary call 次數、worker 佔用與 JS fallback 表現，確認它真的優於純 JS。'
  if (chapter.tags.includes('canvas') || chapter.tags.includes('webgl') || chapter.tags.includes('webgpu') || chapter.tags.includes('graphics')) return '用 FPS、frame time、GPU memory、context loss 測試、不同 DPR 與 pointer/keyboard 操作檢查圖形層是否可靠。'
  if (chapter.tags.includes('genai')) return '用慢網路、取消、重送、IME、screen reader、長答案與引用缺失案例測試 streaming UI 的狀態一致性。'
  if (chapter.part === 2) return '用鍵盤、screen reader、無 JavaScript、表單 autofill、HTML validator 與搜尋結構資料測試語意是否真的有效。'
  return '用可重現案例、瀏覽器 DevTools、合成測試與 production telemetry 建立閉環，避免只靠主觀經驗判斷。'
}

function topicMapIntro(chapter) {
  return `這一章可以從「為什麼會發生、瀏覽器或平台如何處理、產品中會造成什麼後果、如何驗證」四個角度展開。下面的地圖把 ${escapeHtml(chapter.title)} 拆成可討論、可實作、可面試回答的議題。`
}

function renderTopicRow(chapter, section) {
  return `
    <tr>
      <td><strong>${escapeHtml(section.title)}</strong></td>
      <td>${escapeHtml(issueQuestion(chapter, section))}</td>
      <td>${escapeHtml(issueScenario(chapter, section))}</td>
      <td>${escapeHtml(deliverable(chapter, section))}</td>
    </tr>
  `
}

function issueQuestion(chapter, section) {
  if (chapter.part === 1) return `${section.title} 在 navigation pipeline 中負責哪一步？它會阻塞解析、下載、連線還是渲染？`
  if (chapter.part === 2) return `這個 HTML 能力是否已經有 native semantics？如果改用 div + JavaScript，會失去哪些瀏覽器內建行為？`
  if (chapter.part === 3) return `${section.title} 會如何影響 cascade、layout algorithm、intrinsic size 與元件覆寫邊界？`
  if (chapter.part === 4) return `它對 critical path、cache freshness、資源優先級或 Web Vitals 哪一項最敏感？`
  if (chapter.part === 5) return `資料是否適合跨 JS/Wasm boundary？初始化、記憶體與 toolchain 成本是否被納入？`
  if (chapter.part === 6) return `這個繪圖需求需要 retained mode、immediate mode 還是 GPU pipeline？互動與 fallback 如何補齊？`
  if (chapter.part === 7) return `問題是 rendering、JavaScript execution 還是 memory？要用哪個 trace 或 snapshot 證明？`
  if (chapter.part === 8) return `這個互動是否能在 streaming、取消、partial content、引用與可訪問性狀態下保持一致？`
  return `這個速查項目背後的決策條件是什麼？哪些例外會改變預設答案？`
}

function issueScenario(chapter, section) {
  if (chapter.tags.includes('performance')) return `上線後某條 route 的 p75 指標惡化，需要把 ${section.title} 與實際使用者裝置、網路和資源瀑布對起來。`
  if (chapter.tags.includes('css')) return `設計系統元件被多個產品線複用，${section.title} 的決策會影響覆寫能力、RWD 穩定性與長期 theme 成本。`
  if (chapter.tags.includes('genai')) return `聊天、autocomplete 或影像生成流程中，${section.title} 會直接影響使用者是否能中斷、修正、追溯來源或恢復狀態。`
  if (chapter.tags.includes('wasm')) return `團隊想把既有 native 模組搬到前端，${section.title} 會決定 bundle、初始化、資料傳遞與除錯策略。`
  if (chapter.part === 6) return `圖表、白板、地圖或 AI 編輯工具在大量物件與高頻互動下，需要用 ${section.title} 控制幀率與正確性。`
  if (chapter.part === 2) return `產品需要符合鍵盤操作、表單自動填入、SEO 或輔助科技需求時，${section.title} 不能被視覺樣式取代。`
  return `面試或 incident review 中，${section.title} 常被追問到細節，需要能從平台行為講到產品影響。`
}

function deliverable(chapter, section) {
  if (chapter.tags.includes('performance')) return '一份 trace/RUM 對照、修復假設、實作 PR 與改善前後數據。'
  if (chapter.tags.includes('css')) return '一組元件規則、token/layer 設計、響應式測試案例與覆寫指南。'
  if (chapter.tags.includes('genai')) return '一個可取消、可恢復、可追溯來源且對 IME 與 screen reader 友善的互動流程。'
  if (chapter.tags.includes('wasm')) return '一份 boundary 設計、初始化策略、worker/fallback 設計與 benchmark 報告。'
  if (chapter.part === 6) return '一個清楚的 renderer 選型、resize/DPR/context-loss 策略與互動命中測試設計。'
  if (chapter.part === 2) return '一份語意正確、可鍵盤操作、可漸進增強並能被工具驗證的 HTML 結構。'
  return '一個可說明假設、例外條件、實作方式與驗證手段的決策。'
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
  return `${chapter.title} 的核心不是記住 API 清單，而是建立「輸入、平台處理、使用者可見結果、可觀測指標、失敗復原」之間的映射。這樣遇到框架、瀏覽器或產品需求變動時，仍能回到 Web platform 本身做判斷，並能解釋為什麼某個取捨在當下成立。`
}

function scenario(chapter) {
  return `常見場景包含面試追問、production incident、設計系統元件實作、效能 regression 分析與跨團隊技術選型。回答時應先說目標，再說限制，接著提出可落地的實作策略，最後說明會用哪些工具或數據驗證。`
}

function sectionIntro(chapter, section, index) {
  return `本節聚焦「${escapeHtml(section.title)}」。在 ${escapeHtml(chapter.title)} 的脈絡中，它通常是第 ${index + 1} 個需要釐清的關鍵層，因為它會影響使用者體感、程式架構、除錯路徑與面試官判斷你是否理解底層機制。討論時不要停在定義，還要說出它如何和上下游流程互相限制。`
}

function sectionDeepDive(chapter, section) {
  const tag = chapter.tags[0] ?? 'frontend'
  if (chapter.part === 1) return `實務上要把 ${escapeHtml(section.title)} 放回 navigation、快取、解析與渲染的順序中理解。它可能影響 request 是否能提早送出、response 是否被快取、parser 是否被阻塞，以及畫面何時能進入 layout/paint。`
  if (chapter.part === 2) return `實務上要同時看 HTML content model、可訪問性樹、表單或互動元素的預設行為，以及 JavaScript 增強後是否仍保留無障礙與 fallback。${escapeHtml(section.title)} 不是語法細節，而是平台 contract。`
  if (chapter.part === 3) return `實務上要同時看 cascade、specificity、formatting context、intrinsic size 與 design token。以 ${escapeHtml(section.title)} 來說，錯誤做法通常是局部補樣式；更好的做法是讓規則能被元件邊界和系統化覆寫承載。`
  if (chapter.part === 4) return `實務上要把 ${escapeHtml(section.title)} 對應到 critical rendering path、Network priority、cache、main thread 與 Web Vitals。效能優化不是套 checklist，而是找出哪個等待或阻塞最接近使用者體感。`
  if (chapter.part === 5) return `實務上要同時看 toolchain、runtime、linear memory、JS/Wasm boundary 與 fallback。${escapeHtml(section.title)} 若只看 benchmark，很容易忽略初始化、資料轉換與除錯成本。`
  if (chapter.part === 6) return `實務上要把 ${escapeHtml(section.title)} 放在 rendering loop、輸入事件、GPU/CPU 分工、DPR、resize 與可訪問性補償中設計。畫得出來只是起點，能穩定互動才是產品能力。`
  if (chapter.part === 7) return `實務上要先定位 ${escapeHtml(section.title)} 是造成 frame drop、long task、forced layout、GC pressure 還是 retained memory，再選對 DevTools 面板與 production telemetry 驗證。`
  if (chapter.part === 8) return `實務上要把 ${escapeHtml(section.title)} 視為資料流與互動狀態問題。串流中的內容可能尚未完整、使用者可能取消或改寫輸入，UI 必須能處理 partial、rollback、引用與 a11y。`
  return `實務上要同時看 spec 行為、瀏覽器實作、框架抽象與團隊維護成本。以 ${escapeHtml(section.title)} 來說，錯誤做法通常是只背名詞；更好的做法是說明它與 ${escapeHtml(tag)}、效能、可訪問性、debug 工具之間的關係。`
}

function sectionApplication(chapter, section) {
  if (chapter.part === 1) return `在一次「首頁首屏變慢」的 incident 中，${section.title} 會決定你先看 Network waterfall、Server-Timing、Performance trace 還是安全/快取 header。真實應用是把使用者等待時間切成可歸責的階段，而不是只說瀏覽器很慢。`
  if (chapter.part === 2) return `在設計系統元件或內容平台中，${section.title} 會影響鍵盤操作、表單提交、搜尋索引與 screen reader 朗讀順序。真實應用是先用原生語意建立可靠 baseline，再用 JS 增強互動。`
  if (chapter.part === 3) return `在多團隊共用 UI library 時，${section.title} 會影響元件是否能被安全覆寫、是否支援不同容器、不同語言方向與深色模式。真實應用是把樣式規則變成可維護的 contract。`
  if (chapter.part === 4) return `在 p75 Web Vitals regression 中，${section.title} 會影響你如何排定修復優先級。真實應用是先量測，再針對 critical path 或資源排程下手，而不是一次改很多無法驗證的東西。`
  if (chapter.part === 5) return `在把壓縮、影像處理、CAD、遊戲或 ML kernel 搬到瀏覽器時，${section.title} 會影響初始化時間、記憶體上限、worker 架構與 fallback。真實應用是先設計資料流，再比較效能。`
  if (chapter.part === 6) return `在白板、地圖、資料視覺化或 AI 影像編輯器中，${section.title} 會影響 frame budget、互動命中測試、輸入延遲與低階裝置支援。真實應用是同步設計 renderer 與 interaction model。`
  if (chapter.part === 7) return `在大型 SPA 使用一段時間後越來越慢時，${section.title} 會影響你要看 FPS、long task、heap snapshot 還是 framework profiler。真實應用是把症狀和根因拆開，不讓微優化掩蓋主因。`
  if (chapter.part === 8) return `在 LLM 聊天、AI autocomplete 或生成式編輯工具中，${section.title} 會影響使用者是否能即時看到進度、取消、修正、引用來源與恢復失敗狀態。真實應用是把不完整資料當成正常狀態設計。`
  return `在面試準備或技術決策 review 中，${section.title} 應被整理成「條件、選項、例外、驗證」四段，讓速查內容能真正轉成判斷力。`
}

function sectionChecks(chapter, section) {
  const checks = [
    `能用一句話定義 ${section.title}，並說出它解決的問題與不解決的問題。`,
    `能指出至少一個 production failure mode，例如慢、抖動、不可操作、不可維護或無法 fallback。`,
    `能提出一個具體實作策略，而不是只引用框架或套件名稱。`,
    `能說出會用哪個工具、指標或測試案例驗證結果。`,
  ]

  if (chapter.tags.includes('performance')) {
    checks[1] = `能把 ${section.title} 連到 LCP、INP、CLS、TTFB、cache hit rate 或 long task 中至少一個可量測指標。`
  } else if (chapter.tags.includes('css')) {
    checks[2] = `能說明 selector、layer、token、container 或 logical property 如何讓 ${section.title} 在元件邊界內可維護。`
  } else if (chapter.tags.includes('genai')) {
    checks[1] = `能處理 ${section.title} 在 streaming、取消、錯誤重試、引用缺失與 IME 輸入下的狀態一致性。`
  } else if (chapter.tags.includes('wasm')) {
    checks[2] = `能說明 ${section.title} 的資料如何跨 JS/Wasm boundary，並避免過度頻繁的小型呼叫。`
  }

  return checks
}

function exampleReadingNotes(chapter) {
  if (chapter.part === 1) return ['把每個時間段對應到瀏覽器工作，而不是只看總載入時間。', '觀察 redirect、cache、DNS、TLS 與 main thread 是否互相放大延遲。', '把 client-side 指標與 server log 或 CDN log 對齊。']
  if (chapter.part === 2) return ['先確認原生語意是否足夠，再決定 JavaScript 增強。', '注意 keyboard、focus、validation、autofill 與 screen reader 是否被保留。', '把 HTML 結構當成產品 contract，而不是只是模板輸出。']
  if (chapter.part === 3) return ['觀察規則如何被 cascade、layer、specificity 與容器尺寸影響。', '避免用單點覆寫修局部畫面，優先整理 token 與元件邊界。', '同時測試 mobile、desktop、dark mode、不同語言長度與 reduced motion。']
  if (chapter.part === 4 || chapter.part === 7) return ['先建立 baseline，再針對最接近使用者體感的瓶頸修改。', '把 critical work 與非 critical work 分離，讓瀏覽器排程器能做正確選擇。', '用 RUM 或 trace 驗證改善是否出現在目標族群。']
  if (chapter.part === 5) return ['Wasm 範例的重點是資料批次與 runtime 邊界，不是把所有 JavaScript 改寫。', '注意初始化、memory、toolchain 與 fallback 是否比運算本身更貴。', '把 worker 與主執行緒責任分清楚，避免 UI 被計算拖住。']
  if (chapter.part === 6) return ['繪圖程式要同時處理 renderer、互動、resize、DPR 與 fallback。', 'Canvas/WebGL/WebGPU 的可視輸出不等於可操作產品。', '需要用 frame time、GPU/CPU profile 與 context loss 測試驗證。']
  if (chapter.part === 8) return ['把 partial content、abort、retry 與引用資料視為一等狀態。', '使用 rAF 或批次更新降低串流 token 對 layout 的壓力。', '測試 IME、screen reader、長答案與慢網路。']
  return ['把速查內容轉成可執行判斷。', '明確列出預設選項、例外條件與驗證方式。', '面試回答要能從平台層一路講到產品風險。']
}

function exampleVerificationNotes(chapter) {
  if (chapter.tags.includes('performance')) return ['比較修改前後 p75 指標，而不是只看本機一次結果。', '在低階裝置或 CPU throttling 下重跑 trace。', '確認沒有把成本移到其他 route、互動或後續載入。']
  if (chapter.tags.includes('css')) return ['用 DevTools 檢查 computed style 與 cascade 來源。', '用不同容器寬度、語言長度與 color scheme 測試。', '加入視覺回歸或元件截圖測試。']
  if (chapter.tags.includes('genai')) return ['測試取消、重試、網路中斷與長答案。', '確認 aria-live 或 focus 管理沒有造成重複朗讀。', '驗證引用與實際 token 內容是否能對上。']
  if (chapter.tags.includes('wasm')) return ['量測初始化時間、執行時間、memory peak 與 bundle 大小。', '比較純 JS、worker、Wasm 三種版本。', '測試不支援 Wasm 或 cross-origin isolation 缺失時的 fallback。']
  if (chapter.part === 6) return ['確認不同 DPR 下不模糊，resize 後不變形。', '用 Performance panel 或 browser GPU 工具看 frame time。', '模擬 context loss、指標命中與鍵盤替代操作。']
  if (chapter.part === 2) return ['用鍵盤完成主要流程。', '用 screen reader 或 accessibility tree 檢查名稱、角色與狀態。', '關閉 JavaScript 檢查 baseline 是否仍可理解。']
  return ['建立可重現 demo 或測試案例。', '列出判斷條件與例外。', '用工具輸出或數據支持結論。']
}

function realWorldApplications(chapter) {
  if (chapter.part === 1) return [
    { title: '首屏白屏診斷', body: '把 redirect、DNS、TLS、TTFB、HTML 下載、parser blocking script 與 render-blocking CSS 拆開，逐段確認哪一段造成等待。' },
    { title: '跨團隊 incident 溝通', body: '用 Navigation Timing、Server-Timing 與 CDN log 把責任邊界講清楚，讓前端、後端與平台團隊能各自修正。' },
    { title: '面試延伸', body: '從輸入 URL 一路講到 pixels，再說 cache、security、process model 與 DevTools 如何驗證，是高頻 Senior 題型。' },
  ]
  if (chapter.part === 2) return [
    { title: '設計系統元件', body: '用原生元素建立按鈕、表單、dialog、details 等 baseline，再補視覺與狀態管理，降低 a11y 與瀏覽器相容風險。' },
    { title: '內容與 SEO 平台', body: '語意化 heading、metadata、structured data 與 media fallback 會影響搜尋呈現、分享預覽與輔助科技理解。' },
    { title: '複雜表單流程', body: '結帳、開戶、申請單等流程需要 validation、autofill、錯誤聚焦與無 JavaScript fallback 協作。' },
  ]
  if (chapter.part === 3) return [
    { title: '跨產品設計系統', body: '用 token、cascade layer、container query 與 logical properties 支撐多品牌、多語系、多版型，而不是靠頁面覆寫堆疊。' },
    { title: 'RWD 與內容變動', body: '真實產品的文字、圖片、權限與資料量會變動，layout 必須能承受長字串、空狀態、窄容器與不同輸入裝置。' },
    { title: 'CSS 債務治理', body: '把 specificity、global selector、magic number 與 !important 轉成可追蹤的架構問題，才能長期降低回歸。' },
  ]
  if (chapter.part === 4) return [
    { title: 'Core Web Vitals 專案', body: '針對 LCP、INP、CLS 建立 route-level baseline，先修最影響流量與轉換的瓶頸，再驗證 p75 是否改善。' },
    { title: '資源策略 review', body: '檢查 script、font、image、preload、preconnect、cache-control 與 CDN 壓縮，避免 critical path 被非關鍵資源占用。' },
    { title: '低階裝置體驗', body: '效能問題常只在低階 Android、慢網路或省電模式出現，必須用 throttling 和 RUM segmentation 找出。' },
  ]
  if (chapter.part === 5) return [
    { title: '既有 native code 前端化', body: '把壓縮、影像處理、CAD、模擬器或遊戲核心移到瀏覽器時，要設計 toolchain、memory、worker 與 fallback。' },
    { title: '高成本計算模組', body: 'Wasm 適合批次、密集、可預測的計算；不適合頻繁碰 DOM 或大量小型跨邊界呼叫。' },
    { title: '平台選型決策', body: '比較 Rust、Emscripten、AssemblyScript、.NET 與純 JS 時，應同時看團隊能力、bundle、debug 與部署流程。' },
  ]
  if (chapter.part === 6) return [
    { title: '高互動圖形工具', body: '白板、流程圖、標註、地圖與影像編輯需要同步處理繪圖、命中測試、selection、undo、resize 與可訪問性。' },
    { title: '大量資料視覺化', body: '當 DOM/SVG 節點數無法負荷時，Canvas/WebGL/WebGPU 可以改善 frame time，但會增加互動與測試成本。' },
    { title: 'AI 多模態介面', body: '生成進度、遮罩、ControlNet 輸入與影像編輯 preview 都需要圖形層與 AI 狀態協作。' },
  ]
  if (chapter.part === 7) return [
    { title: '互動延遲治理', body: '把 input handler、render、layout、paint、GC 與 framework scheduling 拆開看，才知道要切 task、virtualize 還是修 CSS。' },
    { title: '長時間使用退化', body: 'Dashboard、編輯器與 SPA 常出現記憶體持續成長，需要用 heap snapshot、retained path 與 teardown 策略修復。' },
    { title: '效能文化', body: '把 trace、RUM、budget、CI 與 regression review 納入流程，避免效能只靠專案末期補救。' },
  ]
  if (chapter.part === 8) return [
    { title: 'LLM 聊天與 Agent UI', body: 'Streaming、取消、工具呼叫、引用、分支、重試與 scroll lock 都是主要產品體驗的一部分。' },
    { title: '智慧輸入與輔助', body: 'Autocomplete、改寫、摘要與生成建議需要處理 IME、partial result、optimistic state 與使用者覆寫。' },
    { title: '可信任輸出', body: 'Citation、來源對照、錯誤狀態與安全提示必須融入 UI，而不是等回答完成後才補。' },
  ]
  return [
    { title: '面試速查', body: '把每個主題整理成定義、機制、取捨、例外、驗證五段，能快速轉成完整回答。' },
    { title: '技術決策', body: 'Appendix 的 checklist 和決策樹適合用在 design review、PR review 與 incident follow-up。' },
    { title: '團隊共識', body: '把模糊偏好轉成共同語言，讓不同工程師能用相同條件討論選型。' },
  ]
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
