import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 5)

const prev = chapters.find(c => c.id === 4)
const next = chapters.find(c => c.id === 6)

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
  <div class="chapter-num">Chapter 05 · HTML</div>
  <h1>HTML5 API 與 Metadata</h1>
  <p>新的平台 API 正在把許多過去靠 portal hack、Popper.js、自製 accordion 才能實現的功能收回瀏覽器原生層。<code>&lt;dialog&gt;</code> 解決了 focus trap；Popover API 解決了 z-index 戰爭；<code>&lt;details&gt;</code> 解決了可摺疊 UI 的鍵盤操作。理解這些 API 能讓你在設計系統中用更少的程式碼提供更可靠的行為。</p>
  <div class="chapter-tags">
    <span class="tag">html</span>
    <span class="tag">platform</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 <code>showModal()</code> 和 <code>show()</code> 的差異，以及 top-layer 的實際意義；能解釋 <code>popover="auto"</code> 和 <code>popover="manual"</code> 的行為差異，以及為何 Popover API 不需要 portal；能說明 <code>srcset</code> 的 <code>w</code> 描述符配合 <code>sizes</code> 如何讓瀏覽器選圖，以及 <code>fetchpriority="high"</code> 對 LCP 的影響；能說出 Canvas/SVG/WebGL/WebGPU 的使用場景分界線。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>把這些 API 想成「瀏覽器接管職責」的清單：top-layer 讓 <code>&lt;dialog&gt;</code> 永遠在 z-index 堆疊之上；Popover API 讓 tooltip / dropdown 不需要 portal；<code>&lt;details&gt;</code> 讓 accordion 不需要 JavaScript；<code>&lt;picture&gt;</code> 讓瀏覽器根據能力和上下文選最佳圖片。每個新 API 都對應一個過去靠 JavaScript 繞路的場景。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>設計系統裡的確認 dialog、命令選單、tooltip、filter panel、FAQ accordion、響應式 hero image、lazy-loaded gallery — 這些元件若用原生 API 實作，能免費獲得鍵盤支援、focus management、ESC 關閉、正確的 ARIA role，以及未來的瀏覽器最佳化。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>自製 modal 的 focus 跑出 dialog（沒有 focus trap）；tooltip 在 overflow:hidden 容器內被裁切（未用 top-layer）；圖片用錯 <code>srcset</code> 語法導致瀏覽器只載入一個尺寸；LCP 圖片沒有 <code>fetchpriority="high"</code> 導致延遲發現；video 在 iOS 無法 inline 播放（缺 <code>playsinline</code>）。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>用鍵盤（Tab、Esc、Enter）測試 dialog 和 popover；用 Layers panel 確認 top-layer；用 Network panel + 節流確認哪個 srcset 候選被選中；用 DevTools Performance 確認 LCP element 是否有 fetchpriority；用 screen reader 測試 <code>&lt;details&gt;</code> 的 role 和 expanded 狀態。</p>
  </div>
</div>

<h2 id="dialog-popover">5.1 dialog 與 Popover API</h2>
<p><code>&lt;dialog&gt;</code> 元素提供原生 modal 和 non-modal dialog 的行為。<strong><code>showModal()</code></strong> 把 dialog 送入 <strong>top-layer</strong>——一個獨立於 normal stacking context 之上的特殊 CSS 層，讓 dialog 永遠顯示在頁面所有內容前面，即使父元素有 <code>overflow: hidden</code> 或 <code>transform</code>（這兩者通常會建立新的 stacking context 並限制子元素的 z-index）。showModal() 同時自動建立 <strong>focus trap</strong>：Tab 鍵只能在 dialog 內的 focusable 元素間循環，不會跑到 dialog 外面。<strong><code>show()</code></strong> 讓 dialog 顯示但不進入 top-layer，也不建立 focus trap，適合 non-modal 的 sidebar 或 toast（但通常這種場景直接用 CSS 控制 visibility 就夠了）。</p>

<p>關閉 modal dialog 有三種方式：呼叫 <code>dialog.close()</code>、按 <kbd>Esc</kbd>（showModal 自動支援，可監聽 <code>cancel</code> event 來攔截）、或在 dialog 內用 <code>&lt;form method="dialog"&gt;</code>（按下 submit button 時自動關閉 dialog，<code>dialog.returnValue</code> 是 button 的 <code>value</code>）。關閉後焦點應自動回到觸發 dialog 的元素（showModal 會記住觸發前的 focus 位置並自動復原）。</p>

<p><strong>Popover API</strong> 是 2023-2024 年跨瀏覽器穩定支援的新 API，專為「輕量浮層」設計，取代 tooltip、dropdown menu、context menu、filter panel 等場景。<code>popover="auto"</code>（預設）：一次只有一個 auto popover 可見（點開新的，舊的自動關閉，類似單選行為）；點 popover 外的區域自動關閉；按 ESC 自動關閉。<code>popover="manual"</code>：需要程式碼明確呼叫 <code>showPopover()</code>/<code>hidePopover()</code> 控制，不自動關閉，適合「toast notification」或需要同時顯示多個 popover 的場景。Popover 也進入 top-layer，解決了過去 tooltip 被 overflow:hidden 裁切的問題，這也是 Popper.js 存在的主要原因之一。</p>

${diagram(`
graph TD
    subgraph NormalFlow["Normal Stacking Context（頁面內容）"]
        z999["z-index: 999 的浮層\\n仍在這層，會被 overflow:hidden 裁切"]
        content["一般 DOM 元素"]
    end
    subgraph TopLayer["Top Layer（瀏覽器特殊層，永遠在上方）"]
        modal["showModal() dialog\\n自動 focus trap\\nESC 關閉\\n::backdrop 遮罩"]
        pop["popover=auto / manual\\n進入 top-layer\\n不被 overflow:hidden 裁切"]
    end
    backdrop["::backdrop\\n半透明遮罩，在 dialog 和 normal flow 之間"]
    NormalFlow -.->|"永遠在下方"| TopLayer
    modal -.->|"建立"| backdrop
`, 'top-layer 是獨立於 z-index 堆疊之外的層，dialog showModal() 和 popover 都會進入這一層，解決了過去需要 portal + z-index 管理的問題。')}

${code('html', `<!-- dialog 的完整用法 -->
<button id="open-btn" aria-haspopup="dialog">開啟確認視窗</button>

<dialog id="confirm-dialog" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <h2 id="dialog-title">確認刪除</h2>
  <p id="dialog-desc">這個操作無法還原。確定要刪除這筆資料嗎？</p>

  <!-- method="dialog"：submit 時自動關閉 dialog，returnValue = button.value -->
  <form method="dialog">
    <button value="cancel" autofocus>取消</button>
    <button value="confirm">確定刪除</button>
  </form>
</dialog>

<!-- Popover API：不需要 JavaScript 的基本用法 -->
<!-- popovertarget 屬性自動把 button 和 popover 連結 -->
<button popovertarget="filter-panel" popovertargetaction="toggle">
  篩選條件
</button>
<div id="filter-panel" popover="auto" aria-label="篩選條件">
  <label><input type="checkbox" name="instock"> 只看有庫存</label>
  <label><input type="checkbox" name="discount"> 折扣商品</label>
  <button popovertarget="filter-panel" popovertargetaction="hide">套用</button>
</div>

<!-- Popover API：tooltip 模式（需要 manual + anchor positioning）-->
<button id="help-btn" popovertarget="help-tip">?</button>
<div id="help-tip" popover="manual" role="tooltip">
  這個欄位需要輸入您的統一編號（8 位數字）
</div>

<!-- Invoker Commands API（新，Chrome 130+）
     commandfor 和 command 取代 popovertarget，語意更清晰 -->
<button commandfor="my-dialog" command="show-modal">用 Invoker 開啟</button>
<button commandfor="my-dialog" command="close">用 Invoker 關閉</button>`)}

${code('javascript', `// dialog 的完整 JavaScript 控制
const dialog = document.querySelector('#confirm-dialog');
const openBtn = document.querySelector('#open-btn');

openBtn.addEventListener('click', () => {
  // showModal() → top-layer + focus trap + ESC 支援
  dialog.showModal();
  // show() → 顯示但不進入 top-layer，沒有 focus trap
  // dialog.show();
});

// dialog 關閉時的處理（form method="dialog" 或 ESC）
dialog.addEventListener('close', () => {
  const result = dialog.returnValue;
  // returnValue 是用戶點的 button 的 value 屬性
  if (result === 'confirm') {
    performDelete();
  }
  // 焦點自動回到觸發 dialog 的元素（openBtn）
});

// 攔截 ESC 關閉（cancel event 在 dialog 關閉前觸發）
dialog.addEventListener('cancel', event => {
  if (hasUnsavedChanges) {
    event.preventDefault();  // 阻止 ESC 關閉
    showUnsavedWarning();
  }
});

// Popover API 的程式化控制
const popover = document.querySelector('#help-tip');

document.querySelector('#help-btn').addEventListener('mouseenter', () => {
  popover.showPopover();
});
document.querySelector('#help-btn').addEventListener('mouseleave', () => {
  popover.hidePopover();
});

// 監聽 popover 顯示/隱藏事件
popover.addEventListener('beforetoggle', event => {
  console.log(event.oldState, '→', event.newState);
  // 'closed' → 'open' 或 'open' → 'closed'
});`)}

<div class="callout">
  <div class="callout-title">Senior 信號：dialog vs div[role="dialog"] 的差異</div>
  <p>自製的 <code>&lt;div role="dialog" aria-modal="true"&gt;</code> 需要手動實作：focus trap（循環 Tab）、ESC 關閉、焦點恢復、scrolling prevention、backdrop 點擊關閉。這些實作細節有無數已知 bug（例如動態 focus-able 元素、nested dialogs、virtual keyboard 出現時的 scroll）。<code>&lt;dialog&gt;</code> 元素免費提供正確的實作，且未來瀏覽器升級時行為跟著改善。只有當設計要求的動畫或行為超出原生 dialog 能力時，才值得考慮自製。</p>
</div>

<fe-demo-suite demo="dialog"></fe-demo-suite>

<h2 id="details-summary">5.2 details / summary 與 Disclosure Widget</h2>
<p><code>&lt;details&gt;</code> 和 <code>&lt;summary&gt;</code> 提供了原生的 <strong>Disclosure Widget</strong>（可展開/收合的 UI 元件），等同於 ARIA <code>role="group"</code> 配合一個 <code>role="button"</code> 的 toggle button。<code>&lt;summary&gt;</code> 是 <code>&lt;details&gt;</code> 的第一個子元素，代表摺疊時可見的標題；其他內容在展開時顯示。<code>open</code> attribute 控制展開狀態：<code>&lt;details open&gt;</code> 預設展開。監聽 <code>toggle</code> event 可知道開關狀態改變。</p>

<p>在 <strong>accessibility tree</strong> 中，<code>&lt;summary&gt;</code> 的 <code>role</code> 是 <code>button</code>，並自動帶有 <code>aria-expanded</code> 屬性（open 時為 true，closed 時為 false）。瀏覽器原生支援 Enter/Space 鍵切換。比起自製的 accordion（需要手動設定 <code>aria-expanded</code>、<code>aria-controls</code>、keyboard handler），<code>&lt;details&gt;</code>/<code>&lt;summary&gt;</code> 的 a11y 行為是正確且免維護的。</p>

<p><strong>CSS <code>::details-content</code></strong>（Chromium 131+，進行中）是新的偽元素，讓展開內容的進入/離開動畫成為可能。在此之前，<code>&lt;details&gt;</code> 的展開是瞬間的，無法加 CSS transition（因為 <code>height: 0</code> 到 <code>height: auto</code> 的 transition 一直是 CSS 的難題）。<code>::details-content</code> 配合 <code>@starting-style</code>（定義元素插入 DOM 時的初始樣式）可以實現原生的展開動畫，不需要 JavaScript 計算 scrollHeight。</p>

${code('html', `<!-- 基本用法：FAQ accordion -->
<details>
  <summary>TypeScript 和 JavaScript 的主要差異是什麼？</summary>
  <div class="answer">
    <p>TypeScript 是 JavaScript 的超集，增加了靜態型別系統。
    它在編譯時期發現型別錯誤，提升 IDE 自動補全品質。</p>
  </div>
</details>

<details>
  <summary>什麼時候應該用 React，什麼時候用 Vue？</summary>
  <div class="answer">
    <p>...</p>
  </div>
</details>

<!-- 使用 name 屬性讓多個 details 互斥（Chrome 120+）
     同名的 details，打開一個時其他會自動關閉（exclusive accordion） -->
<details name="faq-group">
  <summary>問題 1</summary>
  <p>答案 1</p>
</details>
<details name="faq-group">
  <summary>問題 2</summary>
  <p>答案 2</p>
</details>

<!-- summary 可以包含任何 phrasing content -->
<details>
  <summary>
    <span class="icon">📦</span>
    <strong>進階配置選項</strong>
    <span class="badge">10 個選項</span>
  </summary>
  <!-- 展開內容 -->
</details>`)}

${code('css', `/* details 展開動畫（::details-content，Chromium 131+）*/
details::details-content {
  /* interpolate-size: allow-keywords 讓 height: auto 可以被 transition */
  /* 需要在 :root 設定 */
  block-size: 0;
  overflow: hidden;
  transition: block-size 0.3s ease, opacity 0.3s ease;
  opacity: 0;
}

details[open]::details-content {
  block-size: auto;
  opacity: 1;
}

/* @starting-style：定義進入 DOM 時的初始狀態
   配合 ::details-content 實現展開動畫 */
@starting-style {
  details[open]::details-content {
    block-size: 0;
    opacity: 0;
  }
}

/* 不支援 ::details-content 的瀏覽器：
   用 grid 的 grid-template-rows: 0fr → 1fr 技巧做動畫
   但需要在 details 和 summary 之外加一層 div */
details .inner-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}
details[open] .inner-wrap {
  grid-template-rows: 1fr;
}
details .inner-wrap > div {
  overflow: hidden;
}

/* summary 的預設三角形標記（marker pseudo-element） */
summary {
  cursor: pointer;
  list-style: none;  /* 移除預設箭頭 */
}
summary::before {
  content: '▶';
  display: inline-block;
  transition: transform 0.2s ease;
  margin-right: 0.5rem;
}
details[open] > summary::before {
  transform: rotate(90deg);
}`)}

${code('javascript', `// toggle event：監聽 details 開關
document.querySelectorAll('details').forEach(details => {
  details.addEventListener('toggle', event => {
    const isOpen = event.target.open;
    const summary = event.target.querySelector('summary');
    console.log(summary.textContent.trim(), isOpen ? '展開' : '收合');

    // 分析用途：追蹤用戶閱讀了哪些 FAQ
    analytics.track('faq_toggle', {
      question: summary.textContent.trim(),
      action: isOpen ? 'expand' : 'collapse',
    });
  });
});

// 程式化控制 details 狀態
function expandAll(container) {
  container.querySelectorAll('details').forEach(d => d.open = true);
}
function collapseAll(container) {
  container.querySelectorAll('details').forEach(d => d.open = false);
}

// 讀取 URL hash 並展開對應的 details（深連結支援）
function openDetailsByHash() {
  const targetId = location.hash.slice(1);
  if (!targetId) return;

  const target = document.getElementById(targetId);
  if (!target) return;

  // 展開所有祖先 details
  let parent = target.parentElement;
  while (parent) {
    if (parent.tagName === 'DETAILS') parent.open = true;
    parent = parent.parentElement;
  }
  target.scrollIntoView({ behavior: 'smooth' });
}
window.addEventListener('hashchange', openDetailsByHash);
openDetailsByHash();`)}

<h2 id="media-elements">5.3 Media Elements</h2>
<p><code>&lt;picture&gt;</code> 元素解決了兩個獨立問題：<strong>art direction</strong>（不同螢幕尺寸顯示不同裁切比例或內容的圖片，例如手機顯示只有人臉的特寫，桌面顯示完整場景）和 <strong>format negotiation</strong>（讓支援 AVIF 的瀏覽器使用 AVIF，不支援的降回 WebP 或 JPEG）。<code>&lt;source media="..."&gt;</code> 處理 art direction；<code>&lt;source type="image/avif"&gt;</code> 處理 format negotiation。瀏覽器從上往下讀 <code>&lt;source&gt;</code>，選第一個符合條件的；都不符合時使用 <code>&lt;img&gt;</code>（必須作為 fallback 保留）。</p>

<p><code>srcset</code> 有兩種描述符語法。<strong>寬度描述符（<code>w</code>）</strong>配合 <code>sizes</code> attribute：告訴瀏覽器每個候選圖片的寬度（像素），讓瀏覽器根據 layout 寬度（由 sizes 計算）和 devicePixelRatio 自行選擇最合適的圖片。<code>sizes="(min-width: 960px) 720px, 100vw"</code> 告訴瀏覽器：「在 viewport 寬度 ≥ 960px 時，圖片顯示寬度是 720px；否則是 viewport 寬度」。瀏覽器用這個資訊計算「需要多少實際像素」，再從 srcset 選候選。<strong>像素密度描述符（<code>x</code>）</strong>：<code>srcset="img-1x.jpg 1x, img-2x.jpg 2x"</code>，直接根據 devicePixelRatio 選圖，但無法考慮 layout 寬度。</p>

<p><strong><code>fetchpriority="high"</code></strong> 是 LCP 圖片最重要的優化屬性。預設情況下，在 HTML 解析時瀏覽器還不知道哪張圖片將成為 LCP element，可能以中等優先級下載它。<code>fetchpriority="high"</code> 明確告訴瀏覽器提升這個資源的 network 優先級，應用於 hero image、above-the-fold 的第一張商品圖，通常能減少 LCP 200-500ms。<code>loading="lazy"</code> 則相反：延遲不在 viewport 內的圖片下載，適合 below-the-fold 的圖片，能減少初始頁面的 bandwidth 使用。兩者不要同時用在同一個圖片上。</p>

${diagram(`
flowchart TD
    start["瀏覽器遇到 &lt;picture&gt;"] --> media{"&lt;source media&gt;\\n條件符合？"}
    media -->|"是"| fmt{"source 的\\ntype 瀏覽器支援？"}
    media -->|"否，試下一個"| media
    media -->|"所有 source 都不符合"| imgEl["使用 &lt;img&gt; fallback\\n（srcset + sizes）"]
    fmt -->|"支援 (avif/webp)"| pickSrc["根據 sizes 計算 layout 寬度\\n× devicePixelRatio = 目標像素寬\\n選 srcset 中最接近的候選"]
    fmt -->|"不支援，試下一個"| media
    imgEl --> pickSrc
    pickSrc --> download["下載選中的圖片\\n（fetchpriority 影響優先級）"]
`, '瀏覽器選圖的決策流程。media 條件決定 art direction，type 條件決定 format，srcset+sizes 決定解析度。這三層是獨立的。')}

${code('html', `<!-- 完整的 responsive image 範例 -->
<picture>
  <!-- Art direction：手機顯示方形裁切（臉部特寫），桌面顯示橫向完整圖 -->
  <source
    media="(max-width: 767px)"
    type="image/avif"
    srcset="/hero-sq-400.avif 400w, /hero-sq-800.avif 800w"
    sizes="100vw"
  >
  <source
    media="(max-width: 767px)"
    type="image/webp"
    srcset="/hero-sq-400.webp 400w, /hero-sq-800.webp 800w"
    sizes="100vw"
  >
  <!-- 桌面：橫向圖，AVIF 優先 -->
  <source
    type="image/avif"
    srcset="/hero-800.avif 800w, /hero-1400.avif 1400w, /hero-2000.avif 2000w"
    sizes="(min-width: 1200px) 960px, (min-width: 768px) 720px, 100vw"
  >
  <source
    type="image/webp"
    srcset="/hero-800.webp 800w, /hero-1400.webp 1400w, /hero-2000.webp 2000w"
    sizes="(min-width: 1200px) 960px, (min-width: 768px) 720px, 100vw"
  >
  <!-- fallback：必須有，也是 SEO 的 alt 所在處 -->
  <img
    src="/hero-800.jpg"
    srcset="/hero-800.jpg 800w, /hero-1400.jpg 1400w"
    sizes="(min-width: 1200px) 960px, (min-width: 768px) 720px, 100vw"
    width="1400"
    height="788"
    alt="工程師在白板前解說架構圖"
    fetchpriority="high"
    decoding="async"
  >
</picture>

<!-- LCP 圖片的最佳化清單
     1. fetchpriority="high" — 提升 network 優先級
     2. 明確 width + height — 讓瀏覽器提前計算 aspect ratio，避免 CLS
     3. 不要加 loading="lazy" — LCP 圖片必須立即載入
     4. 配合 <link rel="preload"> 在 <head> 提前啟動下載 -->
<link rel="preload" as="image"
  href="/hero-1400.avif"
  imagesrcset="/hero-800.avif 800w, /hero-1400.avif 1400w"
  imagesizes="(min-width: 1200px) 960px, 720px"
  fetchpriority="high"
>

<!-- video：行動裝置的注意事項 -->
<video
  src="/demo.mp4"
  width="1280" height="720"
  autoplay    <!-- iOS 需要同時有 muted 才允許自動播放 -->
  muted
  loop
  playsinline <!-- iOS 必須有才能內嵌播放，沒有就強制全螢幕 -->
  poster="/demo-poster.jpg"
  preload="metadata"  <!-- 只載入 metadata，不下載整個影片 -->
>
  <!-- 字幕（a11y 必備） -->
  <track kind="subtitles" src="/demo.vtt" srclang="zh-TW" label="中文字幕" default>
</video>`)}

${code('javascript', `// 觀察圖片載入時機，確認 LCP 候選是否被正確優先處理
const observer = new PerformanceObserver(list => {
  list.getEntries().forEach(entry => {
    if (entry.initiatorType === 'img') {
      console.log({
        url: entry.name,
        priority: entry.fetchPriority,  // 'high' / 'low' / 'auto'
        startTime: Math.round(entry.startTime),
        responseEnd: Math.round(entry.responseEnd),
      });
    }
  });
});
observer.observe({ type: 'resource', buffered: true });

// 偵測 IntersectionObserver 觸發 lazy load 的時機（自製 lazy load）
function createLazyLoader(options = {}) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      // data-src → src（觸發實際下載）
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      if (img.dataset.src) img.src = img.dataset.src;
      io.unobserve(img);
    });
  }, {
    rootMargin: '200px 0px',  // 在進入 viewport 前 200px 就開始載入
    threshold: 0,
    ...options,
  });

  document.querySelectorAll('img[data-src]').forEach(img => io.observe(img));
  return io;
}

// 注意：native loading="lazy" 的 threshold 大約是 viewport 下方 1200px，
// 比自製的 IntersectionObserver 更積極。對大多數場景 native lazy load 夠用。`)}

<fe-demo-suite demo="srcset"></fe-demo-suite>

<h2 id="canvas-svg-webgl-webgpu">5.4 Canvas、SVG、WebGL、WebGPU</h2>
<p>選擇繪圖技術的核心依據是<strong>模式（retained vs immediate）</strong>、<strong>元素數量</strong>、<strong>互動需求</strong>與<strong>可訪問性成本</strong>。這一節提供決策框架；Part VI 會深入 Canvas 2D、OffscreenCanvas、WebGL、WebGPU 的實作細節。</p>

<p><strong>SVG / DOM（Retained Mode）</strong>：瀏覽器保留完整的場景圖，每個元素都是 DOM 節點，有自動的 hit testing（點擊事件）、可樣式化（CSS）、可訪問（<code>role</code>、<code>aria-label</code>）、可索引（screen reader、搜尋引擎）。適合元素數量 &lt; 1000 的圖表、icon、infographic、互動式地圖、流程圖。缺點：大量節點時 DOM 操作成本高、無法直接做 GPU 加速的像素效果。</p>

<p><strong>Canvas 2D（Immediate Mode）</strong>：繪製後就「忘記」，畫面只是一塊像素矩陣。需要自行管理場景圖、hit testing、dirty region 重繪。適合高頻更新（每幀重繪）、像素級操作（濾鏡、影像處理）、元素數量 &gt; 5000 的場景（如 D3 force simulation、文字編輯器光柵化）。缺點：沒有內建 a11y，需要 fallback content 或 parallel DOM。<strong>OffscreenCanvas</strong> 允許把 Canvas 渲染移到 Web Worker，讓繪製不佔用主執行緒 frame budget，適合高複雜度的 canvas 動畫。</p>

<p><strong>WebGL / Three.js / WebGPU</strong>：GPU 管線，適合 3D 場景、> 20000 個繪圖物件、需要 shader 效果的場景。WebGL 1/2 是 OpenGL ES 2/3 的 JavaScript 綁定；Three.js 在其上提供高階場景管理、材質、相機。<strong>WebGPU</strong>（Chrome 113+ 穩定支援）是下一代 GPU API，增加了 compute shader（GPGPU），讓 ML 推論、流體模擬等通用 GPU 計算能在瀏覽器內執行。Part VI 會詳細介紹。</p>

${diagram(`
graph TD
    req["需求分析"] --> node{"元素數量 / 複雜度"}
    node -->|"&lt; 1000 個形狀\\n需要可訪問、可樣式化"| svg["SVG 或 DOM\\n+ CSS 動畫\\nretained mode\\n✓ a11y 免費"]
    node -->|"1000~20000 個元素\\n高頻更新或像素操作"| canvas["Canvas 2D\\nimmediate mode\\n考慮 OffscreenCanvas\\n✗ 需要自製 a11y"]
    node -->|"3D 場景\\n或 > 20000 個元素"| webgl["WebGL via Three.js / Babylon.js\\n或 PixiJS (2D GPU)\\n✗ a11y 需補償"]
    node -->|"需要 compute shader\\n或 GPGPU"| webgpu["WebGPU\\n(ML 推論、粒子、流體)\\n注意瀏覽器支援度"]
    subgraph Notes["共同考量"]
        dpr["HiDPI: canvas.width = size × devicePixelRatio"]
        ctx_loss["WebGL context loss 必須處理"]
        fallback["不支援時需提供 fallback 內容"]
    end
`, 'Canvas/SVG/WebGL/WebGPU 的選型決策樹。核心是 retained mode（SVG/DOM）vs immediate mode（Canvas/WebGL）的取捨，以及元素數量、a11y 需求和 GPU 能力的要求。')}

${code('html', `<!-- SVG：向量、可訪問、可樣式化 -->
<!-- 圖示 SVG 應有 aria-label 或 aria-hidden -->
<svg
  width="24" height="24"
  viewBox="0 0 24 24"
  role="img"
  aria-label="收藏"
  fill="none"
  stroke="currentColor"
>
  <title>收藏</title>
  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
</svg>

<!-- Canvas 2D：即時渲染模式 -->
<canvas id="chart" width="800" height="400">
  <!-- fallback content：給不支援 canvas 的環境，或 screen reader 使用 -->
  <p>銷售數據折線圖，1月至12月，總計 120萬元。</p>
</canvas>`)}

${code('javascript', `// Canvas 2D 基礎 + HiDPI 處理（必須正確設定，否則 Retina 螢幕模糊）
function initCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  // 實體像素（device pixels）= CSS pixels × DPR
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  // CSS 尺寸保持 CSS pixels
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  // scale 讓後續所有繪圖指令都以 CSS pixels 為單位
  ctx.scale(dpr, dpr);
  return ctx;
}

// OffscreenCanvas：把渲染移到 Worker
function setupOffscreenCanvas(canvas) {
  // transferControlToOffscreen() 把控制權永久轉移給 Worker
  // 之後主執行緒無法再操作這個 canvas
  const offscreen = canvas.transferControlToOffscreen();
  const worker = new Worker('/render-worker.js', { type: 'module' });

  // 用 Transferable 傳遞（零拷貝）
  worker.postMessage({
    type: 'init',
    canvas: offscreen,
    dpr: window.devicePixelRatio,
    width: canvas.clientWidth,
    height: canvas.clientHeight,
  }, [offscreen]);  // 第二個參數：transferable objects

  window.addEventListener('resize', () => {
    worker.postMessage({
      type: 'resize',
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      dpr: window.devicePixelRatio,
    });
  });

  return worker;
}

// render-worker.js（在 Worker 內執行）
// self.addEventListener('message', event => {
//   if (event.data.type === 'init') {
//     const ctx = event.data.canvas.getContext('2d');
//     // 在 Worker 內繪圖，完全不阻塞主執行緒
//     requestAnimationFrame(drawFrame);  // OffscreenCanvas 有自己的 rAF
//   }
// });

// WebGPU feature detection + fallback
async function detectGraphicsCapabilities() {
  const capabilities = {
    webgpu: false,
    webgl2: false,
    webgl1: false,
    canvas2d: true,  // 永遠支援
  };

  if ('gpu' in navigator) {
    const adapter = await navigator.gpu?.requestAdapter();
    capabilities.webgpu = !!adapter;
  }

  const testCanvas = document.createElement('canvas');
  capabilities.webgl2 = !!testCanvas.getContext('webgl2');
  capabilities.webgl1 = !!testCanvas.getContext('webgl');

  return capabilities;
}`)}

<h2 id="real-world-applications">真實場景應用</h2>
<div class="application-grid">
  <div class="mini-card">
    <h3>設計系統的 dialog 元件</h3>
    <p>用原生 <code>&lt;dialog&gt;</code> 作為 modal 的 baseline，只在動畫、自訂 backdrop 行為或 nested dialog 場景加 JavaScript 增強。相比自製 portal + focus trap，省去 50+ 行的可靠性較低的程式碼，且隨瀏覽器升級免費改善。</p>
  </div>
  <div class="mini-card">
    <h3>電商 LCP 圖片優化</h3>
    <p>商品詳情頁的 hero image：<code>fetchpriority="high"</code> + <code>&lt;link rel="preload"&gt;</code> + 明確 <code>width</code>/<code>height</code> + AVIF/WebP srcset + 不加 <code>loading="lazy"</code>。這個組合通常能把 LCP 從 3-4s 降到 1.5-2s。</p>
  </div>
  <div class="mini-card">
    <h3>可訪問的 FAQ 頁</h3>
    <p>用 <code>&lt;details&gt;</code>/<code>&lt;summary&gt;</code> + JSON-LD FAQPage schema + 正確的 heading hierarchy，同時滿足：鍵盤操作、screen reader 的 expanded/collapsed 狀態宣告、Google 的 rich result 標記、深連結 URL hash 展開。</p>
  </div>
</div>

<h2 id="pitfalls-tradeoffs">常見陷阱與取捨</h2>
<div class="tradeoff-grid">
  <div class="mini-card">
    <h3>popover vs dialog 的混淆</h3>
    <p><code>popover</code> 適合 tooltip、dropdown menu、filter panel 等「輕量浮層」；<code>&lt;dialog&gt;</code> 適合需要打斷用戶流程的「模態操作」（確認刪除、填寫表單）。兩者都進入 top-layer，但 dialog 的 focus trap 更嚴格，popover 不鎖定焦點。選錯會造成 UX 問題：dialog 做 tooltip 太重；popover 做確認視窗太輕（用戶可以點外部關閉）。</p>
  </div>
  <div class="mini-card">
    <h3>srcset w 描述符少了 sizes</h3>
    <p>使用 <code>srcset="img-800.jpg 800w, img-1400.jpg 1400w"</code> 但沒有 <code>sizes</code>，瀏覽器預設 <code>sizes="100vw"</code>——假設圖片佔滿整個 viewport 寬度。在桌面 1920px viewport + DPR 2 的情況下，瀏覽器會下載 3840px 等效的圖片，遠超實際需要。<code>sizes</code> 必須精確描述圖片在不同 breakpoint 的 layout 寬度。</p>
  </div>
  <div class="mini-card">
    <h3>LCP 圖片加了 loading="lazy"</h3>
    <p>這是最常見的 LCP 問題之一。<code>loading="lazy"</code> 讓圖片在接近 viewport 時才開始下載，對 hero image 來說等同主動延遲 LCP。判斷原則：above-the-fold 的圖片（包括 hero、首屏 banner、商品主圖）不加 <code>loading="lazy"</code>；below-the-fold 的圖片都應加。</p>
  </div>
  <div class="mini-card">
    <h3>Canvas 的 a11y 缺口</h3>
    <p>Canvas 本身對 screen reader 是黑盒子。解法：在 <code>&lt;canvas&gt;</code> 內放置 fallback content（HTML5 規範允許）、用 ARIA 的 application role + aria-label 提供替代描述、或在 canvas 上方疊一層透明的 accessible DOM（例如互動式圖表的每個資料點對應一個看不見的 button）。沒有一個解法是完美的，Canvas-based 工具必須正視這個成本。</p>
  </div>
</div>

<h2 id="interview-framing">面試回答框架</h2>
<ol>
  <li><strong>先說平台職責：</strong>新的 HTML API（dialog、popover、details）把過去靠 JavaScript 繞路的行為收回瀏覽器，提供更可靠的 focus management、keyboard support、a11y，同時跟隨瀏覽器升級免費改善。</li>
  <li><strong>再說機制：</strong>top-layer 讓 dialog/popover 永遠在 stacking context 上方；<code>picture</code> 的 source 選擇是三層獨立的：media（art direction）、type（format）、srcset+sizes（解析度）；<code>fetchpriority="high"</code> 直接影響 network 排程而不是 parse 順序。</li>
  <li><strong>說取捨：</strong>原生 dialog 樣式有限（需要重置 ::backdrop）；srcset w 描述符需要準確的 sizes 才有效；Canvas 沒有免費 a11y；OffscreenCanvas 在 Safari 支援較晚，需要 fallback 策略。</li>
  <li><strong>說驗證：</strong>鍵盤測試 dialog focus trap；Network throttling 觀察 srcset 候選選擇；Performance panel 確認 LCP element 的 fetch 時機；screen reader 測試 details/summary 的 expanded 狀態。</li>
</ol>

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
