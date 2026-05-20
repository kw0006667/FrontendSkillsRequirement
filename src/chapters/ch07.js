import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 7)

const prev = chapters.find(c => c.id === 6)
const next = chapters.find(c => c.id === 8)

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
  <div class="chapter-num">Chapter 07 · CSS</div>
  <h1>Layout 系統</h1>
  <p>現代 CSS layout 有三個主要系統：<strong>Flexbox</strong>（一維、主軸分配）、<strong>Grid</strong>（二維、行列對齊）、<strong>Normal Flow</strong>（預設文流）。它們的核心差異不在語法，而在「誰在控制空間分配」——Flexbox 由 container 控制子元素在一條軸上的分配；Grid 由 container 定義行列後子元素放入對應格子；Normal Flow 由每個元素自己決定佔多少空間。選錯系統不是語法問題，而是心智模型問題。</p>
  <div class="chapter-tags">
    <span class="tag">css</span>
    <span class="tag">layout</span>
    <span class="tag">flexbox</span>
    <span class="tag">grid</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 <code>flex: 1</code> 與 <code>flex: 1 1 0</code> 的差異（basis 不同）；能解釋 Flexbox 中 <code>min-width: auto</code> 的隱藏陷阱；能說明 <code>auto-fill</code> vs <code>auto-fit</code> 在有剩餘空間時的行為差異；能解釋為何 <code>position: sticky</code> 在 <code>overflow: hidden</code> 的父容器內失效；能說出 Container Queries 解決 viewport media query 無法解決的元件問題。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>選擇 layout 系統的判斷樹：<strong>一維排列（橫或縱）</strong> → Flexbox；<strong>二維對齊（行 + 列）</strong> → Grid；<strong>元件響應自己容器大小</strong> → Container Queries；<strong>多語言 / RTL 支援</strong> → Logical Properties。不要讓「熟悉哪個就用哪個」取代這個判斷。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>導覽列（一維橫排 + 兩端對齊）→ Flexbox。Dashboard 卡片格（多欄 + 自動填充）→ Grid。產品卡片在側欄時小版型、在主區時大版型 → Container Query。頁面有阿拉伯文或希伯來文 → Logical Properties 替換所有 left/right。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>Flexbox 子元素在窄螢幕被壓縮到最小寬度溢出（<code>min-width: auto</code> 問題）；Grid 欄位在小螢幕擠在一起（未設 <code>auto-fill</code>）；sticky nav 在某些頁面不黏（父元素有 overflow）；RTL 介面方向錯誤（未用 logical properties）。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>Chrome DevTools Flexbox/Grid overlay 視覺化 container、軌道、gap；調整 viewport 寬度觀察 <code>auto-fill</code>/<code>auto-fit</code> 的 empty track；Responsive Design Mode 測試 RTL/LTR；DevTools 模擬不同 container size 驗證 Container Query 命中。</p>
  </div>
</div>

<h2 id="normal-flow-positioning">7.1 Normal Flow 與 Positioning</h2>
<p>Normal flow 是元素的預設排列模式：<strong>block-level 元素</strong>（<code>div</code>、<code>p</code>、<code>h1</code>）各佔一行，從上到下堆疊；<strong>inline 元素</strong>（<code>span</code>、<code>a</code>、<code>strong</code>）在同一行內流動，到達容器邊界時換行。CSS Display Level 3 spec 把 <code>display</code> 拆成「outer display type」（和父元素互動）與「inner display type」（子元素排列方式）。例如 <code>display: flex</code> 的 outer 是 <code>block</code>（獨佔一行），inner 是 <code>flex</code>（子元素走 flexbox 規則）。</p>

<p><strong>Position 的五個值及其 containing block：</strong></p>
<ul>
  <li><code>static</code>：正常文流，top/left/right/bottom 無效。</li>
  <li><code>relative</code>：相對「自身原始位置」偏移，原始空間保留，不影響其他元素。</li>
  <li><code>absolute</code>：脫離文流，相對「最近的非 static 祖先」定位，原始空間消失。</li>
  <li><code>fixed</code>：相對 viewport 固定，捲動時不移動。但若祖先有 <code>transform</code>/<code>filter</code>/<code>will-change: transform</code>，會改為相對該祖先（常見陷阱）。</li>
  <li><code>sticky</code>：在「容器內」黏在指定位置，超出容器後消失。<strong>關鍵陷阱</strong>：若父容器有 <code>overflow: hidden/auto/scroll</code>，sticky 會失效，因為 sticky 的 scroll container 被改變了。</li>
</ul>

${code('css', `/* absolute 定位：需要父元素設 position: relative */
.dropdown-wrapper {
  position: relative;  /* 成為 absolute 子元素的 containing block */
}
.dropdown-menu {
  position: absolute;
  top: 100%;           /* 緊貼在父元素下方 */
  left: 0;
  z-index: 100;
  min-width: max-content;
}

/* sticky nav 的正確實作 */
.site-header {
  position: sticky;
  top: 0;
  z-index: 200;
  /* ❌ 不要在父元素加 overflow: hidden/auto/scroll，會讓 sticky 失效 */
}

/* fixed 遇到 transform 的陷阱 */
/* ❌ 這行會讓 sidebar 的 fixed 子元素相對 sidebar 定位，而非 viewport */
/* .sidebar { transform: translateX(0); } */

/* 手機底部固定導覽的正確實作 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  /* 搭配 env() 處理 iPhone 的 safe area（瀏海/圓角區域） */
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--color-bg-elevated);
  border-top: 1px solid var(--color-border);
}

/* 讓主內容不被固定底部遮住 */
.main-scrollable {
  padding-bottom: calc(60px + env(safe-area-inset-bottom));
}`)}

<fe-demo-suite demo="positioning"></fe-demo-suite>

<h2 id="flexbox">7.2 Flexbox 深度解析</h2>
<p>Flexbox 的核心是「<strong>主軸（main axis）分配空間</strong>」。container 設定 <code>display: flex</code> 後，子元素沿主軸排列，<code>flex-direction</code> 決定主軸方向（預設 <code>row</code>）。三個關鍵屬性決定子元素如何分配空間：</p>
<ul>
  <li><code>flex-grow</code>：當有剩餘空間時，子元素按比例<strong>伸展</strong>。<code>0</code> 表示不伸展。</li>
  <li><code>flex-shrink</code>：當空間不足時，子元素按比例<strong>收縮</strong>。<code>0</code> 表示不收縮。</li>
  <li><code>flex-basis</code>：子元素的<strong>初始大小</strong>（在 grow/shrink 計算前）。<code>auto</code> 用 <code>width</code>/<code>height</code>；<code>0</code> 從 0 開始讓 grow 完全控制。</li>
</ul>

<p><strong><code>flex: 1</code> vs <code>flex: 1 1 0</code> 的真正差異</strong>：<code>flex: 1</code> 是 <code>flex: 1 1 auto</code>（basis 是 auto，即元素的 content size）；<code>flex: 1 1 0</code> 的 basis 是 0，讓所有空間都依 grow 比例重新分配。若子元素有不同的 content size，兩者結果不同——<code>flex: 1 1 0</code> 才能真正等寬。</p>

<p><strong><code>min-width: auto</code> 的隱藏陷阱</strong>：Flex 子元素的預設 <code>min-width</code> 不是 0，而是 <code>auto</code>（等於 content 的最小寬度）。這讓 flex 子元素即使設了 <code>flex-shrink: 1</code>，也可能拒絕收縮到比 content 更小。修復方法：在需要可收縮的子元素上設 <code>min-width: 0</code>。</p>

${code('css', `/* 導覽列：Logo + Links + 帳戶按鈕 */
.navbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  height: 60px;
}
.navbar__logo    { flex: none; }   /* 不伸縮，維持原始大小 */
.navbar__links   { flex: 1; }      /* 吃掉剩餘空間 */
.navbar__account { flex: none; }   /* 不伸縮 */

/* flex: 1 vs flex: 1 1 0 差異 */
/* flex: 1 → basis: auto，若 A 文字比 B 長，A 比 B 寬 */
.unequal > * { flex: 1; }

/* flex: 1 1 0 → 真正等寬，無論 content */
.equal > * { flex: 1 1 0; min-width: 0; }

/* min-width: auto 陷阱修復 */
.text-truncate {
  flex: 1;
  min-width: 0;          /* ← 關鍵！允許收縮到比 content 更小 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* RWD 黃金模式：flex-wrap + flex-basis */
.feature-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}
.feature-row > * {
  flex: 1 1 280px;
  /* 效果：寬螢幕橫排，手機自動垂直，零 media query */
}

/* 垂直置中（常見面試題）*/
.center-box {
  display: flex;
  align-items: center;     /* 交叉軸居中 */
  justify-content: center; /* 主軸居中 */
  min-height: 100dvh;
}`)}

<fe-demo-suite demo="flexbox"></fe-demo-suite>

<div class="callout">
  <div class="callout-title">RWD 實戰：flex-wrap 的換行力量</div>
  <p><code>flex-wrap: wrap</code> 配合 <code>flex-basis</code> 是最簡潔的響應式排版方式之一：<code>flex: 1 1 280px</code> 讓每個子元素最小 280px，容器夠寬時橫排，不夠時自動換行成垂直。桌面三欄、平板兩欄、手機一欄，零 media query。</p>
</div>

<h2 id="grid">7.3 Grid 深度解析</h2>
<p>Grid 是第一個真正的二維 layout 系統。與 Flexbox 一維主軸不同，Grid 讓你同時控制行（row）和列（column）。<strong>Explicit grid</strong> 由 <code>grid-template-columns</code>/<code>grid-template-rows</code> 定義；超出的元素進入 <strong>implicit grid</strong>，由 <code>grid-auto-rows</code>/<code>grid-auto-columns</code> 控制大小。</p>

<p><strong><code>auto-fill</code> vs <code>auto-fit</code></strong>：兩者都讓 Grid 自動計算欄數，但在剩餘空間處理上不同。<code>auto-fill</code> 保留空欄（讓現有 item 不超過 max 大小）；<code>auto-fit</code> 把空欄 collapse 為 0 寬（讓現有 item 拉伸填滿整行）。Item 數量固定且希望填滿容器時用 <code>auto-fit</code>；希望 item 有固定最大寬度時用 <code>auto-fill</code>。</p>

<p><strong>Subgrid</strong>（2023 年主流瀏覽器支援）解決了「巢狀格線對不齊」的痛點：子容器可以繼承父 Grid 的行列軌道，讓孫元素也能與祖父容器的格線對齊，卡片列表（所有卡片的標題、圖片、描述高度對齊）的標準解法。</p>

${code('css', `/* 響應式 Grid：自動計算欄數，零 media query */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  /* 效果：
     - 寬螢幕（>1120px）→ 4 欄
     - 中螢幕（560-1120px）→ 2 欄
     - 手機（<560px）→ 1 欄
     完全自動！
  */
}

/* auto-fill vs auto-fit：只有 3 item 但容器可放 5 欄時 */
.auto-fill-3 { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
/* → 保留 2 個空欄，item 各自維持 1fr 最大寬 */

.auto-fit-3  { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
/* → 空欄 collapse，3 個 item 各佔 33.3% */

/* grid-template-areas：語意化的頁面版面 */
.page-layout {
  display: grid;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
}
.page-header  { grid-area: header; }
.page-sidebar { grid-area: sidebar; }
.page-main    { grid-area: main; }
.page-footer  { grid-area: footer; }

/* 手機版：單欄，sidebar 移到 main 後面 */
@media (max-width: 768px) {
  .page-layout {
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
    grid-template-columns: 1fr;
  }
}

/* Subgrid：卡片內部元素對齊父格線 */
.card-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto auto 1fr auto;  /* image, title, body, footer */
  gap: 24px;
}
.card {
  grid-row: span 4;
  display: grid;
  grid-template-rows: subgrid;  /* 繼承父格線 */
}
/* 現在所有卡片的圖片、標題、描述、按鈕列高度自動對齊 */`)}

<fe-demo-suite demo="grid"></fe-demo-suite>

${diagram(`
graph LR
    subgraph Comparison["Flexbox vs Grid 核心差異"]
        direction TB
        Q1{{"排列維度？"}}
        Q2{{"內容驅動？"}}
        Grid["Grid（二維）\ngrid-template-columns\ngrid-template-rows"]
        Flex["Flexbox（一維）\nflex-direction\nflex-grow/shrink"]
        Both["都適用時\nGrid 更易對齊\nFlex 更易分配"]
    end
    Q1 -- "行+列" --> Grid
    Q1 -- "只有一個方向" --> Q2
    Q2 -- "內容決定大小" --> Flex
    Q2 -- "格線決定大小" --> Grid
    Q1 -- "兩者都 OK" --> Both
`, 'Flexbox 由內容驅動（item 大小影響分配），Grid 由容器驅動（格線決定 item 位置）。兩者可以巢狀使用。')}

<h2 id="container-queries">7.4 Container Queries 與 Intrinsic Layout</h2>
<p>傳統 media query 的問題：它讓元件耦合到 viewport 尺寸，但同一個元件可能出現在頁面的不同位置（寬主區、窄側欄、彈出面板），應該根據<strong>自己的容器</strong>調整樣式。Container Queries（<code>@container</code>）解決了這個問題，讓元件成為真正「自給自足」的單位——這是 React/Vue 元件化思想在 CSS 上的自然對應。</p>

<p><strong><code>container-type</code> 選擇</strong>：<code>inline-size</code>（最常用）只追蹤容器的行向尺寸（通常是寬度），不計算高度；<code>size</code> 同時追蹤行向和塊向，但可能造成性能問題；<code>style</code>（樣式查詢）可查詢 CSS custom property 的值。<strong>Container query units</strong>（<code>cqw</code>、<code>cqi</code>、<code>cqb</code>）類似 vw/vh，但相對容器而不是 viewport，可做容器相對的流動排版。</p>

${code('css', `/* 產品卡片：根據容器寬度調整版型 */
.product-card {
  container-type: inline-size;
  container-name: product-card;
}

/* 預設（窄容器）：最小版型 */
.product-card__inner {
  display: grid;
  gap: 8px;
  padding: 12px;
}

/* 中等容器（320px+）：垂直堆疊加描述 */
@container product-card (min-width: 320px) {
  .product-card__inner { padding: 16px; }
  .product-card__desc  { display: block; }
}

/* 寬容器（500px+）：橫向排列 */
@container product-card (min-width: 500px) {
  .product-card__inner {
    grid-template-columns: 200px 1fr;
    align-items: start;
  }
  .product-card__image {
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }
}

/* 使用情境：同一個元件，不同位置不同版型 */
.homepage-featured { width: 100%; }   /* → 觸發 500px 版型 */
.sidebar-widget    { width: 260px; }  /* → 窄版型 */

/* Container query units：相對容器的流動排版 */
.product-card__title {
  font-size: clamp(0.9rem, 4cqi, 1.3rem);
  /* cqi：container query inline，相對容器行向尺寸 */
}

/* 樣式查詢：根據 CSS variable 切換版型 */
@container style(--card-layout: compact) {
  .product-card__image { display: none; }
}`)}

<fe-demo-suite demo="container"></fe-demo-suite>

<div class="callout">
  <div class="callout-title">Container Query vs Media Query：何時用哪個</div>
  <p><strong>Media Query</strong> 適合：頁面層級的版面切換（欄數、nav 展開/收合、hero 高度）；<strong>Container Query</strong> 適合：元件層級的版型調整（卡片、列表項、表單欄位）。判斷方式：「這個元件的版型是由整個 viewport 決定，還是由它放置的位置決定？」後者選 Container Query。</p>
</div>

<h2 id="logical-properties">7.5 Logical Properties 與 i18n</h2>
<p>傳統 CSS 用物理座標（top/right/bottom/left）描述方向，但在 RTL（阿拉伯文、希伯來文）或垂直書寫模式（日文縱書）下，這些方向概念會失效。CSS Logical Properties 用<strong>邏輯座標</strong>取代物理座標：</p>
<ul>
  <li><code>inline-start</code>/<code>inline-end</code>：行向的開始/結束（LTR 是左/右，RTL 是右/左）</li>
  <li><code>block-start</code>/<code>block-end</code>：塊向的開始/結束（水平書寫是上/下）</li>
  <li>簡寫：<code>margin-inline</code>（行向兩側）、<code>padding-block</code>（塊向兩側）</li>
</ul>

${code('css', `/* ❌ 物理座標：RTL 時方向錯誤 */
.icon-label { margin-left: 8px; }   /* RTL 中圖示應在右邊，margin 應是 margin-right */

/* ✅ 邏輯座標：自動適應書寫方向 */
.icon-label { margin-inline-start: 8px; }  /* LTR = left；RTL = right */

/* 完整卡片（邏輯屬性版）*/
.card {
  padding-block: 16px;    /* 上下 padding */
  padding-inline: 20px;   /* 行向（左右）padding */
  border-inline-start: 4px solid var(--color-accent);  /* 強調線 */
  /* 以上在 LTR 和 RTL 都正確，無需條件覆寫 */
}

/* 尺寸的邏輯屬性 */
.sidebar {
  inline-size: 240px;   /* = width（LTR）或 height（垂直書寫） */
  max-block-size: 100dvh;  /* = max-height */
}

/* 啟用 RTL */
/* <html dir="rtl"> 或 element 上設 direction: rtl */
/* CSS logical properties 會自動跟著變，無需額外 CSS */`)}

${diagram(`
graph TD
    subgraph LogicalProps["Logical Properties 在不同書寫方向"]
        subgraph LTR["LTR（英文、中文）"]
            lStart["inline-start = left"]
            lEnd["inline-end = right"]
            lBStart["block-start = top"]
            lBEnd["block-end = bottom"]
        end
        subgraph RTL["RTL（阿拉伯文、希伯來文）"]
            rStart["inline-start = right"]
            rEnd["inline-end = left"]
            rBStart["block-start = top"]
            rBEnd["block-end = bottom"]
        end
        subgraph VRL["Vertical-RL（日文縱書）"]
            vStart["inline-start = top"]
            vEnd["inline-end = bottom"]
            vBStart["block-start = right"]
            vBEnd["block-end = left"]
        end
    end
`, 'Logical Properties 中，inline 永遠是文字流動的方向，block 永遠是行與行堆疊的方向，隨 writing-mode 和 direction 自動調整。')}

<h2 id="layout-decision-tree">Layout 選型決策樹</h2>

${diagram(`
flowchart TD
    A[需要 Layout 決策] --> B{元件要響應\n容器還是 viewport？}
    B -->|容器| CQ["Container Query<br>@container (min-width: ...)"]
    B -->|Viewport| C{幾個維度？}
    C -->|一維| E["Flexbox<br>display: flex"]
    C -->|二維| F["Grid<br>display: grid"]
    F --> G{需要自動\n計算欄數？}
    G -->|是| H["repeat(auto-fill/fit,\nminmax())"]
    G -->|否| I["grid-template-areas\n語意版面"]
    E --> J{需要換行\n自適應？}
    J -->|是| K["flex-wrap: wrap\nflex: 1 1 min-content"]
    J -->|否| L["單行排列\nflex-direction 控制"]
    style CQ fill:#0a84ff,color:white
    style E fill:#2ec7d3,color:white
    style F fill:#4caf7d,color:white
`, 'Layout 技術選型流程：先問維度，再問是否需要元件級響應式。')}

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
