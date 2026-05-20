import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 18)

const prev = chapters.find(c => c.id === 17)
const next = chapters.find(c => c.id === 19)

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
  <div class="chapter-num">Chapter 18 · WebAssembly</div>
  <h1>Wasm 與 JavaScript 的互通機制</h1>
  <p>Wasm 和 JavaScript 不是孤立的兩個世界——它們必須緊密協作才能構成完整的應用。JavaScript 負責 DOM 操作、事件處理、I/O；Wasm 負責計算密集的核心邏輯。但這個「分工合作」有一個隱藏代價：<strong>每次跨越 JS/Wasm boundary 都有開銷</strong>。理解 linear memory 的資料共享機制、boundary cost 的本質、以及 Wasm GC 如何改變遊戲規則，是能真正把 Wasm 用好的關鍵。</p>
  <div class="chapter-tags">
    <span class="tag">wasm</span>
    <span class="tag">javascript</span>
    <span class="tag">performance</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 <code>instantiateStreaming</code> vs <code>instantiate</code> 的差異（streaming 在下載過程中就開始編譯）；能解釋 linear memory TypedArray view 的零拷貝機制（JS 和 Wasm 共享同一個 ArrayBuffer）；能說出 <code>memory.grow()</code> 後舊 TypedArray 會 detached 的陷阱；能說出 boundary cost 的含義並用 batching 緩解；能說出 Wasm GC proposal 讓 GC 語言不需要打包整個 runtime；能說出 <code>externref</code> 的意義（Wasm 直接持有 JS 物件引用，不需要整數 handle 映射）。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>把 Linear Memory 想成「共享白板」：JS 和 Wasm 共享同一個 ArrayBuffer，透過 TypedArray view 直接讀寫，不需要序列化。字串需要 TextEncoder（encode → Uint8Array → memory pointer），這是少數需要拷貝的場景。JS 物件（DOM node、Map、Set）在沒有 Reference Types 時只能用整數 handle 間接操作。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>影像處理：JS 把 <code>ImageData.data</code>（Uint8ClampedArray）寫入 Wasm memory，Wasm 就地修改像素，JS 讀回。加密：JS 把明文 encode 成 Uint8Array 寫進 memory，Wasm 就地加密。大量數值：一次傳入整個 Float32Array，Wasm 批次處理，避免每個元素一次 boundary crossing。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>Chrome DevTools Performance 中，JS→Wasm 呼叫在每個 frame 出現幾千次（boundary 太頻繁）；Wasm 函式自身執行時間短但 overhead 高；<code>memory.grow()</code> 後持有舊 buffer 的 TypedArray 變成 detached，導致讀寫到錯誤位置。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>Performance panel Main thread timeline 觀察 Wasm 呼叫頻率；<code>performance.mark()</code> 測量 boundary crossing 次數和總時間；比較逐個呼叫 vs 批次呼叫的 benchmark（差異常達 5-10x）；觀察 <code>memory.buffer.byteLength</code> 的成長確認沒有非預期 <code>grow()</code>。</p>
  </div>
</div>

<h2 id="instantiate">18.1 載入與實例化的最佳實踐</h2>
<p>Wasm 模組從 URL 到可呼叫，需要三步：<strong>下載</strong>→<strong>編譯</strong>（bytecode 到機器碼）→<strong>實例化</strong>（建立 instance，分配 memory）。<code>instantiateStreaming</code> 讓這三步盡量並行。</p>

${diagram(`
sequenceDiagram
    participant JS as JavaScript
    participant Net as Network
    participant Eng as Wasm Engine

    rect rgb(60, 20, 20)
        Note over JS,Eng: ❌ 低效：WebAssembly.instantiate(arrayBuffer)
        JS->>Net: fetch('/module.wasm')
        Net-->>JS: 等待完整下載...
        JS->>Eng: instantiate(bytes)
        Eng-->>JS: instance（兩段等待）
    end

    rect rgb(20, 60, 20)
        Note over JS,Eng: ✅ 最佳：WebAssembly.instantiateStreaming
        JS->>Net: fetch('/module.wasm')
        Net-->>Eng: 邊下載邊傳 bytes
        Eng->>Eng: 邊接收邊 compile（並行！）
        Eng-->>JS: instance（更早就緒）
    end
`, 'instantiateStreaming 讓下載和編譯並行，是 Wasm 載入的最佳實踐。')}

${code('javascript', `// ✅ 最佳實踐：instantiateStreaming
const { module, instance } = await WebAssembly.instantiateStreaming(
  fetch('/image-kernel.wasm'),  // 伺服器必須回應 Content-Type: application/wasm
  imports
);

// ✅ 可靠的回退模式（MIME type 不正確時）
async function loadWasm(url, imports) {
  try {
    return await WebAssembly.instantiateStreaming(fetch(url), imports);
  } catch {
    const bytes = await fetch(url).then(r => r.arrayBuffer());
    return WebAssembly.instantiate(bytes, imports);
  }
}

// ✅ 把編譯好的 Module 快取到 IndexedDB（避免重複 compile）
async function getOrCompileModule(url) {
  const cache = await caches.open('wasm-modules');
  const cached = await cache.match(url + '.compiled');
  if (cached) return cached.json(); // Module 是 structured cloneable！

  const response = await fetch(url);
  const module = await WebAssembly.compileStreaming(response.clone());
  // Module 無法直接快取到 HTTP Cache，但可以用 IDB 或 structured clone
  return module;
}

// 一個 Module 可以多次實例化（各自隔離的 memory）
const module = await WebAssembly.compileStreaming(fetch('/kernel.wasm'));
const [inst1, inst2] = await Promise.all([
  WebAssembly.instantiate(module, imports),
  WebAssembly.instantiate(module, imports),
]);
// inst1 和 inst2 共享 bytecode，但各有自己的 memory`)}

<h2 id="linear-memory">18.2 Linear Memory 與資料傳遞的零拷貝模式</h2>
<p>Wasm 的 Linear Memory 是一段連續的 ArrayBuffer，JS 和 Wasm 共享這同一塊記憶體。透過 TypedArray view，JS 可以直接讀寫 Wasm 的記憶體，不需要任何序列化——這是 JS/Wasm 溝通最高效的方式。</p>

${diagram(`
graph LR
    subgraph JS["JavaScript"]
        V1["new Uint8Array(memory.buffer, ptr, len)\nnew Float32Array(memory.buffer, ptr, len)"]
        Enc["TextEncoder / TextDecoder"]
    end

    subgraph Mem["Linear Memory（共享 ArrayBuffer）"]
        B0["ptr: 0x0000\n[圖片 RGBA bytes]"]
        B1["ptr: 0x4000\n[字串 UTF-8 bytes]"]
        B2["ptr: 0x8000\n[Float32 結果]"]
    end

    subgraph Wasm["Wasm"]
        Fn["exports.process(input_ptr, len)\n用指標直接操作記憶體"]
    end

    V1 <-->|"零拷貝讀寫"| Mem
    Enc -->|"encode → bytes"| Mem
    Fn <-->|"指標操作"| Mem

    style Mem fill:#1a2332,stroke:#f5a623
`, 'Linear Memory 是共享白板，TypedArray view 提供零拷貝讀寫，不需要序列化。')}

${code('javascript', `// 零拷貝資料傳遞的完整示範

const memory = new WebAssembly.Memory({ initial: 16, maximum: 256 });
const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/kernel.wasm'), { env: { memory } }
);

// === 案例 1：圖片像素資料（ImageData ↔ Wasm）===
async function grayscaleInWasm(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const size = imageData.data.byteLength;

  const ptr = instance.exports.alloc(size);

  // TypedArray view 指向 Wasm 記憶體的 ptr 位置（零拷貝 view）
  const wasmView = new Uint8ClampedArray(memory.buffer, ptr, size);
  wasmView.set(imageData.data);  // JS→Wasm 一次 memcpy（不可避免）

  instance.exports.apply_grayscale(ptr, canvas.width, canvas.height);

  // 從 Wasm 讀回（另一次 memcpy）
  imageData.data.set(new Uint8ClampedArray(memory.buffer, ptr, size));
  ctx.putImageData(imageData, 0, 0);

  instance.exports.free(ptr, size);
}

// === 案例 2：字串傳遞 ===
function callWithString(str) {
  const encoded = new TextEncoder().encode(str);
  const ptr = instance.exports.alloc(encoded.length + 1);
  const view = new Uint8Array(memory.buffer, ptr, encoded.length + 1);
  view.set(encoded);
  view[encoded.length] = 0;  // null terminator（C 慣例）
  const result = instance.exports.hash_string(ptr, encoded.length);
  instance.exports.free(ptr, encoded.length + 1);
  return result >>> 0;  // i32 轉 u32
}

// === ⚠ 陷阱：memory.grow() 後舊 TypedArray 變 detached ===
const view1 = new Uint8Array(memory.buffer);  // 建立 view
memory.grow(1);                               // 擴展記憶體！

console.log(view1.byteLength);  // 0（已 detached！）

// 最佳實踐：不要在模組層級快取 TypedArray
// 每次使用前重新建立 view
function getMemoryView() {
  return new Uint8Array(instance.exports.memory.buffer);
}`)}

<h2 id="boundary-cost">18.3 函式呼叫的 Boundary Cost</h2>
<p>JS 和 Wasm 互相呼叫有 overhead，每次呼叫都需要型別轉換和執行上下文切換。對每秒呼叫幾百萬次的熱路徑，這個成本會累積到可見的程度。Senior 面試能說「Wasm 不是萬靈丹，反而可能因為頻繁 boundary crossing 變慢」。</p>

${code('javascript', `// Boundary Cost 量化示範

const N = 100_000;

// ❌ 壞模式：每個元素一次呼叫
console.time('many-calls');
let sum1 = 0;
for (let i = 0; i < N; i++) {
  sum1 += instance.exports.square(i);  // N 次 boundary crossing
}
console.timeEnd('many-calls');  // ~50-200ms（主要是 overhead）

// ✅ 好模式：批次傳入整個陣列
console.time('batched');
const ptr = instance.exports.alloc(N * 4);
const inView = new Int32Array(memory.buffer, ptr, N);
for (let i = 0; i < N; i++) inView[i] = i;

const outPtr = instance.exports.alloc(N * 4);
instance.exports.square_batch(ptr, outPtr, N);  // 1 次 boundary crossing

let sum2 = 0;
const outView = new Int32Array(memory.buffer, outPtr, N);
for (let i = 0; i < N; i++) sum2 += outView[i];
console.timeEnd('batched');  // ~5-15ms（快 5-10x）

instance.exports.free(ptr, N * 4);
instance.exports.free(outPtr, N * 4);

// 實際案例：Particle System
// ❌ 每個粒子一次 Wasm 呼叫（10000 粒子 × 60fps = 60萬次/秒）
// ✅ 把所有粒子狀態放入 SharedArrayBuffer，
//   一次呼叫讓 Wasm 更新所有粒子，結果直接寫回

// 診斷 boundary 瓶頸：在 DevTools Performance 中，
// 如果 Wasm 函式出現在每個 frame 的 Main Thread timeline 成千上萬次，
// 且每次只有幾微秒，這就是 boundary 瓶頸的特徵`)}

<h2 id="wasm-gc">18.4 Wasm GC 與 Reference Types Proposal</h2>
<p>Wasm 1.0 只有四種數值型別。這個限制讓 GC 語言必須把整個 runtime 打包進去。Reference Types 和 Wasm GC proposal 從根本改變了這一點。</p>

${diagram(`
graph LR
    subgraph V1["Wasm 1.0（2017）"]
        T1["只有 i32 / i64 / f32 / f64\nGC 語言問題：\n需帶整個 JVM / Dart VM\n體積 5-20MB"]
    end

    subgraph RT["Reference Types（2021+）"]
        E1["externref：Wasm 直接持有 JS 物件引用\n不需要整數 handle 映射"]
        F1["funcref：型別安全的函式引用"]
    end

    subgraph WG["Wasm GC（Chrome 119+, 2023）"]
        S1["struct / array GC managed 型別"]
        B1["瀏覽器 GC 直接管理 Kotlin / Dart 物件"]
        R1["Kotlin/Wasm 體積：5MB → ~200KB"]
    end

    V1 --> RT --> WG
    style V1 fill:#1a2332,stroke:#e8505b
    style RT fill:#1a2332,stroke:#f5a623
    style WG fill:#1a2332,stroke:#4caf7d
`, 'Wasm GC 讓 GC 語言不再需要打包整個 runtime，Kotlin/Wasm 體積縮小約 25x。')}

${code('javascript', `// Reference Types（externref）：Wasm 直接持有 JS 物件

// 舊方式（Wasm 1.0）：用整數 handle 映射 JS 物件
const objectStore = new Map();
let nextId = 0;

const oldImports = {
  env: {
    store_object: () => {
      const id = nextId++;
      objectStore.set(id, someJSObject);
      return id;  // Wasm 只能操作這個整數 ID
    },
    get_property: (id, propPtr, len) => {
      const obj = objectStore.get(id);
      return obj[readString(memory, propPtr, len)];
    }
  }
};

// 新方式（有 externref，wasm-bindgen 自動生成）：
// Rust 端：
// #[wasm_bindgen]
// pub fn process_element(el: &web_sys::HtmlElement) {
//   el.set_inner_text("Hello from Rust!");  // 直接操作 DOM 物件
// }

// JS 端：
import { process_element } from './my_module.js';
const el = document.getElementById('output');
process_element(el);  // HtmlElement 以 externref 傳入 Wasm

// Wasm GC：feature detection（Chrome 119+ / Firefox 120+ / Safari 18+）
const supportsWasmGC = await WebAssembly.validate(
  new Uint8Array([0,97,115,109,1,0,0,0,4,4,1,95,0,0])
).catch(() => false);
console.log('Wasm GC supported:', supportsWasmGC);`)}

<fe-demo-suite demo="wasm-memory"></fe-demo-suite>

<h2 id="interop-summary">互通機制選型對照</h2>

<table class="issue-map">
  <thead>
    <tr><th>資料型別</th><th>傳遞策略</th><th>成本</th><th>適用場景</th></tr>
  </thead>
  <tbody>
    <tr><td>整數 / 浮點數</td><td>直接函式參數</td><td>最低</td><td>簡單數值計算</td></tr>
    <tr><td>二進位陣列</td><td>TypedArray + memory pointer</td><td>低（一次 memcpy）</td><td>圖片、音訊、視訊</td></tr>
    <tr><td>字串</td><td>TextEncoder + memory pointer</td><td>中（encode + memcpy）</td><td>短字串，偶爾呼叫</td></tr>
    <tr><td>JS 物件</td><td>externref（Reference Types）</td><td>低（引用傳遞）</td><td>wasm-bindgen / Wasm GC</td></tr>
    <tr><td>JSON / 複雜物件</td><td>改用 MessagePack 二進位</td><td>高，應設法避免</td><td>重新設計 API</td></tr>
  </tbody>
</table>

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${prev.title}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${next.title}</span></a>` : ''}
</div>
`
