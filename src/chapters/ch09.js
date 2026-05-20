import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 9)

const prev = chapters.find(c => c.id === 8)
const next = chapters.find(c => c.id === 10)

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
  <div class="chapter-num">Chapter 09 · CSS</div>
  <h1>CSS 架構與可維護性</h1>
  <p>CSS 架構解決的問題不是「怎麼寫 CSS」，而是「當多個人維護同一份 CSS 時，如何讓覆寫可預測、作用域可控制、設計 token 一致」。從 BEM 的命名約定、CSS Modules 的 hash 隔離、Tailwind 的 utility-first，到 Vanilla Extract 的 zero-runtime CSS-in-JS，每種方案都在「開發體驗 vs runtime 成本 vs 設計一致性 vs 元件封裝」之間做不同取捨。Senior 工程師的能力是能說清楚每種方案的適用情境，而不是追求某個命名流派的純度。</p>
  <div class="chapter-tags">
    <span class="tag">css</span>
    <span class="tag">architecture</span>
    <span class="tag">design-system</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 styled-components/Emotion 的 runtime 成本是什麼（生成 class name + 注入 <code>&lt;style&gt;</code>，有 SSR hydration mismatch 風險）；能說出 Tailwind 的 utility-first 如何解決 CSS 特異性戰爭（每個 utility class 的 specificity 幾乎相同）；能說出 Vanilla Extract 如何做到 zero-runtime（build time 生成靜態 CSS）；能說出 <code>adoptedStyleSheets</code> 相對於 <code>&lt;style&gt;</code> 標籤在 Shadow DOM 中的共享效率優勢。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>CSS 架構方案可以從兩個維度評估：<strong>作用域方式</strong>（命名約定 vs 編譯時隔離 vs 運行時隔離 vs Shadow DOM）和<strong>樣式位置</strong>（標準 CSS 文件 vs JavaScript 文件 vs HTML class 屬性）。選型時要同時考慮 SSR、bundle size、設計系統整合能力、team 學習曲線。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>大型 React 應用已有大量 styled-components，但 SSR 性能差且 bundle 過大 → 漸進遷移到 Vanilla Extract 或 CSS Modules。多個產品線共用設計系統 → Cascade Layers + CSS Custom Properties 提供最高彈性。Web Components 跨框架元件庫 → Constructable Stylesheets 共享樣式。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>樣式難以覆寫（specificity 過高）；SSR 頁面有 FOUC 或 class name hydration mismatch；CSS bundle 太大（未 purge）；設計 token 在不同元件中不一致（沒有 token 系統）；Web Component 樣式洩漏到外部（Shadow DOM 未正確設定）。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>DevTools Coverage panel 找未使用 CSS；DevTools Computed 看 specificity 來源；bundle analyzer 看 CSS runtime 大小；Lighthouse 的 Render-Blocking Resources 確認 CSS 載入策略；用 Node.js SSR 環境測試 CSS-in-JS 的 hydration 行為。</p>
  </div>
</div>

<h2 id="naming">9.1 命名方法論：BEM、SMACSS、OOCSS</h2>
<p>CSS 命名方法論的根本問題是「如何在全域 CSS 命名空間中避免衝突」。在沒有 scoping 工具的時代，命名約定是唯一的防線。三個主流方法論各有核心思想：</p>

<p><strong>BEM（Block Element Modifier）</strong>：<code>block__element--modifier</code>。Block 是獨立的元件（<code>.card</code>），Element 是 block 的一部分（<code>.card__title</code>），Modifier 是狀態或變體（<code>.card--featured</code>）。長處：命名清楚表達 DOM 層級關係，避免意外繼承，易於定位樣式來源。短處：class name 冗長，但這在 CSS Modules / Tailwind 的時代已不是問題。</p>

<p><strong>SMACSS（Scalable and Modular Architecture for CSS）</strong>：把 CSS 分為五個類別：Base（元素預設）、Layout（頁面骨架）、Module（可重複用的 UI 元件）、State（狀態，如 <code>.is-active</code>）、Theme（主題變化）。貢獻在於讓 CSS 有「分層責任」，不同類別的規則清楚分離。</p>

<p><strong>OOCSS（Object-Oriented CSS）</strong>：兩個原則：<strong>結構與皮膚分離</strong>（<code>.btn</code> 定義結構，<code>.btn--primary</code> 定義皮膚）、<strong>容器與內容分離</strong>（<code>.title</code> 的樣式不應依賴它在哪個容器內）。這是現代 utility-first CSS（Tailwind）的思想先驅。</p>

${code('css', `/* BEM 命名範例 */
/* Block：獨立元件 */
.card { }

/* Element：Block 的一部分，用雙底線 */
.card__image { }
.card__title { }
.card__body  { }
.card__footer { }

/* Modifier：狀態或變體，用雙破折號 */
.card--featured { }
.card--horizontal { }
.card__title--large { }

/* ❌ 不要這樣做：過度巢狀讓 specificity 升高 */
.card .card__title .card__title__link { }

/* ✅ BEM 保持扁平，靠命名而非巢狀表達層級 */
.card__title-link { }

/* SMACSS 分類示範 */
/* base.css：元素預設，低 specificity */
a { color: var(--color-action); text-decoration: none; }
button { cursor: pointer; }

/* layout.css：頁面骨架，用 .l- 或 .layout- 前綴 */
.l-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.l-sidebar   { width: 260px; flex-shrink: 0; }

/* module.css：可重複用的 UI 元件 */
.btn { display: inline-flex; align-items: center; gap: 8px; }

/* state.css：狀態，用 .is- 或 .has- 前綴 */
.is-active   { color: var(--color-action); }
.is-disabled { opacity: 0.4; pointer-events: none; }
.has-error   { border-color: var(--color-error); }

/* OOCSS：結構與皮膚分離 */
.btn {
  /* 結構：所有 button 共用 */
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 6px;
  font-weight: 700;
}
.btn--primary { background: var(--color-action); color: white; }
.btn--ghost   { background: transparent; border: 1px solid currentColor; }
.btn--danger  { background: var(--color-error); color: white; }`)}

<h2 id="css-in-js-modules-utility">9.2 CSS-in-JS vs CSS Modules vs Utility-first</h2>
<p>這三種方案代表了三種截然不同的 CSS 組織哲學，每種都在解決不同的核心問題：</p>

<p><strong>CSS-in-JS（styled-components、Emotion）</strong>：把 CSS 寫在 JavaScript 中，以元件為單位管理樣式。優點：完整的 JavaScript 動態能力（依 props 切換樣式）、自動作用域（不用 BEM）、no dead CSS。缺點：<strong>runtime 成本</strong>（在 JS 主執行緒生成 class name 並注入 <code>&lt;style&gt;</code>）、SSR hydration 複雜（需要 SSR 時的 style 收集）、bundle 中帶著 runtime library（styled-components ~12kB）。</p>

<p><strong>Zero-runtime CSS-in-JS（Vanilla Extract、Linaria）</strong>：CSS 在 build time 生成靜態 CSS 文件，zero runtime cost。Vanilla Extract 使用 TypeScript 語法寫 CSS，並自動生成 scoped class names，結合了 CSS-in-JS 的類型安全和靜態 CSS 的性能。</p>

<p><strong>CSS Modules</strong>：在 CSS 文件層面做 local scoping，build time 生成 hash 化的 class names。不帶 runtime，但也不能依賴 JavaScript 動態值。最適合「不想換 CSS 語法，只想解決命名衝突」的場景。</p>

<p><strong>Utility-first（Tailwind CSS）</strong>：只有小型的 single-purpose classes（<code>p-4</code>、<code>text-blue-500</code>、<code>hover:bg-gray-100</code>），直接在 HTML 上組合。優點：幾乎不寫 custom CSS、specificity 幾乎相同、purge 後 CSS 極小。缺點：HTML class 屬性冗長、設計 token 的靈活性受限於 Tailwind config。</p>

${code('typescript', `/* styled-components（runtime CSS-in-JS）*/
import styled from 'styled-components';

const Card = styled.div<{ featured?: boolean }>\`
  padding: 16px;
  border-radius: 8px;
  background: \${props => props.featured ? '#1769ff' : '#f6f8fa'};
  color: \${props => props.featured ? 'white' : '#1f2328'};
\`;
/* 優點：完整的 props 動態能力
   缺點：每次 render 計算樣式，SSR 需要 style 收集 */`)}

${code('typescript', `/* Vanilla Extract（zero-runtime）*/
// styles.css.ts — 在 build time 生成靜態 CSS
import { style, createVar } from '@vanilla-extract/css';

export const cardBg = createVar();  /* CSS variable */

export const card = style({
  padding: '16px',
  borderRadius: '8px',
  background: cardBg,
  /* TypeScript 完整類型檢查！ */
  ':hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  '@media': {
    '(min-width: 768px)': { padding: '24px' }
  }
});

// 使用時
import { card, cardBg } from './styles.css';
/* 生成的 class name 是靜態的 hash，zero runtime */`)}

${code('css', `/* CSS Modules（.module.css）*/
/* card.module.css */
.card { padding: 16px; border-radius: 8px; }
.card.featured { background: #1769ff; color: white; }

/* TypeScript 使用 */
/* import styles from './card.module.css'
   <div className={styles.card}>...</div>
   生成：<div class="card_abc123">...</div> */`)}

${code('html', `<!-- Tailwind CSS utility-first -->
<!-- 不寫 custom CSS，直接在 HTML 組合 -->
<div class="p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow
            dark:bg-gray-900 dark:text-gray-100
            md:p-6 lg:flex lg:gap-4">
  <img class="w-full rounded md:w-48 md:shrink-0 aspect-video object-cover" />
  <div class="mt-4 md:mt-0">
    <h2 class="text-lg font-bold text-gray-900 dark:text-white">標題</h2>
    <p class="mt-2 text-gray-600 dark:text-gray-400 line-clamp-3">描述文字</p>
  </div>
</div>`)}

${diagram(`
graph TD
    subgraph Comparison["CSS 架構方案比較"]
        direction LR
        subgraph Method["方案"]
            BEM["BEM / SMACSS\n命名約定"]
            Modules["CSS Modules\nBuild-time scoping"]
            InJS["CSS-in-JS\nRuntime scoping"]
            ZeroRT["Zero-runtime\nVanilla Extract"]
            Utility["Utility-first\nTailwind"]
        end
        subgraph Tradeoffs["特性"]
            RunCost["Runtime 成本"]
            TypeSafe["TypeScript 支援"]
            Dynamic["動態樣式"]
            SSR["SSR 友善"]
            BundleSize["Bundle 大小"]
        end
    end
    BEM --- RunCost --- Utility
    Modules --> TypeSafe
    InJS --> Dynamic
    ZeroRT --> TypeSafe
    ZeroRT --> SSR
    Utility --> BundleSize
`, 'CSS 架構方案沒有「最好」的，只有「最適合當前約束」的。選型時要同時考慮 SSR、bundle、DX、設計系統整合。')}

<div class="callout">
  <div class="callout-title">Senior 觀點：方案選型的判斷條件</div>
  <p>
    <strong>選 CSS Modules</strong>：不想改 CSS 語法、需要 SSR 性能、team 熟悉傳統 CSS。<br>
    <strong>選 Tailwind</strong>：快速開發、prototype 優先、不需要高度客製化的設計系統、團隊接受 utility 模式。<br>
    <strong>選 Vanilla Extract</strong>：需要 TypeScript 類型安全、需要 zero runtime、需要複雜 design token。<br>
    <strong>選 styled-components/Emotion</strong>：現有 codebase 已採用、需要 props 動態樣式、SSR 性能不是瓶頸。<br>
    <strong>避免</strong>：在一個專案中混用多種方案，除非是漸進遷移。
  </p>
</div>

<h2 id="constructable-stylesheets">9.3 Constructable Stylesheets 與 Shadow DOM 整合</h2>
<p><strong>Constructable Stylesheets</strong>（<code>CSSStyleSheet</code> constructor）讓你用 JavaScript 建立 CSS 樣式表物件，並透過 <code>adoptedStyleSheets</code> 把它附加到 Document 或 Shadow Root。這個 API 的核心價值在 Web Components 的 style sharing：多個 Shadow Root 可以共享同一個 <code>CSSStyleSheet</code> 實例，瀏覽器只解析一次、記憶體只存一份，是傳統「每個元件各自注入 <code>&lt;style&gt;</code>」方式的效率替代品。</p>

<p>在 Web Components 的世界中，樣式封裝是雙向的：<strong>外部樣式不能進入 Shadow DOM</strong>（CSS 隔離），<strong>Shadow DOM 內的樣式不能洩漏到外部</strong>（CSS 封裝）。這讓元件真正獨立，但也讓主題化（theming）變得複雜——<strong>CSS Custom Properties 是目前唯一能穿透 Shadow DOM 的樣式機制</strong>，設計系統的 token 應通過 custom properties 暴露給 Shadow DOM 元件消費。</p>

${code('javascript', `/* Constructable Stylesheets：建立共享樣式 */
const sharedSheet = new CSSStyleSheet();
sharedSheet.replaceSync(\`
  :host {
    display: block;
    box-sizing: border-box;
  }
  :host([hidden]) { display: none; }
  button {
    padding: 8px 16px;
    background: var(--color-action, #0a84ff);  /* CSS variable 可穿透 Shadow */
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
\`);

/* 多個 Web Component 共享同一個 CSSStyleSheet */
class MyButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    /* 共享已解析的 stylesheet，不重複解析 */
    this.shadowRoot.adoptedStyleSheets = [sharedSheet];
    this.shadowRoot.innerHTML = \`<button><slot></slot></button>\`;
  }
}

class MyIconButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    /* 共享基礎樣式 + 加入元件特定樣式 */
    const iconSheet = new CSSStyleSheet();
    iconSheet.replaceSync(\`button { gap: 8px; display: inline-flex; }\`);
    this.shadowRoot.adoptedStyleSheets = [sharedSheet, iconSheet];
    this.shadowRoot.innerHTML = \`<button><slot name="icon"></slot><slot></slot></button>\`;
  }
}`)}

${code('css', `/* CSS Custom Properties 穿透 Shadow DOM 實現 Theming */

/* 主題在外部文件定義 */
:root {
  --color-action: #0969da;
  --color-action-hover: #0550ae;
  --radius-btn: 6px;
}

[data-theme="dark"] {
  --color-action: #58a6ff;
  --color-action-hover: #79b8ff;
}

/* Web Component 內部使用 custom properties */
/* (:host 是 Shadow Root 的元素本身) */
/* 在 Shadow DOM 內的 CSS 裡寫 var(--color-action) */
/* 會自動繼承外部文件的 token 值 */

/* CSS Parts：讓外部可以精確地樣式化 Shadow DOM 的特定部分 */
/* 在 Web Component 的 HTML 中：<button part="btn">... */
/* 外部 CSS 可以這樣樣式化：*/
my-button::part(btn) {
  font-family: 'Brand Font', system-ui;
  letter-spacing: 0.02em;
  /* 注意：只有被 part 暴露的元素才能被外部樣式化 */
}`)}

${diagram(`
graph TD
    subgraph ShadowDOM["Shadow DOM 樣式邊界"]
        External["外部文件\n.card { } .btn { }"]
        CustomProps["CSS Custom Properties\n--color-action: #0a84ff\n（唯一能穿透的機制）"]
        Shadow1["Shadow Root 1\n:host { }\nbutton { }"]
        Shadow2["Shadow Root 2\n:host { }\nbutton { }"]
        Parts["::part() API\n讓外部樣式化指定部位"]
        AdoptedSheets["adoptedStyleSheets\n多個 Shadow Root 共享"]
    end
    External -. "❌ 無法進入" .-> Shadow1
    External -. "❌ 無法進入" .-> Shadow2
    External -- "✓ 可以穿透" --> CustomProps --> Shadow1 & Shadow2
    External -- "✓ 精確樣式化" --> Parts --> Shadow1
    AdoptedSheets --> Shadow1 & Shadow2
`, 'Shadow DOM 提供雙向 CSS 隔離，CSS Custom Properties 和 ::part() 是兩種官方認可的「穿透」方式。')}

<h2 id="css-architecture-principles">CSS 架構的核心原則</h2>
<p>無論選擇哪種工具，優良的 CSS 架構都遵守以下原則：</p>

${code('css', `/* 原則 1：低 specificity，高可覆寫性 */
/* 用 :where() 讓 base styles 不增加 specificity */
:where(h1, h2, h3, h4, h5, h6) {
  line-height: 1.2;
  font-weight: 700;
}
/* 任何一般 selector 都能覆寫上面的規則 */

/* 原則 2：CSS Custom Properties 作為設計 token */
/* token 在最外層定義，元件只引用 token */
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
}
.card {
  padding: var(--space-4);  /* ✅ 引用 token */
  /* ❌ 避免 padding: 16px; — 魔法數字，難以全局調整 */
}

/* 原則 3：Cascade Layers 讓覆寫有明確順序 */
@layer reset, tokens, components, utilities, page;
/* page 層可以覆寫所有 component 層，無需提升 specificity */

/* 原則 4：元件作用域 */
/* 選擇適合 team 的方式：BEM 命名、CSS Modules、Shadow DOM */
/* 重要的是一致性，不是工具選擇 */

/* 原則 5：容器響應（Container Query）優於全局查詢 */
.product-card {
  container-type: inline-size;
  /* 元件自行處理響應式，使用端不需要知道細節 */
}

/* 原則 6：尊重使用者偏好 */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
@media (prefers-color-scheme: dark) {
  :root { --color-bg: #0d1117; }
}`)}

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
