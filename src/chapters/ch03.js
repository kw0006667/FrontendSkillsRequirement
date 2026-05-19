import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 3)

const prev = chapters.find(c => c.id === 2)
const next = chapters.find(c => c.id === 4)

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
  <div class="chapter-num">Chapter 03 · HTML</div>
  <h1>語意化 HTML 與文件結構</h1>
  <p>語意化 HTML 的價值在於讓瀏覽器、搜尋引擎、輔助科技與維護者都讀得懂同一份文件。當你用 <code>&lt;div&gt;</code> 堆疊一切時，失去的不只是語意，而是整套免費的平台能力：無障礙樹、鍵盤導覽、搜尋索引、表單自動填入，以及逐漸重要的 LLM 爬蟲理解能力。</p>
  <div class="chapter-tags">
    <span class="tag">html</span>
    <span class="tag">a11y</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能解釋 <code>&lt;article&gt;</code> 與 <code>&lt;section&gt;</code> 的語意差異，以及為何 HTML5 Outline Algorithm 從未被瀏覽器實作、已從 spec 移除，讓「一頁只能一個 <code>&lt;h1&gt;</code>」的實踐規則再度成立；能說明三種 viewport（layout、visual、ideal）的數學關係；能比較 JSON-LD 與 Microdata，並說明 LLM-driven crawling 對結構化資料需求的影響。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>HTML 文件有三個讀者：<strong>瀏覽器</strong>（HTML content model 決定解析與渲染規則）、<strong>輔助科技</strong>（accessibility tree 提供 heading / landmark 導覽）、<strong>爬蟲</strong>（heading hierarchy 與 structured data 提供語意索引）。只有三個讀者都讀得懂，才算真正的語意化。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>新聞、電商、知識庫要拿 Google Rich Result（FAQ、Breadcrumb、Product）必須有正確結構化資料；政府與銀行需要 WCAG 2.1 AA 合規，heading 是審計第一項；SPA 路由切換後 heading 和 <code>document.title</code> 若不更新，視障用戶無從得知頁面變了。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>Google Search Console 報告「無法解析結構化資料」；Screen reader 用戶回報 heading 跳轉時找不到正確段落；手機版 viewport 寬度不符（meta viewport 設錯）；社群分享缺縮圖（Open Graph 未設定）；axe DevTools 報告 landmark 重疊或 heading 跳級。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>Chrome DevTools Accessibility panel 看 accessibility tree；<code>document.querySelectorAll('h1,h2,h3,h4,h5,h6')</code> 列出 heading 階層；<a href="https://validator.w3.org/" rel="noopener">W3C Validator</a> 驗語法；Google Rich Results Test 驗 structured data；<a href="https://wave.webaim.org/" rel="noopener">WAVE</a> 或 axe 找 a11y 問題。</p>
  </div>
</div>

<h2 id="outline-heading">3.1 Document Outline 與 Heading Hierarchy</h2>
<p>HTML5 引入了一個雄心勃勃的 <strong>Document Outline Algorithm</strong>：透過 <code>&lt;article&gt;</code>、<code>&lt;section&gt;</code>、<code>&lt;nav&gt;</code>、<code>&lt;aside&gt;</code> 等 sectioning content，理論上每個區段都可以重新從 <code>&lt;h1&gt;</code> 開始，瀏覽器依巢狀層級推斷正確的 heading 等級。設計初衷是讓 CMS widget 各自用 h1，整合進頁面時仍有正確語意。</p>

<p><strong>然而這個演算法從未被任何瀏覽器或 screen reader 實作，W3C 在 2022 年正式將其從 HTML spec 中移除。</strong> 現實中，<code>&lt;h1&gt;</code>–<code>&lt;h6&gt;</code> 的語意完全由元素的數字決定，與 sectioning element 的巢狀無關。這意味著：<strong>實踐上整頁應只有一個 <code>&lt;h1&gt;</code></strong>（代表整個頁面或文章的主題），後續以 <code>&lt;h2&gt;</code>–<code>&lt;h6&gt;</code> 建立實際的階層結構，且不應跳級（從 h2 直接到 h4 是 a11y 問題）。</p>

<p>Sectioning elements 的真正作用是在 <strong>accessibility tree 中建立 landmark regions</strong>，讓 screen reader 使用者能用快捷鍵（VoiceOver 按 <kbd>R</kbd>、NVDA 按 <kbd>D</kbd>）在 region 間跳轉。<code>&lt;main&gt;</code> 對應 <code>role="main"</code>、<code>&lt;nav&gt;</code> 對應 <code>role="navigation"</code>、<code>&lt;aside&gt;</code> 對應 <code>role="complementary"</code>、<code>&lt;header&gt;</code> 在頂層時對應 <code>role="banner"</code>、<code>&lt;footer&gt;</code> 對應 <code>role="contentinfo"</code>。正確使用這些元素，等於免費提供了頁面地圖。頁面上如有多個 <code>&lt;nav&gt;</code>，應用 <code>aria-label</code> 加以區別（例如「主要導覽」、「麵包屑」），否則 screen reader 會宣告多個名稱相同的 navigation。</p>

${diagram(`
graph TD
    subgraph LandmarkRegions["Landmark Regions (screen reader 按 R/D 跳轉)"]
        banner["&lt;header&gt;\\nrole: banner"]
        nav["&lt;nav aria-label='主要導覽'&gt;\\nrole: navigation"]
        main["&lt;main&gt;\\nrole: main"]
        comp["&lt;aside&gt;\\nrole: complementary"]
        info["&lt;footer&gt;\\nrole: contentinfo"]
    end
    subgraph HeadingTree["Heading Tree (screen reader 按 H/1-6 跳轉)"]
        h1["H1 — 頁面唯一主標題"]
        h2a["H2 — 第一大節"]
        h2b["H2 — 第二大節"]
        h3a["H3 — 子節"]
        h3b["H3 — 子節"]
        h1 --> h2a & h2b
        h2a --> h3a & h3b
    end
    main --> HeadingTree
`, 'Landmark regions 和 heading tree 是兩套獨立的導覽系統，但都在同一份 accessibility tree 上。多個同類 landmark（如兩個 nav）需要 aria-label 區分名稱。')}

${code('html', `<!-- 完整的 document outline 範例 -->
<body>
  <!-- <header> 在頂層 = role="banner" -->
  <header>
    <a href="/" aria-label="首頁">LOGO</a>
    <!-- aria-label 區分多個 nav landmark -->
    <nav aria-label="主要導覽">
      <ul>
        <li><a href="/docs">文件</a></li>
        <li><a href="/blog">部落格</a></li>
      </ul>
    </nav>
  </header>

  <!-- 一頁只有一個 <main> -->
  <main>
    <!-- 一頁只有一個 <h1> -->
    <h1>CSS Grid 完全指南</h1>

    <!-- aria-labelledby 把 section 和它的標題連結 -->
    <section aria-labelledby="basic-section">
      <h2 id="basic-section">基礎概念</h2>
      <p>...</p>
      <section aria-labelledby="fr-unit">
        <!-- h3 緊跟 h2，不跳級 -->
        <h3 id="fr-unit">fr 單位</h3>
        <p>...</p>
      </section>
    </section>

    <section aria-labelledby="advanced-section">
      <h2 id="advanced-section">進階應用</h2>
      <p>...</p>
    </section>
  </main>

  <!-- <aside> 在頂層 = role="complementary" -->
  <aside aria-label="相關文章">
    <!-- h2 而非 h1；aside 是補充，不是主要內容 -->
    <h2>延伸閱讀</h2>
    <ul>...</ul>
  </aside>

  <footer>
    <!-- <nav> 在 footer 裡的 landmark role 仍是 navigation -->
    <nav aria-label="頁尾連結">...</nav>
    <p>© 2026 Example</p>
  </footer>
</body>`)}

${code('javascript', `// SPA 路由切換後的 a11y 三步驟
router.on('navigate', async ({ title, path }) => {
  // 1. 更新 document.title（screen reader 宣告新頁面的依據）
  document.title = title + ' | My App';

  // 2. 把焦點移到 h1（讓 screen reader 從頭開始讀新內容）
  //    非互動元素需要 tabindex="-1" 才能用 JS focus()
  const h1 = document.querySelector('h1');
  if (h1) {
    h1.tabIndex = -1;
    h1.focus({ preventScroll: true });
  }

  // 3. 用 aria-live region 宣告「頁面已更新」
  //    在 DOM 的 hidden 區域放一個 aria-live="assertive" div
  //    插入文字 → screen reader 會立即朗讀
  const announcer = document.getElementById('route-announcer');
  if (announcer) {
    announcer.textContent = '';
    requestAnimationFrame(() => {
      announcer.textContent = \`已切換至：\${title}\`;
    });
  }
});
// HTML 中需要有：
// <div id="route-announcer" aria-live="assertive" aria-atomic="true"
//      class="sr-only"></div>  ← 視覺上隱藏但 a11y tree 可讀`)}

<div class="callout">
  <div class="callout-title">Senior 信號：heading 跳級的 a11y 影響</div>
  <p>Screen reader 使用者會用 heading 快捷鍵建立頁面心智模型。從 h2 跳到 h4 表示「h3 這個層次不存在」，這讓使用者困惑是否漏掉了內容。WCAG 2.4.6（Headings and Labels）和 WCAG 1.3.1（Info and Relationships）要求 heading 結構能正確反映文件層次。axe 和 Lighthouse 都會標記 heading 跳級問題。</p>
</div>

<fe-demo-suite demo="landmark"></fe-demo-suite>

<h2 id="inline-block-replaced">3.2 Inline vs Block vs Replaced Elements</h2>
<p>傳統的「block vs inline」是 CSS 渲染模型的分類，而 HTML 的 <strong>content model</strong> 是另一套：HTML5 spec 把元素分成 <em>flow content</em>（能出現在大多數地方）、<em>phrasing content</em>（能出現在段落內的行內內容）、<em>sectioning content</em>、<em>heading content</em>、<em>interactive content</em>、<em>embedded content</em>（<code>&lt;img&gt;</code>、<code>&lt;video&gt;</code>、<code>&lt;canvas&gt;</code>）等類別。這兩套分類是獨立的：一個元素的 HTML content model 決定它能出現在文件哪裡，CSS <code>display</code> 決定它如何渲染——可以獨立改變。</p>

<p><strong>Replaced Elements</strong> 是一類特殊元素：其顯示內容由外部資源或元素屬性（<code>src</code>、<code>data</code>）決定，瀏覽器不渲染元素本身的內容，而是讓資源「替換」元素的位置。<code>&lt;img&gt;</code>、<code>&lt;video&gt;</code>、<code>&lt;iframe&gt;</code>、<code>&lt;canvas&gt;</code>、<code>&lt;input&gt;</code>（多數 type）都是 replaced elements。它們有 <strong>intrinsic dimensions（固有尺寸）</strong>：<code>&lt;img src="photo.jpg"&gt;</code> 的固有大小是圖片的像素寬高。沒有明確 CSS 尺寸時，瀏覽器使用固有尺寸，這也是為何 <code>object-fit</code> 是 replaced element 專用屬性。</p>

<p><strong>CSS Display Level 3</strong> 把 <code>display</code> 拆成兩個維度：<strong>outer display type</strong>（影響元素在 flow layout 中的行為：<code>block</code> 或 <code>inline</code>）和 <strong>inner display type</strong>（影響子元素如何排列：<code>flow</code>、<code>flow-root</code>、<code>flex</code>、<code>grid</code>、<code>table</code>）。<code>display: flex</code> 的完整名稱是 <code>display: block flex</code>（自己在外部是 block，子元素用 flex 排列）；<code>display: inline-flex</code> 是 <code>display: inline flex</code>。這個雙維度解釋了為何 <code>&lt;span style="display:flex"&gt;</code> 是合法的，即使 span 語意上是 phrasing content。</p>

${diagram(`
graph LR
    dp["display 屬性\\n= outer + inner"]
    dp -->|"outer: block"| blk1["display: block\\n(block flow)"]
    dp -->|"outer: block"| blk2["display: flex\\n(block flex)"]
    dp -->|"outer: block"| blk3["display: grid\\n(block grid)"]
    dp -->|"outer: inline"| inl1["display: inline\\n(inline flow)"]
    dp -->|"outer: inline"| inl2["display: inline-flex\\n(inline flex)"]
    dp -->|"outer: inline"| inl3["display: inline-grid\\n(inline grid)"]
    subgraph Replaced["Replaced Elements 特性"]
        ri["&lt;img&gt; / &lt;video&gt; / &lt;iframe&gt;\\n有 intrinsic dimensions\\nobject-fit 可控制填滿方式"]
    end
`, 'CSS Display Level 3 把 display 拆成 outer（自己如何參與 flow）與 inner（子元素如何排列）。Replaced elements 有固有尺寸，CSS 未設定時使用資源本身的大小。')}

${code('css', `/* img 的 baseline gap 問題與修法 */

/* 問題：img 預設 display: inline，對齊 text baseline
   但圖片比 baseline 到底部的 descent 高，
   造成圖片底部與父容器底部之間有 2-4px 空隙 */
.container { background: red; /* 能看到底部有空隙 */ }
.container img { /* 預設：inline + baseline 對齊 */ }

/* 修法 1：讓 img 退出 inline flow */
.container img { display: block; }

/* 修法 2：改變垂直對齊方式 */
.container img { vertical-align: bottom; }

/* 修法 3：父元素用 flex/grid（子元素不再走 inline formatting context）*/
.container { display: flex; }

/* object-fit：replaced element 填滿容器的方式 */
.avatar {
  width: 48px;
  height: 48px;
  object-fit: cover;      /* 填滿並裁切 */
  object-position: center top; /* 裁切焦點 */
  border-radius: 50%;
}

/* CSS Display Level 3 雙值語法（現代瀏覽器支援） */
.outer-inline-inner-flex {
  display: inline flex; /* 等同 display: inline-flex */
}
.outer-block-inner-grid {
  display: block grid;  /* 等同 display: grid */
}`)}

${code('javascript', `// 找出頁面所有 alt 缺失或為檔名的 img（a11y 快速掃描）
function auditImages() {
  const issues = [];
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('alt')) {
      issues.push({ type: 'missing-alt', src: img.src });
    } else if (img.alt === img.src || /\\.(jpg|png|webp|avif|svg)$/i.test(img.alt)) {
      issues.push({ type: 'filename-alt', src: img.src, alt: img.alt });
    }
  });
  return issues;
}

// alt 的三種情境：
// 1. 裝飾性圖片（與內容無關）→ alt=""（空字串，非省略）
// 2. 資訊性圖片 → alt="描述圖片傳達的資訊"
// 3. 連結/按鈕內的圖片 → alt="連結目的地或按鈕功能"
// 永遠不要：alt="image.png" 或 alt="圖片" 這類 non-descriptive text`)}

<div class="callout">
  <div class="callout-title">Senior 信號：content model 影響 HTML 驗證</div>
  <p>HTML content model 規定什麼元素能包含什麼。<code>&lt;p&gt;</code> 只能包含 phrasing content，所以 <code>&lt;p&gt;&lt;div&gt;...&lt;/div&gt;&lt;/p&gt;</code> 是無效的——瀏覽器會「修復」它，把 <code>&lt;div&gt;</code> 提升到 <code>&lt;p&gt;</code> 外面，造成意外的 DOM 結構。<code>&lt;button&gt;</code> 是 interactive content，不能嵌套另一個 <code>&lt;button&gt;</code> 或 <code>&lt;a&gt;</code>。W3C Validator 能抓出這類錯誤，但 browser 的錯誤修復讓開發環境看起來「正常」，生產環境才出現難以追溯的渲染問題。</p>
</div>

<fe-demo-suite demo="display"></fe-demo-suite>

<h2 id="meta-tags">3.3 meta Tags 與文件元資訊</h2>
<p><code>&lt;meta&gt;</code> 標籤不可見於畫面，卻決定了瀏覽器渲染行為、搜尋引擎解讀、社群平台預覽與安全政策。以下是每個 meta tag 的實際機制，而不只是「加上去就對了」的 checklist。</p>

<p><strong>viewport meta</strong> 的真正作用是控制三種 viewport 的關係。<strong>Layout viewport</strong> 是 CSS media query 讀取的寬度（<code>@media (min-width: 768px)</code> 問的就是這個）。行動瀏覽器歷史上預設 layout viewport 為 980px，以適應桌面頁面。<strong>Visual viewport</strong> 是使用者目前在螢幕上實際看到的區域（縮放會改變它）。<strong>Ideal viewport</strong> 是裝置的 CSS 像素寬度（例如 iPhone 15 的 393px，由 <code>window.screen.width</code> 取得）。<code>width=device-width</code> 把 layout viewport 設為 ideal viewport；<code>initial-scale=1</code> 讓 visual viewport 等於 layout viewport。兩者合用才讓 RWD 的 media query 對應裝置的真實寬度。</p>

<p><strong>Open Graph 和 Twitter Card</strong> 讓社群分享時顯示正確的標題、描述與縮圖。<code>og:image</code> 必須是絕對 URL（含 scheme 和 domain）；使用相對路徑，爬蟲無法解析。圖片建議 1200×630px。Twitter Card 需要 <code>twitter:card</code> 至少設為 <code>summary_large_image</code> 才顯示大圖；<code>twitter:title</code>、<code>twitter:description</code>、<code>twitter:image</code> 若未設定，會 fallback 到 <code>og:</code> 等效項目。</p>

${code('html', `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <!-- charset 必須是 <head> 第一個 meta（瀏覽器在解析文字前需要知道編碼） -->
  <meta charset="UTF-8">

  <!-- viewport：把 layout viewport 對齊裝置 CSS pixel 寬度
       避免加 user-scalable=no / maximum-scale=1 — 違反 WCAG 1.4.4
       低視力使用者需要 200% 以上放大，iOS 14+ 已忽略此設定 -->
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- description：搜尋 snippet 與社群分享備用描述（50-160 字元） -->
  <meta name="description" content="深入解析 Senior 前端必知的瀏覽器底層、HTML/CSS 架構與效能優化策略。">

  <!-- Referrer Policy：控制 Referer header 的精確度
       strict-origin-when-cross-origin（現代瀏覽器預設）：
       同源請求 → 完整 URL；跨域降級 → 只帶 origin；HTTP→HTTPS → 不帶 -->
  <meta name="referrer" content="strict-origin-when-cross-origin">

  <!-- theme-color：Android Chrome 位址列顏色；支援 media 條件 -->
  <meta name="theme-color" content="#1769ff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0052cc" media="(prefers-color-scheme: dark)">

  <!-- Open Graph（Facebook、LINE、大部分平台） -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="Senior 前端工程師完整學習書籍">
  <meta property="og:description" content="從瀏覽器底層到 GenAI 整合的完整學習路徑。">
  <!-- og:image 必須是絕對 URL；建議 1200×630px；PNG 或 JPEG -->
  <meta property="og:image" content="https://example.com/og-cover.png">
  <meta property="og:url" content="https://example.com/book">
  <meta property="og:site_name" content="Frontend Skills">

  <!-- Twitter Card（未設定時 fallback 到 og: 等效項目） -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@frontend_skills">

  <title>Senior 前端工程師完整學習書籍 | Frontend Skills</title>
</head>`)}

<div class="table-wrap">
<table class="info-table">
  <thead>
    <tr><th>meta tag</th><th>主要作用</th><th>常見錯誤</th></tr>
  </thead>
  <tbody>
    <tr><td><code>charset="UTF-8"</code></td><td>宣告字元編碼，防止亂碼</td><td>放在 <code>&lt;title&gt;</code> 後面（title 已被解析，若編碼錯會亂碼）</td></tr>
    <tr><td><code>viewport</code></td><td>控制 layout viewport 尺寸</td><td>加 <code>user-scalable=no</code> 阻止縮放，違反 WCAG 1.4.4</td></tr>
    <tr><td><code>description</code></td><td>搜尋 snippet 與社群分享描述</td><td>每頁相同、過短、堆砌關鍵字或超過 160 字元被截斷</td></tr>
    <tr><td><code>og:image</code></td><td>社群分享縮圖</td><td>用相對 URL（social crawler 無法解析）</td></tr>
    <tr><td><code>theme-color</code></td><td>Android Chrome 位址列顏色</td><td>只設一個值，未考慮 dark mode</td></tr>
    <tr><td><code>referrer</code></td><td>控制 Referer header 精確度</td><td>不設定（預設值可能洩漏用戶導覽路徑給第三方）</td></tr>
  </tbody>
</table>
</div>

${code('javascript', `// 動態更新 SPA 路由切換後的 meta tag
function updateMeta(config) {
  // document.title
  document.title = config.title + ' | My App';

  // description
  document.querySelector('meta[name="description"]')
    ?.setAttribute('content', config.description);

  // Open Graph（og:title、og:description、og:image）
  ['title', 'description', 'image', 'url'].forEach(key => {
    let el = document.querySelector(\`meta[property="og:\${key}"]\`);
    if (!el) {
      el = Object.assign(document.createElement('meta'), {
        setAttribute: Function.prototype.call.bind(
          HTMLElement.prototype.setAttribute, el, 'property', \`og:\${key}\`
        ),
      });
      // 實際寫法：
      el = document.createElement('meta');
      el.setAttribute('property', \`og:\${key}\`);
      document.head.appendChild(el);
    }
    el.setAttribute('content', config[key] ?? '');
  });
}

// 取得三種 viewport 的實際尺寸（用於偵錯）
function getViewports() {
  return {
    // Layout viewport（CSS media query 讀這個）
    layout: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
    // Visual viewport（縮放時會變）
    visual: { width: window.visualViewport?.width, height: window.visualViewport?.height },
    // Ideal viewport（裝置 CSS pixel 尺寸）
    ideal: { width: window.screen.width, height: window.screen.height },
    dpr: window.devicePixelRatio,
  };
}`)}

<h2 id="structured-data">3.4 Microdata、JSON-LD 與 Structured Data</h2>
<p>Structured Data 讓搜尋引擎和 AI 爬蟲直接讀取機器可讀的語意資訊，不需要解析 HTML 推斷意圖。有三種主要格式：<strong>Microdata</strong> 把 Schema 屬性直接嵌入 HTML（<code>itemscope</code>、<code>itemprop</code>）；<strong>RDFa</strong> 用 <code>vocab</code>、<code>typeof</code>、<code>property</code> 屬性；<strong>JSON-LD</strong> 把結構化資料放在一個獨立的 <code>&lt;script type="application/ld+json"&gt;</code>，完全不改動 HTML 結構。</p>

<p><strong>Google 明確偏好 JSON-LD</strong>：不依賴 HTML 結構，可以獨立修改，不影響視覺；爬蟲解析速度更快；支援 <code>@graph</code>（在一個腳本中描述多個實體）。Microdata 的優點是「標記緊貼 HTML 內容」，確保結構化資料和頁面顯示不脫節。但 JSON-LD 也有脫節風險——例如 JSON-LD 中的商品價格和頁面顯示的價格不一致。Google 對此的懲罰是移除 rich result，不會直接降排名，但仍需要測試確保兩者同步。</p>

<p>隨著 <strong>LLM-driven crawling</strong>（Bing Copilot、ChatGPT Search、Perplexity AI）崛起，structured data 的重要性進一步提升。這些 AI 搜尋引擎會用結構化資料直接回答用戶（例如商品價格、FAQ 答案、事件時間），而不只是顯示連結。正確的 Schema.org 標記能讓你的內容進入 AI 摘要。常用 Schema.org types：<code>Article</code>、<code>Product</code>（含 <code>Offer</code>）、<code>FAQPage</code>、<code>BreadcrumbList</code>、<code>Organization</code>、<code>Event</code>。</p>

${code('html', `<!-- JSON-LD 範例：電商商品頁 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "機械式鍵盤 Pro",
  "description": "Cherry MX Red 軸，RGB 背光，USB-C 連線",
  "image": "https://example.com/keyboard-pro.jpg",
  "brand": { "@type": "Brand", "name": "KeyCraft" },
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/keyboard-pro",
    "priceCurrency": "TWD",
    "price": "3990",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.6",
    "reviewCount": "127"
  }
}
</script>

<!-- JSON-LD 範例：FAQ 頁（最常被 Google AI Overview 引用） -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "TypeScript 和 JavaScript 的主要差異是什麼？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "TypeScript 是 JavaScript 的超集，增加了靜態型別系統。它在編譯時期發現型別錯誤，提升 IDE 自動補全品質，對大型專案的維護成本有顯著幫助。"
      }
    },
    {
      "@type": "Question",
      "name": "React 和 Vue 哪個比較適合初學者？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Vue 通常被認為學習曲線較平緩，template 語法接近 HTML；React 生態系更大，就業市場更廣。選擇取決於團隊背景和職涯目標。"
      }
    }
  ]
}
</script>

<!-- JSON-LD 範例：麵包屑（BreadcrumbList） -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "首頁", "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "JavaScript", "item": "https://example.com/javascript" },
    { "@type": "ListItem", "position": 3, "name": "非同步程式設計" }
  ]
}
</script>`)}

${code('javascript', `// SPA 動態更新 JSON-LD（路由切換時同步更新 structured data）
class StructuredDataManager {
  #scripts = new Map();

  set(type, data) {
    let script = this.#scripts.get(type);
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      document.head.appendChild(script);
      this.#scripts.set(type, script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': type,
      ...data,
    });
  }

  remove(type) {
    this.#scripts.get(type)?.remove();
    this.#scripts.delete(type);
  }
}

const sdm = new StructuredDataManager();

// 路由切換到商品頁時
router.on('/products/:id', async ({ params }) => {
  const product = await api.getProduct(params.id);
  sdm.set('Product', {
    name: product.name,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'TWD',
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  });
});

// 離開商品頁時清除
router.on('leave /products/:id', () => sdm.remove('Product'));

// 驗證工具：
// Google Rich Results Test: search.google.com/test/rich-results
// Schema.org Validator: validator.schema.org`)}

<h2 id="real-world-applications">真實場景應用</h2>
<div class="application-grid">
  <div class="mini-card">
    <h3>WCAG 合規審計</h3>
    <p>heading hierarchy 是 WCAG 2.4.6 的必查項目。常見問題：整頁沒有 <code>&lt;h1&gt;</code>、heading 跳級（h2→h4）、用 heading 只為了大字視覺效果。修法：heading 管語意，視覺用 CSS class 控制字體大小，分開處理。</p>
  </div>
  <div class="mini-card">
    <h3>Google Rich Results 優化</h3>
    <p>Product schema 需要 <code>offers.price</code>（格式必須是純數字字串）、<code>aggregateRating.reviewCount</code>（必須 &gt; 0）、絕對 URL 的 <code>image</code>。FAQ schema 的 <code>acceptedAnswer.text</code> 若太短可能不被展開。失效後 Search Console 會報錯。</p>
  </div>
  <div class="mini-card">
    <h3>SPA 的完整 a11y 路由切換</h3>
    <p>更新 <code>document.title</code>、把焦點移到 <code>&lt;h1 tabindex="-1"&gt;</code>、透過 <code>aria-live="assertive"</code> region 宣告頁面切換——三步缺一不可。Next.js App Router 內建前兩步；React Router 需要自行實作 focus management。</p>
  </div>
</div>

<h2 id="pitfalls-tradeoffs">常見陷阱與取捨</h2>
<div class="tradeoff-grid">
  <div class="mini-card">
    <h3>把 heading 當樣式工具</h3>
    <p>視覺上需要大字就用 <code>&lt;h2&gt;</code>，邏輯上是標題卻用 <code>&lt;p class="big"&gt;</code>，這是最常見的語意污染。heading 管文件結構，視覺大小用 CSS class 控制。反過來也一樣：邏輯上是子標題不能因為「視覺要小」就降到 h5。</p>
  </div>
  <div class="mini-card">
    <h3>viewport user-scalable 的 a11y 代價</h3>
    <p><code>user-scalable=no</code> 或 <code>maximum-scale=1</code> 阻止縮放，違反 WCAG 1.4.4（文字需能放大 200%）。iOS 14+ 已忽略此設定，Android 仍遵守。低視力使用者、高齡用戶、或在強光下看手機的用戶都依賴縮放功能。</p>
  </div>
  <div class="mini-card">
    <h3>JSON-LD 和頁面顯示脫節</h3>
    <p>JSON-LD 中的商品價格或庫存狀態與頁面實際顯示不一致，Google 會撤銷 rich result 資格，但不會降排名。解法：直接從同一個 data source 同時生成頁面 HTML 和 JSON-LD，而不是維護兩份獨立的資料。</p>
  </div>
  <div class="mini-card">
    <h3>多個同類 landmark 未加 aria-label</h3>
    <p>一個頁面有多個 <code>&lt;nav&gt;</code>（主導覽、麵包屑、頁尾）未加 <code>aria-label</code>，screen reader 宣告多個「navigation」讓用戶困惑。每個 landmark 應有能辨別的名稱：<code>&lt;nav aria-label="主要導覽"&gt;</code>、<code>&lt;nav aria-label="麵包屑"&gt;</code>。</p>
  </div>
</div>

<h2 id="interview-framing">面試回答框架</h2>
<ol>
  <li><strong>先建立三個讀者：</strong>HTML 語意服務瀏覽器（content model）、輔助科技（accessibility tree）、爬蟲（heading + landmark + structured data）。每個取捨都可以從這三個角度分析。</li>
  <li><strong>再說具體機制：</strong>HTML5 Outline Algorithm 為何被移除、sectioning elements 建立 landmark regions 的 ARIA 對應、viewport meta 三種 viewport 的關係、JSON-LD 獨立於 HTML 結構的優點。</li>
  <li><strong>說取捨：</strong>Microdata 不脫節但維護成本高；JSON-LD 簡潔但需確保與頁面同步；user-scalable=no 傷害 a11y；open graph 絕對 URL 在不同環境的一致性問題。</li>
  <li><strong>說驗證：</strong>W3C Validator、axe DevTools、Google Rich Results Test、VoiceOver/NVDA 實測、Chrome Accessibility panel。</li>
</ol>

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
