import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 10)

const prev = chapters.find(c => c.id === 9)
const next = chapters.find(c => c.id === 11)

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function code(lang, raw) {
  const cls = lang === 'html' ? 'language-markup' : `language-${lang}`
  return `<fe-code-block><pre slot="${lang}"><code class="${cls}">${esc(raw)}</code></pre></fe-code-block>`
}

function diagram(source, caption = '') {
  return `<div class="diagram-wrap"><pre class="mermaid">${source}</pre>${caption ? `<p class="diagram-caption">${caption}</p>` : ''}</div>`
}

export const content = `
<div class="chapter-header">
  <div class="chapter-num">Chapter 10 · Performance</div>
  <h1>JavaScript 載入策略</h1>
  <p>JavaScript 是瀏覽器中唯一可以同時 <strong>阻塞 HTML 解析</strong>與<strong>阻塞渲染</strong>的資源。一個錯誤的 <code>&lt;script&gt;</code> 標籤放置位置，可能讓使用者多等待數百毫秒才能看到畫面內容；而正確的載入策略——搭配 <code>async</code>、<code>defer</code>、<code>type="module"</code>、動態 <code>import()</code>——能讓 parser 持續前進、首次互動加速、非關鍵程式碼延後執行。Senior 工程師的核心能力是能為每種 script 選擇正確的載入模式，並能從 Network 瀑布圖判斷瓶頸。</p>
  <div class="chapter-tags">
    <span class="tag">performance</span>
    <span class="tag">javascript</span>
    <span class="tag">loading</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 <code>async</code> 與 <code>defer</code> 的執行順序差異（async 下載完即執行，不保序；defer 在 DOMContentLoaded 前按序執行）；能解釋為何 <code>type="module"</code> 預設就是 deferred；能說出 <strong>Preload Scanner</strong> 的作用以及為何它無法掃到 JavaScript 動態插入的資源；能解釋 tree shaking 為何依賴 ESM 的靜態分析；能說出在什麼情況下增加 <code>preload</code> hint 反而會傷害 LCP。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p><code>&lt;script&gt;</code> 的四個模式可以用兩個維度理解：<strong>是否 blocking parser</strong>（有 async/defer 就不 blocking）與<strong>執行時機</strong>（async 是下載完立即執行；defer 和 module 是 parse 完成後、DOMContentLoaded 前按序執行）。動態 import() 是第三個軸：不阻塞、按需下載。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>第三方分析腳本（GTM、GA）用 <code>async</code>；頁面邏輯需要 DOM 就緒但有多個依賴時用 <code>defer</code>；對話框、圖表、富文本編輯器等非首屏功能用動態 <code>import()</code>；Preload Scanner 無法抓的 critical chunk 用 <code>&lt;link rel="modulepreload"&gt;</code>。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>Lighthouse 顯示 "Eliminate render-blocking resources"（同步 script 在 <code>&lt;head&gt;</code>）；Network 瀑布圖看到 HTML 下載完成後 script 才開始下載（preload scanner 失效）；TTI 很高但 FCP 還好（defer/async 設置錯誤讓 main thread 長時間佔用）；bundle 裡有大量未使用的程式碼（缺乏 code splitting）。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>Chrome DevTools Network 面板查看 script 的 priority（High/Medium/Low）；Performance 面板的 Main thread 追蹤 parse/evaluate script 時長；Lighthouse "Reduce unused JavaScript" 找 code splitting 機會；Coverage 面板看首屏實際執行的 JS 比例。</p>
  </div>
</div>

<h2 id="script-model">10.1 &lt;script&gt; 標籤的執行模型</h2>
<p>HTML parser 在遇到 <code>&lt;script&gt;</code> 標籤時的預設行為是：<strong>立即停止解析 HTML、下載 script、執行 script，然後繼續解析</strong>。這個「停止-下載-執行」的序列稱為 <strong>parser blocking</strong>。它存在的原因是 script 可能修改 DOM（例如 <code>document.write()</code>），所以 parser 不敢繼續解析未確定的 HTML。</p>

<p>為了解除這個阻塞，HTML5 引入了兩個屬性：</p>
<ul>
  <li><strong><code>async</code></strong>：下載與 HTML 解析<strong>並行</strong>，下載完成後<strong>立即中斷 parser 執行</strong>。若有多個 async script，誰先下載完誰先執行，<strong>不保序</strong>。適合：第三方、分析腳本（不依賴 DOM 或其他 script）。</li>
  <li><strong><code>defer</code></strong>：下載與 HTML 解析<strong>並行</strong>，但<strong>推遲到 HTML 完全解析完畢後</strong>（DOMContentLoaded 事件觸發前）才按序執行。有多個 defer script 時，<strong>按 HTML 出現順序執行</strong>。適合：頁面主邏輯，需要完整 DOM，有互相依賴。</li>
</ul>

<p><strong><code>type="module"</code></strong>：ES module 預設就是 deferred（等同 <code>defer</code>），且是嚴格模式（<code>'use strict'</code> 自動生效）。這是因為 module 的頂層 <code>import</code> 建立了靜態依賴圖，browser 需要先下載所有依賴才能執行，執行順序才能保證正確。若再加上 <code>async</code> 屬性（<code>&lt;script type="module" async&gt;</code>），則行為變成 async module：依賴全部下載完後立即執行，不等 DOM parse 完成。</p>

${diagram(`
sequenceDiagram
    participant HTML
    participant Parser as HTML Parser
    participant DL as Downloader
    participant JS as JS Engine
    Note over Parser,DL: default（同步）
    Parser->>DL: 遇到 script，暫停解析，開始下載
    DL-->>JS: 下載完成，立即執行
    JS-->>Parser: 執行完畢，繼續解析
    Note over Parser,DL: async
    Parser->>DL: 繼續解析 HTML，同時並行下載
    DL-->>JS: 下載完，立即中斷 parser 執行
    Note over Parser,DL: defer / module
    Parser->>DL: 繼續解析 HTML，同時並行下載
    DL-->>DL: 等待 HTML parse 完成
    DL-->>JS: HTML parse 完，按序執行
`, 'async、defer、module 的核心差異：是否 blocking parser，以及何時執行。')}

${code('html', `<!-- ❌ render-blocking：parser 在此停止，等 app.js 下載執行完畢 -->
<head>
  <script src="/app.js"></script>
</head>

<!-- ✅ async：分析腳本不依賴 DOM，下載完立即執行 -->
<script async src="https://analytics.example.com/ga.js"></script>

<!-- ✅ defer：主邏輯需要完整 DOM，defer 保序執行 -->
<script defer src="/vendor.js"></script>
<script defer src="/app.js"></script>
<!-- vendor.js 一定先於 app.js 執行，即使 app.js 先下載完 -->

<!-- ✅ type="module"：預設 deferred，支援頂層 await -->
<script type="module" src="/main.js"></script>

<!-- ✅ inline module：同樣 deferred，可 import 依賴 -->
<script type="module">
  import { init } from '/app.js';
  init(document.querySelector('#app'));
</script>

<!-- ✅ modulepreload：提前通知 browser 要載入的 module graph -->
<link rel="modulepreload" href="/vendor.js" />
<link rel="modulepreload" href="/app.js" />`)}

<fe-demo-suite demo="script-loading"></fe-demo-suite>

<div class="callout">
  <div class="callout-title">Preload Scanner（投機解析器）</div>
  <p>當主 HTML parser 被 blocking script 暫停時，Chrome 會啟動一個<strong>次要掃描線程（Preload Scanner）</strong>，提前掃描 HTML 文件中可見的 <code>&lt;link&gt;</code>、<code>&lt;script src&gt;</code>、<code>&lt;img&gt;</code> 等資源，提前觸發下載。這讓 DNS/TCP/TLS 的建立在 blocking script 執行時已在進行。<strong>陷阱</strong>：Preload Scanner 只能看到原始 HTML，<code>document.write()</code> 動態插入的標籤、CSS 背景圖（background-image）、JavaScript 動態建立的 <code>fetch()</code> 等都看不到——這些需要 <code>&lt;link rel="preload"&gt;</code> 明確提示瀏覽器。</p>
</div>

<h2 id="esm-import-maps">10.2 ES Modules 與 Import Maps</h2>
<p>原生 ESM（ES Modules）讓瀏覽器能直接解析 <code>import</code>/<code>export</code>，不需要 bundler。瀏覽器處理 ESM 的方式是：<strong>下載根模組 → 靜態分析 import → 遞迴下載依賴 → 實例化並執行</strong>。這個過程建立了一個<strong>模組載入圖（Loading Graph）</strong>，每個 import 都是圖中的邊。</p>

<p><strong>動態 import()</strong> 是原生 code splitting 的基礎：<code>import('./module.js')</code> 回傳 Promise，在呼叫時才觸發下載，不加入靜態載入圖。這讓你可以依據使用者行為（點擊按鈕、進入路由）按需載入大型模組。</p>

<p><strong>Import Maps</strong> 解決了 bare specifier 問題：原生 ESM 要求 import path 必須是 URL 或相對路徑，無法直接寫 <code>import React from 'react'</code>（bare specifier）。Import Maps 讓你在 HTML 中定義 bare specifier 的解析規則，讓瀏覽器在不使用 bundler 的情況下也能解析第三方模組。</p>

${code('html', `<!-- Import Maps：定義 bare specifier 映射 -->
<script type="importmap">
{
  "imports": {
    "lodash": "/node_modules/lodash-es/lodash.js",
    "lodash/": "/node_modules/lodash-es/",
    "react": "https://esm.sh/react@18",
    "react-dom/client": "https://esm.sh/react-dom@18/client"
  },
  "scopes": {
    "/legacy/": {
      "react": "https://esm.sh/react@16"
    }
  }
}
</script>

<script type="module">
  import { debounce } from 'lodash';    // 解析到 /node_modules/lodash-es/debounce.js
  import React from 'react';            // 解析到 esm.sh
  console.log(debounce, React.version);
</script>`)}

${code('javascript', `// 動態 import()：按需載入，code splitting 的基礎
const openChartBtn = document.querySelector('#open-chart');

openChartBtn.addEventListener('click', async () => {
  // 點擊後才下載，首屏不需要付出這個 bundle 成本
  const { default: Chart } = await import('./chart.js');
  const chart = new Chart(document.querySelector('#canvas'));
  chart.render(data);
});

// 配合 React.lazy / Suspense
import { lazy, Suspense } from 'react';

const HeavyEditor = lazy(() => import('./HeavyEditor'));

function App() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <HeavyEditor />
    </Suspense>
  );
}

// Promise.all：並行預載入多個 chunk（避免串行 waterfall）
async function prefetchDashboard() {
  await Promise.all([
    import('./dashboard/charts'),
    import('./dashboard/table'),
    import('./dashboard/filters'),
  ]);
}`)}

<h2 id="bundler-code-splitting">10.3 Bundler 與 Code Splitting</h2>
<p>雖然原生 ESM 讓 bundler 在開發環境不再必要（Vite 在 dev mode 直接使用原生 ESM），但在生產環境 bundler 仍有不可替代的價值：<strong>tree shaking</strong>（消除未使用的 export）、<strong>code splitting</strong>（分割成多個 chunk）、<strong>minification</strong>（縮小體積）、以及<strong>polyfill 注入</strong>。</p>

<p><strong>Webpack vs Vite（Rollup + esbuild）vs Turbopack</strong>：</p>
<ul>
  <li><strong>Webpack</strong>：生態最完整，有大量 loader/plugin，但 dev server 啟動和 HMR 速度在大型專案下較慢（CommonJS 模組系統在 dev mode 仍需 bundle）。</li>
  <li><strong>Vite</strong>：dev mode 使用原生 ESM + esbuild（Go 寫的，比 JS 快 10-100x）快速轉換，HMR 只更新有變動的模組；build 使用 Rollup 產生最佳化 bundle。</li>
  <li><strong>Turbopack</strong>（Rust）：Next.js 13+ 預設，針對增量編譯優化，首次 build 慢但後續 hot update 極快。</li>
</ul>

<p><strong>Tree Shaking 依賴 ESM 靜態分析</strong>：bundler 能安全地刪除未被任何 import 引用的 export，是因為 ESM 的 <code>import</code>/<code>export</code> 是靜態的（不能動態改變）。CommonJS 的 <code>require()</code> 是動態的（可以在 if/else 裡執行），bundler 必須保守地保留所有 exports，無法 tree shake。</p>

${code('javascript', `// vite.config.js：Route-based code splitting
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // 手動控制 chunk 分割策略
        manualChunks: {
          // 第三方庫分到獨立 vendor chunk（利用長期快取）
          vendor: ['react', 'react-dom'],
          charts: ['recharts', 'd3'],
          editor: ['@tiptap/core', '@tiptap/starter-kit'],
        },
      },
    },
    // 超過此大小發出警告（預設 500kB）
    chunkSizeWarningLimit: 800,
  },
});

// React Router v6 的 lazy route（route-based splitting）
import { createBrowserRouter, lazy } from 'react-router-dom';

const router = createBrowserRouter([
  { path: '/', Component: lazy(() => import('./pages/Home')) },
  { path: '/dashboard', Component: lazy(() => import('./pages/Dashboard')) },
  { path: '/editor', Component: lazy(() => import('./pages/Editor')) },
]);

// modulepreload 預載 route chunks，避免導航時的 waterfall
// （Vite 自動為 lazy route 加上 modulepreload hint）
// <link rel="modulepreload" href="/assets/Dashboard-abc123.js" />
// <link rel="modulepreload" href="/assets/Editor-def456.js" />`)}

${diagram(`
graph TD
    subgraph Bundle["Code Splitting 策略"]
        Entry["Entry Chunk\n(main.js ~100kB)"]
        Vendor["Vendor Chunk\n(react + deps ~150kB)\n永久快取"]
        Route1["Route: Home\n(~30kB)"]
        Route2["Route: Dashboard\n(~80kB)"]
        Route3["Route: Editor\n(~200kB)"]
    end
    subgraph Loading["載入行為"]
        First["首次訪問 /\n載入 Entry + Vendor + Home"]
        Nav["導航到 /dashboard\n只載入 Dashboard chunk"]
    end
    Entry --> Vendor
    Entry --> Route1
    Entry --> Route2
    Entry --> Route3
    First --> Entry
    First --> Vendor
    First --> Route1
    Nav --> Route2
`, 'Code splitting 讓每個路由只載入需要的 chunk，加速首屏並允許路由 chunk 獨立快取更新。')}

<h2 id="lazy-loading">10.4 Lazy Loading 與 On-demand Loading</h2>
<p>Lazy loading 是「不在首屏需要的資源，不在首屏下載」的策略。實作方式有三個層次：</p>
<ol>
  <li><strong>JavaScript 模組</strong>：動態 <code>import()</code>，由框架（React.lazy、Vue defineAsyncComponent）或路由器管理。</li>
  <li><strong>圖片與 iframe</strong>：<code>loading="lazy"</code> HTML 屬性（browser native），或 Intersection Observer 自製版本。</li>
  <li><strong>Web Components</strong>：<code>customElements.whenDefined('my-component')</code> 搭配動態 import，實現按需升級（progressive hydration）。</li>
</ol>

${code('typescript', `// Intersection Observer + dynamic import：按進入視窗觸發載入
function lazyModule<T>(factory: () => Promise<{ default: T }>, options?: IntersectionObserverInit) {
  const observer = new IntersectionObserver(async (entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      obs.unobserve(entry.target);
      const { default: Module } = await factory();
      // 載入完後初始化模組（例如 render chart into entry.target）
      initModule(Module, entry.target as HTMLElement);
    }
  }, { rootMargin: '200px', ...options }); // rootMargin 讓載入提前觸發

  return observer;
}

// 使用範例：監視每個圖表容器
const chartObserver = lazyModule(() => import('./chart-module'));
document.querySelectorAll('[data-chart]').forEach(el => chartObserver.observe(el));

// Vue 3 defineAsyncComponent
import { defineAsyncComponent, defineComponent } from 'vue';

const HeavyEditor = defineAsyncComponent({
  loader: () => import('./HeavyEditor.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorComponent,
  delay: 200,      // 200ms 後才顯示 loading（避免 loading flash）
  timeout: 10000,  // 10s 超時
});

// Web Components progressive hydration
customElements.whenDefined('rich-text-editor').then(() => {
  document.querySelectorAll('rich-text-editor').forEach(el => {
    el.initialize(editorConfig);
  });
});

// 定義元件（可以在需要時才 import）
async function upgradeRichTextEditor() {
  if (customElements.get('rich-text-editor')) return;
  const { RichTextEditor } = await import('./rich-text-editor');
  customElements.define('rich-text-editor', RichTextEditor);
}`)}

<h2 id="workers">10.5 Worker 模型：Web Worker、Service Worker、SharedArrayBuffer</h2>
<p>瀏覽器的 JavaScript 預設在<strong>主執行緒（main thread）</strong>執行，與 DOM 操作、用戶事件、渲染管線共享同一個執行緒。CPU 密集工作（影像處理、大型資料排序、密碼學）若在主執行緒執行，會造成 UI 凍結（Long Task）。<strong>Web Worker</strong> 提供了一個獨立的 JS 執行緒，沒有 DOM 存取權限，透過 <code>postMessage</code> 和主執行緒溝通。</p>

<p><strong>Service Worker</strong> 是一種特殊的 Worker，充當<strong>網路代理</strong>（network proxy）：它可以攔截頁面發出的所有 fetch 請求，實現離線快取、background sync、push notification。Service Worker 有完整的生命週期（install → activate → fetch），並且獨立於頁面存活（頁面關閉後 SW 仍在）。</p>

<p><strong>SharedArrayBuffer + Atomics</strong>：讓多個 Worker 共享同一塊記憶體（零拷貝），適合需要多執行緒協作的計算（如 WebAssembly 多執行緒）。但需要頁面設定 <code>Cross-Origin-Opener-Policy: same-origin</code> 和 <code>Cross-Origin-Embedder-Policy: require-corp</code> headers（Spectre 攻擊緩解措施）。</p>

${code('typescript', `// Web Worker：CPU 密集工作卸載到背景執行緒
// worker.ts
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  if (type === 'sort') {
    // 此處執行不影響主執行緒的 UI 回應
    const sorted = heavySort(data.items);
    self.postMessage({ type: 'done', result: sorted });
  }
});

// main.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

worker.addEventListener('message', ({ data }) => {
  if (data.type === 'done') renderList(data.result);
});

// Comlink：讓 Worker 通訊像普通函式呼叫一樣簡單
import * as Comlink from 'comlink';

// worker.ts
export const api = { sort: (items: Item[]) => heavySort(items) };
Comlink.expose(api);

// main.ts
const worker = Comlink.wrap<typeof api>(new Worker('./worker.js'));
const sorted = await worker.sort(items); // 看起來像同步呼叫

// Service Worker：攔截 /api/catalog 請求，stale-while-revalidate
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/catalog')) {
    event.respondWith(staleWhileRevalidate(event.request, 'catalog-v2'));
  }
});

async function staleWhileRevalidate(req: Request, cacheName: string) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  // 同時更新快取（不等結果）
  const freshPromise = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  return cached ?? freshPromise;
}`)}

${diagram(`
graph LR
    subgraph Main["Main Thread（主執行緒）"]
        direction TB
        UI["UI 事件 / DOM 操作\n（不可阻塞）"]
        Fetch["fetch() 請求"]
    end

    subgraph WW["Web Worker（背景執行緒）"]
        CPU["CPU 密集計算\n影像處理 / 排序 / 加密"]
    end

    subgraph SW["Service Worker（網路代理）"]
        direction TB
        CacheQ["快取查詢\nCache-First / SWR"]
        Network["Cache 未命中\n→ Network 請求"]
    end

    UI -- "① postMessage(data)" --> CPU
    CPU -- "② postMessage(result)" --> UI
    Fetch -- "③ 所有請求皆攔截" --> CacheQ
    CacheQ -- "④ 命中：直接返回" --> Fetch
    CacheQ -- "⑤ 未命中" --> Network
`, 'Web Worker 解決 CPU 阻塞，Service Worker 解決網路層快取；兩者都不能直接存取 DOM。')}

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
