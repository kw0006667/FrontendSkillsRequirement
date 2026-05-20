import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 12)

const prev = chapters.find(c => c.id === 11)
const next = chapters.find(c => c.id === 13)

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
  <div class="chapter-num">Chapter 12 · Performance</div>
  <h1>Image 與媒體資源優化</h1>
  <p>圖片通常是網頁中體積最大的資源，也是 LCP（Largest Contentful Paint）最常見的候選元素。優化圖片不只是「壓縮檔案大小」，而是一個多維決策：<strong>格式選擇</strong>（WebP/AVIF vs JPEG/PNG）、<strong>尺寸適配</strong>（srcset + sizes 按裝置送對應解析度）、<strong>載入優先級</strong>（LCP 圖片用 <code>fetchpriority="high"</code>，首屏外用 <code>loading="lazy"</code>）、以及<strong>空間保留</strong>（width/height attribute 防止 CLS）。每個決策都直接對應到 Core Web Vitals。</p>
  <div class="chapter-tags">
    <span class="tag">performance</span>
    <span class="tag">media</span>
    <span class="tag">lcp</span>
    <span class="tag">cls</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 <code>srcset</code> 中寬度描述符（<code>800w</code>）與像素密度描述符（<code>2x</code>）的差異，以及瀏覽器如何配合 <code>sizes</code> 計算最終需要的像素數；能說出 <code>fetchpriority="high"</code> 對 LCP 的影響（讓 browser 提升圖片的 network priority，提前下載）；能說出 <code>&lt;img&gt;</code> 的 <code>width</code>/<code>height</code> 屬性即使有 CSS 覆寫仍然重要的原因（防止 CLS：讓 browser 在圖片下載前預留正確 aspect ratio 空間）；能說出 AVIF 和 WebP 的適用場景差異。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>圖片優化可以用「FARE 框架」思考：<strong>F</strong>ormat（選最佳格式）→ <strong>A</strong>daptive（響應式尺寸）→ <strong>R</strong>ank（設定正確優先級）→ <strong>E</strong>mpty space（預留空間防 CLS）。這四個維度缺一不可，只壓縮體積但忽略其他三個，效果有限。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>電商產品圖（LCP 候選）→ AVIF + WebP fallback + <code>fetchpriority="high"</code> + <code>width/height</code>。列表頁縮圖（首屏外）→ <code>loading="lazy"</code> + WebP。使用者上傳頭像（需 alpha 透明）→ WebP 或 PNG（AVIF 支援 alpha）。大型橫幅插畫（向量）→ SVG。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>LCP 慢但 TTFB 正常 → 圖片下載慢（格式、尺寸、priority 問題）；CLS 高 → 圖片沒有預留空間（缺少 width/height）；行動裝置上圖片過大（沒有 srcset 提供小尺寸版本）；Lighthouse 顯示 "Serve images in next-gen formats"。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>Chrome DevTools Network 面板 > Filter "img"，檢查每張圖的 size 和 transfer size；Lighthouse "Properly size images" 和 "Serve images in next-gen formats"；Performance 面板標記 LCP element；WebPageTest 的 filmstrip 觀察圖片出現時序。</p>
  </div>
</div>

<h2 id="formats">12.1 圖片格式選擇</h2>
<p>現代瀏覽器支援多種圖片格式，選擇關鍵在於<strong>壓縮效率</strong>、<strong>功能特性</strong>（透明、動畫）和<strong>瀏覽器支援度</strong>：</p>

${diagram(`
graph TD
    subgraph Formats["圖片格式選型"]
        Q1{需要透明背景？}
        Q2{需要向量/可縮放？}
        Q3{需要動畫？}
        Q4{需要最高壓縮率？}
        AVIF["AVIF\n最高壓縮率\n支援 alpha & animation\n瀏覽器支援 >90%"]
        WEBP["WebP\n高壓縮率\n支援 alpha & animation\n瀏覽器支援 >96%"]
        JPEG["JPEG\n廣泛相容\n無透明\n照片首選"]
        PNG["PNG\n無損\n支援 alpha\n圖示/截圖"]
        SVG["SVG\n向量\n可訪問\nCSS/JS 互動"]
        GIF["GIF\n避免使用\n改用 WebP 動畫或 video"]
    end
    Q1 -->|是| Q4
    Q4 -->|是| AVIF
    Q4 -->|否| WEBP
    Q1 -->|否| Q2
    Q2 -->|是| SVG
    Q2 -->|否| Q3
    Q3 -->|是| WEBP
    Q3 -->|否| JPEG
`, '格式選擇決策樹：從透明、向量、動畫需求開始，再考慮壓縮率和相容性。')}

<p><strong>格式壓縮率比較（同等視覺品質）</strong>：AVIF > WebP > JPEG（~30-50% 的差距）。但 AVIF 的編碼時間較長，適合預先生成；即時處理（如 CDN 動態 resize）目前 WebP 更常見。</p>

${code('html', `<!-- 使用 picture + source 做格式協商（art direction + format fallback）-->
<picture>
  <!-- 現代瀏覽器：AVIF（最小檔案）-->
  <source
    type="image/avif"
    srcset="/hero-480.avif 480w, /hero-800.avif 800w, /hero-1400.avif 1400w"
    sizes="(min-width: 960px) 720px, 100vw"
  />
  <!-- 較舊的現代瀏覽器：WebP -->
  <source
    type="image/webp"
    srcset="/hero-480.webp 480w, /hero-800.webp 800w, /hero-1400.webp 1400w"
    sizes="(min-width: 960px) 720px, 100vw"
  />
  <!-- 最終 fallback：JPEG（所有瀏覽器都支援）-->
  <img
    src="/hero-800.jpg"
    srcset="/hero-480.jpg 480w, /hero-800.jpg 800w, /hero-1400.jpg 1400w"
    sizes="(min-width: 960px) 720px, 100vw"
    width="1400"
    height="900"
    alt="產品主視覺"
    fetchpriority="high"
  />
</picture>

<!-- CDN 動態格式轉換（Cloudflare Images / Cloudinary 等）-->
<!-- 不需要手動生成多個格式，CDN 自動轉換 -->
<img
  src="https://imagedelivery.net/abc123/product/w=800,format=auto"
  srcset="
    https://imagedelivery.net/abc123/product/w=480,format=auto 480w,
    https://imagedelivery.net/abc123/product/w=800,format=auto 800w,
    https://imagedelivery.net/abc123/product/w=1400,format=auto 1400w
  "
  sizes="(min-width: 960px) 720px, 100vw"
  width="1400"
  height="900"
  alt="Product"
/>`)}

<h2 id="responsive-images">12.2 Responsive Images</h2>
<p><code>srcset</code> 有兩種語法，解決不同問題：</p>
<ul>
  <li><strong>寬度描述符（<code>800w</code>）</strong>：告訴瀏覽器「這個圖片版本的固有寬度是 800px」，搭配 <code>sizes</code> attribute 讓瀏覽器計算需要多少 CSS pixels，再乘以 DPR，選出最接近的版本。</li>
  <li><strong>像素密度描述符（<code>2x</code>）</strong>：直接告訴瀏覽器「這個版本給 2x DPR 裝置用」。適合 avatar、logo 等固定顯示尺寸的圖片。</li>
</ul>

<p><strong><code>sizes</code> attribute</strong>：告訴瀏覽器「這張圖片在各 viewport 條件下的 layout 寬度」，以便讓瀏覽器在下載 CSS 之前就能選擇正確的 srcset 候選圖片（Preload Scanner 無法解析 CSS）。</p>

${code('html', `<!-- 寬度描述符 + sizes：響應式圖片的標準做法 -->
<img
  srcset="product-480.webp 480w,
          product-800.webp 800w,
          product-1200.webp 1200w"
  sizes="
    (max-width: 480px) 100vw,
    (max-width: 768px) 50vw,
    33vw
  "
  src="product-800.webp"
  width="1200"
  height="800"
  alt="Product"
/>

<!-- 瀏覽器計算邏輯：
  Viewport = 768px，DPR = 2
  sizes 命中：50vw → 384px CSS pixels
  需要像素：384px × 2 = 768px
  選擇 srcset 中 >= 768px 的最小版本：product-800.webp
-->

<!-- 像素密度描述符：固定顯示尺寸（頭像、icon）-->
<img
  srcset="avatar-40.webp 1x,
          avatar-80.webp 2x,
          avatar-120.webp 3x"
  src="avatar-40.webp"
  width="40"
  height="40"
  alt="User avatar"
/>

<!-- Art Direction：不同 viewport 用不同構圖的圖片 -->
<picture>
  <!-- 手機：直式裁切，突出主體 -->
  <source
    media="(max-width: 600px)"
    srcset="/hero-portrait-600.webp 600w, /hero-portrait-1200.webp 1200w"
  />
  <!-- 桌面：橫式完整構圖 -->
  <source
    media="(min-width: 601px)"
    srcset="/hero-landscape-1200.webp 1200w, /hero-landscape-2400.webp 2400w"
  />
  <img src="/hero-landscape-1200.webp" alt="Hero" width="1200" height="675" />
</picture>`)}

<fe-demo-suite demo="srcset"></fe-demo-suite>

<h2 id="lazy-loading">12.3 Lazy Loading 與 loading="lazy"</h2>
<p>原生 <code>loading="lazy"</code>（Chrome 77+）讓瀏覽器延遲載入首屏外的圖片，等到使用者即將捲動到圖片時才下載。這減少了初始頁面載入的網路請求數和傳輸量，改善 TTI 和頁面權重。</p>

<p><strong>Threshold 距離</strong>：瀏覽器在圖片距離 viewport 約 <strong>1250px</strong>（快速網路）到 <strong>2500px</strong>（慢速網路）時開始下載（各瀏覽器的具體值不同）。這個提前量讓圖片通常能在使用者捲動到它之前就準備好。</p>

<p><strong>重要注意</strong>：<code>loading="lazy"</code> 絕對不應用在 LCP candidate 圖片上。LCP 圖片應該用 <code>fetchpriority="high"</code> 並確保 Preload Scanner 能找到它（不要藏在 CSS background-image 中）。</p>

${code('html', `<!-- LCP 圖片：不 lazy、提高優先級 -->
<img
  src="/hero.webp"
  width="1400"
  height="900"
  alt="Hero image"
  fetchpriority="high"
/>
<!-- 也可以搭配 preload，讓下載更早開始 -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />

<!-- 首屏外圖片：lazy loading -->
<img
  src="/product-1.webp"
  width="400"
  height="300"
  alt="Product 1"
  loading="lazy"
  decoding="async"
/>

<!-- decoding="async"：允許 browser 在圖片解碼時繼續其他工作
     不阻塞主執行緒的圖像解碼 -->

<!-- ❌ 不要對 LCP 圖片用 lazy -->
<img
  src="/hero.webp"
  loading="lazy"   <!-- 這會嚴重傷害 LCP！-->
  alt="Hero"
/>

<!-- IntersectionObserver 自製 lazy loading（針對 loading="lazy" 不支援的情況）-->
<img
  data-src="/product-2.webp"
  src="/placeholder.svg"
  width="400"
  height="300"
  alt="Product 2"
  class="js-lazy"
/>

<script type="module">
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const img = entry.target;
    img.src = img.dataset.src;
    observer.unobserve(img);
  });
}, { rootMargin: '200px' });

document.querySelectorAll('.js-lazy').forEach(img => observer.observe(img));
</script>`)}

<h2 id="aspect-ratio-cls">12.4 Aspect Ratio 與 CLS 防範</h2>
<p>圖片沒有明確尺寸時，瀏覽器在下載圖片前不知道它的高度，會先渲染成 0 高度，圖片下載後再撐開空間，導致下方內容跳動——這是 CLS 最常見的來源之一。</p>

<p>解決方案有兩個：</p>
<ol>
  <li><strong><code>width</code> + <code>height</code> HTML attributes</strong>：即使有 CSS <code>width: 100%</code> 覆寫，瀏覽器仍會從 HTML attributes 計算 aspect ratio，在圖片下載前預留正確比例的空間。這是 HTML 規範在 2019 年後的行為（Chrome 79+）。</li>
  <li><strong><code>aspect-ratio</code> CSS property</strong>：直接指定比例，適合尺寸不固定但比例已知的情況。</li>
</ol>

${code('html', `<!-- ✅ 正確：width + height attributes 讓 browser 預留空間 -->
<img
  src="/product.webp"
  width="400"  <!-- 固有寬度 -->
  height="300" <!-- 固有高度，計算出 4:3 ratio -->
  style="width: 100%; height: auto"  <!-- CSS 覆寫顯示尺寸 -->
  alt="Product"
/>
<!-- 即使 CSS 讓圖片顯示 200px 寬，browser 仍知道比例是 4:3
     → 高度預留 150px，圖片下載後不會跳 -->

<!-- ❌ 錯誤：沒有 width/height，browser 不知道預留多少高度 -->
<img src="/product.webp" style="width: 100%" alt="Product" />

<!-- ✅ CSS aspect-ratio：明確指定比例 -->
<style>
.product-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: #f0f0f0; /* 載入前的佔位顏色 */
}
</style>
<img class="product-image" src="/product.webp" alt="Product" />

<!-- content-visibility: auto + contain-intrinsic-size：虛擬化長頁面 -->
<!-- 對首屏外內容跳過 layout 和 paint，但需要指定 intrinsic-size 防 CLS -->
<style>
.product-card {
  content-visibility: auto;
  /* 告訴 browser 跳過 render 時這個元素的估計高度 */
  contain-intrinsic-size: 0 400px;
}
</style>`)}

${code('javascript', `// 動態產生的圖片（例如 CMS 或 AI 生成）如何防 CLS
// 如果事先知道圖片尺寸，可以在 API response 中返回
interface ImageMeta {
  src: string;
  width: number;  // 固有寬度
  height: number; // 固有高度
  alt: string;
}

function renderImage({ src, width, height, alt }: ImageMeta) {
  return \`<img
    src="\${src}"
    width="\${width}"
    height="\${height}"
    style="width:100%;height:auto"
    loading="lazy"
    decoding="async"
    alt="\${alt}"
  />\`;
}

// 如果不知道尺寸：在上傳時計算並儲存
async function uploadImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const { naturalWidth, naturalHeight } = bitmap;

  const formData = new FormData();
  formData.set('file', file);
  formData.set('width', String(naturalWidth));
  formData.set('height', String(naturalHeight));

  return fetch('/api/upload', { method: 'POST', body: formData });
}`)}

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
