import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 4)

const prev = chapters.find(c => c.id === 3)
const next = chapters.find(c => c.id === 5)

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
  <div class="chapter-num">Chapter 04 · HTML</div>
  <h1>表單與互動元素</h1>
  <p>表單是 Web 平台最成熟的互動模型。原生 HTML 提供的 constraint validation、<code>FormData</code>、autocomplete 與虛擬鍵盤適配，是二十年以上的瀏覽器協作沉澱。Senior 工程師的標準是：先用 native behavior 完成 80%，再用 CSS/JavaScript 精緻化剩下的 20%，而不是把整個表單系統從頭重寫。</p>
  <div class="chapter-tags">
    <span class="tag">html</span>
    <span class="tag">forms</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 <code>:user-invalid</code> 和 <code>:invalid</code> 的差異（後者在頁面載入就觸發，前者需要用戶互動後）；能解釋 <code>enctype="multipart/form-data"</code> 為何是 file upload 的唯一正確選項；能說明 <code>document.execCommand</code> 被廢棄的具體原因，以及現代 rich text editor 為何需要重新實作 selection model；能解釋 IME composition 事件對 GenAI chat input 的影響。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>把表單想成「瀏覽器提供的互動 contract」：<code>type</code> 決定鍵盤和驗證行為，<code>autocomplete</code> 讓密碼管理器和 OS autofill 知道該填什麼，<code>required</code>/<code>pattern</code> 在不需要 JavaScript 的情況下提供第一道防線，<code>enctype</code> 決定資料如何序列化傳送。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>結帳流程、開戶表單、登入頁：每個欄位都涉及 keyboard type（數字鍵盤 vs 全鍵盤）、autofill hint（<code>autocomplete="cc-number"</code>）、server-side validation 與 client-side feedback 的協調。錯誤處理如果不用 <code>ValidityState</code>，通常只靠 <code>aria-invalid</code> + 自製邏輯，難以覆蓋所有邊界情況。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>iOS 上數字輸入框出現全鍵盤（<code>inputmode</code> 未設）；密碼管理器無法填入（<code>autocomplete</code> 設錯）；檔案上傳失敗（<code>enctype</code> 未設 multipart）；送出時光標沒移到第一個錯誤欄位（<code>reportValidity()</code> 未呼叫）；中文輸入法按 Enter 誤送訊息（IME composition 未處理）。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>關閉 JavaScript 檢查 form 是否仍能提交（progressive enhancement）；用手機實機測試 virtual keyboard；用密碼管理器（1Password、Bitwarden）測試 autofill；用 screen reader 測試 <code>aria-invalid</code> 與 <code>aria-describedby</code> 錯誤訊息；用 DevTools Network 確認 FormData 序列化格式。</p>
  </div>
</div>

<h2 id="form-overview">4.1 Form Element 全景</h2>
<p>HTML 的表單元素遠不止 <code>&lt;input&gt;</code>。<code>&lt;select&gt;</code> 提供下拉選單（<code>multiple</code> 屬性允許多選）；<code>&lt;datalist&gt;</code> 給 <code>&lt;input&gt;</code> 提供可篩選的建議清單（不強制選擇，不同於 <code>&lt;select&gt;</code>）；<code>&lt;textarea&gt;</code> 多行文字輸入，<code>rows</code> 和 <code>cols</code> 是視覺提示而非最大字數；<code>&lt;output&gt;</code> 顯示計算結果，語意上是「由其他輸入計算而來的值」，支援 <code>for</code> 屬性連結輸入來源；<code>&lt;fieldset&gt;</code> 和 <code>&lt;legend&gt;</code> 把相關欄位分組，<code>&lt;legend&gt;</code> 作為分組的無障礙標籤。</p>

<p><code>&lt;input&gt;</code> 的 <strong><code>type</code> 屬性</strong>決定了三件事：瀏覽器呈現的 UI widget、觸發的 validation 規則，以及在行動裝置上顯示的 virtual keyboard。<code>type="email"</code> 在 iOS 上會出現帶 <code>@</code> 符號的鍵盤；<code>type="tel"</code> 出現數字鍵盤；<code>type="number"</code> 在 Android 上出現數字鍵盤但 iOS 上會帶加減按鈕，且接受非數字輸入。想要純數字鍵盤又不要 number 的 +/- UI，應用 <code>type="text" inputmode="numeric" pattern="[0-9]*"</code>。</p>

<p><strong><code>autocomplete</code> 屬性</strong>讓瀏覽器、OS 和密碼管理器知道該填入什麼資料。值不是 <code>true</code>/<code>false</code>，而是來自 WHATWG 規格的標準關鍵字清單：<code>email</code>、<code>current-password</code>、<code>new-password</code>（讓密碼管理器建議新密碼）、<code>cc-number</code>、<code>cc-exp</code>、<code>billing postal-code</code>（前置 billing 表示帳單地址）。<code>autocomplete="off"</code> 告訴瀏覽器不要自動填入，但主流瀏覽器對 <code>current-password</code>/<code>cc-number</code> 欄位有時會忽略此設定（用戶體驗考量），不能完全依賴它做 security boundary。</p>

${code('html', `<!-- 完整表單元素展示 -->
<form id="checkout" action="/api/checkout" method="post" novalidate>
  <fieldset>
    <legend>購買者資訊</legend>

    <label for="name">姓名 <span aria-hidden="true">*</span></label>
    <input
      id="name"
      type="text"
      name="name"
      autocomplete="name"
      required
      aria-required="true"
    >

    <label for="email">Email <span aria-hidden="true">*</span></label>
    <input
      id="email"
      type="email"
      name="email"
      autocomplete="email"
      required
    >

    <!-- tel：帶 @ 的 email 鍵盤；若需純數字鍵盤用 inputmode="tel" -->
    <label for="phone">電話</label>
    <input
      id="phone"
      type="tel"
      name="phone"
      autocomplete="tel"
      inputmode="tel"
      pattern="[0-9\\-]+"
    >
  </fieldset>

  <fieldset>
    <legend>付款資訊</legend>

    <!-- cc-number：觸發信用卡 autofill，iOS 也會出現掃描信用卡選項 -->
    <label for="cc-num">信用卡卡號</label>
    <input
      id="cc-num"
      type="text"
      name="cardNumber"
      autocomplete="cc-number"
      inputmode="numeric"
      pattern="[0-9 ]{13,19}"
      placeholder="1234 5678 9012 3456"
    >

    <label for="cc-exp">到期日</label>
    <input id="cc-exp" type="text" name="cardExpiry" autocomplete="cc-exp" placeholder="MM/YY">

    <!-- new-password：讓密碼管理器建議強密碼 -->
    <label for="pwd">設定密碼</label>
    <input
      id="pwd"
      type="password"
      name="password"
      autocomplete="new-password"
      minlength="12"
    >
  </fieldset>

  <!-- datalist：提供建議但不強制選擇 -->
  <label for="city">城市</label>
  <input id="city" name="city" list="city-suggestions" autocomplete="address-level2">
  <datalist id="city-suggestions">
    <option value="台北市"></option>
    <option value="新北市"></option>
    <option value="桃園市"></option>
    <option value="台中市"></option>
  </datalist>

  <!-- output：顯示計算結果，for 屬性連結計算來源 -->
  <label for="total">訂單總計</label>
  <output id="total" name="total" for="qty price">NT$0</output>

  <button type="submit">確認購買</button>
</form>`)}

<div class="table-wrap">
<table class="info-table">
  <thead>
    <tr><th>input type</th><th>適用場景</th><th>行動鍵盤</th><th>注意事項</th></tr>
  </thead>
  <tbody>
    <tr><td><code>text</code></td><td>一般文字</td><td>全鍵盤</td><td>最通用的 fallback</td></tr>
    <tr><td><code>email</code></td><td>Email 地址</td><td>帶 @、.com 的鍵盤</td><td>驗證格式但不確認信箱是否存在</td></tr>
    <tr><td><code>tel</code></td><td>電話號碼</td><td>撥號鍵盤</td><td>不強制數字格式，允許 +()-</td></tr>
    <tr><td><code>number</code></td><td>數值（如年齡）</td><td>Android 數字盤，iOS 帶 +/-</td><td>輸入 "12e" 是合法值（科學記號），value 是字串</td></tr>
    <tr><td><code>text inputmode="numeric"</code></td><td>純數字（如 OTP、卡號）</td><td>數字鍵盤，無 +/-</td><td>搭配 <code>pattern="[0-9]*"</code> 限制格式</td></tr>
    <tr><td><code>date</code></td><td>日期選擇</td><td>日期選擇器</td><td>value 格式固定為 YYYY-MM-DD，不受語系影響</td></tr>
    <tr><td><code>password</code></td><td>密碼</td><td>全鍵盤（字元遮罩）</td><td>搭配 <code>autocomplete="current-password"</code> 或 <code>new-password"</code></td></tr>
    <tr><td><code>file</code></td><td>檔案上傳</td><td>—</td><td>accept 限制 MIME type；multiple 允許多選；需 enctype="multipart/form-data"</td></tr>
  </tbody>
</table>
</div>

<h2 id="native-validation">4.2 原生 Form Validation</h2>
<p>HTML5 的 <strong>Constraint Validation API</strong> 讓瀏覽器在 form submit 前自動檢查欄位是否符合指定條件，並顯示原生錯誤 UI（tooltip 形式，各平台外觀不同）。約束條件包括：<code>required</code>（不得為空）、<code>type</code> 隱含的格式驗證（<code>email</code> 必須有 @）、<code>pattern</code>（正則表達式）、<code>min</code>/<code>max</code>/<code>step</code>（數值 range）、<code>minlength</code>/<code>maxlength</code>（字元長度）。</p>

<p><strong>CSS pseudo-classes 的差異</strong>對 UX 設計有重大影響。<code>:invalid</code> 在頁面載入時立即觸發（只要 required 欄位是空的，它就是 :invalid），這會讓用戶還沒填就看到滿版紅色邊框。<code>:user-invalid</code>（CSS Selectors 4）只在用戶實際互動過（聚焦後離開、或嘗試提交）才觸發，是更友善的設計。搭配使用：<code>:user-invalid, :invalid:not(:focus):not(:placeholder-shown)</code> 可以近似這個行為，作為不支援 <code>:user-invalid</code> 的 fallback。</p>

<p><strong><code>ValidityState</code> 介面</strong>提供十個布林屬性，精確指出欄位哪裡不對：<code>valueMissing</code>（required 但為空）、<code>typeMismatch</code>（email type 格式錯）、<code>patternMismatch</code>（不符 pattern regex）、<code>tooLong</code>/<code>tooShort</code>（超過 maxlength / 不足 minlength）、<code>rangeUnderflow</code>/<code>rangeOverflow</code>（數值超出 min/max）、<code>stepMismatch</code>（不符 step 間距）、<code>badInput</code>（使用者輸入了瀏覽器無法解析的值，例如 type="number" 輸入了純文字）、<code>customError</code>（有自訂錯誤訊息）。<code>setCustomValidity('訊息')</code> 設定自訂錯誤（同時讓 <code>validity.customError = true</code>）；傳空字串清除它。</p>

${diagram(`
flowchart TD
    A["用戶操作 Submit / 呼叫 reportValidity()"] --> B{"每個欄位的 checkValidity()"}
    B -->|"validity.valid === true"| C["表單有效\n觸發 submit event\n或走 native navigation"]
    B -->|"validity.valid === false"| D["觸發 invalid event\n（每個無效欄位各一個）"]
    D --> E["瀏覽器顯示原生 tooltip 錯誤 UI\n（或自訂 event handler 接管）"]
    E --> F["focus 移至第一個無效欄位"]
    subgraph ValidityState["ValidityState 屬性"]
        vm["valueMissing — required 但為空"]
        tm["typeMismatch — email/url 格式錯"]
        pm["patternMismatch — 不符 pattern"]
        tl["tooLong / tooShort — 長度超界"]
        rv["rangeUnderflow / Overflow — 數值超界"]
        bi["badInput — 無法解析的輸入"]
        ce["customError — setCustomValidity() 設定"]
    end
    D -.->|"input.validity.*"| ValidityState
`, 'Constraint Validation API 的完整流程。novalidate 屬性可繞過整個流程，讓 JavaScript 完全接管驗證邏輯（但原生行為仍可用 checkValidity() 輔助）。')}

${code('javascript', `// 自訂驗證 UX：使用 ValidityState 顯示語意化錯誤訊息
function setupFormValidation(form) {
  // novalidate 讓瀏覽器不顯示原生 tooltip，但 constraint API 仍有效
  form.setAttribute('novalidate', '');

  // 在用戶離開欄位時驗證（:user-invalid 行為）
  form.addEventListener('blur', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
    validateField(input);
  }, { capture: true });

  form.addEventListener('submit', async event => {
    event.preventDefault();

    // checkValidity() 不顯示 UI；reportValidity() 會顯示原生錯誤 UI
    const inputs = [...form.querySelectorAll('input, textarea, select')];
    let firstInvalid = null;

    inputs.forEach(input => {
      validateField(input);
      if (!input.validity.valid && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    await submitForm(new FormData(form));
  });
}

function validateField(input) {
  const errorEl = document.getElementById(input.getAttribute('aria-describedby') ?? '');
  const v = input.validity;

  // 清除舊狀態
  input.setCustomValidity('');
  input.removeAttribute('aria-invalid');
  if (errorEl) errorEl.textContent = '';

  // 按優先順序判斷錯誤類型，給出具體訊息
  let message = '';
  if (v.valueMissing) {
    message = \`\${input.labels?.[0]?.textContent ?? '此欄位'} 為必填\`;
  } else if (v.typeMismatch && input.type === 'email') {
    message = '請輸入有效的 Email 地址（例如：user@example.com）';
  } else if (v.patternMismatch) {
    message = input.dataset.patternError ?? '格式不正確，請確認輸入';
  } else if (v.tooShort) {
    message = \`至少需要 \${input.minLength} 個字元，目前 \${input.value.length} 個\`;
  } else if (v.rangeUnderflow) {
    message = \`最小值為 \${input.min}\`;
  } else if (v.rangeOverflow) {
    message = \`最大值為 \${input.max}\`;
  }

  // 伺服器端錯誤（API 返回後呼叫）
  // input.setCustomValidity('此 Email 已被使用'); → validity.customError = true

  if (message) {
    input.setAttribute('aria-invalid', 'true');
    if (errorEl) errorEl.textContent = message;
  }
}`)}

${code('css', `/* :user-invalid 和 :invalid 的差異
   :invalid  → 頁面載入即觸發（required 欄位為空就是 invalid）
   :user-invalid → 需要用戶互動後才觸發（Chrome 119+, Firefox 88+, Safari 16.5+） */

/* 現代瀏覽器：用 :user-invalid */
input:user-invalid {
  border-color: #e53e3e;
}

/* Fallback：模擬 :user-invalid 行為
   :not(:focus) → 用戶離開後才顯示
   :not(:placeholder-shown) → 有輸入過（placeholder 被取代）才顯示 */
input:invalid:not(:focus):not(:placeholder-shown) {
  border-color: #e53e3e;
}

/* 同樣邏輯用在 :valid */
input:user-valid {
  border-color: #38a169;
}
input:valid:not(:focus):not(:placeholder-shown) {
  border-color: #38a169;
}

/* 自訂錯誤訊息區塊（配合 aria-describedby + aria-invalid） */
.field-error {
  color: #e53e3e;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  /* min-height 保留空間，防止錯誤出現時 layout shift */
  min-height: 1.25rem;
}`)}

<fe-demo-suite demo="form"></fe-demo-suite>

<h2 id="formdata">4.3 Form Submission 與 FormData</h2>
<p><code>enctype</code> 屬性決定 form 資料序列化為 request body 的格式。<strong><code>application/x-www-form-urlencoded</code></strong>（預設）：把欄位序列化為 <code>key=value&amp;key=value</code>，特殊字元 percent-encoded。簡單、輕量，但 <strong>無法上傳檔案</strong>（檔案是 binary 資料，percent-encoding 後體積膨脹 3 倍，且無法保留 MIME type）。<strong><code>multipart/form-data</code></strong>：把每個欄位用 boundary 分隔成獨立的 part，每個 part 可以是任意 binary 資料並附帶 <code>Content-Type</code>。File upload 必須用這個 enctype。<strong><code>text/plain</code></strong>：除了 debugging 幾乎沒有使用場景，不做 percent-encoding，任何特殊字元都可能被誤解析。</p>

<p><strong><code>FormData</code> API</strong> 讓 JavaScript 程式化地建立和操作表單資料，不需要有實際的 <code>&lt;form&gt;</code> 元素。<code>new FormData(formElement)</code> 從已存在的 form 建立 FormData（只包含有 <code>name</code> 屬性的欄位）；<code>formData.append(key, value)</code>、<code>formData.set(key, value)</code>（set 會取代已有的同名欄位）、<code>formData.getAll(key)</code>（同名欄位可有多個，如 checkbox）。傳給 <code>fetch</code> 的 <code>body</code> 時，自動帶正確的 <code>Content-Type: multipart/form-data; boundary=...</code>，不需要手動設定。</p>

<p><strong><code>formdata</code> event</strong> 是一個常被忽略的鉤子：在 <code>FormData</code> 物件建立時觸發（包括 form submit 時和 <code>new FormData(form)</code> 時），可以在 event handler 裡用 <code>event.formData.append()</code> 動態加入欄位，例如 CSRF token、用戶識別資訊或計算後的衍生值。</p>

${diagram(`
graph LR
    subgraph enctype["enctype 選擇"]
        url["application/x-www-form-urlencoded\\n（預設）\\nname=value%26key%3Dval"]
        multi["multipart/form-data\\n（檔案上傳必用）\\n每欄位用 boundary 分隔"]
        plain["text/plain\\n（幾乎不用）"]
    end
    subgraph FormDataAPI["FormData API"]
        fd["new FormData(form)"]
        methods["append / set / get\\ngetAll / delete / has"]
        iter["entries() / keys()\\nvalues() — 可迭代"]
    end
    url -->|"只適合文字欄位"| submit["fetch / XMLHttpRequest\\nContent-Type 自動設定"]
    multi -->|"支援 File, Blob"| submit
    fd --> submit
    methods --> fd
`, 'enctype 的選擇決定了 body 的序列化格式。只要 form 裡有 type="file"，就必須使用 multipart/form-data。FormData API 讓 JS 能程式化構建 multipart 請求。')}

${code('javascript', `// FormData 完整使用示範
const form = document.querySelector('#upload-form');

// 方式 1：從 form element 建立（自動包含所有有 name 的欄位）
form.addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(form);

  // 動態附加額外欄位（例如 CSRF token）
  data.append('_csrf', getCsrfToken());

  // 附加計算出的 metadata
  data.append('uploadedAt', new Date().toISOString());
  data.append('clientTimezone', Intl.DateTimeFormat().resolvedOptions().timeZone);

  // 傳給 fetch 時，Content-Type: multipart/form-data; boundary=... 自動設定
  // 不要手動設定 Content-Type，否則 boundary 會遺失
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: data,
    // 注意：不要設 'Content-Type': 'multipart/form-data'！
    // 少了 boundary，server 無法解析
  });
});

// 方式 2：從 formdata event 注入（更早介入，適合 CSRF token）
form.addEventListener('formdata', event => {
  event.formData.append('_csrf', getCsrfToken());
  // 這裡修改的是 submit 時實際使用的 FormData
});

// 方式 3：程式化建立，不需要 form 元素
async function uploadFile(file, metadata) {
  const data = new FormData();
  data.set('file', file, file.name);  // 第三個參數覆蓋 filename
  data.set('title', metadata.title);
  data.set('type', file.type);

  return fetch('/api/files', { method: 'POST', body: data });
}

// 從 FormData 讀取（包含多值欄位）
const fd = new FormData(form);
const allTags = fd.getAll('tags');  // checkbox group 可能有多個同名欄位
const payload = Object.fromEntries(fd);  // 注意：多值欄位只取最後一個值

// 進度追蹤（XMLHttpRequest，fetch 目前不支援 upload progress）
function uploadWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener('load', () => resolve(xhr.response));
    xhr.addEventListener('error', reject);
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}`)}

<div class="callout">
  <div class="callout-title">Senior 信號：Progressive Enhancement 的 form 設計</div>
  <p>Progressive Enhancement 要求：即使 JavaScript 完全失效，form 仍能透過 native HTML submission 運作。這意味著 <code>&lt;form action="/api/checkout" method="post"&gt;</code> 中的 <code>action</code> 必須指向能處理 form submission 的真實 server endpoint，而不是 <code>action="#"</code> 或 <code>action="javascript:void(0)"</code>。JavaScript 的角色是「增強」：提供即時驗證、fetch API 送出、上傳進度、優化錯誤提示，但這些都是可選的改善，不是必要路徑。</p>
</div>

<fe-demo-suite demo="formdata"></fe-demo-suite>

<h2 id="contenteditable">4.4 ContentEditable 與 Rich Text Editing</h2>
<p><code>contenteditable="true"</code> 讓任何 HTML 元素變成可編輯區塊，瀏覽器自動處理游標顯示、鍵盤輸入、Undo/Redo 堆疊。然而，<code>contenteditable</code> 本身幾乎是 rich text editor 實作的最大挑戰來源，而非解法——因為每個瀏覽器對「按 Enter 插入段落」、「貼上 HTML」、「格式化選取範圍」的行為不一致，且這些行為無法可靠地控制。</p>

<p><strong><code>document.execCommand()</code> 的廢棄</strong>：這個 API 曾是 contenteditable 的格式化介面（<code>execCommand('bold')</code>、<code>execCommand('insertText', false, '...')</code>）。它被廢棄的原因：各瀏覽器實作不一致（尤其是 <code>insertParagraph</code> 在不同瀏覽器產生不同 HTML 結構）；沒有事務語意（無法原子化執行多個命令）；沒有 observer 可以監聽副作用；根本上是「對 DOM 副作用的隱式操作」，與現代框架的 immutable state 模型衝突。</p>

<p><strong>現代 rich text editor 的設計思路</strong>：ProseMirror（Notion、Linear 使用）用 schema 定義文件結構，把編輯操作抽象成 transactions（類似 git commit，每個操作有明確的 before/after state）；Lexical（Meta 開源，用於 Workplace、Instagram）在 React reconciler 外獨立管理編輯器狀態，能在 Worker 內運行；Slate 直接用 React component tree 表示文件；TipTap 是 ProseMirror 的高階封裝，適合快速接入。這些框架的共同特性是：<strong>自行接管 selection model 和 DOM 管理</strong>，不依賴 execCommand，並攔截所有 keyboard event 確保跨瀏覽器一致性。</p>

${diagram(`
sequenceDiagram
    actor U as 用戶（中文輸入法）
    participant I as Input
    participant C as contenteditable
    participant App as App Logic

    Note over U,App: IME 輸入流程
    U->>I: 按下注音 ㄓ
    I->>C: compositionstart（isComposing = true）
    Note over C: compositionstart 觸發，此時 value 還是空
    U->>I: 繼續輸入 ㄓㄨ
    I->>C: compositionupdate（data = "ㄓㄨ"）
    U->>I: 選字「注」
    I->>C: compositionend（data = "注"）
    I->>C: input event（最終 value 包含"注"）
    Note over U,App: 關鍵：Enter 鍵在 isComposing=true 期間不應觸發 Submit
    U->>I: 按 Enter（在 composition 中選字）
    I->>C: keydown（key="Enter", isComposing=true）
    C-->>App: 應攔截並忽略（勿送出訊息）
`, 'IME composition 流程。compositionstart 到 compositionend 期間，Enter 鍵的語意是「選字確認」而非「送出」。GenAI chat input 若不處理這個情況，中文使用者會在確認輸入法時誤送訊息。')}

${code('javascript', `// contenteditable + Selection / Range API 基礎操作
const editor = document.querySelector('[contenteditable]');

// 取得當前選取範圍
function getSelectionInfo() {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;

  const range = selection.getRangeAt(0);
  return {
    startContainer: range.startContainer,
    startOffset: range.startOffset,
    endContainer: range.endContainer,
    endOffset: range.endOffset,
    collapsed: range.collapsed,  // true = 只有游標，沒有選取範圍
    text: selection.toString(),  // 選取的純文字
  };
}

// 程式化設定游標位置
function setCursorAt(node, offset) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);  // 收縮成游標
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

// 在選取位置插入文字（不使用 execCommand）
function insertText(text) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();  // 刪除選取內容（若有）
  range.insertNode(document.createTextNode(text));
  // 把游標移到插入文字的結尾
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

// IME composition 處理（GenAI chat input 的核心）
let isComposing = false;

editor.addEventListener('compositionstart', () => {
  isComposing = true;
});
editor.addEventListener('compositionend', () => {
  isComposing = false;
  // compositionend 後的 keydown/keyup 是「選字確認」的後置事件
  // 用 setTimeout 讓 keydown handler 先執行完，再重置狀態
});

editor.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    // 在 IME composition 中，Enter = 選字確認，不送出
    if (isComposing || event.isComposing) return;
    // Shift+Enter = 換行
    if (event.shiftKey) return;
    // 否則 = 送出訊息
    event.preventDefault();
    submitMessage(editor.textContent.trim());
    editor.textContent = '';
  }
});

// contenteditable="plaintext-only"（Chrome 125+）
// 禁止貼上 rich text，解決「貼上後帶入 span/div 污染結構」的問題
// <div contenteditable="plaintext-only">...</div>
// 等效的舊做法：監聽 paste event + 手動讀 clipboardData.getData('text/plain')`)}

<fe-demo-suite demo="ime"></fe-demo-suite>

<h2 id="real-world-applications">真實場景應用</h2>
<div class="application-grid">
  <div class="mini-card">
    <h3>結帳流程的 autofill 優化</h3>
    <p>正確設定 <code>autocomplete</code>：<code>cc-number</code>、<code>cc-exp</code>、<code>cc-csc</code>（信用卡安全碼）、<code>billing postal-code</code>。iOS 上 <code>cc-number</code> 還會觸發「使用相機掃描信用卡」選項。這些設定讓結帳填表時間可縮短 40-60%。</p>
  </div>
  <div class="mini-card">
    <h3>GenAI Chat Input 的 IME 處理</h3>
    <p>中文、日文、韓文輸入法的 composition 期間，Enter 是選字鍵不是送出鍵。判斷方式：<code>event.isComposing</code> 為 <code>true</code>，或自行追蹤 <code>compositionstart</code>/<code>compositionend</code> 狀態。Safari 15 以下的 <code>isComposing</code> 有 bug，需要 workaround。</p>
  </div>
  <div class="mini-card">
    <h3>富文字編輯器選型</h3>
    <p>需要 schema validation + 版本控制（如 Notion）→ ProseMirror；需要 React 整合 + 快速開發 → TipTap（ProseMirror 封裝）；需要高效能 + 端側 AI 整合（如 Meta Workplace）→ Lexical；需要極度客製化且有 React 專業 → Slate。四者都自行接管 DOM，不用 execCommand。</p>
  </div>
</div>

<h2 id="pitfalls-tradeoffs">常見陷阱與取捨</h2>
<div class="tradeoff-grid">
  <div class="mini-card">
    <h3>:invalid 讓頁面載入就顯示錯誤</h3>
    <p>加了 <code>required</code> 但未設 <code>novalidate</code>，用 CSS <code>:invalid { border: red }</code> 會讓空白必填欄位在頁面載入時就顯示紅框。解法：改用 <code>:user-invalid</code>，或加 <code>novalidate</code> 轉由 JavaScript 控制驗證時機。</p>
  </div>
  <div class="mini-card">
    <h3>file upload 忘記設 enctype</h3>
    <p>沒有設 <code>enctype="multipart/form-data"</code> 的 form 上傳檔案，server 收到的只有空字串（檔案被編碼成空值）。這個錯誤在 dev 工具中很難發現，因為 Network panel 顯示請求有被送出，只是 body 的 file 部分是空的。</p>
  </div>
  <div class="mini-card">
    <h3>autocomplete="off" 的局限</h3>
    <p>主流瀏覽器對 <code>current-password</code> 和 <code>cc-number</code> 欄位有時忽略 <code>autocomplete="off"</code>（用戶體驗考量）。不能依賴它作為安全機制。真正需要防止自動填入（如 OTP 輸入框）應搭配 <code>autocomplete="one-time-code"</code>，明確告訴瀏覽器這是什麼性質的欄位。</p>
  </div>
  <div class="mini-card">
    <h3>ContentEditable 的 innerHTML 注入風險</h3>
    <p>contenteditable 的 <code>innerHTML</code> 是 XSS 的高風險區：貼上的 HTML 可能含有 <code>&lt;script&gt;</code> 或事件屬性。解法：只讀 <code>textContent</code>（純文字），或用 <code>DOMPurify</code> 清理；若需要保留 rich text 格式，用成熟的 rich text editor 框架，它們都有內建 sanitization。</p>
  </div>
</div>

<h2 id="interview-framing">面試回答框架</h2>
<ol>
  <li><strong>先說平台提供了什麼：</strong>Constraint Validation API、FormData、ValidityState 是瀏覽器原生提供的，不需要 JavaScript library 也能做基本表單驗證和序列化。</li>
  <li><strong>再說機制：</strong>enctype 決定序列化格式（file 必須 multipart）；<code>:user-invalid</code> vs <code>:invalid</code> 的觸發時機；IME composition 事件讓 Enter 有雙重語意；ContentEditable 為何比它看起來複雜十倍。</li>
  <li><strong>說取捨：</strong>原生驗證 UI 跨平台外觀不一致（用 novalidate 關閉）；FormData API 不支援 fetch 的 upload progress（需用 XHR）；execCommand 廢棄後 rich text 需引入成熟框架。</li>
  <li><strong>說驗證：</strong>關閉 JS 測試 native fallback；手機實機測試 virtual keyboard type；screen reader 測試 aria-invalid + error message 聯動。</li>
</ol>

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${esc(prev.title)}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${esc(next.title)}</span></a>` : ''}
</div>
`
