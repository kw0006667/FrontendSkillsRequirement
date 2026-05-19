import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 2)

const prev = chapters.find(c => c.id === 1)
const next = chapters.find(c => c.id === 3)

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
  <div class="chapter-num">Chapter 02 · Browser Internals</div>
  <h1>Parsing 與 Rendering Pipeline</h1>
  <p>Senior 前端要能把 DevTools Performance panel 上的 Parse HTML、Recalculate Style、Layout、Paint、Composite Layers 事件，對應回瀏覽器內部的工作，而不是只說「瀏覽器會 render」。</p>
  <div class="chapter-tags">
    <span class="tag">browser</span>
    <span class="tag">rendering</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能解釋為什麼改 <code>transform</code> 比改 <code>left</code> 更流暢（只觸發 Composite，跳過 Layout 和 Paint）；能說出 <code>getElementsByTagName</code> 的 Live NodeList 在迴圈中讀 <code>.length</code> 為什麼危險；能描述 Preload Scanner 如何在 parser 被 script 阻塞時仍繼續抓取資源；能說出 Spectre/Meltdown 為什麼讓 <code>SharedArrayBuffer</code> 需要 COOP + COEP headers。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>把 rendering pipeline 想成一條組裝線：HTML 和 CSS 進來，DOM + CSSOM 在中間組合成 Render Tree，再依序通過 Layout（算幾何）、Paint（記錄指令）、Composite（GPU 輸出）。任何一步被阻塞，後面的步驟全部等待。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>動畫卡頓：用 Performance panel 確認是 Layout Shift（綠色條）、Paint（紫色條）還是 Scripting 時間過長（黃色條）。不同根因有不同修法——不能一律說「加 will-change 就好」。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>INP（Interaction to Next Paint）高代表 main thread 被長任務佔用；CLS 高代表有 Layout Shift；FCP 慢通常指向 render-blocking stylesheet 或 script。這些指標都能在 DevTools Performance panel 找到對應事件。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>用 Performance panel 的 Main thread waterfall 找 Long Task（紅色三角形）、用 Layers panel 觀察圖層數量、用 Rendering overlay（Paint Flashing）確認哪些區域在 repaint、用 <code>PerformanceObserver</code> 收集 long task。</p>
  </div>
</div>

<h2 id="html-parser">2.1 HTML Parser 與 Tokenization</h2>
<p>HTML5 規格定義的 tokenizer 是一個含有約 80 個狀態的有限狀態機。它從 Data state 開始，遇到 <code>&lt;</code> 切換到 Tag Open state，再依序識別 tag name、attributes、self-closing slash、end tag 等，最後輸出 tokens：StartTag、EndTag、Character、Comment、DOCTYPE。這個設計讓 HTML parser 能處理任意格式的錯誤輸入（unlike XML 的 well-formedness 要求），並以完全可預測的方式進行錯誤修復——例如遺失的 <code>&lt;/p&gt;</code> 會被自動補上，不是「最佳努力」而是「標準規範的必要行為」。</p>

<p><strong>Tree Construction</strong> 把 tokens 轉成 DOM 節點，使用一個「insertion mode」的狀態機和一個「open elements stack」。遇到 StartTag 通常把節點推入 stack，遇到 EndTag 就 pop，文字 token 成為當前 open element 的 text node。解析是 <strong>streaming</strong> 的：瀏覽器不需要收到完整 HTML 才開始建立 DOM，第一個位元組到達就能開始 tokenize，這讓伺服器端 streaming render（Next.js 的 <code>renderToPipeableStream</code>）能讓使用者更早看到部分頁面。</p>

<p><strong>Parser Blocking 與 Preload Scanner</strong> 是理解 script 載入策略的關鍵。當 HTML parser 遇到沒有 <code>async</code> 或 <code>defer</code> 屬性的 <code>&lt;script&gt;</code> 標籤，必須停止解析、下載腳本、執行完畢後才能繼續。這是因為 JavaScript 可能呼叫 <code>document.write()</code> 插入新的 HTML，讓後續已解析的 DOM 全部失效。現代瀏覽器引入 <strong>Preload Scanner（Speculative Parser）</strong>：它在主 parser 被阻塞時，先行掃描後續 HTML 並提前送出 <code>&lt;script src&gt;</code>、<code>&lt;link rel=stylesheet&gt;</code>、<code>&lt;img src&gt;</code> 的下載請求，讓下載工作與腳本執行並行。這是為什麼「把 script 放 body 底部」和「加 defer」都能提升效能的底層原因。</p>

${diagram(`
flowchart LR
    subgraph Tokenizer
        D[Data State] -->|遇到 &lt;| TO[Tag Open]
        TO --> TN[Tag Name]
        TN --> ATT[Attribute]
        ATT -->|遇到 &gt;| EM[Emit StartTag Token]
    end
    subgraph TreeConstruction
        EM --> TC[Tree Construction\n依 insertion mode 建節點]
        TC --> DOM[DOM Tree]
    end
    subgraph Parallel
        PS[Preload Scanner\n提前掃描後續 HTML] -.->|提前請求| RES[script / css / img]
    end
    TC -.->|parser blocked by script| PS
`, 'HTML parsing 的兩個階段。Tokenizer 輸出 tokens，Tree Construction 把 tokens 轉成 DOM 節點。Parser 被 script 阻塞時，Preload Scanner 繼續並行掃描。')}

${code('html', `<!-- script 的四種執行模型 -->

<!-- 1. Default：parser blocking。不建議用在 <head> -->
<script src="app.js"></script>

<!-- 2. async：下載並行，下載完立即執行（可能打亂順序），仍短暫 block parser -->
<script src="analytics.js" async></script>

<!-- 3. defer：下載並行，等 HTML 解析完成後、DOMContentLoaded 前執行，維持順序 -->
<script src="app.js" defer></script>

<!-- 4. type="module"：預設就是 defer（不用寫 defer），支援 import/export -->
<script type="module" src="app.js"></script>

<!-- 判斷用哪個：
     - 需要 DOM 操作 → defer 或 type="module"
     - 獨立的分析/廣告腳本 → async
     - 首屏必要的 inline 邏輯 → 直接 inline <script>（不需要 src，無 blocking）
-->`)}

<div class="callout">
  <div class="callout-title">Senior 信號：為什麼 type="module" 預設 defer</div>
  <p>ES Module 需要先解析 import graph（靜態分析依賴關係）再執行，而解析依賴可能觸發額外的 fetch 請求。如果 module 是 synchronous blocking，整個 import graph 的下載都會阻塞 parser。預設 defer 讓下載並行發生，執行延後到 DOM 解析完成後，保持了正確的語意（可以安全存取 DOM），又避免了 blocking。</p>
</div>

<h2 id="dom-construction">2.2 DOM 建構</h2>
<p>DOM（Document Object Model）是 HTML 文件在記憶體中的樹狀表示，每個 HTML 元素、文字內容、注釋都是一個 Node 物件。Node 是基礎介面，Element 是繼承自 Node 的子型別，專門表示 HTML 標籤元素。<code>&lt;p&gt;Hello&lt;/p&gt;</code> 產生兩個節點：一個 <code>HTMLParagraphElement</code>（Element）和一個文字 <code>Node</code>（Text node），Text node 是 p 的 child。這個細節在操作 <code>node.childNodes</code> 時很重要：它包含 Text node（空白也算），而 <code>node.children</code> 只包含 Element。</p>

<p><strong>Live NodeList vs Static NodeList</strong> 是高頻陷阱。<code>getElementsByTagName()</code>、<code>getElementsByClassName()</code>、<code>childNodes</code>、<code>children</code> 回傳的是 <strong>Live NodeList</strong>：它直接參考 DOM 的內部狀態，每次讀取時都會重新查詢。如果在迴圈裡一邊改 DOM 一邊讀 <code>list.length</code>，可能造成無限迴圈或跳過節點。<code>querySelectorAll()</code> 回傳 <strong>Static NodeList</strong>（快照），不受後續 DOM 改變影響。效能上，Live NodeList 在讀取 <code>.length</code> 時若 DOM 被標記為「dirty」，會觸發 style recalculation 確保資料是最新的，這是 layout thrashing 的根源之一。</p>

<p><strong>Layout Thrashing（Forced Synchronous Layout）</strong> 發生在交替讀取 layout 屬性和修改 DOM 的時候。讀取 <code>offsetHeight</code>、<code>scrollTop</code>、<code>getBoundingClientRect()</code>、<code>getComputedStyle()</code> 等會強制瀏覽器在此刻完成尚未執行的 layout（稱為「flush layout」），確保你拿到的是最新值。如果你在修改 DOM 之後立刻讀取，瀏覽器必須先做一次 layout 計算才能回答你的問題。批次「先讀後寫」是避免 layout thrashing 的關鍵模式。</p>

${code('javascript', `// Live NodeList 陷阱
const list = document.getElementsByClassName('item'); // Live
// BAD：邊改 DOM 邊讀 length，list.length 會動態變化
for (let i = 0; i < list.length; i++) {
  list[i].classList.remove('item'); // 改了 DOM，list 馬上更新！
}
// 可能跳過一半的元素，因為 remove 後 list 縮短了

// GOOD：先轉成 static array 再操作
const items = Array.from(document.getElementsByClassName('item'));
items.forEach(el => el.classList.remove('item')); // 安全

// Layout Thrashing 範例與修復
const cards = [...document.querySelectorAll('.card')];

// BAD：交替讀寫，每次 write 後 read 都觸發 forced layout
cards.forEach(card => {
  const height = card.offsetHeight;      // 讀（觸發 layout）
  card.style.height = height + 20 + 'px'; // 寫（使 layout 失效）
  // 下一次迭代讀 offsetHeight 時又要重新 layout
});

// GOOD：先批次讀，再批次寫
const heights = cards.map(card => card.offsetHeight); // 批次讀（一次 layout）
requestAnimationFrame(() => {
  cards.forEach((card, i) => {
    card.style.height = heights[i] + 20 + 'px'; // 批次寫（只觸發一次 layout）
  });
});`)}

<h2 id="cssom">2.3 CSSOM 建構與 CSS 為何 render-blocking</h2>
<p>CSS Parser 把每一條 CSS rule 解析為 CSSOM（CSS Object Model）中的節點。與 HTML parser 的 streaming 特性不同，CSS 解析在概念上必須等整個 stylesheet 下載完成才能確定最終的 CSSOM——因為 CSS 規則有級聯（cascade）：後出現的規則可以覆蓋先出現的。如果瀏覽器在 CSS 下載到一半時就嘗試渲染，可能先顯示錯誤的樣式，然後在 CSS 下載完成後發生視覺跳動（FOUC — Flash of Unstyled Content）。</p>

<p>CSS 是 <strong>render-blocking</strong> 的原因：Render Tree 需要 DOM + CSSOM 同時就緒才能建立。沒有 CSSOM，瀏覽器不知道哪些元素應該顯示、字型大小是什麼、背景顏色是什麼。因此，瀏覽器在 CSSOM 完成之前不會進入 Layout 階段。<code>&lt;link rel="stylesheet"&gt;</code> 預設是 render-blocking 的；但加上 <code>media</code> attribute 可以讓不符合條件的 stylesheet 不阻塞渲染（瀏覽器仍會下載它，只是不 block）。</p>

<p><strong>CSS 和 Script 的互動</strong>是另一個微妙的阻塞關係：Parser blocking script 必須等 CSSOM 就緒才能執行（因為腳本可能存取 <code>getComputedStyle()</code>），所以如果 CSS 還在下載，script 就得等——即使 script 本身已經下載完畢。這個「CSS blocks JS, JS blocks HTML parser」的雙重阻塞，是為什麼「把 CSS 放 <code>&lt;head&gt;</code>、把 JS 放 <code>&lt;body&gt;</code> 底部」這個古老建議在 HTTP/1.1 時代仍然正確的原因。</p>

${code('html', `<!-- Render-blocking stylesheet（預設） -->
<link rel="stylesheet" href="styles.css">

<!-- 非 render-blocking：media 條件不符合時不 block -->
<link rel="stylesheet" href="print.css" media="print">
<link rel="stylesheet" href="wide.css" media="(min-width: 1200px)">

<!-- Critical CSS inline + defer 完整樣式 — 一種 render-blocking 優化技術 -->
<style>
  /* 只放首屏必要的樣式（body, header, hero 等），幾 KB 以內 */
  body { margin: 0; font-family: system-ui; }
  .hero { min-height: 100vh; background: #f7fbff; }
</style>
<link rel="preload" href="full.css" as="style" onload="this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="full.css"></noscript>`)}

<h2 id="render-layout-paint-composite">2.4 Render Tree、Layout、Paint、Composite</h2>
<p>Render Tree 由 DOM 和 CSSOM 共同建立，只包含需要渲染的節點。<code>display: none</code> 的元素不進入 Render Tree（也不佔空間）；<code>visibility: hidden</code> 的元素進入 Render Tree 但不顯示（佔空間）；<code>::before</code>/<code>::after</code> 等偽元素也會出現在 Render Tree 中。Shadow DOM 的節點在各自的 shadow tree 裡渲染，不影響主 Render Tree。</p>

<p><strong>Layout（Reflow）</strong> 計算每個 Render Tree 節點的幾何屬性：位置（x, y）和大小（width, height）。Layout 從 Render Tree 的根節點開始，依照 Box Model、Float、Flexbox 或 Grid 演算法遞迴計算。任何改變元素大小或位置的操作（width、height、margin、padding、font-size、border）都會觸發整個或部分 Render Tree 的重新計算。Layout 是 rendering pipeline 中通常最昂貴的步驟。</p>

<p><strong>Paint</strong> 把 Layout 的結果轉換成繪圖指令序列（display list）。這些指令描述「在哪裡畫什麼顏色的什麼形狀」，但還不是像素——它們在 Raster Thread 中才轉成位圖。Paint 觸發的屬性包括 color、background-color、box-shadow、outline 等，但不包括 transform 和 opacity（這兩個在 Composite 層處理）。<strong>Composite</strong> 是最後一步：GPU 把各個 layer 的位圖按順序合成，輸出到螢幕。CSS <code>transform</code> 和 <code>opacity</code> 的變化只影響 Composite 步驟，跳過 Layout 和 Paint，這是它們是「動畫安全屬性」的原因。</p>

${diagram(`
flowchart LR
    subgraph Parsing
        H[HTML Stream] --> DOM[DOM Tree]
        C[CSS Files] --> CSSOM[CSSOM]
    end
    subgraph MainThread
        DOM --> RT[Render Tree\ndisplay:none 排除]
        CSSOM --> RT
        RT --> L[Layout\n計算幾何位置]
        L --> P[Paint\n記錄繪圖指令]
    end
    subgraph GPU
        P --> R[Raster Threads\n生成位圖]
        R --> CO[Compositor Thread\n圖層合成輸出]
    end
    style L fill:#ffe8e8,stroke:#e06
    style P fill:#fff8e0,stroke:#d90
    style CO fill:#e8ffe8,stroke:#0a0
`, 'Rendering Pipeline 的四個主要階段。Layout 和 Paint 在主執行緒，Rasterization 在 Raster Thread Pool，Composite 在 Compositor Thread（獨立於主執行緒）。')}

${code('css', `/* 動畫安全屬性 vs 觸發 Layout 的屬性 */

/* AVOID：改 left/top 觸發 Layout → Paint → Composite（最貴） */
.box-bad {
  position: absolute;
  left: 0;
  transition: left 0.3s; /* 每幀都觸發 Layout */
}

/* PREFER：改 transform 只觸發 Composite（最便宜） */
.box-good {
  position: absolute;
  transform: translateX(0);
  transition: transform 0.3s; /* 只在 Compositor Thread，不阻塞主執行緒 */
}

/* will-change：提示瀏覽器提前為該元素建立獨立 compositor layer */
.animated-panel {
  will-change: transform; /* 讓 transform 動畫不需要 repaint 其他元素 */
}

/* 注意：will-change 濫用會造成 Layer Explosion，佔用大量 GPU 記憶體 */
/* 只對確實會做 transform/opacity 動畫的元素使用，動畫結束後考慮移除 */`)}

<fe-demo-suite demo="rendering"></fe-demo-suite>

<div class="callout">
  <div class="callout-title">Senior 信號：哪些操作觸發哪些階段</div>
  <p><strong>只 Composite：</strong><code>transform</code>、<code>opacity</code>（元素已在獨立 layer）。<strong>Paint + Composite：</strong><code>color</code>、<code>background-color</code>、<code>box-shadow</code>。<strong>Layout + Paint + Composite：</strong><code>width</code>、<code>height</code>、<code>margin</code>、<code>padding</code>、<code>font-size</code>、<code>display</code>、<code>position</code>。完整清單可以在 <a href="https://csstriggers.com" rel="noopener">csstriggers.com</a> 查詢。</p>
</div>

<h2 id="threads">2.5 主執行緒、Compositor Thread、Raster Thread</h2>
<p>在 60fps 的螢幕上，瀏覽器每幀有 <strong>16.67ms 的 budget</strong>。120fps 則只有 8.33ms。這個 budget 必須包含 JavaScript 執行、Style 重算、Layout、Paint 記錄等所有主執行緒工作。超過 budget 的幀會被 dropped，使用者感受到卡頓（jank）。<strong>Long Task</strong> 定義為超過 50ms 的主執行緒任務（一個任務 = 不可中斷的同步執行區塊），它不只影響動畫，也讓瀏覽器無法回應用戶輸入（點擊、鍵盤）。</p>

<p><strong>INP（Interaction to Next Paint）</strong> 於 2024 年 3 月取代 FID 成為 Core Web Vitals 的互動指標。INP 衡量從用戶互動（click、keydown、pointerdown）到瀏覽器渲染回應的最差延遲（取所有互動的 98th percentile）。與 FID 只看「第一次互動的輸入延遲」不同，INP 覆蓋整個頁面生命週期的所有互動。INP &gt; 200ms 被視為「需要改善」，&gt; 500ms 被視為「差」。優化 INP 的核心是把長任務切成小塊，讓瀏覽器有機會在任務間處理用戶輸入。</p>

<p><strong>Compositor Thread</strong> 和 <strong>Raster Thread</strong> 是獨立於主執行緒的執行單元。Compositor Thread 處理頁面滾動（透過把已光柵化的圖層重新排列）和 CSS <code>transform</code>/<code>opacity</code> 動畫——這兩種操作不需要主執行緒介入，所以即使主執行緒忙於執行 JavaScript，頁面仍可以流暢滾動和播放動畫（前提：動畫的屬性只有 transform 和 opacity，且元素已在獨立 compositor layer）。Raster Thread Pool 把 Paint 生成的顯示清單轉成位圖，它們在 Worker 執行緒中工作，也不阻塞主執行緒。</p>

${code('javascript', `// 把長任務切片，讓瀏覽器能在中間回應輸入
async function processLargeDataset(items) {
  const results = [];
  const CHUNK_SIZE = 300;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    results.push(...chunk.map(processItem));

    // 把控制權還給瀏覽器，讓它有機會處理用戶輸入
    // scheduler.yield() 是最優選（優先級感知），setTimeout(0) 是 fallback
    if ('scheduler' in window && 'yield' in scheduler) {
      await scheduler.yield();
    } else {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  return results;
}

// scheduler.postTask — 明確設定工作優先級
// 'user-blocking': 影響用戶感知，最高優先（如更新可見 UI）
// 'user-visible': 用戶可能注意到，中等優先（如預計算下一頁資料）
// 'background':  背景工作，最低優先（如上報 analytics、預取）
scheduler.postTask(() => {
  buildSearchIndex(data);
}, { priority: 'background' });

// requestAnimationFrame：在下一幀繪製前執行（用於 DOM 讀寫操作）
// requestIdleCallback：在瀏覽器空閒時執行（已被 scheduler.postTask background 取代）
requestAnimationFrame(() => {
  // 安全的 DOM 讀寫批次點
  const height = element.offsetHeight; // 讀
  element.style.height = height + 'px'; // 寫（在同一個 rAF 中，不算 thrashing）
});

// 偵測 Long Task（在 production 用於 RUM）
const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      reportMetric('long-task', { duration: entry.duration, startTime: entry.startTime });
    }
  }
});
observer.observe({ type: 'longtask', buffered: true });`)}

<h2 id="browser-process">2.6 Browser Process 架構（Multi-process Architecture）</h2>
<p>Chrome 採用多進程架構，每個進程負責特定職責並在獨立的系統沙箱中運行。<strong>Browser Process</strong>（主進程）負責 Chrome 的 UI（位址列、分頁欄）、使用者輸入、Storage（localStorage、cookies）、Permission（麥克風、相機）和進程管理。<strong>Network Process</strong> 獨立處理所有網路請求（HTTP、DNS、WebSocket），2018 年從 Browser Process 分離出來，讓網路操作不會阻塞 UI。<strong>GPU Process</strong> 所有 Renderer Process 共用，負責 OpenGL/Metal/Vulkan 的最終像素輸出。<strong>Renderer Process</strong> 包含 Main Thread、Compositor Thread、Raster Thread Pool，執行 HTML/CSS/JS 解析與渲染。</p>

<p><strong>Site Isolation</strong> 在 2018 年 Spectre/Meltdown 漏洞被揭露後全面啟用：Chrome 把每個不同的 <em>site</em>（scheme + registrable domain）放在獨立的 Renderer Process 中。這意味著 <code>attacker.com</code> 的 JavaScript 即使能透過 Spectre 讀取其 process 的記憶體，也讀不到 <code>bank.com</code> 的資料（因為它們在不同 process）。代價是：跨站點 iframe 現在各自在獨立 process，記憶體用量增加；同時，跨 process 的通訊必須透過 <code>postMessage</code> 而非直接記憶體存取。</p>

<p><strong>COOP 與 COEP headers</strong> 的存在直接來自 Site Isolation 的安全需求。Spectre 攻擊需要高精度計時器（<code>SharedArrayBuffer</code> 可以作為精確計時器，因為讀取共享記憶體的速度差異反映出 cache timing）。瀏覽器在沒有 cross-origin isolation 的情況下，預設禁用了 <code>SharedArrayBuffer</code> 和高精度 <code>performance.now()</code>。設定 <code>Cross-Origin-Opener-Policy: same-origin</code> 和 <code>Cross-Origin-Embedder-Policy: require-corp</code>，讓頁面聲明「我不接受任何未明確允許的跨域資源」，才能重新啟用 <code>SharedArrayBuffer</code>（<code>crossOriginIsolated === true</code>）。這也是 Wasm 多執行緒需要這兩個 headers 的原因。</p>

${diagram(`
flowchart TB
    subgraph BrowserProcess[Browser Process]
        UI[UI Thread\n位址列 分頁 Permission]
        Storage[Storage Thread\nCookies localStorage]
    end
    subgraph NetworkProcess[Network Process]
        HTTP[HTTP / DNS / WebSocket]
    end
    subgraph RendererA[Renderer Process A\nsite-a.com]
        MTA[Main Thread\nParse JS Style Layout Paint]
        CTA[Compositor Thread\nScroll Transform]
        RTA[Raster Thread Pool]
    end
    subgraph RendererB[Renderer Process B\nsite-b.com 獨立 sandbox]
        MTB[Main Thread]
    end
    subgraph GPUProcess[GPU Process\n所有 Renderer 共用]
        GPU[GPU Thread\nOpenGL Metal Vulkan]
    end
    BrowserProcess <-->|IPC| NetworkProcess
    BrowserProcess <-->|IPC| RendererA
    BrowserProcess <-->|IPC| RendererB
    RendererA -->|composited frames| GPUProcess
`, 'Chrome 多進程架構。每個 site 在獨立 Renderer Process 中運行（Site Isolation）。Renderer 與 GPU Process 之間傳遞合成後的幀，不直接存取 GPU。')}

${code('javascript', `// 檢查 cross-origin isolation 狀態
console.log('crossOriginIsolated:', crossOriginIsolated);
// true → 可以使用 SharedArrayBuffer、高精度 performance.now()
// false → SharedArrayBuffer 不可用

// 需要在 server 設定以下 headers 才能讓 crossOriginIsolated = true：
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Embedder-Policy: require-corp

// 啟用後可以使用：
if (crossOriginIsolated) {
  const sab = new SharedArrayBuffer(1024); // 跨 Worker 共享記憶體
  const view = new Int32Array(sab);
  Atomics.store(view, 0, 42); // 原子操作
  Atomics.wait(view, 0, 42);  // 阻塞等待（只能在 Worker，不能在主執行緒）
}

// postMessage 是跨 process / 跨 iframe 通訊的唯一安全方式
// Structured Clone 深拷貝，或用 Transferable 零拷貝（ArrayBuffer 轉移後原側失效）
iframe.contentWindow.postMessage(
  { type: 'data', payload: largeArrayBuffer },
  'https://trusted-origin.com',
  [largeArrayBuffer] // Transferable：零拷貝轉移所有權
);`)}

<h2 id="practical-example">程式碼與範例</h2>
<p><strong>用 PerformanceObserver 同時監控 Long Task、Layout Shift 與 LCP。</strong>在 production 部署時，把這段監控邏輯放在非阻塞位置，收集真實使用者的渲染 pipeline 健康數據。</p>

${code('javascript', `// 一次設定三個關鍵 rendering 指標的 observer
function initRenderingMonitor(reportFn) {
  // Long Task：主執行緒被佔用超過 50ms
  new PerformanceObserver(list => {
    for (const task of list.getEntries()) {
      reportFn('long-task', {
        duration: Math.round(task.duration),
        startTime: Math.round(task.startTime),
        // attribution 告訴你是哪個 script 造成的（Chrome 85+）
        scripts: task.attribution?.map(a => a.containerSrc),
      });
    }
  }).observe({ type: 'longtask', buffered: true });

  // Layout Shift：用戶沒有互動時的版面移動
  new PerformanceObserver(list => {
    for (const shift of list.getEntries()) {
      if (!shift.hadRecentInput) { // 排除使用者互動後 500ms 內的位移
        reportFn('layout-shift', {
          value: shift.value,
          sources: shift.sources?.map(s => ({
            node: s.node?.nodeName,
            previousRect: s.previousRect,
            currentRect: s.currentRect,
          })),
        });
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });

  // LCP：最大內容繪製（每次可能更新到更大的元素）
  new PerformanceObserver(list => {
    const entries = list.getEntries();
    const lcp = entries.at(-1); // 取最後一個（最大的）
    if (lcp) {
      reportFn('lcp', {
        startTime: Math.round(lcp.startTime),
        element: lcp.element?.tagName,
        url: lcp.url, // 如果是圖片，這裡有 URL
        size: lcp.size,
      });
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
}

initRenderingMonitor((name, data) => {
  navigator.sendBeacon('/rum', JSON.stringify({ metric: name, ...data }));
});`)}

<h2 id="real-world-applications">真實場景應用</h2>
<div class="application-grid">
  <div class="mini-card">
    <h3>動畫卡頓診斷</h3>
    <p>用 Performance panel 的 Frames timeline 找 dropped frames，再看 Main thread 的 yellow（JS）、purple（Layout/Style）、green（Paint）條哪個最長。Green 條長 → 考慮把動畫屬性改為 transform；yellow 條長 → 找 JS 熱路徑；purple 條長 → 找觸發 layout 的 CSS 操作。</p>
  </div>
  <div class="mini-card">
    <h3>INP 優化</h3>
    <p>INP 高通常因為 click handler 裡有長同步工作。用 <code>scheduler.yield()</code> 把工作切片，或把非緊急工作推到 <code>scheduler.postTask({ priority: 'background' })</code>。React 18 的 <code>startTransition</code> 也是相同原理——把 state update 標記為非緊急，讓輸入事件優先處理。</p>
  </div>
  <div class="mini-card">
    <h3>SharedArrayBuffer 與 Wasm 多執行緒</h3>
    <p>需要在瀏覽器端跑多執行緒的 Wasm 計算（影像處理、音訊、ML 推論），必須設定 COOP + COEP headers。在 Vite 開發環境，可以加 <code>Cross-Origin-Isolation: true</code> plugin；在 production 則需要確保 CDN 不剝離這些 security headers。</p>
  </div>
</div>

<h2 id="pitfalls-tradeoffs">常見陷阱與取捨</h2>
<div class="tradeoff-grid">
  <div class="mini-card">
    <h3>will-change 濫用</h3>
    <p><code>will-change: transform</code> 讓元素進入獨立 compositor layer，消耗 GPU 記憶體。如果頁面上有幾百個元素都設了 will-change，GPU 記憶體會爆掉（Layer Explosion），反而造成比不用更差的效能。原則：只對確實在做高頻動畫的元素設定，且動畫開始前設定、結束後移除。</p>
  </div>
  <div class="mini-card">
    <h3>Live NodeList 迴圈陷阱</h3>
    <p>在 <code>getElementsByTagName()</code> 的結果上迭代時同時修改 DOM（加入或移除符合 selector 的節點），會導致 live list 的 index 移動，跳過某些節點或無限迴圈。解法：用 <code>Array.from()</code> 或 <code>[...list]</code> 先轉成靜態 array。</p>
  </div>
  <div class="mini-card">
    <h3>display:none vs visibility:hidden 的渲染差異</h3>
    <p><code>display: none</code> 讓元素不進入 Render Tree，不佔空間，但切換時觸發 Layout。<code>visibility: hidden</code> 保留佔位空間，切換時只觸發 Paint（更便宜）。<code>opacity: 0</code> 只觸發 Composite，最便宜，但元素仍可接收事件（需要配合 <code>pointer-events: none</code>）。</p>
  </div>
  <div class="mini-card">
    <h3>COOP/COEP 對嵌入第三方資源的衝擊</h3>
    <p>設定 <code>COEP: require-corp</code> 後，所有跨域資源（圖片、script、iframe）都必須附帶 <code>Cross-Origin-Resource-Policy</code> header 才能載入。許多第三方廣告、分析、社群嵌入不支援這個 header，設定後會讓它們失效。需要逐一評估是否值得犧牲這些整合。</p>
  </div>
</div>

<h2 id="interview-framing">面試回答框架</h2>
<ol>
  <li><strong>先建立分層：</strong>HTML 解析在 Parser 層，DOM/CSSOM 建構在 Tree Construction 層，Render Tree/Layout/Paint/Composite 在 Rendering 層，多執行緒模型在 Process/Thread 層。不同問題對應不同層。</li>
  <li><strong>說具體機制：</strong>「render-blocking」不是因為瀏覽器設計有問題，而是因為 CSSOM 完整性是 Render Tree 的前提。「Compositor 獨立執行緒」不是最佳化 trick，而是為了讓 scroll 和動畫在主執行緒忙碌時仍然流暢。</li>
  <li><strong>說取捨：</strong>will-change 省動畫成本但佔 GPU 記憶體；Site Isolation 提高安全但增加記憶體；inline critical CSS 加速 FCP 但增加 HTML 大小。</li>
  <li><strong>說驗證：</strong>Performance panel 的 Main thread 時間線、Layers panel、Paint Flashing overlay、PerformanceObserver long-task/layout-shift/lcp。</li>
</ol>

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
