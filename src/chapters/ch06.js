import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 6)

const prev = chapters.find(c => c.id === 5)
const next = chapters.find(c => c.id === 7)

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
  <div class="chapter-num">Chapter 06 · CSS</div>
  <h1>CSS 基礎與級聯機制</h1>
  <p>CSS 的困難不在語法，而在 <strong>cascade</strong>（哪條規則最終生效）與 <strong>layout algorithm</strong>（元素如何決定自己的大小與位置）兩個彼此獨立但互相影響的系統。理解這兩層機制，才能在面對樣式衝突、RWD 排版失控、設計系統覆寫失效等問題時，找到可追溯的根因而非靠猜測修補。</p>
  <div class="chapter-tags">
    <span class="tag">css</span>
    <span class="tag">cascade</span>
    <span class="tag">specificity</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能解釋 margin collapsing 在 Flexbox container 內為何不發生；能說明 <code>:is()</code> 與 <code>:where()</code> 在 specificity 上的關鍵差異；能說出 <code>@layer</code> 如何讓你在不增加 specificity 的前提下控制覆寫順序；能說出 <code>@property</code> 讓 CSS variable 可動畫的原因；能說出 <code>dvh</code> 解決的具體 mobile browser chrome 問題。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>把 CSS 想成「規則競爭」：每條宣告都在爭奪最終生效的機會。Cascade 是仲裁機制（origin → layer → specificity → order），inheritance 是預設值傳播機制，而 layout algorithm 決定空間分配。把這三層分開理解，才不會把 specificity 問題誤診為 inheritance，或把 layout 問題誤診為 cascade。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>設計系統元件被頁面樣式覆寫失效：用 <code>@layer</code> 顯式控制優先順序，不再靠提升 specificity 的軍備競賽。手機版元素尺寸用 <code>100vh</code> 但被 browser chrome 遮住：改用 <code>dvh</code>。按鈕在某些頁面顏色不對：Cascade Layers 能精確定位是哪個 layer 的規則覆蓋了另一個。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>「為什麼我加了樣式沒有生效」往往是 specificity 或 layer 問題。「為什麼這個 div 有不明的 margin」往往是 margin collapsing。「為什麼手機版空白區域在 bottom nav 後面」往往是 viewport unit 問題（<code>vh</code> vs <code>dvh</code>）。DevTools Computed panel 能直接顯示哪條規則勝出及其來源。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>DevTools Computed tab 看 cascade 來源；Specificity Calculator（本章互動示範）驗算選擇器權重；在 DevTools Sources 或 Styles tab 直接看 <code>@layer</code> 的排列；用真實手機測試 <code>dvh</code> vs <code>svh</code> vs <code>lvh</code> 在不同狀態下的高度表現。</p>
  </div>
</div>

<h2 id="box-model">6.1 Box Model 與 box-sizing</h2>
<p>每個 HTML 元素在 CSS 中都是一個矩形盒子，由四層組成：<strong>content</strong>（內容區）、<strong>padding</strong>（內距）、<strong>border</strong>（邊框）、<strong>margin</strong>（外距）。這四層從裡到外疊加，但 <code>box-sizing</code> 屬性決定 <code>width</code> 和 <code>height</code> 指的是哪一層的尺寸。</p>

<p><strong><code>content-box</code>（預設值）</strong>：<code>width</code> 只計算 content 區域，加上 padding 和 border 後，元素的實際佔位更寬。這讓「設 <code>width: 100%</code>」的元素容易因 padding/border 溢出父容器，是許多 layout 問題的根源。<strong><code>border-box</code></strong>：<code>width</code> 包含 content + padding + border，元素的實際佔位就是你設定的數字，直觀且不易出錯。現代 CSS reset 幾乎都全域設定 <code>box-sizing: border-box</code>。</p>

<p><strong>Margin collapsing（外距折疊）</strong>是 CSS 中最讓人困惑的行為之一：相鄰的兩個垂直 margin 不是相加，而是取較大值。觸發條件是「相鄰的 block-level 元素在正常文流中」，而三種情境下 margin collapsing <strong>不發生</strong>：Flexbox 或 Grid container 的子元素（格式化上下文改變）、有 padding 或 border 分隔的父子元素、以及使用 <code>overflow: hidden</code> 的容器。理解「為什麼用了 Flexbox 後 margin 變成相加而不是折疊」，就是理解 formatting context 的改變。</p>

${code('css', `/* ❌ content-box（預設）：width 加 padding 超出 100% */
.card {
  box-sizing: content-box;
  width: 100%;
  padding: 0 20px;  /* 實際佔位 = 100% + 40px，溢出父容器 */
}

/* ✅ border-box：width 包含 padding，絕不溢出 */
.card {
  box-sizing: border-box;
  width: 100%;
  padding: 0 20px;  /* 實際佔位 = 100%，padding 往內擠 */
}

/* 全域套用的最佳實踐 */
*, *::before, *::after {
  box-sizing: border-box;
}

/* Margin collapsing 範例：兩個 h2 之間實際間距是 max(24px, 16px) = 24px */
h2 { margin-bottom: 24px; }
p  { margin-top:    16px; }

/* 防止 margin collapsing 的方法：改用 Flexbox/Grid 或加 padding */
.container {
  display: flex;
  flex-direction: column;
  gap: 16px;  /* gap 取代 margin，不會 collapse */
}`)}

<fe-demo-suite demo="box"></fe-demo-suite>

<div class="callout">
  <div class="callout-title">RWD 實戰：Percentage Padding 與 Aspect Ratio</div>
  <p>一個鮮為人知的規則：<code>padding</code> 的百分比值（無論是 top/bottom/left/right）都基於<strong>父元素的 width</strong>，不是 height。這讓 <code>padding-top: 56.25%</code> 成為保持 16:9 aspect ratio 的經典 hack（現已被 <code>aspect-ratio: 16/9</code> 取代）。在 RWD 中，這個特性也意味著用 <code>padding</code> 做的 spacer 在縮短頁面寬度時也會縮小。</p>
</div>

<h2 id="specificity">6.2 Selectors 與 Specificity 計算</h2>
<p>CSS 選擇器的「特異性」決定當多條規則同時作用於同一元素時，哪條規則勝出。特異性用一個三位數組（<code>[id, class/attr/pseudo-class, element/pseudo-element]</code>）表示，從左到右比較大小，<strong>id &gt; class &gt; element</strong>。</p>

<p>幾個關鍵細節：<code>:is()</code> 的特異性取「括號內最高的那個選擇器」，而 <code>:where()</code> 的特異性<strong>永遠是 0</strong>（這讓它非常適合寫 reset 或低優先級的 base style）。<code>:has()</code> 是歷史上第一個真正意義上的「parent selector」，讓你能根據子元素的存在改變父元素的樣式；其特異性計算方式與 <code>:is()</code> 相同。<code>!important</code> 完全跳出 specificity 系統，進入 cascade origin 的比較，是特效藥不是日常藥。</p>

${code('css', `/* 特異性計算範例 */
h2 { color: black; }                          /* [0, 0, 1] */
.title { color: blue; }                       /* [0, 1, 0] */
#hero .title { color: red; }                  /* [1, 1, 0] */
h2.title { color: green; }                    /* [0, 1, 1] */

/* :is() 繼承最高 specificity */
:is(#hero, .section) h2 { color: purple; }    /* [1, 0, 1] — #hero 的 id 被帶入 */

/* :where() 特異性永遠是 0 */
:where(#hero, .section) h2 { color: orange; } /* [0, 0, 1] — 不帶入括號內的 specificity */

/* :has() — parent selector */
.card:has(img) { padding: 0; }               /* [0, 1, 1] — 有圖片的 card 去掉 padding */
.nav:has(.active) { background: #eef; }      /* [0, 2, 0] — 有 active 子元素的 nav 改背景 */

/* 面試關鍵：inline style > !important > id > class > element */
/* 但 !important 的優先順序依 origin 與 layer 再分高低 */`)}

<fe-demo-suite demo="specificity"></fe-demo-suite>

<div class="callout">
  <div class="callout-title">Senior 信號：不用 <code>!important</code> 解決衝突</div>
  <p>遇到 specificity 戰爭時，Senior 的解法通常是：降低衝突選擇器的複雜度（用 <code>:where()</code> 包裹 reset），或用 <code>@layer</code> 顯式設定覆寫順序。用 <code>!important</code> 反而會讓下一次覆寫需要更高的 <code>!important</code>，無限軍備競賽。</p>
</div>

<h2 id="cascade">6.3 Cascade、Inheritance、Importance 與 @layer</h2>
<p>Cascade 是一套決定哪條 CSS 宣告最終勝出的規則。它的完整優先順序（從低到高）是：<strong>瀏覽器預設樣式</strong> → <strong>使用者樣式</strong> → <strong>作者樣式</strong>。在「作者樣式」這一層內，再依 <strong>@layer 順序</strong>（後宣告者勝） → <strong>specificity</strong> → <strong>出現順序</strong>來決定。<code>!important</code> 會翻轉 origin 的順序（瀏覽器的 <code>!important</code> 最高，使用者的次之，作者的最低）。</p>

<p><strong>Cascade Layers（<code>@layer</code>）</strong>是 2022 年瀏覽器全面支援的重大特性。它讓你顯式宣告樣式層的優先順序，後宣告的 layer 優先級更高，且 layer 內的樣式無論 specificity 多高，都輸給更高 layer 的任何規則。這徹底解決了大型專案中「reset 與 component 互相干擾」、「第三方 library 被覆寫後又被加回來」的問題。設計系統的標準 layer 宣告通常是：</p>

${code('css', `/* 1. 宣告 layer 順序（優先級從低到高） */
@layer reset, tokens, components, utilities;

/* 2. 各層填入規則 */
@layer reset {
  /* 低優先，任何 component 規則都能覆寫它 */
  *, *::before, *::after { box-sizing: border-box; margin: 0; }
  button { all: unset; }
}

@layer tokens {
  :root {
    --color-action: #1769ff;
    --radius-md: 8px;
    --space-3: 0.75rem;
  }
}

@layer components {
  .button {
    padding: var(--space-3) 1rem;
    border-radius: var(--radius-md);
    background: var(--color-action);
    color: white;
  }
}

@layer utilities {
  /* utilities 層最高，可以強制覆寫任何 component */
  .hidden { display: none; }
  .sr-only { position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0); }
}

/* 在 layer 外的規則：優先級高於所有 layer 內的規則 */
/* 適合用在一次性的頁面例外覆寫 */
.checkout-button {
  background: #e8505b;  /* 覆寫 components layer 的 .button，即使 specificity 相同 */
}`)}

<fe-demo-suite demo="cascade"></fe-demo-suite>

${diagram(`
graph LR
    subgraph Cascade["Cascade 優先順序（由低到高）"]
        UA["瀏覽器預設 user-agent"]
        User["使用者 (user) 樣式"]
        subgraph Author["作者 (author) 樣式"]
            L1["@layer reset"]
            L2["@layer tokens"]
            L3["@layer components"]
            L4["@layer utilities"]
            NoLayer["未置入 layer 的規則"]
        end
        ImpUA["瀏覽器 !important"]
        ImpAuthor["作者 !important（layer 優先逆轉）"]
    end
    UA --> User --> L1 --> L2 --> L3 --> L4 --> NoLayer --> ImpAuthor --> ImpUA
`, 'Cascade 的完整優先順序。@layer 讓你在「作者樣式」這一層內自訂順序；!important 翻轉整個鏈的方向。')}

<h2 id="custom-properties">6.4 CSS Custom Properties（CSS Variables）</h2>
<p>CSS 自定義屬性（通常稱為 CSS variables）與 Sass/Less 變數有根本差異：<strong>CSS variables 是 runtime 的</strong>，儲存在 DOM 中，可以被 JavaScript 動態改變，可以繼承，可以在 media query 內重新定義；Sass/Less 變數是 <strong>build-time 的</strong>，編譯後消失在輸出的 CSS 中，無法動態改變。這個差異讓 CSS variables 成為 design token 系統、dark mode theming、動態主題的核心工具。</p>

<p><code>@property</code> 是 CSS variables 的進階版：你可以用它<strong>宣告變數的型別</strong>（<code>&lt;color&gt;</code>、<code>&lt;length&gt;</code>、<code>&lt;number&gt;</code>、<code>&lt;percentage&gt;</code>），並指定初始值和是否繼承。這讓 CSS variable 可以被 <code>transition</code> 和 <code>animation</code> 平滑補間——普通的 CSS variable 因為沒有型別信息，瀏覽器無法計算中間值，所以不能動畫；而 <code>@property</code> 登錄型別後就能動畫。</p>

${code('css', `/* 基礎 CSS variable 用法 */
:root {
  --color-primary: #0a84ff;
  --space-base: 1rem;
  --font-body: 'Inter', system-ui, sans-serif;
}

.button {
  color: white;
  background: var(--color-primary);
  padding: var(--space-base) calc(var(--space-base) * 2);
  /* var() 可以有 fallback 值 */
  border-radius: var(--radius-md, 8px);
}

/* Dark mode：只改 token，所有元件自動更新 */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #58b5ff;
  }
}

/* @property：讓 variable 可動畫 */
@property --card-opacity {
  syntax: '<number>';
  inherits: false;
  initial-value: 1;
}

.card {
  opacity: var(--card-opacity);
  transition: --card-opacity 0.3s ease;  /* 現在可以 transition! */
}

.card:hover {
  --card-opacity: 0.7;
}

/* JavaScript 動態改變 */
/* document.documentElement.style.setProperty('--color-primary', '#ff6b6b') */`)}

<div class="callout">
  <div class="callout-title">設計 Token 系統的層次</div>
  <p>成熟的 design token 系統有三層：<strong>Primitive tokens</strong>（原始色板：<code>--blue-500: #0a84ff</code>）→ <strong>Semantic tokens</strong>（語意角色：<code>--color-action: var(--blue-500)</code>）→ <strong>Component tokens</strong>（元件：<code>--button-bg: var(--color-action)</code>）。切換主題時只要改 semantic 層，所有元件自動響應。這個架構讓設計師可以調色板，工程師可以調元件，互不干擾。</p>
</div>

<h2 id="values-units-functions">6.5 Values、Units、Functions</h2>
<p>CSS 的 unit 系統遠比 <code>px</code> 和 <code>%</code> 複雜。<strong>相對 font unit</strong>：<code>em</code> 相對父元素字體大小（巢狀累積）、<code>rem</code> 相對根元素（<code>&lt;html&gt;</code>）字體大小（穩定可預測）；<code>ch</code> 等於字體的「0」字元寬度，適合設定 prose 最大寬度（<code>max-width: 65ch</code>）；<code>ex</code> 等於小寫字母 x 的高度。<strong>Viewport units</strong>：<code>vw</code>/<code>vh</code> 是 viewport 的 1%，但 <code>vh</code> 在手機上因為 browser chrome（網址列）的顯示/隱藏而不穩定。</p>

<p>為此 CSS 推出了三組 mobile-aware viewport units：<code>svh</code>（small viewport height，browser chrome 顯示時的高度）、<code>lvh</code>（large viewport height，browser chrome 隱藏時的高度）、<code>dvh</code>（dynamic viewport height，隨 chrome 動態更新）。全螢幕佈局（chat 介面、landing page）應使用 <code>dvh</code> 確保元素真正貼合可見區域。<strong>CSS functions</strong>：<code>clamp(min, preferred, max)</code> 一行取代 media query 的漸進縮放；<code>min()</code>/<code>max()</code> 做約束計算；現代 color functions 如 <code>oklch()</code> 在感知一致的顏色空間操作，<code>color-mix()</code> 混合兩個顏色。</p>

${code('css', `/* Viewport units：手機必用 dvh */
.app-shell {
  height: 100dvh;  /* 動態適配 mobile browser chrome 的顯示/隱藏 */
  display: grid;
  grid-template-rows: auto 1fr auto;  /* header / main / nav */
}

/* 固定底部導覽（讓主內容不被遮住）*/
.main-content {
  overflow-y: auto;
  /* 不需要 padding-bottom hack，dvh 已經把 bottom nav 空間算進去 */
}

/* clamp()：流動文字大小，取代多個 media query */
h1 {
  font-size: clamp(1.75rem, 4vw + 1rem, 3.5rem);
  /* min: 1.75rem（手機），preferred: 4vw+1rem（流動），max: 3.5rem（桌面） */
}

/* 多欄佈局寬度限制 */
.prose {
  max-width: min(65ch, 100% - 3rem);  /* 最多 65 字元寬，但不超出容器 */
}

/* 現代 color：oklch 在感知一致的色彩空間 */
:root {
  --color-primary: oklch(55% 0.2 250);         /* 感知均勻的藍色 */
  --color-primary-light: oklch(75% 0.15 250);  /* 同色調更淡 */
  --color-mix-example: color-mix(in oklch, #0a84ff 60%, white); /* 混色 */
}

/* 響應式間距：不用 media query */
.card {
  padding: clamp(1rem, 3vw, 2rem);
  margin-bottom: clamp(1.5rem, 4vw, 3rem);
}`)}

${diagram(`
graph TD
    subgraph ViewportUnits["Viewport Height Units（手機關鍵）"]
        svh["svh — Small Viewport Height<br>Browser chrome 展開時的高度<br>（最小可見區域）"]
        lvh["lvh — Large Viewport Height<br>Browser chrome 收合時的高度<br>（最大可見區域）"]
        dvh["dvh — Dynamic Viewport Height<br>即時追蹤當前可見高度<br>✓ 適合全螢幕 App Shell"]
        vh["vh — 歷史行為不一致<br>某些瀏覽器等同 lvh<br>某些等同 svh"]
    end
    subgraph Use["使用建議"]
        fullscreen["全螢幕 App Shell\\n→ 用 dvh"]
        hero["Hero section\\n→ 用 svh（確保永遠可見）"]
        scroll["需要精確計算\\n→ 用 svh/lvh 各自設計"]
    end
    dvh --> fullscreen
    svh --> hero
`, 'Mobile browser chrome（網址列）的高度隨捲動變化，三組 viewport unit 對應三種設計需求。')}

<h2 id="chapter-summary">章節整合：從 Cascade 到 Design System</h2>
<p>本章的所有概念在設計系統中彼此呼應：<strong>Box Model 的 border-box</strong> 是元件尺寸計算的基礎；<strong>Cascade Layers</strong> 讓 reset、token、component 的樣式有明確的覆寫順序；<strong>Custom Properties</strong> 是 design token 的實作形式；<strong>CSS functions 與 viewport units</strong> 讓響應式設計不再依賴大量 media query。</p>

${code('css', `/* 完整的 Design System 基礎結構 */
@layer reset, tokens, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  /* 避免 margin collapsing 造成意外間距 */
  body { margin: 0; }
}

@layer tokens {
  :root {
    /* Primitive */
    --blue-500: oklch(55% 0.2 250);
    --space-unit: 0.25rem;

    /* Semantic */
    --color-action: var(--blue-500);
    --space-3: calc(var(--space-unit) * 3);   /* 0.75rem */
    --space-4: calc(var(--space-unit) * 4);   /* 1rem */

    /* App Shell */
    --app-height: 100dvh;
  }

  @media (prefers-color-scheme: dark) {
    :root { --color-action: oklch(72% 0.18 250); }
  }
}

@layer components {
  .app-shell {
    height: var(--app-height);
    display: grid;
    grid-template-rows: auto 1fr auto;  /* header / main / footer-nav */
  }

  :where(.button) {
    /* :where() 不增加 specificity，容易被 utilities 覆寫 */
    padding: var(--space-3) var(--space-4);
    background: var(--color-action);
    color: white;
    border: none;
    border-radius: 6px;
  }
}

@layer utilities {
  .w-full { width: 100%; }
  .text-center { text-align: center; }
}`)}

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
