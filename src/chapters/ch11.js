import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 11)

const prev = chapters.find(c => c.id === 10)
const next = chapters.find(c => c.id === 12)

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
  <div class="chapter-num">Chapter 11 · Performance</div>
  <h1>Font 載入與字型優化</h1>
  <p>Web font 是一個獨特的效能問題：它同時影響<strong>視覺穩定性（CLS）</strong>、<strong>可讀性體感（FOIT/FOUT）</strong>、與<strong>頁面載入速度</strong>。字型下載延遲會讓文字暫時隱形（FOIT：Flash of Invisible Text）或閃爍替換（FOUT：Flash of Unstyled Text）。選擇正確的 <code>font-display</code> 策略、搭配 metric override 讓 fallback font 幾何對齊 web font、並用 <code>preload</code> 提前啟動下載，是 Senior 工程師能精準控制字型體驗的三把鑰匙。</p>
  <div class="chapter-tags">
    <span class="tag">performance</span>
    <span class="tag">font</span>
    <span class="tag">cls</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 <code>font-display: swap</code> vs <code>optional</code> 的差異（swap 有 FOUT，optional 若首次渲染前未下載完則放棄使用 web font）；能解釋 <code>size-adjust</code>、<code>ascent-override</code> 等 metric override 屬性如何用來對齊 fallback font，防止字體切換引發 CLS；能說出 <code>&lt;link rel="preload" as="font" crossorigin&gt;</code> 漏寫 <code>crossorigin</code> 會造成什麼問題（字型會被下載兩次）；能說出 Variable Fonts 如何讓一個檔案涵蓋多種 weight/width。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p><code>font-display</code> 控制「等待期間的降級策略」：<code>block</code> 最多等 3s（FOIT）；<code>swap</code> 無限等（FOUT）；<code>fallback</code> 等 0.1s 後若仍未好則顯示 fallback，最多等 3s 才換；<code>optional</code> 幾乎只信任 cache，不信任慢速下載。配合 metric override 讓各策略的視覺跳動最小化。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>新聞/內容網站優先閱讀體驗 → <code>font-display: optional</code>（不讓字型影響版面穩定性）。品牌識別重要的行銷頁 → <code>swap</code>（接受 FOUT，堅持使用品牌字型）。系統 UI / dashboard → 考慮系統字型堆疊，完全不依賴 web font。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>CLS 分數差但找不到明顯的元素移動 → 字體切換是常見隱藏原因；Lighthouse 顯示 "Ensure text remains visible during webfont load"；Google Fonts 在 critical rendering path 上造成 TTFB 增加（需改為自託管）；字體資源被下載兩次（preload 缺少 crossorigin）。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>Chrome DevTools Network 面板確認字型下載時序；Performance 面板查看 Layout Shift 的 source（字型切換會顯示相關 event）；<code>document.fonts.ready</code> Promise 在字型載入後 resolve；Font Style Matcher 工具計算 metric override 的精確值。</p>
  </div>
</div>

<h2 id="font-loading">11.1 Font Loading 全景</h2>
<p>瀏覽器的字型載入分為三個階段：<strong>CSSOM 解析時</strong>發現 <code>@font-face</code> 規則；<strong>渲染樹建構時</strong>判斷是否有元素實際使用該字型（若沒有就不下載）；<strong>使用時</strong>才觸發下載（稱為 lazy loading by default）。這個「用到才下載」的策略意味著字型下載常常很晚才開始，對 LCP 和可讀性都是威脅。</p>

<p><code>font-display</code> descriptor 在 <code>@font-face</code> 中控制等待期間的行為。它定義了兩個時間窗：<strong>block period</strong>（文字不可見，等待字型）和 <strong>swap period</strong>（顯示 fallback，繼續等待字型）：</p>

${diagram(`
graph LR
    subgraph Timeline["font-display 各策略時間線示意"]
        direction LR
        B["<b>block</b>\n隱形 3s\n→ 換字型（無限期）"]
        S["<b>swap</b>\n隱形 ~0ms\n→ fallback 顯示\n→ 換字型（無限期）"]
        F["<b>fallback</b>\n隱形 0.1s\n→ fallback 顯示\n→ 換字型（3s 內）\n→ 放棄"]
        O["<b>optional</b>\n隱形 0.1s\n若 cache 命中就換\n否則不換（本次）"]
    end
    B -. "最大 FOIT\nCLS 風險中等" .-> B
    S -. "有 FOUT\nCLS 風險中高" .-> S
    F -. "FOUT 短暫\nCLS 風險低" .-> F
    O -. "無 FOUT\nCLS 風險最低" .-> O
`, 'font-display 五個值在 Block Period 和 Swap Period 的長度不同，決定 FOIT 或 FOUT 的嚴重程度。')}

${code('css', `/* 基本 @font-face 宣告 */
@font-face {
  font-family: 'Brand Sans';
  /* 先 WOFF2（現代瀏覽器），再 WOFF（舊版 fallback） */
  src: url('/fonts/brand-sans-400.woff2') format('woff2'),
       url('/fonts/brand-sans-400.woff')  format('woff');
  font-weight: 400;
  font-style: normal;
  /* unicode-range：只下載頁面實際用到的字元範圍 */
  unicode-range: U+0000-00FF, U+0131, U+0152-0153;
  /* CLS 最安全的策略：首次渲染不等 web font */
  font-display: optional;
}

/* Bold weight */
@font-face {
  font-family: 'Brand Sans';
  src: url('/fonts/brand-sans-700.woff2') format('woff2');
  font-weight: 700;
  font-display: optional;
}

/* Variable Font：一個檔案涵蓋所有 weight (100-900) */
@font-face {
  font-family: 'Brand Sans VF';
  src: url('/fonts/brand-sans-variable.woff2') format('woff2-variations');
  font-weight: 100 900;    /* 宣告支援的 weight 範圍 */
  font-stretch: 75% 125%;  /* 宣告支援的 stretch 範圍 */
  font-display: swap;
}

/* 使用 variable font 的 weight axis */
.heading { font-family: 'Brand Sans VF'; font-weight: 750; }
.body    { font-family: 'Brand Sans VF'; font-weight: 420; }
/* 傳統字型只能選整百，VF 可以精確到任意值 */`)}

<fe-demo-suite demo="font-display"></fe-demo-suite>

<h2 id="formats-subsetting">11.2 Font Format 與 Subsetting</h2>
<p>字型格式選擇直接影響下載時間。<strong>WOFF2</strong>（Web Open Font Format 2.0）是現代 web 字型的首選格式，使用 Brotli 壓縮，比 TTF 小 30-50%，現代瀏覽器（>96% 覆蓋率）全部支援。TTF/OTF 則是桌面字型格式，不建議直接用於 web（體積大）。</p>

<p><strong>Unicode Range Subsetting</strong>：CJK（中日韓）字型通常包含數萬個字元，完整字型檔往往超過 10MB。透過 <code>unicode-range</code> descriptor 搭配預先切割的子集（subset），瀏覽器只下載頁面中實際出現的字元所在的 subset 檔。Google Fonts 對中文字型採用此策略，自動生成 100+ 個子集，每個 subset 只在被用到時才下載。</p>

${code('css', `/* CJK 字型的 unicode-range subsetting */
/* Google Fonts 做法：把中文字型切成 100+ 個小包，每包約 20-30kB */
/* 瀏覽器只下載頁面中實際出現的字元所在的 subset */

/* 假設自己切割：常用漢字子集 */
@font-face {
  font-family: 'Noto Sans TC';
  src: url('/fonts/noto-tc-common.woff2') format('woff2');
  /* 只包含最常用的漢字（Big5 常用字） */
  unicode-range: U+4E00-9FFF, U+3400-4DBF;
  font-display: swap;
}

@font-face {
  font-family: 'Noto Sans TC';
  src: url('/fonts/noto-tc-latin.woff2') format('woff2');
  /* 英文 + 標點，最先用到，應 preload */
  unicode-range: U+0000-00FF, U+0370-03FF;
  font-display: swap;
}

/* Variable Font 的 design axes 使用範例 */
.brand-text {
  font-family: 'Brand Sans VF', sans-serif;
  /* font-variation-settings 精確控制 variable axes */
  font-variation-settings:
    'wght' 650,   /* weight axis */
    'wdth' 110,   /* width axis */
    'opsz' 32;    /* optical size axis */
}`)}

<h2 id="optional-cls">11.3 font-display: optional 與 CLS 防範</h2>
<p>在 Core Web Vitals 的 CLS（Cumulative Layout Shift）考量下，<code>font-display: optional</code> 是避免字型切換引發版面位移最安全的策略：若字型在瀏覽器開始第一次渲染前已在 cache 中，就使用它；否則本次頁面訪問使用 fallback font，不再切換。這徹底避免了 FOUT。</p>

<p>但 <code>optional</code> 並不完整：fallback font 和 web font 的字元間距、行高、字元寬度往往不同，即使不切換字型，只要 fallback 和 web font 的<strong>幾何不一致</strong>，CLS 仍然可能發生（因為第二次訪問時切換到 web font，版面位移）。解決方案是 <strong>Metric Override Descriptors</strong>：調整 fallback font 的 ascent、descent、line gap、字元寬度，使其與 web font 在視覺上儘量對齊。</p>

${code('css', `/* Metric Override：讓 fallback font 幾何對齊 web font */
/* 使用 Font Style Matcher (meowni.ca/font-style-matcher) 計算精確值 */

@font-face {
  font-family: 'Brand Sans Fallback';
  /* 以系統字型作為 fallback 基礎 */
  src: local('Arial');
  /* Metric overrides：調整 fallback font 使其幾何接近 Brand Sans */
  size-adjust: 104.5%;      /* 放大/縮小字元寬度 */
  ascent-override: 90%;     /* 調整字元上方空間 */
  descent-override: 22%;    /* 調整字元下方空間 */
  line-gap-override: 0%;    /* 消除額外行距 */
}

body {
  /* 先用對齊後的 fallback，再換成 web font */
  font-family: 'Brand Sans', 'Brand Sans Fallback', Arial, sans-serif;
}

/* 效果：即使 font swap 發生，文字幾乎不移動，CLS ≈ 0 */

/* 完整實作流程 */
/* 步驟 1：使用 Font Style Matcher 找到最接近 web font 的系統字型和 override 值 */
/* 步驟 2：定義 adjusted fallback @font-face */
/* 步驟 3：font-family 堆疊：web font → adjusted fallback → generic fallback */
/* 步驟 4：配合 font-display: swap 讓 FOUT 有但版面不跳 */`)}

<h2 id="preload-font">11.4 Preload 字型的最佳實踐</h2>
<p>字型的「用到才下載」預設行為意味著，瀏覽器需要：(1) 下載並解析 HTML，(2) 解析 CSS 並建立 CSSOM，(3) 建立 Render Tree，(4) 確認某個元素有使用此字型，<strong>才開始下載字型</strong>。這個延遲在 3G 網路上可能超過 1 秒。</p>

<p>解決方案是 <strong><code>&lt;link rel="preload" as="font" crossorigin&gt;</code></strong>：在 HTML <code>&lt;head&gt;</code> 中明確告訴瀏覽器「這個字型在本頁一定會用到，請提前下載」。<strong>注意：<code>crossorigin</code> 屬性是必要的</strong>，即使字型來自同一個 origin——因為字型的 CORS 處理機制要求它。漏寫 <code>crossorigin</code> 會導致 preload 請求和後來真正使用字型時的請求被視為不同請求，字型<strong>下載兩次</strong>。</p>

${code('html', `<head>
  <!-- ✅ 正確：preload 關鍵字型，一定要有 crossorigin -->
  <link rel="preload"
        href="/fonts/brand-sans-400.woff2"
        as="font"
        type="font/woff2"
        crossorigin />

  <!-- ✅ Variable Font：只有一個檔案需要 preload -->
  <link rel="preload"
        href="/fonts/brand-sans-variable.woff2"
        as="font"
        type="font/woff2"
        crossorigin />

  <!-- ✅ 第三方字型 CDN：先 preconnect，讓 TCP/TLS 提前建立 -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <!-- ❌ 漏寫 crossorigin：字型被下載兩次 -->
  <link rel="preload" href="/fonts/bad.woff2" as="font" type="font/woff2" />

  <!-- 字型 CSS 可以不 blocking render（media trick）-->
  <link rel="stylesheet" href="/fonts.css" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="/fonts.css" /></noscript>
</head>`)}

${diagram(`
sequenceDiagram
    participant HTML
    participant CSS
    participant Font as 字型檔案
    participant Render as 渲染
    Note over HTML,Render: 無 preload（預設行為）
    HTML->>CSS: 下載 CSS
    CSS->>CSS: 解析 @font-face
    CSS->>Render: CSSOM 完成，開始渲染
    Render->>Font: 發現元素使用字型，才開始下載
    Font-->>Render: 字型就緒（延遲 1-3s）
    Note over HTML,Render: 有 preload
    HTML->>Font: 立即觸發字型下載（與 CSS 並行）
    HTML->>CSS: 同時下載 CSS
    CSS-->>Render: CSSOM 完成
    Font-->>Render: 字型比 CSSOM 晚不了多少
`, 'preload 讓字型下載與 CSS 解析並行，大幅縮短字型等待時間。')}

<div class="callout">
  <div class="callout-title">Google Fonts 自託管 vs CDN</div>
  <p><strong>Google Fonts CDN 的隱藏成本</strong>：瀏覽器需要解析 <code>fonts.googleapis.com</code> 和 <code>fonts.gstatic.com</code> 兩個域名（各需 DNS + TCP + TLS），且因為 HTTP cache partitioning（Chrome 86+），不同網站之間的 Google Fonts 快取不再共享，「共用 CDN 字型已被快取」的優勢已消失。<strong>建議</strong>：將字型下載到自己的伺服器或 CDN 自託管，省去跨域解析成本，並搭配長期快取 header。</p>
</div>

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
