import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 15)

const prev = chapters.find(c => c.id === 14)
const next = chapters.find(c => c.id === 16)

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
  <div class="chapter-num">Chapter 15 · Performance</div>
  <h1>Core Web Vitals 與 RUM</h1>
  <p>Core Web Vitals 是 Google 在 2020 年提出的三個以<strong>使用者體感</strong>為中心的效能指標：<strong>LCP</strong>（Largest Contentful Paint，載入速度）、<strong>INP</strong>（Interaction to Next Paint，互動回應速度）、<strong>CLS</strong>（Cumulative Layout Shift，視覺穩定性）。這三個指標自 2021 年起成為 Google 搜尋排名的信號之一，但更重要的是：它們真正捕捉了「使用者有沒有感覺到頁面快、順、穩」。Senior 工程師能把指標數字翻譯成可執行的修復策略，而不是只追求 Lighthouse 分數。</p>
  <div class="chapter-tags">
    <span class="tag">performance</span>
    <span class="tag">metrics</span>
    <span class="tag">rum</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 INP 為何取代 FID（FID 只測量第一次互動的 input delay，INP 測量整個頁面生命週期中所有互動的最壞情況）；能說出 LCP 的「Discoverability 問題」（CSS background-image 不被 Preload Scanner 掃到，需要 preload hint）；能說出 CLS 的計算方式（session window 中連續 layout shift 的加總，有 5s window 和 max 1s gap 的限制）；能說出 RUM 和 Lighthouse synthetic test 的核心差異（RUM 是真實使用者數據，synthetic 是受控環境模擬）；能說出 <code>scheduler.yield()</code> 如何改善 INP。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>三個 Core Web Vitals 對應三個使用者問題：<strong>"Is it happening?"</strong>（頁面有在載入嗎？→ LCP）、<strong>"Is it responsive?"</strong>（我的操作有回應嗎？→ INP）、<strong>"Is it stable?"</strong>（版面會不會突然跳動？→ CLS）。每個問題都有可量測的閾值：Good（綠）/ Needs Improvement（橙）/ Poor（紅）。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>LCP 差但 TTFB 好 → 圖片 priority 問題、CSS background image 無法被 preload scanner 發現。INP 差 → 事件處理函式太重（需要 task splitting 或 virtualization）。CLS 差 → 字型切換、圖片無預留尺寸、廣告動態插入。RUM 數據差但 Lighthouse 好 → 測試裝置與真實使用者的裝置差距。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>Google Search Console 的 Core Web Vitals 報告（基於 CrUX 數據）；商品頁 LCP p75 > 2.5s 但首頁正常（路由特定問題）；行動裝置 INP 比桌面差 3-5 倍（低階裝置主執行緒壓力）；CLS 0.1+ 但找不到原因（字型 swap 或 iframe 廣告）。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>Chrome DevTools Performance panel 的 Experience 軌道（CLS）和 Timings（LCP、FCP）；<code>PerformanceObserver</code> 在 browser 中實時觀察；Lighthouse 產生 synthetic test baseline；web-vitals npm 套件收集 RUM 數據；CrUX Dashboard（PageSpeed Insights）看真實使用者數據。</p>
  </div>
</div>

<h2 id="lcp">15.1 LCP (Largest Contentful Paint)</h2>
<p>LCP 測量從頁面開始載入，到<strong>最大的可見內容元素</strong>繪製完成的時間。LCP 候選元素類型：<code>&lt;img&gt;</code>、<code>&lt;image&gt;</code>（SVG 內）、含文字的 block-level 元素（<code>&lt;h1&gt;</code>、<code>&lt;p&gt;</code> 等）、視頻的 poster frame。<strong>重要</strong>：CSS background-image <strong>不是</strong> LCP 候選元素（無法被 Preload Scanner 發現）。</p>

<p><strong>LCP 好壞閾值</strong>：Good ≤ 2.5s / Needs Improvement 2.5-4s / Poor > 4s（以 p75 衡量）。</p>

<p>LCP 的優化路徑可以分解為四個子部分：</p>

${diagram(`
graph LR
    subgraph LCP["LCP 時間分解"]
        TTFB["TTFB\n伺服器回應時間\n目標 < 600ms"]
        ResourceLoad["資源載入延遲\n從 HTML parse 到\n開始下載 LCP 資源"]
        Download["LCP 資源下載\n圖片/字型/資源大小"]
        Render["渲染延遲\n收到資源後到繪製"]
    end
    TTFB --> ResourceLoad --> Download --> Render
    style TTFB fill:#e8505b,color:white
    style ResourceLoad fill:#f5a623,color:white
    style Download fill:#4caf7d,color:white
    style Render fill:#0a84ff,color:white
`, 'LCP 可以分解為 TTFB + 資源發現延遲 + 下載時間 + 渲染延遲，每個子部分都有對應的優化手段。')}

${code('javascript', `// 用 PerformanceObserver 觀察 LCP
const lcpObserver = new PerformanceObserver((entryList) => {
  // LCP 可能更新多次，最後一個才是最終值
  const entries = entryList.getEntries();
  const lastEntry = entries[entries.length - 1];

  console.log('LCP element:', lastEntry.element);    // 哪個元素是 LCP
  console.log('LCP time:', lastEntry.startTime);      // 毫秒
  console.log('LCP size:', lastEntry.size);           // 像素面積
  console.log('LCP url:', lastEntry.url);             // 若是圖片，圖片 URL

  // 診斷：LCP 元素是否是 CSS background image？
  if (!lastEntry.url && lastEntry.element) {
    const style = getComputedStyle(lastEntry.element);
    if (style.backgroundImage !== 'none') {
      console.warn('LCP is a CSS background image — 無法被 Preload Scanner 發現！');
      console.warn('解決方案：改用 <img> 或加上 <link rel="preload" as="image">');
    }
  }
});

lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

// 使用 web-vitals 套件收集並上報
import { onLCP, onINP, onCLS } from 'web-vitals';

function sendToRUM(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    delta: metric.delta,
    id: metric.id,
    attribution: metric.attribution, // 詳細歸因資訊
    // 附加上下文
    url: location.href,
    connection: navigator.connection?.effectiveType ?? 'unknown',
    deviceMemory: (navigator as any).deviceMemory ?? 'unknown',
  });

  navigator.sendBeacon('/rum/vitals', body);
}

onLCP(sendToRUM);
onINP(sendToRUM);
onCLS(sendToRUM);`)}

<fe-demo-suite demo="web-vitals"></fe-demo-suite>

<h2 id="inp">15.2 INP (Interaction to Next Paint)</h2>
<p>INP（2024 年 3 月取代 FID 成為正式 Core Web Vital）衡量頁面對所有使用者互動的回應延遲，取最差（高百分位）的那一次。它涵蓋 click、tap、keydown 三種互動類型，並測量從使用者互動到下一個 paint 的時間。</p>

<p><strong>INP vs FID</strong>：FID 只看第一次互動的 input delay（從互動到 event handler 開始執行的等待時間），INP 看的是整個生命週期中最差的互動的完整延遲（input delay + processing time + presentation delay）。FID 無法反映頁面長期使用後的 jank。</p>

<p><strong>INP 好壞閾值</strong>：Good ≤ 200ms / Needs Improvement 200-500ms / Poor > 500ms。</p>

${code('javascript', `// INP 優化：Task Splitting 和 scheduler.yield()

// ❌ 問題：一個長任務阻塞主執行緒，INP 差
button.addEventListener('click', () => {
  const results = processLargeDataset(10000_items); // 500ms 的計算
  renderResults(results);
});

// ✅ 方案 1：把長任務切成小塊，yield 讓 paint 先發生
button.addEventListener('click', async () => {
  renderLoadingState(); // 立即顯示 loading

  // 讓 browser 先 paint（下一個 frame）
  if ('scheduler' in window && 'yield' in scheduler) {
    await scheduler.yield(); // 現代 API，讓 input 事件有機會插隊
  } else {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const results = await processInChunks(items, 250);
  renderResults(results);
});

async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (item: T) => R
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    results.push(...chunk.map(processor));

    // 每個 chunk 後 yield，讓 browser 有機會處理其他工作
    await scheduler.yield?.() ?? new Promise(r => setTimeout(r, 0));
  }

  return results;
}

// ✅ 方案 2：把非 UI 的計算卸載到 Web Worker
const worker = new Worker('/worker.js');

button.addEventListener('click', () => {
  renderLoadingState();
  worker.postMessage({ type: 'process', data: items });
});

worker.onmessage = ({ data }) => {
  if (data.type === 'done') renderResults(data.result);
};

// 觀察 INP
new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    const inp = entry as PerformanceEventTiming;
    if (inp.duration > 200) {
      console.warn(\`Slow interaction: \${inp.name}, duration: \${inp.duration}ms\`);
      console.warn('Attribution:', inp);
    }
  });
}).observe({ type: 'event', buffered: true, durationThreshold: 200 });`)}

<h2 id="cls">15.3 CLS (Cumulative Layout Shift)</h2>
<p>CLS 測量頁面在生命週期內所有<strong>非預期版面位移</strong>的累積分數。每次 layout shift 的分數 = impact fraction × distance fraction。Impact fraction 是位移元素在 viewport 中佔的面積；distance fraction 是位移距離佔 viewport 高/寬的比例。</p>

<p><strong>Session Window 計算</strong>：CLS 取的是「session window」中 layout shift 的加總：每個 window 最長 5 秒，且連續 layout shift 間距不超過 1 秒。CLS = 所有 session window 中最大的那一個。這個設計讓長時間頁面不因一個孤立的大 shift 而完全失分。</p>

<p><strong>CLS 好壞閾值</strong>：Good ≤ 0.1 / Needs Improvement 0.1-0.25 / Poor > 0.25。</p>

${code('javascript', `// 觀察 CLS 並找出罪魁禍首
new PerformanceObserver((list) => {
  list.getEntries().forEach((entry: LayoutShift) => {
    if (entry.hadRecentInput) return; // 使用者觸發的位移不計入 CLS

    console.log('Layout shift score:', entry.value);

    // 找出發生位移的元素
    entry.sources.forEach(source => {
      console.log('Shifted element:', source.node);
      console.log('Previous rect:', source.previousRect);
      console.log('Current rect:', source.currentRect);
    });
  });
}).observe({ type: 'layout-shift', buffered: true });

// 常見 CLS 修復

// 1. 字型切換：用 metric override 對齊（見 ch11）
// 2. 圖片沒有預留空間：加 width/height attribute（見 ch12）

// 3. 動態插入內容（廣告、通知、chatbot）
// ❌ 在頁面頂部動態插入元素，把所有內容往下推
const notification = document.createElement('div');
notification.className = 'notification';
document.body.prepend(notification); // 位移所有下方元素！

// ✅ 事先預留空間
const notificationSlot = document.querySelector('.notification-slot');
// .notification-slot { min-height: 60px; } // CSS 預留空間
notificationSlot.appendChild(notification); // 不位移其他元素

// 4. 動畫 / 展開元素
// ❌ 改變 height 觸發 layout 和 layout shift
element.style.height = '200px';

// ✅ 使用 transform（不觸發 layout）
element.style.transform = 'scaleY(1)';
element.style.transformOrigin = 'top';
// 或使用 @starting-style + CSS transition（現代方案）

// 5. 廣告 iframe：保留固定高度
// <div style="min-height: 250px; contain: layout;">
//   <!-- 廣告 iframe -->
// </div>`)}

<h2 id="other-metrics">15.4 TTFB、FCP、TTI 與其他輔助指標</h2>
<p>除了三個 Core Web Vitals，還有幾個重要的診斷指標：</p>

${diagram(`
graph LR
    subgraph Timeline["頁面載入時間線上的指標"]
        direction LR
        Nav["導航開始\n(0ms)"]
        TTFB["TTFB\nTime to First Byte\n第一個 HTML byte 到達\n目標 < 800ms"]
        FCP["FCP\nFirst Contentful Paint\n第一個文字/圖片出現\n目標 < 1.8s"]
        LCP["LCP\nLargest Contentful Paint\n最大元素繪製完成\n目標 < 2.5s"]
        TTI["TTI\nTime to Interactive\n主執行緒空閒，可穩定互動\n(非 Core Web Vitals，但仍有診斷價值)"]
        TBT["TBT\nTotal Blocking Time\nLong Tasks 阻塞時間加總\n目標 < 200ms"]
    end
    Nav --> TTFB --> FCP --> LCP --> TTI
    FCP -.-> TBT -.-> TTI
`, '頁面載入的時間線上，每個指標測量不同的感知層面。')}

${code('javascript', `// 完整的效能指標收集（配合 web-vitals 套件）
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals/attribution';

const rumQueue: object[] = [];
let scheduled = false;

function flushRUM() {
  if (rumQueue.length === 0) return;
  navigator.sendBeacon('/rum', JSON.stringify(rumQueue.splice(0)));
}

function collectMetric(metric: Metric) {
  rumQueue.push({
    name: metric.name,
    value: Math.round(metric.value),
    rating: metric.rating,
    // web-vitals v3+ 提供 attribution（歸因）資訊
    attribution: metric.attribution,
    // 頁面上下文
    url: location.pathname,
    referrer: document.referrer,
    effectiveType: (navigator as any).connection?.effectiveType,
    deviceMemory: (navigator as any).deviceMemory,
    // 自訂標籤（用於分組分析）
    experiment: document.cookie.match(/exp=([^;]+)/)?.[1],
  });

  if (!scheduled) {
    scheduled = true;
    // 等 page 隱藏再一次性上報（減少 beacon 次數）
    document.addEventListener('visibilitychange', flushRUM, { once: true });
  }
}

onLCP(collectMetric);
onINP(collectMetric);
onCLS(collectMetric);
onFCP(collectMetric);
onTTFB(collectMetric);`)}

<h2 id="rum-synthetic">15.5 RUM vs Synthetic Monitoring</h2>
<p>這兩種監測方式各有不可替代的價值：</p>

<p><strong>Synthetic Monitoring（合成測試）</strong>：在受控環境（固定網路、固定裝置、固定 Chrome 版本）執行的模擬測試。代表工具：Lighthouse（本地）、WebPageTest（多地點/多裝置）、CI/CD 中的 Lighthouse CI。<strong>優點</strong>：可重現、可對比、可設 budget；<strong>缺點</strong>：不代表真實使用者，低階 Android + 3G 的真實體驗 Lighthouse 無法完全模擬。</p>

<p><strong>RUM（Real User Monitoring）</strong>：在真實使用者的瀏覽器中收集的 performance metrics。代表工具：<code>web-vitals</code> npm 套件 + 自建分析、Google Analytics 4（內建 Web Vitals 收集）、Vercel Speed Insights、Sentry Performance。<strong>優點</strong>：真實裝置、真實網路、真實使用者行為；<strong>缺點</strong>：延遲收到數據、難以 debug 特定問題。</p>

<p><strong>CrUX（Chrome User Experience Report）</strong>：Google 從匿名 Chrome 使用者收集的 Core Web Vitals 數據，是 Google Search 排名的依據。可在 PageSpeed Insights 和 BigQuery 中查詢。<strong>重要</strong>：CrUX 只有頁面有足夠訪客才有數據（threshold 不公開），小流量頁面看不到。</p>

${code('javascript', `// 建立完整 RUM Pipeline

// 1. 在所有頁面載入 web-vitals（gzip < 2kB）
// 建議在 <head> 中早期載入，不要 defer（避免錯過早期 metrics）

// 2. 分析 RUM 數據時的分組策略
// 按路由（pathname）分組，而不是按完整 URL
const pageGroup = location.pathname
  .replace(/\\/\\d+/g, '/:id')           // /products/123 → /products/:id
  .replace(/\\/[a-f0-9-]{36}/g, '/:uuid'); // UUID 替換

// 3. 設定效能 budget（在 CI 中失敗的閾值）
// lighthouserc.js
const config = {
  ci: {
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift':  ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time':      ['warn',  { maxNumericValue: 300 }],
        'interactive':              ['warn',  { maxNumericValue: 3500 }],
        'categories:performance':   ['error', { minScore: 0.85 }],
      },
    },
  },
};

// 4. 監聽 Long Animation Frames（Chrome 123+，比 Long Tasks 更精確）
new PerformanceObserver(list => {
  list.getEntries().forEach(entry => {
    if (entry.duration > 200) {
      // LoAF 提供比 LongTask 更詳細的歸因：
      // scripts 陣列顯示哪個 script 佔用了時間
      console.log('Long Animation Frame:', entry.duration, entry.scripts);
    }
  });
}).observe({ type: 'long-animation-frame', buffered: true });`)}

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
