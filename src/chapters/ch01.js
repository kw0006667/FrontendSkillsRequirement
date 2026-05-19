import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 1)

const next = chapters.find(c => c.id === 2)

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
  <div class="chapter-num">Chapter 01 · Browser Internals</div>
  <h1>從 URL 到像素的完整旅程</h1>
  <p>URL 到畫面的路徑不是單一流程，而是網路、快取、安全、解析與渲染互相交錯的 pipeline。理解每一層的職責與開銷，是 Senior 前端工程師能把「頁面很慢」精確定位到可修復根因的核心能力。</p>
  <div class="chapter-tags">
    <span class="tag">browser</span>
    <span class="tag">network</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能把 URL 輸入後的 DNS、TCP/TLS、HTTP、HTML parsing、rendering pipeline 串成因果鏈，並能用 <code>performance.getEntriesByType('navigation')</code> 或 DevTools Network/Performance panel 把延遲精確歸因到對應階段。不只說「網路慢」，而是能說「是 TTFB 高還是 DNS 慢還是 render-blocking script」。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>把整條 pipeline 想像成一個可觀測的瀑布（waterfall）：每個階段有開始時間與結束時間，後一階段依賴前一階段的完成，但許多子工作可以並行。Navigation Timing API 就是暴露這張瀑布的標尺。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>電商首頁 LCP 惡化：用 Navigation Timing 找出 TTFB 佔了 800ms，再看 Server-Timing header 確認是 CDN 未命中還是 origin DB 查詢慢，接著才能決定是加 CDN edge cache 還是優化查詢。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>白屏、TTFB 飆高、redirect chain、TLS negotiation timeout、render-blocking resource 阻塞首屏，全部會在 Network waterfall 或 Performance trace 的 main thread 上留下可追溯的痕跡。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>用 <code>performance.getEntriesByType('navigation')</code> 抓本頁 timing、用 DevTools Network panel 看瀑布、用 WebPageTest 取 filmstrip、用 CrUX 看真實使用者 TTFB 分布。</p>
  </div>
</div>

<h2 id="overview">1.1 高層次全景</h2>
<p>當使用者在網址列輸入 URL 並按下 Enter，瀏覽器需要完成十幾個相互依賴的工作才能讓像素出現在螢幕上。這些工作跨越了作業系統、網路協定、安全層、HTML/CSS 解析引擎、排版引擎，一直到 GPU 合成器。Senior 前端工程師的核心價值之一，就是能把「使用者說頁面很慢」拆成「哪個階段花了多少時間、為什麼、如何修」。</p>

<p>全程可分為四個大區塊：<strong>連線建立</strong>（URL parsing → DNS → TCP → TLS）、<strong>資料傳輸</strong>（HTTP request/response）、<strong>文件解析</strong>（HTML parser → DOM；CSS parser → CSSOM）、<strong>渲染</strong>（Render Tree → Layout → Paint → Composite）。這四個區塊有嚴格的依賴順序，但每個區塊內部都有大量的並行機會——例如 Preload Scanner 可以在主 parser 被 script 阻塞時提前抓取資源，HTTP/2 multiplexing 可以在同一條連線同時傳輸多個資源。</p>

<p>Navigation Timing Level 2 API 把這整條 pipeline 拆成可量測的時間點，讓前端工程師不需要猜測，而是直接從瀏覽器取得數據。下圖是完整的時間軸對應。</p>

${diagram(`
sequenceDiagram
    actor User
    participant Browser
    participant DNS
    participant Server

    User->>Browser: 輸入 URL，按 Enter
    Browser->>Browser: URL 解析（scheme / host / path）
    Browser->>DNS: DNS Lookup（cache miss 時）
    DNS-->>Browser: IP Address（含 TTL）
    Browser->>Server: TCP SYN（HTTP/3 改用 QUIC）
    Server-->>Browser: TCP SYN-ACK
    Browser->>Server: TCP ACK + TLS ClientHello
    Server-->>Browser: TLS ServerHello + Certificate + Finished
    Browser->>Server: HTTP GET /（TLS 1.3 可與 Finished 合併）
    Server-->>Browser: 200 OK + HTML（streaming）
    Note over Browser: HTML Tokenizer → Tree Construction（DOM）
    Note over Browser: CSS Parser → CSSOM（render-blocking）
    Note over Browser: Render Tree → Layout → Paint → Composite
`, '完整 URL 到 Pixels 的 pipeline。TLS 1.3 把 Server Finished 與 HTTP Request 合並到同一 RTT，節省一個來回。')}

${code('javascript', `// Navigation Timing Level 2 — 把每個階段的耗時分開看
const [nav] = performance.getEntriesByType('navigation');
const paint = Object.fromEntries(
  performance.getEntriesByType('paint').map(e => [e.name, e.startTime])
);

console.table({
  // 連線建立
  dns:         nav.domainLookupEnd - nav.domainLookupStart,
  tcp:         nav.connectEnd - nav.connectStart,
  tls:         nav.secureConnectionStart > 0
                 ? nav.connectEnd - nav.secureConnectionStart : 0,
  // 資料傳輸
  ttfb:        nav.responseStart - nav.requestStart,
  htmlDownload: nav.responseEnd - nav.responseStart,
  // 解析 & 渲染
  domInteractive: nav.domInteractive - nav.startTime,
  domComplete:    nav.domComplete    - nav.startTime,
  // Paint
  fcp: paint['first-contentful-paint'] ?? 'N/A',
});`)}

<div class="callout">
  <div class="callout-title">Senior 信號：分離歸因</div>
  <p>遇到「頁面慢」時，先看 TTFB 是否高（&gt; 600ms 通常指向 server 或 CDN 問題），再看 <code>domInteractive</code> 是否比 <code>responseEnd</code> 晚很多（指向 render-blocking script 或 large JS bundle），最後看 FCP 與 <code>domComplete</code> 的差距（指向 lazy-loaded 資源或圖片）。這三步讓問題歸因不模糊。</p>
</div>

<h2 id="url-parsing">1.2 URL Parsing 與 Scheme 處理</h2>
<p>URL 的結構由 <a href="https://url.spec.whatwg.org/" rel="noopener">WHATWG URL Standard</a> 定義：<code>scheme://username:password@host:port/path?query#fragment</code>。瀏覽器的 URL 解析是確定性的：相同輸入永遠產生相同結果，且有明確的 error handling（不像 HTML 的錯誤恢復，URL 解析器會直接回傳失敗）。現代瀏覽器都實作了 <code>URL</code> API，讓 JavaScript 能做同樣的解析而不需要自己寫 regex。</p>

<p><strong>Scheme 決定後續的處理路徑</strong>。<code>http:</code> 和 <code>https:</code> 走網路請求；<code>data:</code> 直接從 URL 本身讀取 base64 或 UTF-8 資料，不需要網路；<code>blob:</code> 是 <code>URL.createObjectURL()</code> 建立的暫時 URL，指向記憶體中的 Blob 物件；<code>file:</code> 讀取本機檔案系統；<code>javascript:</code>（歷史遺留）執行腳本，現代瀏覽器在許多場景已禁用它。</p>

<p><strong>Fragment 與 history API 是「免費導覽」</strong>。Fragment（<code>#section</code>）變化不會觸發網路請求，只會讓瀏覽器捲動到對應元素，並更新 <code>location.hash</code>。<code>history.pushState()</code> 和 <code>history.replaceState()</code> 同樣不觸發導覽，但能更改整條 URL（包括 path 和 query），這是 SPA 路由的基礎。這兩種機制是 SPA 能呈現「正常 URL」但不重載頁面的原因。</p>

${code('javascript', `// URL API — 解析所有組成
const url = new URL('https://example.com:8080/search?q=css&page=2#results');
console.log(url.protocol);  // 'https:'
console.log(url.hostname);  // 'example.com'
console.log(url.port);      // '8080'
console.log(url.pathname);  // '/search'
console.log(url.searchParams.get('q')); // 'css'
console.log(url.hash);      // '#results'

// 安全建議：永遠用 URL API 解析，不要自己寫 URL regex
// 自製 regex 幾乎必然在邊界案例（IPv6、punycode、encoded path）出錯

// IDN Homograph Attack 範例（勿直接使用）
// 'аpple.com'（Cyrillic а）看起來像 'apple.com'（ASCII a）
// 瀏覽器 UI 會顯示 punycode 格式：xn--pple-43d.com
// 因此不要只靠視覺判斷 URL 是否可信

// 編碼：encodeURI vs encodeURIComponent
console.log(encodeURI('https://example.com/path?q=hello world'));
// → 'https://example.com/path?q=hello%20world'（保留 :// ? =）

console.log(encodeURIComponent('hello world & <more>'));
// → 'hello%20world%20%26%20%3Cmore%3E'（連 & < > 都編碼）`)}

<div class="callout">
  <div class="callout-title">Senior 信號：Fragment vs pushState</div>
  <p>Fragment 變化觸發 <code>hashchange</code> 事件但不觸發 <code>popstate</code>；<code>pushState</code> 觸發 <code>popstate</code> 但不重載頁面。傳統 SPA 以 <code>#</code> 開頭的 hash routing 能在靜態主機運作，而 HTML5 History API routing 需要 server 把所有路徑都指向同一個 <code>index.html</code>（catch-all route）。這是 Netlify / Vercel 的 <code>_redirects</code> 或 <code>vercel.json</code> rewrite 存在的原因。</p>
</div>

<h2 id="dns-connection">1.3 DNS Resolution 與 Connection Pooling</h2>
<p>DNS 是網際網路的電話簿：把人類可讀的 hostname 轉成 IP address。這個查詢有多層快取，每一層都有機會命中，省去後續的網路往返。瀏覽器自己維護一份 DNS cache（Chrome 約 60 秒 TTL），OS 維護 stub resolver cache（<code>/etc/hosts</code> 和系統 DNS cache），之後才是外部的 Local DNS server（通常是 ISP 提供或自訂的 DoH server）。只有當所有快取都 miss 時，才會走完整個遞迴解析流程。</p>

<p><code>dns-prefetch</code> 告訴瀏覽器提前對某個 hostname 做 DNS 查詢，成本低（只解 DNS，不建立 TCP 連線）；<code>preconnect</code> 則完整做 DNS + TCP + TLS，省去連線建立的整個 RTT，適合確定會用到的第三方 origin（字型 CDN、API server）。過度使用 <code>preconnect</code> 會浪費連線資源；只有當資源在首屏 critical path 上時才值得。</p>

<p>HTTP/1.1 對同一個 origin 限制 6 條並行 TCP 連線，這造成 head-of-line blocking：第 7 個資源必須等其中一條連線空出來。HTTP/2 引入多路複用（multiplexing），所有請求共用一條 TCP 連線上的多個 stream，消除了 HTTP 層面的 HOL blocking。但 TCP 本身的 HOL blocking 依然存在（一個封包遺失會阻塞整條連線的所有 stream）。HTTP/3 改用 QUIC（UDP 上的傳輸層），每個 stream 獨立，真正解決了 HOL blocking 問題。</p>

${diagram(`
flowchart LR
    A[Browser DNS Cache] -->|cache miss| B[OS Resolver]
    B -->|cache miss| C[Local DNS / DoH]
    C -->|cache miss| D[Recursive Resolver]
    D -->|ask root| E[Root Nameserver .]
    E -->|refer .com| F[TLD Nameserver .com]
    F -->|refer| G[Authoritative NS\nexample.com]
    G -->|A record: IP| D
    D -->|IP + TTL| A
`, 'DNS 解析的五層快取。每一層 cache miss 才往下走，只有 Authoritative NS 持有最終答案。TTL 決定快取的有效時間。')}

${code('html', `<!-- dns-prefetch：只解析 DNS，不建立連線。成本低，適合「可能用到」的 origin -->
<link rel="dns-prefetch" href="//analytics.example.com">

<!-- preconnect：DNS + TCP + TLS 全做。適合「一定會用到」的 critical origin -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://api.example.com">

<!-- 注意：preconnect 最多放 3-4 個，過多反而搶走 critical resource 的頻寬 -->
<!-- fonts.gstatic.com 的 crossorigin 是必要的，因為字型請求是 CORS anonymous mode -->`)}

<div class="callout">
  <div class="callout-title">Senior 信號：HTTP 版本對連線策略的影響</div>
  <p>HTTP/2 下，「domain sharding」（把資源分散到多個 subdomain 以突破 6 連線限制）反而有害，因為多個 subdomain 需要多次 TLS handshake。HTTP/2 最佳策略是盡量集中到同一個 origin。HTTP/3 / QUIC 的另一個優點是 <strong>0-RTT connection resumption</strong>：已知的 server 可以直接跳過 TLS handshake 建立資料傳輸，對行動裝置頻繁切換網路的場景尤其有價值。</p>
</div>

<h2 id="tls-handshake">1.4 TLS Handshake 與 0-RTT</h2>
<p>TLS（Transport Layer Security）在 TCP 連線建立後、HTTP 請求發出前，為通訊加密並驗證 server 身份。TLS 1.2 需要兩個 RTT（Round Trip Time）才能完成握手：第一個 RTT 交換加密演算法清單和 server 憑證，第二個 RTT 完成 key exchange 和 Finished 驗證。TLS 1.3 透過把 key share 加入 ClientHello，把完整握手壓縮到一個 RTT。</p>

<p><strong>0-RTT Session Resumption</strong> 是 TLS 1.3 的進階功能：如果瀏覽器曾連線過這個 server，可以在 ClientHello 裡附上 Pre-Shared Key（PSK）直接傳送第一筆 HTTP 請求，不需要等握手完成。代價是可重放攻擊（replay attack）——攻擊者可以重送這個 0-RTT 請求。因此 0-RTT 只應用於 <strong>idempotent 請求</strong>（例如 GET），絕對不用於 POST、DELETE 等改變 server 狀態的操作。</p>

<p><strong>HSTS（HTTP Strict Transport Security）</strong> 透過 response header <code>Strict-Transport-Security: max-age=31536000; includeSubDomains</code> 告訴瀏覽器未來一年內對這個 domain 永遠使用 HTTPS，即使使用者輸入的是 <code>http://</code>。HSTS Preload 更進一步：把 domain 加入瀏覽器原始碼中的清單（<a href="https://hstspreload.org/" rel="noopener">hstspreload.org</a>），讓第一次造訪都不需要先發出 HTTP 請求再被 redirect。</p>

${diagram(`
sequenceDiagram
    participant C as Client
    participant S as Server

    Note over C,S: TLS 1.2（2 RTT）
    C->>S: ClientHello（cipher suites, random）
    S-->>C: ServerHello + Certificate + ServerHelloDone
    C->>S: ClientKeyExchange + ChangeCipherSpec + Finished
    S-->>C: ChangeCipherSpec + Finished
    C->>S: HTTP Request（第 3 RTT 才開始傳資料）

    Note over C,S: TLS 1.3（1 RTT）
    C->>S: ClientHello + KeyShare（ECDHE key）
    S-->>C: ServerHello + KeyShare + Certificate + Finished
    C->>S: HTTP Request（第 2 RTT 就傳資料）

    Note over C,S: TLS 1.3 0-RTT（有重放風險）
    C->>S: ClientHello + KeyShare + EarlyData（HTTP Request 直接附上）
    S-->>C: ServerHello + Finished
`, 'TLS 1.2 → 1.3 的 RTT 演進。0-RTT 把 HTTP 請求與握手合並，但只能用於冪等操作。')}

${code('javascript', `// 判斷 TLS 握手延遲的方式
const [nav] = performance.getEntriesByType('navigation');

const tlsCost = nav.secureConnectionStart > 0
  ? nav.connectEnd - nav.secureConnectionStart
  : 0;

const connectionReused = nav.connectEnd === nav.connectStart; // TCP 複用時兩者相等

console.log({
  tlsMs: tlsCost,
  connectionReused,
  // TLS 1.3 的 tlsCost 應顯著低於 TLS 1.2（約少 0.5-1 RTT）
  // connectionReused = true 表示來自 connection pool，不需要重新握手
});

// 用 Server-Timing header 從 server 側補充數據
// Server 可以在 response 加上：Server-Timing: db;dur=45, cache;dur=2, total;dur=89
// 前端讀取：
const serverTimings = nav.serverTiming ?? [];
serverTimings.forEach(({ name, duration }) => {
  console.log(\`Server: \${name} = \${duration}ms\`);
});`)}

<h2 id="http-lifecycle">1.5 HTTP Request 與 Response Lifecycle</h2>
<p>HTTP 請求由三部分組成：<strong>Request Line</strong>（method + URL + protocol version）、<strong>Headers</strong>（key-value 元資訊，包含 Host、Accept、Authorization、Cache-Control 等）、<strong>Body</strong>（GET 通常沒有，POST/PUT 有）。Server 回應同樣由三部分組成：Status Line、Response Headers、Response Body。理解 HTTP 的語意不只是「知道 status code 是什麼」，而是能設計出正確的 API contract 讓前端做出對應 UX 決策。</p>

<p><strong>Cookie 的安全屬性</strong>是 Senior 必須熟悉的面試題。<code>HttpOnly</code> 讓 JavaScript 無法讀取 Cookie，防止 XSS 竊取 session；<code>Secure</code> 讓 Cookie 只在 HTTPS 下傳輸；<code>SameSite</code> 控制跨站點請求時是否攜帶 Cookie——<code>Strict</code> 完全不帶（連從 Google 點連結進來都不帶）、<code>Lax</code>（現代瀏覽器預設值）允許 top-level GET 導覽攜帶、<code>None</code> 允許所有跨站請求但必須同時設定 <code>Secure</code>。</p>

<p><strong>Service Worker 攔截的時機</strong>：Service Worker 在頁面 JavaScript 之前就接管 fetch 請求。當 SW 已安裝且 active，對相同 origin 的 fetch 請求都會先進入 SW 的 <code>fetch</code> event handler，SW 可以選擇回應快取版本、去 network 拿或兩者結合（stale-while-revalidate）。重要：第一次造訪時 SW 尚未安裝，必須等頁面載入、SW 安裝完成後，第二次造訪才會被攔截。</p>

<div class="table-wrap">
<table class="info-table">
  <thead>
    <tr><th>Status Code</th><th>語意</th><th>前端應如何回應</th></tr>
  </thead>
  <tbody>
    <tr><td><code>200 OK</code></td><td>請求成功，有 response body</td><td>正常渲染結果</td></tr>
    <tr><td><code>204 No Content</code></td><td>成功，無 body（常用於 OPTIONS preflight、DELETE）</td><td>不讀 body，更新本地狀態</td></tr>
    <tr><td><code>301 Moved Permanently</code></td><td>永久 redirect，瀏覽器與 CDN 會快取</td><td>通常透明跟隨，SEO 有影響</td></tr>
    <tr><td><code>302 Found</code></td><td>暫時 redirect，不快取</td><td>跟隨 redirect，但 method 可能變成 GET</td></tr>
    <tr><td><code>307 Temporary Redirect</code></td><td>暫時 redirect，<strong>保留原始 method</strong></td><td>POST redirect 應用 307 而非 302</td></tr>
    <tr><td><code>304 Not Modified</code></td><td>條件請求命中快取（ETag / Last-Modified 有效）</td><td>使用本機快取內容</td></tr>
    <tr><td><code>401 Unauthorized</code></td><td>未提供認證（unauthenticated）</td><td>導向登入頁</td></tr>
    <tr><td><code>403 Forbidden</code></td><td>認證通過但無權限（unauthorized）</td><td>顯示「無權限」訊息，不重新導向</td></tr>
    <tr><td><code>429 Too Many Requests</code></td><td>Rate limited，常附 <code>Retry-After</code> header</td><td>讀取 Retry-After，排程重試</td></tr>
    <tr><td><code>503 Service Unavailable</code></td><td>Server 暫時不可用，通常附 <code>Retry-After</code></td><td>顯示維護頁，背景指數退避重試</td></tr>
  </tbody>
</table>
</div>

${code('javascript', `// 把 HTTP status 轉成前端可執行的控制流程
async function apiFetch(url, init) {
  const res = await fetch(url, init);

  // 4xx/5xx 不會讓 fetch reject，必須手動處理
  if (res.status === 401) {
    await auth.redirectToLogin({ returnUrl: location.href });
    return;
  }
  if (res.status === 403) throw new Error('你沒有執行這個操作的權限');
  if (res.status === 409) throw new Error('資料已被其他人修改，請重新整理');
  if (res.status === 422) {
    const errors = await res.json();
    throw new ValidationError(errors.fields); // 表單錯誤，不同處理路徑
  }
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? '60');
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return apiFetch(url, init); // 指數退避應用在真實場景
  }
  if (!res.ok) throw new Error(\`Unexpected \${res.status}\`);
  return res.status === 204 ? null : res.json();
}

// Cookie 的正確設定（server-side）
// Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
// HttpOnly → XSS 無法讀取
// Secure   → 只在 HTTPS 傳輸
// SameSite=Lax → 防 CSRF，允許正常的跨站連結導覽`)}

<fe-demo-suite demo="navtiming"></fe-demo-suite>

<h2 id="real-world-applications">真實場景應用</h2>
<div class="application-grid">
  <div class="mini-card">
    <h3>首屏白屏診斷</h3>
    <p>用 Navigation Timing 把 redirect → DNS → TLS → TTFB → HTML 下載 → DOM interactive → FCP 依序檢查。TTFB &gt; 600ms 優先找 CDN 或 server 問題；FCP 比 domInteractive 晚很多則找 render-blocking resources。</p>
  </div>
  <div class="mini-card">
    <h3>跨團隊 incident 溝通</h3>
    <p>用 <code>nav.responseStart - nav.requestStart</code>（TTFB）和 Server-Timing header 把前端、後端、CDN 的責任邊界講清楚，避免「你說是後端慢，他說是前端慢」的無效爭論。</p>
  </div>
  <div class="mini-card">
    <h3>HTTP API contract 設計</h3>
    <p>301 vs 302 vs 307 的選擇直接影響 SEO 和表單重送行為；401 vs 403 決定前端是導向登入還是顯示錯誤；429 + Retry-After 讓前端能做正確的 rate limit recovery 而不是無限重試。</p>
  </div>
</div>

<h2 id="pitfalls-tradeoffs">常見陷阱與取捨</h2>
<div class="tradeoff-grid">
  <div class="mini-card">
    <h3>preconnect 用太多</h3>
    <p><code>preconnect</code> 建立的連線佔用 socket，如果那個 origin 最終沒被使用（或超過 10 秒才用到），這些連線會被瀏覽器關閉，白費了 DNS + TCP + TLS 的成本。原則：只對首屏 critical path 上的 origin 使用。</p>
  </div>
  <div class="mini-card">
    <h3>忽略 302 vs 307 的差異</h3>
    <p>302 在許多瀏覽器實作上會把 POST 請求改成 GET，這是歷史遺留問題。如果需要保留 POST method（例如 form submit 後 redirect），必須用 307 Temporary Redirect 或 303 See Other（故意改成 GET 的 redirect）。</p>
  </div>
  <div class="mini-card">
    <h3>把 401 和 403 搞混</h3>
    <p>401 表示「我不知道你是誰」（需要登入）；403 表示「我知道你是誰但你沒有權限」（登入後仍看到此錯誤）。混用會導致前端把有權限的已登入用戶重導向到登入頁，或把未登入用戶顯示「無權限」錯誤訊息。</p>
  </div>
  <div class="mini-card">
    <h3>SameSite=None 的安全代價</h3>
    <p><code>SameSite=None; Secure</code> 允許第三方 iframe 和跨站請求攜帶 cookie（例如嵌入式 widget 需要的 session）。這是 CSRF 保護的完全放棄，必須有對應的 CSRF token 機制補位，不能只靠 SameSite。</p>
  </div>
</div>

<h2 id="interview-framing">面試回答框架</h2>
<ol>
  <li><strong>先建立分層：</strong>把問題分到「連線層（DNS/TCP/TLS）、傳輸層（HTTP）、解析層（HTML/CSS）、渲染層（Layout/Paint/Composite）」中的哪一層。</li>
  <li><strong>再說機制：</strong>DNS 快取 TTL、TLS 1.3 的 1 RTT、HTTP/2 multiplexing、HSTS preload 這些機制不是魔法，是有明確設計原因的協定決策。</li>
  <li><strong>說取捨：</strong>0-RTT 省延遲但有重放風險；HSTS 提升安全但難以回滾（preload 移除要等 18 個月生效）；preconnect 省 RTT 但佔 socket。</li>
  <li><strong>說驗證：</strong>Navigation Timing API、DevTools Network panel waterfall、WebPageTest 的 connection view、Server-Timing header。</li>
</ol>

<div class="chapter-footer">
  <span></span>
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
