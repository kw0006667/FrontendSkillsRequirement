import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 8)

const prev = chapters.find(c => c.id === 7)
const next = chapters.find(c => c.id === 9)

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
  <div class="chapter-num">Chapter 08 · CSS</div>
  <h1>響應式設計與現代 CSS</h1>
  <p>RWD（Responsive Web Design）已從 2010 年代的「斷點切換版面」演進成一套整合能力查詢、偏好查詢、容器查詢與使用者設定的完整系統。現代 RWD 的目標不只是「在手機上看起來正確」，而是讓介面能響應裝置能力（觸控 vs 滑鼠）、使用者偏好（深色模式、動態減少）、以及元件自身的容器尺寸。新的 CSS 動畫 API（scroll-driven animations、View Transitions）則把動態效果從 JavaScript 移回 CSS 的聲明式世界。</p>
  <div class="chapter-tags">
    <span class="tag">css</span>
    <span class="tag">rwd</span>
    <span class="tag">animations</span>
    <span class="tag">dark-mode</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 <code>prefers-reduced-motion</code> 應該做什麼而不是什麼（不是禁止所有動畫，而是用 instant 替換 easing）；能解釋為何 <code>transform</code> 和 <code>opacity</code> 是「animation safe」屬性（只觸發 composite，不觸發 layout/paint）；能說出 View Transitions API 如何用 CSS 實作跨頁面的動畫切換；能說出 <code>@media (hover: hover)</code> 在觸控裝置上的真正意義；能說出防止 dark mode FOUC 的方法。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>把現代 RWD 想成三層響應：<strong>Viewport 層</strong>（@media 斷點、視窗尺寸）→ <strong>容器層</strong>（@container，元件響應自身空間）→ <strong>能力/偏好層</strong>（@media 能力查詢：hover、prefers-*）。三層各司其職，不互相替代。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>Chat App 要在手機底部 nav 不被 browser chrome 遮住（dvh + safe-area-inset）；Enterprise Dashboard 要支援深色模式（CSS variables + prefers-color-scheme）；Landing Page 要有流暢的滾動動畫（scroll-driven animations）但需要 <code>prefers-reduced-motion</code> 降級方案。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>手機版頁面有一塊莫名的白色空白（safe-area-inset 未設）；深色模式下圖片或 icon 對比度太低（沒有為 dark mode 提供替代資源）；頁面切換沒有動畫感覺生硬（缺少 View Transitions）；滾動觸發的動畫在慢速裝置上造成 jank（未用 compositor-only 屬性）。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>DevTools Rendering 面板可模擬 <code>prefers-color-scheme</code> 和 <code>prefers-reduced-motion</code>；在真實 iOS Safari 測試 dvh 行為；用 DevTools Layers 面板確認動畫是否只在 compositor layer 上執行；用 Performance panel 的 Frame Timeline 確認動畫無 layout 或 paint。</p>
  </div>
</div>

<h2 id="media-queries">8.1 Media Queries 演進</h2>
<p>Media queries 從最初的 <code>min-width</code>/<code>max-width</code>（尺寸查詢）演進到能查詢裝置能力（hover、pointer）和使用者偏好（prefers-*）。<strong>Range syntax</strong>（Level 4）讓 <code>@media (width >= 768px)</code> 取代 <code>@media (min-width: 768px)</code>，更直觀。</p>

<p>對 RWD 最重要的「能力查詢」：</p>
<ul>
  <li><code>@media (hover: hover)</code>：裝置有精確的懸停能力（滑鼠），觸控裝置回傳 <code>none</code>。這是區分觸控與滑鼠體驗的正確方法，不應用螢幕尺寸作為代理。</li>
  <li><code>@media (pointer: fine)</code>：有精確指標（滑鼠、觸控板），vs <code>coarse</code>（手指觸控）。用來決定按鈕尺寸（touch target 最小 44px）。</li>
  <li><code>@media (prefers-reduced-motion: reduce)</code>：使用者在 OS 設定了「減少動態效果」，應大幅簡化或關閉動畫。</li>
  <li><code>@media (prefers-color-scheme: dark)</code>：系統深色模式。</li>
  <li><code>@media (forced-colors: active)</code>：Windows 高對比模式，UI 顏色被 OS 強制替換。</li>
</ul>

${code('css', `/* Range syntax（Level 4）：更直觀的尺寸查詢 */
/* ❌ 舊式 */
@media (min-width: 768px) and (max-width: 1279px) { }

/* ✅ 新式 Range syntax */
@media (768px <= width < 1280px) { }

/* 能力查詢：區分觸控與滑鼠 */
/* ❌ 錯誤做法：用螢幕尺寸判斷輸入方式 */
@media (min-width: 1024px) { .row-action { opacity: 0; } }

/* ✅ 正確做法：用 hover 能力判斷 */
@media (hover: hover) and (pointer: fine) {
  .row-action { opacity: 0; transition: opacity 0.15s; }
  .data-row:hover .row-action { opacity: 1; }
}

/* 觸控裝置：確保 touch target 夠大 */
@media (pointer: coarse) {
  .nav-link {
    min-height: 44px;  /* iOS HIG 最小觸控目標 */
    display: flex;
    align-items: center;
  }
}

/* 整合偏好查詢：全域動畫控制 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* forced-colors：高對比模式相容 */
@media (forced-colors: active) {
  .custom-checkbox {
    /* 不要用 background 設顏色，OS 會強制替換 */
    /* 用 border 來確保可見 */
    border: 2px solid ButtonText;
  }
}`)}

<div class="callout">
  <div class="callout-title">手機 RWD 的三個常被忽略的細節</div>
  <p>1. <strong>Safe Area Inset</strong>：iPhone 的瀏海/圓角/Home bar 會遮住內容，用 <code>padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)</code> 留出安全區域，需要在 <code>&lt;meta name="viewport"&gt;</code> 加 <code>viewport-fit=cover</code>。<br>
  2. <strong>Mobile keyboard</strong>：在 iOS 上，虛擬鍵盤彈出時 viewport 會縮小，<code>dvh</code> 會因此縮小，固定元素可能跑掉。需要特別處理 <code>visualViewport</code> API。<br>
  3. <strong>Overscroll bounce</strong>：iOS 的橡皮筋效果讓 <code>overflow: hidden</code> 的容器也可能捲動，<code>overscroll-behavior: none</code> 可停用。</p>
</div>

<h2 id="dark-mode">8.2 Dark Mode 與 Theming</h2>
<p>Dark mode 的正確實作不是「把背景改成黑色、文字改成白色」，而是一套基於 <strong>design token</strong> 的主題系統。核心原則：把顏色定義為「語意 token」（<code>--color-surface</code>、<code>--color-text-primary</code>、<code>--color-action</code>），light/dark 模式只改 token 的值，所有元件自動更新。</p>

<p><strong>FOUC（Flash of Unstyled Content）防範</strong>：若允許使用者手動切換主題（且要記住偏好），初始載入時必須在 <code>&lt;head&gt;</code> 最前方執行一段 <strong>inline script</strong> 讀取 localStorage 的偏好並設定 <code>data-theme</code>，避免瀏覽器先用系統偏好渲染後又切換造成閃爍。<strong><code>color-scheme</code> property</strong> 告訴瀏覽器目前的主題，讓 browser chrome（scrollbar、input、select）也跟著調整。</p>

${code('css', `/* Dark Mode 的 token 架構 */
:root {
  color-scheme: light;
  /* Primitive tokens */
  --white: #ffffff;
  --gray-900: #0d1117;
  --blue-400: #58a6ff;
  --blue-600: #0969da;

  /* Semantic tokens */
  --color-bg:         var(--white);
  --color-surface:    #f6f8fa;
  --color-text:       #1f2328;
  --color-text-muted: #656d76;
  --color-action:     var(--blue-600);
  --color-border:     #d1d9e0;
}

/* 系統偏好：prefers-color-scheme */
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --color-bg:         var(--gray-900);
    --color-surface:    #161b22;
    --color-text:       #e6edf3;
    --color-text-muted: #8d96a0;
    --color-action:     var(--blue-400);
    --color-border:     #30363d;
  }
}

/* 使用者手動切換：data-theme 屬性 */
/* 優先於系統偏好（放在 prefers-color-scheme 後面覆蓋） */
[data-theme="light"] {
  color-scheme: light;
  --color-bg: var(--white);
  /* ... */
}
[data-theme="dark"] {
  color-scheme: dark;
  --color-bg: var(--gray-900);
  /* ... */
}

/* 所有元件只用 semantic token，自動響應主題 */
.card {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}`)}

${code('html', `<!-- FOUC 防範：在 <head> 最前方執行，避免主題閃爍 -->
<!DOCTYPE html>
<html>
<head>
  <!-- 在 stylesheet 之前執行，同步讀取 localStorage -->
  <script>
    (function() {
      const stored = localStorage.getItem('theme');
      const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = stored ?? system;
    })();
  </script>
  <link rel="stylesheet" href="/styles.css">
</head>`)}

<fe-demo-suite demo="darkmode"></fe-demo-suite>

<h2 id="animations">8.3 Animations 與 Transitions</h2>
<p><strong>Transition vs Animation</strong>：<code>transition</code> 是「屬性從 A 到 B 的補間」，由狀態變化觸發（hover、focus、class 切換）；<code>animation</code>（配合 <code>@keyframes</code>）是「預定義的時間軸動畫」，可以自動播放、循環。兩者都使用相同的 timing functions（<code>ease</code>、<code>linear</code>、<code>cubic-bezier()</code>）。</p>

<p><strong>Animation safe properties</strong>：<code>transform</code>（translate、rotate、scale）和 <code>opacity</code> 以及 GPU-accelerated 的 <code>filter</code>（在支援的情境）只觸發 <strong>Composite</strong> 階段，可以在 compositor thread 執行，不阻塞主執行緒，適合做 60fps 動畫。其他屬性（width、height、margin、background、box-shadow）會觸發 Layout 或 Paint，應謹慎大量使用。<code>will-change: transform</code> 提示瀏覽器提前把元素提升到獨立的 compositor layer，但過度使用會增加 GPU 記憶體壓力。</p>

${code('css', `/* ✅ Animation safe：只觸發 Composite */
.card {
  transform: translateY(0);
  opacity: 1;
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.card:hover {
  transform: translateY(-4px);  /* 不觸發 Layout！*/
  opacity: 0.92;
}

/* ❌ 避免動畫 width/height（觸發 Layout）*/
/* 改用 transform: scaleX() 模擬寬度變化 */
.progress-bar {
  transform-origin: left;
  transform: scaleX(var(--progress));  /* 0 到 1 */
  will-change: transform;              /* 提示瀏覽器準備 GPU layer */
}

/* @keyframes 動畫：進場動畫 */
@keyframes slide-in {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.notification {
  animation: slide-in 0.3s ease both;
}

/* Scroll-Driven Animations（2024 主流瀏覽器支援）*/
@keyframes fade-in-up {
  from { transform: translateY(30px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}

.scroll-reveal {
  animation: fade-in-up linear both;
  /* animation-timeline 讓動畫跟著捲動進度 */
  animation-timeline: view();
  animation-range: entry 0% entry 30%;
  /* 元素進入 viewport 時播放動畫，純 CSS！ */
}

/* 尊重 prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .scroll-reveal {
    animation: none;
    opacity: 1;
    transform: none;
  }
}`)}

<fe-demo-suite demo="animation"></fe-demo-suite>

${diagram(`
graph LR
    subgraph AnimPipeline["CSS 動畫的 Rendering Pipeline"]
        Style["Style\n套用規則"]
        Layout["Layout\n計算幾何"]
        Paint["Paint\n生成指令"]
        Composite["Composite\nGPU 合成"]
    end
    subgraph SafeProps["Animation-Safe 屬性"]
        T["transform ✓"]
        O["opacity ✓"]
        F["filter (GPU) ✓"]
    end
    subgraph CostlyProps["昂貴屬性"]
        W["width / height"]
        M["margin / padding"]
        B["background"]
        S["box-shadow"]
    end
    T & O & F --> Composite
    W & M --> Style --> Layout --> Paint --> Composite
    B & S --> Paint --> Composite
    style Composite fill:#4caf7d,color:white
    style Layout fill:#e8505b,color:white
`, 'transform 和 opacity 跳過 Layout 與 Paint 直接合成，是 60fps 動畫的首選屬性。')}

<div class="callout">
  <div class="callout-title">View Transitions API：CSS 跨頁動畫</div>
  <p>View Transitions API 讓 SPA 路由切換或頁面內容更新能有流暢的動畫過渡，只需極少的 JavaScript：</p>
  <pre><code>// JavaScript 觸發
await document.startViewTransition(() => updateDOM());
// CSS 定義動畫（預設是 cross-fade）
::view-transition-old(root) { animation: slide-out 0.3s ease; }
::view-transition-new(root) { animation: slide-in  0.3s ease; }</code></pre>
  <p>為特定元素加 <code>view-transition-name: hero-image</code>，可以讓該元素在新舊頁面之間「飛行」連接，無需手動計算位移。</p>
</div>

<h2 id="modern-css">8.4 現代 CSS 新特性總覽</h2>
<p>幾個 2022–2024 年普及的 CSS 特性，正在改變傳統的 JavaScript 依賴模式：</p>

<p><strong><code>:has()</code>（Parent Selector）</strong>：根據子元素或後繼元素的狀態改變父元素或前面元素的樣式。這是 CSS 歷史上第一個真正的「parent selector」，消除了大量的 JavaScript 狀態管理。例如：<code>.form:has(:invalid)</code>（表單有無效欄位時顯示提示）、<code>.card:has(img)</code>（有圖片的卡片去掉 padding）。</p>

<p><strong>CSS Nesting（Level 1）</strong>：讓 CSS 原生支援巢狀規則，類似 Sass/LESS。<code>&amp;</code> 代表父選擇器。這讓元件樣式可以完全封裝在一個 CSS 區塊內，無需重複類名。<strong><code>@scope</code></strong>：限制樣式只作用在特定的 DOM 子樹內，不向外洩漏，是 CSS Modules 等工具的原生替代品。<strong><code>@starting-style</code></strong>：為元素首次出現時（從 <code>display: none</code> 變為可見）提供初始樣式，讓 enter animation 不再需要 JavaScript 幫忙。<strong>Anchor Positioning</strong>：讓 tooltip、dropdown、popover 能相對於錨點元素定位，取代 Popper.js 等 library。</p>

${code('css', `/* :has() 實戰應用 */

/* 表單有無效欄位時顯示整體錯誤提示 */
.form-actions:has(~ .form-field:invalid) .error-summary {
  display: block;
}

/* 有圖片的卡片去掉 padding */
.card:has(> .card__image) {
  padding-top: 0;
}

/* 導覽欄有展開的子選單時改變背景 */
.nav:has(.dropdown[open]) {
  background: var(--color-bg-elevated);
}

/* CSS Nesting（原生，無需 Sass）*/
.card {
  background: var(--color-surface);
  border-radius: 8px;

  /* 巢狀子元素 */
  & .card__title {
    font-size: 1.1rem;
    font-weight: 700;
  }

  /* 巢狀狀態 */
  &:hover {
    box-shadow: var(--shadow-md);
  }

  /* 巢狀 media query */
  @media (min-width: 768px) {
    padding: 24px;
  }
}

/* @scope：限制樣式作用範圍 */
@scope (.card) {
  /* 只影響 .card 內的 .title，不洩漏到外部 */
  .title { font-size: 1.1rem; }
  .desc  { color: var(--color-text-muted); }
}

/* @starting-style：enter animation */
.popover {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.2s, transform 0.2s;

  @starting-style {
    /* 元素首次出現時的初始狀態 */
    opacity: 0;
    transform: translateY(-8px);
  }
}

/* Anchor Positioning：tooltip 不需要 Popper.js */
.tooltip-trigger {
  anchor-name: --my-trigger;
}
.tooltip {
  position: absolute;
  position-anchor: --my-trigger;
  top: anchor(bottom);             /* 定位在錨點的底部 */
  left: anchor(center);            /* 水平對齊錨點中心 */
  translate: -50% 8px;
}`)}

${diagram(`
graph TD
    subgraph ModernCSS["現代 CSS 新特性（取代 JS 的場景）"]
        Has[":has()\nParent selector\n取代 class toggling"]
        Nesting["CSS Nesting\n原生巢狀\n取代 Sass/LESS"]
        Scope["@scope\n樣式隔離\n取代 CSS Modules"]
        StartStyle["@starting-style\nEnter animation\n取代 JS class toggle"]
        Anchor["Anchor Positioning\n相對定位\n取代 Popper.js"]
        ViewTrans["View Transitions\n跨頁動畫\n取代手動 FLIP"]
        ScrollDriven["Scroll-Driven Animations\n滾動動畫\n取代 IntersectionObserver"]
    end
`, '現代 CSS 正在把過去需要 JavaScript 才能做到的 UI 功能，納入聲明式的 CSS 系統。')}

<h2 id="mobile-rwd-checklist">RWD 與手機介面實戰 Checklist</h2>
<p>以下是現代手機 RWD 的關鍵實作要點，每一項都對應真實的 production 問題：</p>

${code('css', `/* ─── 手機 RWD 關鍵 Checklist ─── */

/* 1. App Shell 高度：用 dvh 而非 vh */
.app-shell {
  height: 100dvh;  /* 動態適配 browser chrome 顯示/隱藏 */
}

/* 2. Safe Area：處理瀏海和圓角 */
/* 需要 <meta name="viewport" content="...,viewport-fit=cover"> */
.header {
  padding-top: max(16px, env(safe-area-inset-top));
}
.bottom-nav {
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}

/* 3. Touch Target：最小 44x44px */
.btn {
  min-height: 44px;
  min-width: 44px;
}

/* 4. 防止意外縮放（iOS 在 focus 時自動縮放字體 >= 16px 的 input）*/
input, select, textarea {
  font-size: max(16px, 1rem);
}

/* 5. 捲動優化 */
.scroll-container {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* iOS 慣性滾動（舊版需要） */
  overscroll-behavior-y: contain;    /* 防止橡皮筋效果傳播到父容器 */
}

/* 6. 手機版隱藏滾動條 */
.scroll-x-mobile {
  overflow-x: auto;
  scrollbar-width: none;  /* Firefox */
  -ms-overflow-style: none;  /* IE */
}
.scroll-x-mobile::-webkit-scrollbar { display: none; }

/* 7. 圖片：避免意外拉伸 */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* 8. 字體響應式縮放 */
html {
  font-size: clamp(14px, 2.5vw, 18px);
  /* 小螢幕最小 14px，大螢幕最大 18px */
}

/* 9. 偏好查詢：尊重使用者設定 */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
@media (prefers-color-scheme: dark) {
  :root { color-scheme: dark; }
}`)}

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
