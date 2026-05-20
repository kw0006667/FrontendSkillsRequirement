import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 13)

const prev = chapters.find(c => c.id === 12)
const next = chapters.find(c => c.id === 14)

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
  <div class="chapter-num">Chapter 13 · Performance</div>
  <h1>Resource Hints 與網路層優化</h1>
  <p>網路延遲是前端效能的核心瓶頸之一，而瀏覽器的預設行為往往太保守：它等到解析 HTML 時才發現需要某個資源，才開始建立連線、下載。Resource Hints 讓開發者能「提前告知」瀏覽器，讓 DNS 查詢、TCP/TLS 握手、資源下載提前開始。但這是一把雙刃劍——<strong>過度 preload 反而搶走 LCP 資源的頻寬</strong>，反而傷害效能。理解每種 hint 的語義，才能正確使用。</p>
  <div class="chapter-tags">
    <span class="tag">performance</span>
    <span class="tag">network</span>
    <span class="tag">http</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 <code>preconnect</code> vs <code>dns-prefetch</code> 的差異（preconnect 建立完整 TCP/TLS，dns-prefetch 只解析 DNS，preconnect 更積極但也更耗資源）；能說出 <code>preload</code> vs <code>prefetch</code> 的差異（preload 是當前頁面必要資源，high priority；prefetch 是未來頁面可能需要的，idle priority）；能說出 HTTP/2 的 multiplexing 如何解決 HTTP/1.1 的 head-of-line blocking；能說出 Brotli 的壓縮率為何高於 gzip，以及什麼情境下仍該用 gzip。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>Resource hints 按「確定性」排序：<strong>preload</strong>（當前頁面一定用到，必給）→ <strong>preconnect</strong>（當前頁面一定會連到此 origin）→ <strong>dns-prefetch</strong>（可能連到）→ <strong>prefetch</strong>（下一頁可能用到）→ <strong>prerender</strong>（幾乎確定要去的下一頁）。越確定的 hint 優先級越高，但也越耗資源，用錯了反而傷害效能。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>電商首頁確定載入 Algolia 搜尋 SDK → <code>preconnect</code>。Next.js SSR 生成的 critical CSS chunk → <code>modulepreload</code>。用戶點擊「下一步」的高可能頁面 → <code>prefetch</code> 或 Speculation Rules API 的 <code>prerender</code>。LCP hero image → <code>preload</code>（確保 Preload Scanner 能找到）。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>Network 瀑布圖中看到大量請求排隊（HTTP/1.1 connection limit）；Brotli 尚未在 CDN 開啟（壓縮後 JS/CSS 體積可縮小 20-30%）；preload 清單過長導致 LCP 圖片被降優先級；Chrome 發出 "The resource was preloaded but not used within a few seconds" 警告。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>Chrome DevTools Network 面板的 Priority 欄（Highest/High/Medium/Low/Lowest）；Response headers 的 <code>Content-Encoding: br</code> 確認 Brotli 已啟用；Lighthouse "Preload key requests" 和 "Avoid enormous network payloads"；WebPageTest 的 waterfall 圖，找多次 DNS/TCP/TLS 建立的浪費。</p>
  </div>
</div>

<h2 id="resource-hints">13.1 Resource Hints 完整對照</h2>
<p>Resource Hints 是透過 <code>&lt;link&gt;</code> 標籤在 HTML <code>&lt;head&gt;</code> 中放置的「提示」，告訴瀏覽器未來可能需要的資源或連線。它們是<strong>建議性的</strong>（browser 可能忽略），而非強制性的。</p>

${diagram(`
graph TD
    subgraph Hints["Resource Hints 決策樹"]
        Q1{目的是？}
        Q2{同 origin 還是跨 origin？}
        Preload["preload\n當前頁面 critical 資源\n高優先級，一定會用到\nas= 指定資源類型"]
        Prefetch["prefetch\n未來頁面可能用到\n瀏覽器空閒時下載\n低優先級"]
        Prerender["prerender / Speculation Rules\n幾乎確定的下一頁\n完整預渲染包括 JS 執行"]
        Preconnect["preconnect\n建立 DNS + TCP + TLS\n已知需要連到此域名"]
        DNS["dns-prefetch\n只解析 DNS（無 TCP/TLS）\n用於 preconnect 的低成本替代"]
        Module["modulepreload\n預載 ES module\n同時解析 module graph"]
    end
    Q1 -->|"當前頁面資源（腳本/字型/圖片）"| Q2
    Q2 -->|同 origin| Preload
    Q2 -->|跨 origin| Preconnect
    Q1 -->|"未來可能需要的頁面資源"| Prefetch
    Q1 -->|"幾乎確定的下一頁"| Prerender
    Q1 -->|"只建立連線（第三方域名）"| DNS
    Q1 -->|"ES module 及其依賴"| Module
`, 'Resource hints 的選擇取決於確定性（一定用 vs 可能用）和目標（資源 vs 連線）。')}

${code('html', `<head>
  <!-- preconnect：提前建立完整 TCP/TLS（適合字型 CDN、API 域名）-->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://api.example.com" />

  <!-- dns-prefetch：只解析 DNS，比 preconnect 輕量（適合不確定是否用到的域名）-->
  <link rel="dns-prefetch" href="https://analytics.vendor.com" />

  <!-- preload：當前頁面 critical 資源（字型、LCP 圖片、critical JS）-->
  <!-- 注意：as= 必填，決定優先級；字型必須有 crossorigin -->
  <link rel="preload" href="/fonts/brand.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />
  <link rel="preload" href="/critical.css" as="style" />

  <!-- modulepreload：預載 ES module（同時解析 import graph）-->
  <link rel="modulepreload" href="/app.js" />
  <link rel="modulepreload" href="/vendor.js" />

  <!-- prefetch：未來可能用到的資源（idle 時下載）-->
  <link rel="prefetch" href="/next-page-data.json" as="fetch" crossorigin />

  <!-- Speculation Rules API（取代舊的 prerender）-->
  <script type="speculationrules">
  {
    "prerender": [
      {
        "source": "list",
        "urls": ["/checkout"],
        "eagerness": "moderate"
      }
    ],
    "prefetch": [
      {
        "source": "document",
        "where": { "href_matches": "/products/*" },
        "eagerness": "conservative"
      }
    ]
  }
  </script>
</head>`)}

<fe-demo-suite demo="resources"></fe-demo-suite>

<div class="callout">
  <div class="callout-title">preload 的常見錯誤：過度 preload</div>
  <p>每個 <code>rel="preload"</code> 都會提升資源的 network priority 到 High/Highest，<strong>搶走本應給 LCP 圖片的頻寬</strong>。常見反模式：把所有可能的 JS chunks 都 preload（Vite/webpack 會自動 modulepreload 你的 entry chunks，手動再加一遍就 double 了）。原則：<strong>只對首次渲染真正需要、且 Preload Scanner 無法自動發現的資源使用 preload</strong>（例如：CSS background 圖片、JS 動態 import、第三方 CDN 字型）。</p>
</div>

<h2 id="http2-http3">13.2 HTTP/2、HTTP/3 與 Multiplexing</h2>
<p>HTTP/1.1 最大的限制是每個 TCP 連線一次只能有一個進行中的 request（Head-of-Line blocking）。瀏覽器用開多個連線（每個域名最多 6 個）來規避，但仍有 DNS/TLS 建立成本。</p>

<p><strong>HTTP/2 Multiplexing</strong>：在單一 TCP 連線上同時傳輸多個 request/response（多路複用），徹底解決 HTTP/1.1 的連線數限制。<strong>帶來的架構改變</strong>：HTTP/1.1 時代的 "domain sharding"（把資源分到多個子域名以增加連線數）在 HTTP/2 下反而有害（增加 DNS/TLS 建立成本）；HTTP/1.1 時代的 "image spriting"（合併圖片減少請求數）在 HTTP/2 下不再必要。</p>

<p><strong>HTTP/3 與 QUIC</strong>：HTTP/2 雖然在應用層解決了 HoL blocking，但 TCP 層仍有 HoL blocking（一個 packet 丟失，後續所有流都等待 retransmit）。HTTP/3 改用 QUIC（基於 UDP），讓不同流的 packet 丟失不互相影響，在高丟包率網路（行動網路、Wi-Fi）下效果特別顯著。</p>

${diagram(`
sequenceDiagram
    participant Browser
    participant Server
    Note over Browser,Server: HTTP/1.1（每次一個請求）
    Browser->>Server: GET /app.js
    Server-->>Browser: Response app.js
    Browser->>Server: GET /styles.css
    Server-->>Browser: Response styles.css
    Note over Browser,Server: HTTP/2（多路複用，同時多個）
    Browser->>Server: GET /app.js (stream 1)
    Browser->>Server: GET /styles.css (stream 3)
    Browser->>Server: GET /font.woff2 (stream 5)
    Server-->>Browser: Response (stream 1, 3, 5 交錯)
`, 'HTTP/2 multiplexing 讓多個請求在同一個 TCP 連線上並行，消除 HTTP/1.1 的 6 個連線限制。')}

${code('javascript', `// 在 Node.js/Express 伺服器確認 HTTP/2 支援
// （現代 CDN 如 Cloudflare、Fastly 預設開啟 HTTP/3）

// HTTP/2 server push（已被棄用，改用 Link: <url>; rel=preload header）
// 更好的替代：103 Early Hints 讓 server 在主 response 之前發送 preload hints
// 讓 browser 在 server 處理 HTML 時就能開始下載 critical 資源

// 檢查當前頁面的 HTTP 版本
const perfEntries = performance.getEntriesByType('navigation');
const nav = perfEntries[0];
console.log('HTTP version:', nav.nextHopProtocol);
// 'h2' = HTTP/2, 'h3' = HTTP/3, 'http/1.1' = HTTP/1.1

// 檢查所有資源的協議
performance.getEntriesByType('resource').forEach(entry => {
  console.log(entry.name, '→', entry.nextHopProtocol);
});`)}

<h2 id="compression">13.3 Compression：gzip、Brotli、Zstandard</h2>
<p>HTTP 壓縮透過 <code>Accept-Encoding</code> 請求 header 和 <code>Content-Encoding</code> 回應 header 協商。現代 browser 發送 <code>Accept-Encoding: gzip, deflate, br</code>（<code>br</code> = Brotli）。</p>

<p>壓縮率比較（JS/CSS/HTML 文字內容）：</p>
<ul>
  <li><strong>Brotli（br）</strong>：比 gzip 高 15-25% 壓縮率，是現代 web 文字資源的首選。缺點：壓縮時 CPU 成本高，適合靜態壓縮（build time 預先壓縮）；動態壓縮建議用較低的 Brotli 等級（level 4-6）。</li>
  <li><strong>gzip</strong>：壓縮率稍低但 CPU 成本低，動態壓縮首選，所有瀏覽器支援。</li>
  <li><strong>Zstandard（zstd）</strong>：2023 年開始被 Chrome/Firefox 支援，兼顧壓縮率（接近 Brotli）和速度（接近 gzip），是下一代標準。</li>
</ul>

${code('javascript', `// Nginx 配置 Brotli + gzip（server 端）
// nginx.conf
// brotli on;
// brotli_comp_level 6;
// brotli_types text/html text/css application/javascript application/json;
//
// gzip on;
// gzip_comp_level 6;
// gzip_types text/html text/css application/javascript;

// Vite build：靜態 Brotli 壓縮
// vite.config.js with vite-plugin-compression
import { defineConfig } from 'vite';
import compress from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    compress({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024, // 只壓縮 > 1kB 的檔案
    }),
    compress({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
  ],
});

// 在 browser 中驗證壓縮是否生效
fetch('/app.js').then(res => {
  // 實際傳輸用了 Brotli：
  console.log(res.headers.get('content-encoding')); // 'br'
  // 注意：fetched resource 的 size = 解壓後大小
  // Network 面板的 "transferred" = 壓縮後大小（即傳輸量）
});`)}

<h2 id="speculation-rules">13.4 Speculation Rules API</h2>
<p>舊版的 <code>&lt;link rel="prerender"&gt;</code> 實作簡陋且各瀏覽器行為不一致。Chrome 109+ 引入的 <strong>Speculation Rules API</strong> 是現代的 prerender/prefetch 標準，提供：</p>
<ul>
  <li><strong>eagerness 控制</strong>：<code>immediate</code>（立即觸發）、<code>eager</code>（hover 時觸發）、<code>moderate</code>（滑鼠在 link 上 200ms 觸發）、<code>conservative</code>（實際 pointerdown/touch 觸發）。</li>
  <li><strong>document rules</strong>：讓瀏覽器根據 URL 規則和 score 自動選擇要 prefetch/prerender 的連結。</li>
  <li><strong>Bfcache 協同</strong>：prerendered 頁面可存進 bfcache，讓下一頁和後退都瞬間完成。</li>
</ul>

${code('html', `<!-- Speculation Rules API：細粒度控制預載策略 -->
<script type="speculationrules">
{
  "prerender": [
    {
      "source": "list",
      "urls": ["/checkout/step-2"],
      "eagerness": "moderate"
    }
  ],
  "prefetch": [
    {
      "source": "document",
      "where": {
        "and": [
          { "href_matches": "/products/*" },
          { "not": { "href_matches": "*.pdf" } }
        ]
      },
      "eagerness": "conservative",
      "refers_type": "same-site"
    }
  ]
}
</script>

<!-- 動態插入 Speculation Rules（根據使用者行為調整）-->
<script type="module">
function addSpeculationRule(href) {
  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify({
    prefetch: [{ source: 'list', urls: [href] }]
  });
  document.head.appendChild(script);
}

// 當用戶把商品加入購物車，預先 prefetch 結帳頁
document.querySelector('#add-to-cart').addEventListener('click', () => {
  addSpeculationRule('/checkout');
});
</script>`)}

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
