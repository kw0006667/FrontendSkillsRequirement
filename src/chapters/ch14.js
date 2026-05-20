import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 14)

const prev = chapters.find(c => c.id === 13)
const next = chapters.find(c => c.id === 15)

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
  <div class="chapter-num">Chapter 14 · Performance</div>
  <h1>Caching 策略</h1>
  <p>快取是效能優化中回報最高的槓桿：一個命中快取的資源，延遲接近 0，不消耗頻寬，不佔用伺服器資源。但快取的設計需要同時考慮 <strong>freshness</strong>（資料多久過期）、<strong>invalidation</strong>（如何讓舊快取失效）和 <strong>fallback</strong>（快取失效時的降級策略）。「電腦科學兩大難題」之一的 cache invalidation 在前端也同樣棘手，設計錯誤的快取策略可能讓使用者在幾小時甚至幾天內看到過時的內容。</p>
  <div class="chapter-tags">
    <span class="tag">performance</span>
    <span class="tag">cache</span>
    <span class="tag">service-worker</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 <code>Cache-Control: max-age=31536000, immutable</code> 適合什麼資源（fingerprinted static assets，內容不變可永久快取）；能說出 <code>stale-while-revalidate</code> 的語義（先返回 stale cache，背景更新）；能說出 Bfcache（Back/Forward Cache）的運作原理以及什麼會破壞它（<code>unload</code> 事件 listener、<code>Cache-Control: no-store</code>）；能說出 Service Worker 的 Cache-First vs Network-First 策略分別適合什麼場景；能解釋 normalized cache 的概念（TanStack Query / Apollo Client 如何去重 API 回應）。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>快取可以分為「靜態資源快取」和「API 資料快取」兩類。靜態資源（JS/CSS/字型/圖片）策略簡單：用 content hash 做 fingerprinting，搭配 <code>Cache-Control: max-age=31536000, immutable</code> 永久快取，更新就換檔名。API 資料複雜：需要考慮 freshness（多久重新驗證）、shared state（多個頁面共用同一份資料）、optimistic update（使用者操作後先更新 UI）。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>電商產品 API → stale-while-revalidate（先顯示快取價格，背景更新）。股票/即時數據 → Network-First（必須最新）。靜態 FAQ 頁面 → Cache-First + 24h max-age。認證 API token → 永不快取（Cache-Control: no-store）。使用者上傳的圖片 → 長期快取（加 fingerprint）。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>部署新版本後使用者仍在用舊 JS（fingerprinting 沒做）；API 回應 Cache-Control 不一致導致 CDN 快取錯誤；返回頁面後頁面重新載入而非瞬間恢復（Bfcache 被破壞）；Service Worker 更新後舊版 SW 繼續提供舊內容（SW 更新策略沒設好）。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>DevTools Network 面板的 Size 欄（"(disk cache)"、"(memory cache)"、"(ServiceWorker)"）；Application > Cache Storage 查看 SW 快取內容；<code>about:blank#blocked</code> 確認 Bfcache 不被 listener 破壞；Chrome tracing 的 bfcache category；Lighthouse "Efficiently cache static assets"。</p>
  </div>
</div>

<h2 id="http-cache">14.1 HTTP Cache：Cache-Control、ETag、Last-Modified</h2>
<p>HTTP Cache 是瀏覽器的第一道快取防線，由 <code>Cache-Control</code> response header 控制。理解 <strong>freshness</strong>（新鮮度）和 <strong>validation</strong>（條件請求）的區別是核心：</p>
<ul>
  <li><strong>Freshness</strong>：在 <code>max-age</code> 期限內，瀏覽器直接使用快取，不發送任何請求（0 RTT）。</li>
  <li><strong>Validation</strong>：過期後，瀏覽器用 <code>ETag</code>（If-None-Match）或 <code>Last-Modified</code>（If-Modified-Since）向伺服器確認資源是否變動。若未變動，伺服器回 304（1 RTT，但不傳輸 body）。</li>
</ul>

${code('http', `# 靜態 Fingerprinted Assets（JS/CSS/字型，檔名帶 hash）
Cache-Control: max-age=31536000, immutable
# max-age=31536000 = 1年；immutable 告訴 browser 不用重新驗證

# HTML 文件（需要快取但不能太舊）
Cache-Control: no-cache
# no-cache ≠ 不快取！意思是「快取但每次都要 revalidate（ETag/Last-Modified）」
# 若伺服器回 304，只需 1 RTT，不需要重新傳輸 HTML 內容

# API Response（需要新鮮度保證）
Cache-Control: no-store  # 完全不快取，每次重新請求

# CDN Shared Cache + Browser Cache
Cache-Control: public, max-age=600, s-maxage=3600, stale-while-revalidate=86400
# public：CDN 和 proxy 都可以快取
# max-age=600：browser 快取 10 分鐘
# s-maxage=3600：CDN 快取 1 小時（覆蓋 max-age for shared caches）
# stale-while-revalidate=86400：過期後 24h 內仍可使用舊快取，同時背景 revalidate

# 讓快取資源在特定情境立即失效
Vary: Accept-Encoding  # 不同壓縮格式分開快取
Vary: Accept-Language  # 不同語言分開快取`)}

${code('javascript', `// ETag 條件請求示範
const response1 = await fetch('/api/products');
const etag = response1.headers.get('ETag'); // '"abc123"'
const data = await response1.json();

// 下一次請求，帶上 ETag
const response2 = await fetch('/api/products', {
  headers: { 'If-None-Match': etag }
});

if (response2.status === 304) {
  // 資料未變，使用上次的 data（不消耗頻寬傳輸 body）
  console.log('Data unchanged, using cached version');
} else {
  const newData = await response2.json();
  const newEtag = response2.headers.get('ETag');
}

// stale-while-revalidate 語義的手動實作（當 HTTP header 無法控制時）
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

async function fetchWithSWR(url: string, ttl = 60_000) {
  const cached = cache.get(url);
  const now = Date.now();

  if (cached) {
    // 背景 revalidate（不等結果）
    if (now - cached.timestamp > ttl) {
      fetch(url).then(r => r.json()).then(data => {
        cache.set(url, { data, timestamp: Date.now(), ttl });
      });
    }
    return cached.data; // 立即返回舊資料
  }

  const data = await fetch(url).then(r => r.json());
  cache.set(url, { data, timestamp: now, ttl });
  return data;
}`)}

<h2 id="cache-hierarchy">14.2 Cache Hierarchy：五層快取的查找順序</h2>
<p>瀏覽器處理一個請求時，會按以下順序查找快取，命中則立即返回，不進入下一層：</p>

${diagram(`
flowchart TD
    Request["瀏覽器發出請求"]
    MemCache["Memory Cache\n本次 page session 的快取\n最快（0ms）\npreload 的資源優先放這裡"]
    SWCache["Service Worker Cache\nCaches API 儲存\n可完全控制：Cache-First/Network-First/SWR"]
    DiskCache["Disk Cache（HTTP Cache）\nCache-Control 控制\n跨 session 持久"]
    CDN["CDN / Proxy Cache\nshared cache，多用戶共享"]
    Network["Network（原始伺服器）"]
    HitMem{"命中？"}
    HitSW{"命中？"}
    HitDisk{"命中？"}
    HitCDN{"命中？"}
    Request --> MemCache --> HitMem
    HitMem -->|"是"| Return1["立即返回（最快）"]
    HitMem -->|"否"| SWCache --> HitSW
    HitSW -->|"是"| Return2["SW 返回快取或自訂回應"]
    HitSW -->|"否"| DiskCache --> HitDisk
    HitDisk -->|"是（且 fresh）"| Return3["返回 disk cache"]
    HitDisk -->|"過期，304 revalidate"| CDN
    HitCDN -->|"是"| Return4["CDN 返回"]
    HitCDN -->|"否"| Network
    CDN --> HitCDN
`, '五層快取的查找順序：Memory > Service Worker > Disk > CDN > Network。命中越靠前，延遲越低。')}

<p><strong>Bfcache（Back/Forward Cache）</strong>：Chrome/Safari 把後退/前進的頁面整個凍結（包括 JS heap 狀態），恢復時直接「解凍」，速度接近瞬間。<strong>破壞 Bfcache 的常見原因</strong>：</p>
<ul>
  <li><code>unload</code> event listener（改用 <code>pagehide</code>）</li>
  <li><code>Cache-Control: no-store</code> 在 HTML response</li>
  <li>打開的 <code>IndexedDB</code> 事務</li>
  <li>頁面中有正在進行的 WebSocket 連線</li>
</ul>

<h2 id="service-worker-cache">14.3 Service Worker 快取策略</h2>
<p>Service Worker 提供最靈活的快取控制，可以攔截所有 fetch 請求並實作自訂策略：</p>

${code('javascript', `// Service Worker 快取策略實作

// 1. Cache-First（離線優先）：靜態資源、圖片
// 適合：不常變動、離線必要的資源
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

// 2. Network-First（網路優先）：HTML、動態 API
// 適合：必須最新的內容，但需要離線 fallback
async function networkFirst(request, cacheName, timeout = 3000) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(reject, timeout, new Error('timeout')))
    ]);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return Response.error();
  }
}

// 3. Stale-While-Revalidate（先用舊，背景更新）
// 適合：可接受短暫過期的內容（商品列表、文章）
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchAndUpdate = fetch(request).then(fresh => {
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  });

  return cached ?? fetchAndUpdate;
}

// SW 主路由：依 URL 模式選擇策略
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 靜態資源（fingerprinted）→ Cache-First
  if (url.pathname.match(/\\.(js|css|woff2|webp|avif)$/)) {
    event.respondWith(cacheFirst(request, 'static-v1'));
    return;
  }

  // API → Stale-While-Revalidate
  if (url.pathname.startsWith('/api/catalog')) {
    event.respondWith(staleWhileRevalidate(request, 'api-v1'));
    return;
  }

  // 認證 API → 不快取
  if (url.pathname.startsWith('/api/auth')) return;

  // HTML → Network-First
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, 'pages-v1'));
    return;
  }
});`)}

<fe-demo-suite demo="cache-strategy"></fe-demo-suite>

<h2 id="application-cache">14.4 Application-Level Caching</h2>
<p>除了 HTTP Cache 和 Service Worker，前端應用也有自己的快取層：</p>
<p><strong>SWR / TanStack Query</strong>：React Query、SWR 等 data-fetching library 在 JavaScript 記憶體中維護一個 query cache。每個查詢（key → data）被快取，多個元件訂閱同一個 key 只發一個請求。支援 stale time、revalidate on focus、optimistic updates、background refetch。</p>
<p><strong>Apollo Client Normalized Cache</strong>：GraphQL 的 Apollo Client 使用 normalized cache：把回應中每個物件（依 <code>__typename</code> + <code>id</code>）拆平儲存，讓不同查詢回傳同一個物件時，UI 自動更新。這解決了「不同頁面都請求同一個 user profile，任何更新都能全局同步」的問題。</p>

${code('typescript', `// TanStack Query 快取策略
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function ProductList() {
  const { data, isStale } = useQuery({
    queryKey: ['products', { category: 'electronics' }],
    queryFn: () => fetch('/api/products?category=electronics').then(r => r.json()),
    staleTime: 5 * 60 * 1000,      // 5 分鐘內視為新鮮，不 refetch
    gcTime: 10 * 60 * 1000,         // 10 分鐘後從記憶體清除
  });

  return <div>{data?.map(p => <ProductCard key={p.id} product={p} />)}</div>;
}

// Optimistic Update + Cache Invalidation
function AddToCartButton({ productId }: { productId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) =>
      fetch('/api/cart', { method: 'POST', body: JSON.stringify({ productId: id }) }),

    // Optimistic update：立即更新 UI，不等 API 回應
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previous = queryClient.getQueryData(['cart']);
      queryClient.setQueryData(['cart'], (old: any) => ({
        ...old,
        items: [...old.items, { productId: id, qty: 1 }]
      }));
      return { previous };
    },

    // 若 API 失敗，回滾到之前狀態
    onError: (err, id, context) => {
      queryClient.setQueryData(['cart'], context?.previous);
    },

    // 成功後重新驗證 cart 資料
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  return <button onClick={() => mutation.mutate(productId)}>加入購物車</button>;
}`)}

<div class="callout">
  <div class="callout-title">GenAI Streaming 與快取的矛盾</div>
  <p>傳統的 API response 可以快取（內容固定），但 LLM streaming response 天生難以快取：<strong>每次生成的 token 序列幾乎不可能完全相同</strong>，即使是相同的 prompt。部分解決方案：(1) <strong>語義快取</strong>（Semantic Cache）：把 prompt embedding 向量化，對相似 prompt 返回之前的回應（GPTCache 等工具）；(2) <strong>確定性 prompt 快取</strong>：固定 system prompt + temperature=0 的場景（如分類、摘要），結果可快取；(3) <strong>Prefix Caching</strong>：LLM provider（如 Anthropic 的 prompt caching）在 API 層面快取 KV state，降低重複前綴的推論成本，但對前端而言 response 仍是 streaming。</p>
</div>

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
