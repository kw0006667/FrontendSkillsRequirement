import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 20)

const prev = chapters.find(c => c.id === 19)
const next = chapters.find(c => c.id === 21)

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
  <div class="chapter-num">Chapter 20 · WebAssembly</div>
  <h1>Wasm 進階主題與未來</h1>
  <p>Wasm 正在從「瀏覽器的補充技術」演進成「跨平台通用執行格式」。WASI 讓 Wasm 離開瀏覽器，成為伺服器端、邊緣計算、外掛系統的沙盒標準。Component Model 讓不同語言寫的 Wasm 模組能直接互呼叫。SharedArrayBuffer + Web Worker 讓 Wasm 真正多核心並行。而 Wasm 的 Debugging 工具鏈也在快速成熟中。本章是 Part V 的收尾，也是展望未來的起點。</p>
  <div class="chapter-tags">
    <span class="tag">wasm</span>
    <span class="tag">future</span>
    <span class="tag">wasi</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 WASI 是什麼（WebAssembly System Interface，讓 Wasm 在非瀏覽器環境執行系統呼叫的標準，Cloudflare Workers / Fastly Compute@Edge 用它執行使用者程式碼）；能說出 Component Model 的意義（讓不同語言的 Wasm 模組透過 WIT 定義介面互相呼叫，不需要 JavaScript 中介）；能說出使用 Wasm 多執行緒的前置條件（COOP + COEP headers 使頁面 cross-origin isolated，SharedArrayBuffer 才可用）；能說出在 Chrome DevTools 中 debug Wasm 的方法（需要 DWARF debug info，Emscripten 的 <code>-g</code> 旗標，或 Rust 的 <code>--profiling</code> build）。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>把 Wasm 想成「可攜式 CPU 指令集」：跟 Java Bytecode 的「Write Once, Run Anywhere」類似，但無 GC 負擔、安全沙盒是原生設計。WASI 是「可攜式 OS 系統呼叫介面」：讓同一個 .wasm 在瀏覽器、Node.js、Cloudflare Workers、嵌入式系統上執行相同邏輯，只是 WASI 實作不同。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>Cloudflare Workers 用 WASI 讓開發者上傳 .wasm 作為 Edge Function（隔離、快速啟動、低資源）。Component Model 讓 Rust 寫的圖片壓縮模組和 Go 寫的 JSON 解析模組直接組合，不需要 JS 包裝層。SharedArrayBuffer + Atomics 讓 ffmpeg.wasm 使用多執行緒並行處理多個視訊軌道。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>SharedArrayBuffer 可用的前提：<code>crossOriginIsolated === true</code>（需要 COOP: same-origin + COEP: require-corp headers）；缺少這兩個 header 會讓 ffmpeg.wasm 的多執行緒模式靜默降級到單執行緒；Wasm 程式 crash 但 DevTools 只顯示 <code>wasm-function[42]</code>（沒有 debug info，需要重新建置帶 DWARF 的版本）。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>用 <code>crossOriginIsolated</code> 屬性確認 cross-origin isolation 狀態；Chrome DevTools Application > Shared Workers 確認 SharedArrayBuffer 可用；Performance panel 的 Workers 軌道確認 Wasm Worker 真的在並行執行；Sources panel > Wasm 檔案確認可以設中斷點（需要 DWARF debug info）。</p>
  </div>
</div>

<h2 id="wasi">20.1 WASI 與瀏覽器外的 Wasm</h2>
<p>WebAssembly System Interface（WASI）是讓 Wasm 在非瀏覽器環境執行的系統呼叫標準。它的設計目標是：讓同一個 .wasm 檔案可以在瀏覽器、Node.js、伺服器、Edge Function 上執行，只需要不同的 WASI 實作提供能力。</p>

${diagram(`
graph TD
    subgraph Wasm["同一個 .wasm 模組"]
        W["image-compress.wasm\n（純計算邏輯）"]
    end

    subgraph Hosts["不同的執行環境（Host）"]
        Browser["瀏覽器\nWASI via wasmer-js\n或直接 Emscripten"]
        Node["Node.js\nwasm_bindgen + WASI adapter"]
        CF["Cloudflare Workers\nWASI 原生支援"]
        Fastly["Fastly Compute@Edge\nWASI 原生支援"]
        Embedded["嵌入式 / IoT\nwasm3 / wasmtime"]
    end

    W --> Browser
    W --> Node
    W --> CF
    W --> Fastly
    W --> Embedded

    style Wasm fill:#1a2332,stroke:#f5a623
    note["WASI 的能力模型：\n每個環境只暴露必要的系統呼叫\n瀏覽器：不允許 fs 直接存取\nCloudflare Workers：有限的 network + KV 能力"]
`, '同一個 .wasm 模組可以在不同環境執行，WASI 定義了可攜的系統呼叫介面。')}

${code('javascript', `// WASI 在 Cloudflare Workers 中的使用
// （Cloudflare Workers 原生支援 Wasm + WASI）

// wrangler.toml
// [[ rules ]]
// type = "CompiledWasm"
// globs = ["**/*.wasm"]

// worker.js
import wasmModule from './image-compress.wasm';

export default {
  async fetch(request) {
    const instance = await WebAssembly.instantiate(wasmModule, {
      wasi_snapshot_preview1: {
        // Cloudflare 提供最小化的 WASI 能力集
        fd_write: (fd, iovs, iovs_len, nwritten_ptr) => { /* stdout/stderr */ },
        proc_exit: (code) => { throw new Error(\`Exit: \${code}\`); },
        // 注意：沒有 fs 存取（sandbox 保護）
      }
    });

    const imageData = await request.arrayBuffer();
    const ptr = instance.exports.alloc(imageData.byteLength);
    new Uint8Array(instance.exports.memory.buffer, ptr, imageData.byteLength)
      .set(new Uint8Array(imageData));

    const outPtr = instance.exports.compress_jpeg(ptr, imageData.byteLength, 80);
    const outLen = instance.exports.last_output_size();
    const result = new Uint8Array(instance.exports.memory.buffer, outPtr, outLen).slice();

    instance.exports.free(ptr, imageData.byteLength);

    return new Response(result, {
      headers: { 'Content-Type': 'image/jpeg' }
    });
  }
};

// 為什麼 Cloudflare 用 Wasm（而不是讓用戶上傳 JS）？
// 1. 安全隔離：Wasm sandbox 比 JS VM 更嚴格
// 2. 快速冷啟動：Wasm 模組可以預先編譯，啟動時間 <1ms
// 3. 多語言支援：用戶可以用 Rust、Go、C++ 寫 Edge Function`)}

<p><strong>WASI Preview 2（Component Model）</strong>：WASI 的下一個版本引入了 Component Model，讓 Wasm 模組能組合成更大的系統，而不只是單一的二進位執行檔。</p>

<h2 id="component-model">20.2 Component Model 與 WIT</h2>
<p>Wasm Component Model 是 Wasm 生態的「下一個十年」基礎設施。它解決了一個根本問題：目前每個 Wasm 模組都是孤立的，不同語言寫的模組無法直接互呼叫（必須透過 JS 中介或共享 memory 的複雜協議）。</p>

${diagram(`
graph LR
    subgraph WIT["WIT（WebAssembly Interface Types）介面定義"]
        Interface["interface image-processing {\n  record Image {\n    data: list<u8>,\n    width: u32,\n    height: u32,\n  }\n  compress: func(img: Image, quality: u8) -> Image;\n}"]
    end

    subgraph Components["Wasm Components"]
        Rust["compress.wasm\n（Rust 實作）"]
        Go["classify.wasm\n（Go / TinyGo 實作）"]
        Python["transform.wasm\n（Python + Wasm GC）"]
    end

    subgraph Composition["組合後的系統"]
        App["image-pipeline.wasm\n= compress + classify + transform\n無需 JavaScript 中介！"]
    end

    WIT -->|"自動生成 binding"| Rust
    WIT -->|"自動生成 binding"| Go
    WIT -->|"自動生成 binding"| Python
    Rust --> App
    Go --> App
    Python --> App

    style WIT fill:#1a2332,stroke:#f5a623
    style App fill:#1a2332,stroke:#4caf7d
`, 'WIT 定義跨語言介面，Component Model 讓不同語言的 Wasm 模組直接組合。')}

${code('javascript', `// WIT（WebAssembly Interface Types）介面定義範例
// 這是 .wit 格式（不是 JavaScript！）
/*
// image.wit
package example:image;

interface types {
  record image {
    data: list<u8>,
    width: u32,
    height: u32,
    format: format-type,
  }

  enum format-type {
    jpeg,
    png,
    webp,
    avif,
  }
}

interface processing {
  use types.{image};
  compress: func(input: image, quality: u8) -> image;
  grayscale: func(input: image) -> image;
  resize: func(input: image, max-width: u32, max-height: u32) -> image;
}

world image-processor {
  export processing;
}
*/

// WIT 工具鏈自動生成 JavaScript binding：
// wit-bindgen js --world image-processor image.wit

// 生成的 JavaScript 使用方式（類型安全！）
import { compress, grayscale } from './image-processor-component.js';

const input = {
  data: new Uint8Array(imageBuffer),
  width: 1920,
  height: 1080,
  format: 'jpeg',  // 符合 WIT enum 定義
};

const compressed = compress(input, 75);     // Rust 實作
const grayImage = grayscale(compressed);    // Go 實作

// 為什麼這很重要？
// 1. 型別安全的跨語言介面（WIT 是強型別 IDL）
// 2. 無需 JavaScript 作為中介（直接 Wasm→Wasm 呼叫）
// 3. 組合性：Rust 的壓縮 + Go 的分類 + Python 的轉換，組成一個 pipeline
// 4. 工具鏈成熟度：wasmtime、jco（js component toolchain）已可生產使用`)}

<h2 id="threads-sab">20.3 Wasm + Web Worker + SharedArrayBuffer</h2>
<p>真正發揮 Wasm 多核心優勢需要三個元件共同作用：<strong>Web Worker</strong>（獨立執行緒）、<strong>SharedArrayBuffer</strong>（跨 Worker 共享記憶體）、<strong>Atomics API</strong>（同步原語）。但這個組合有一個必要前提：<strong>Cross-Origin Isolation</strong>。</p>

${diagram(`
graph TD
    subgraph COOP_COEP["Cross-Origin Isolation 前置條件"]
        Header1["Cross-Origin-Opener-Policy: same-origin"]
        Header2["Cross-Origin-Embedder-Policy: require-corp"]
        Check["crossOriginIsolated === true"]
        SAB["SharedArrayBuffer 可用"]
        Header1 --> Check
        Header2 --> Check
        Check --> SAB
    end

    subgraph ThreadArch["多執行緒架構"]
        Main["Main Thread\n（UI / 輸入事件 / 結果呈現）"]
        SABMem["SharedArrayBuffer\n（Wasm 的 linear memory）\n多個 Worker 共享！"]
        W1["Worker 1\n（Wasm 執行緒 1）"]
        W2["Worker 2\n（Wasm 執行緒 2）"]
        W3["Worker 3\n（Wasm 執行緒 3）"]
        Atomics["Atomics API\n（mutex、semaphore、wait/notify）"]
    end

    COOP_COEP -->|"啟用"| ThreadArch
    Main <-->|"postMessage 分配任務"| W1
    Main <-->|"postMessage 分配任務"| W2
    Main <-->|"postMessage 分配任務"| W3
    W1 <-->|"直接讀寫"| SABMem
    W2 <-->|"直接讀寫"| SABMem
    W3 <-->|"直接讀寫"| SABMem
    Atomics -.->|"同步"| SABMem

    style COOP_COEP fill:#1a2332,stroke:#e8505b
    style ThreadArch fill:#1a2332,stroke:#4caf7d
`, 'Wasm 多執行緒需要 COOP + COEP headers 啟用 Cross-Origin Isolation，SharedArrayBuffer 才可用。')}

${code('javascript', `// Wasm + SharedArrayBuffer 多執行緒實作

// ✅ 第一步：確認 Cross-Origin Isolation
if (!crossOriginIsolated) {
  console.warn('需要 COOP + COEP headers 才能使用 SharedArrayBuffer');
  console.warn('在 Nginx / Express 中設置：');
  console.warn('  Cross-Origin-Opener-Policy: same-origin');
  console.warn('  Cross-Origin-Embedder-Policy: require-corp');
  // 降級到單執行緒版本
}

// ✅ 第二步：建立共享記憶體（SharedArrayBuffer）
const sharedMemory = new WebAssembly.Memory({
  initial: 64,    // 64 pages = 4MB
  maximum: 256,
  shared: true,   // ← 這讓 ArrayBuffer 變成 SharedArrayBuffer
});

// ✅ 第三步：把同一個 memory 傳給多個 Worker
const workerCount = Math.max(1, navigator.hardwareConcurrency - 1);
const workers = Array.from({ length: workerCount }, (_, i) => {
  const worker = new Worker('/wasm-worker.js', { type: 'module' });
  worker.postMessage({
    type: 'init',
    memory: sharedMemory,  // SharedArrayBuffer 可以 postMessage 傳送（不是拷貝！）
    workerId: i,
    totalWorkers: workerCount,
  });
  return worker;
});

// ✅ 第四步：分配工作（例如：把大圖切分成橫條，每個 Worker 處理一條）
async function processImageParallel(imageData) {
  const chunkSize = Math.ceil(imageData.height / workerCount);

  // 把圖片資料寫入共享記憶體
  const inputPtr = wasmExports.alloc(imageData.data.byteLength);
  new Uint8ClampedArray(sharedMemory.buffer, inputPtr, imageData.data.byteLength)
    .set(imageData.data);

  const outputPtr = wasmExports.alloc(imageData.data.byteLength);

  // 發送任務給每個 Worker
  const promises = workers.map((worker, i) => {
    return new Promise(resolve => {
      const startRow = i * chunkSize;
      const endRow = Math.min((i + 1) * chunkSize, imageData.height);

      worker.onmessage = (e) => {
        if (e.data.type === 'done' && e.data.workerId === i) resolve();
      };

      worker.postMessage({
        type: 'process',
        workerId: i,
        inputPtr,
        outputPtr,
        width: imageData.width,
        startRow,
        endRow,
      });
    });
  });

  await Promise.all(promises);  // 等待所有 Worker 完成

  // 從共享記憶體讀回結果
  const result = new Uint8ClampedArray(sharedMemory.buffer, outputPtr, imageData.data.byteLength);
  return new ImageData(result.slice(), imageData.width, imageData.height);
}

// wasm-worker.js
// self.onmessage = async ({ data }) => {
//   if (data.type === 'init') {
//     const { instance } = await WebAssembly.instantiateStreaming(
//       fetch('/kernel.wasm'),
//       { env: { memory: data.memory } }
//     );
//     self._instance = instance;
//     self._workerId = data.workerId;
//   }
//   if (data.type === 'process') {
//     self._instance.exports.process_rows(
//       data.inputPtr, data.outputPtr, data.width, data.startRow, data.endRow
//     );
//     self.postMessage({ type: 'done', workerId: data.workerId });
//   }
// };

// === Atomics API：同步多個 Worker 的寫入 ===
const lockBuffer = new SharedArrayBuffer(4);  // 1 個 i32 作為 mutex
const lock = new Int32Array(lockBuffer);

// Worker 端取得 mutex（Atomics.wait 讓 Worker 等待）
function acquireLock() {
  while (Atomics.compareExchange(lock, 0, 0, 1) !== 0) {
    Atomics.wait(lock, 0, 1);  // 等待 lock 變成 0
  }
}

function releaseLock() {
  Atomics.store(lock, 0, 0);
  Atomics.notify(lock, 0, 1);  // 通知一個等待的 Worker
}`)}

<h2 id="debug-profiling">20.4 Wasm 的 Debugging 與 Profiling</h2>
<p>Wasm 的 debugging 體驗在 2020 年後大幅改善，主要靠 <strong>DWARF debug info</strong>——一種把 Wasm 字節碼位置映射回原始 C++/Rust 程式碼的 debug format，讓 Chrome DevTools 可以顯示原始程式碼而不是 Wasm 指令。</p>

${code('bash', `# Emscripten：保留 debug info
emcc my_code.cpp -o output.js \\
  -g                          # 保留 DWARF debug info
  -gsource-map                # 同時生成 source map
  --source-map-base /         # source map 的基礎路徑
  -O1                         # 輕度優化（-O0 debug 資訊最完整，-O2 會讓 debug 更困難）

# Rust：debug build（預設保留 debug info）
wasm-pack build --debug       # 完整 debug info，大 bundle
wasm-pack build --profiling   # 優化 + 保留函式名稱（最適合 profiling）
wasm-pack build --release     # 最小化（去除 debug info）

# 在 Chrome DevTools 中啟用 Wasm debug extension
# DevTools Settings > Experiments > "WebAssembly Debugging: Enable DWARF support"
# 或安裝 Chrome DevTools Extension: C/C++ DevTools Support

# 查看 .wasm 的 WAT 文字格式（不需要原始碼）
wasm2wat module.wasm -o module.wat  # 需要 wabt 工具

# 分析 Rust wasm 的 size
cargo install twiggy
twiggy top -n 20 target/wasm32-unknown-unknown/release/my_module.wasm
# 找出哪些函式佔用最多空間`)}

${code('javascript', `// JavaScript 端的 Wasm profiling

// 方式 1：用 performance.mark() 測量 Wasm 呼叫時間
performance.mark('wasm-start');
const result = instance.exports.heavy_computation(inputPtr, outputPtr, size);
performance.mark('wasm-end');
const measure = performance.measure('wasm-compute', 'wasm-start', 'wasm-end');
console.log(\`Wasm 執行時間：\${measure.duration.toFixed(2)}ms\`);

// 方式 2：在 Chrome DevTools Performance panel 中查看 Wasm
// 1. 開啟 DevTools > Performance
// 2. 點擊「錄製」
// 3. 執行 Wasm 程式碼
// 4. 停止錄製
// 在 Main Thread 的 Flame Chart 中，Wasm 函式會顯示為：
// - 有 DWARF：顯示原始 C++/Rust 函式名稱（例如 "MyClass::processImage"）
// - 無 DWARF：只顯示 "wasm-function[42]"（幾乎無法解讀）

// 方式 3：觀察 Linear Memory 的使用情況
// Chrome DevTools > Memory > Take heap snapshot
// 搜尋 "WebAssembly.Memory" 可以找到 Wasm 的 ArrayBuffer

// 常見 Wasm debug 問題和解法
const debugTips = [
  {
    problem: "wasm-function[42] 無法識別",
    cause: "沒有 DWARF debug info",
    fix: "重新 build 帶 -g 旗標（Emscripten）或 --debug（wasm-pack）",
  },
  {
    problem: "memory.buffer detached",
    cause: "memory.grow() 後持有舊 TypedArray",
    fix: "每次使用前重新建立 TypedArray view",
  },
  {
    problem: "SharedArrayBuffer is not defined",
    cause: "缺少 COOP + COEP headers",
    fix: "伺服器設置 Cross-Origin-Opener-Policy + Cross-Origin-Embedder-Policy",
  },
  {
    problem: "Wasm 執行比純 JS 慢",
    cause: "boundary crossing 太頻繁，或 Wasm 啟動成本未被分攤",
    fix: "批次化呼叫；或確認啟動成本只計算一次（lazy init）",
  },
];

// 在 Memory 面板中觀察 Wasm 記憶體洩漏
// 問題症狀：memory.buffer.byteLength 持續增長，從不縮小
// 診斷：每次快照比對 WebAssembly.Memory 的大小
// 解法：確保每次 alloc() 都有對應的 free()`)}

<fe-demo-suite demo="wasm-threads"></fe-demo-suite>

<h2 id="wasm-future">Wasm 的未來路線圖</h2>
<p>從 2024-2026 年的 Wasm 標準化進程，可以預見幾個對前端工程師有直接影響的能力：</p>

<table class="issue-map">
  <thead>
    <tr><th>Proposal</th><th>狀態（2025）</th><th>對前端的意義</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Wasm GC</td>
      <td>✅ 標準化，Chrome 119+ / Firefox 120+</td>
      <td>Kotlin/Wasm、Dart/Wasm 不需要帶 runtime，bundle 縮小 10-25x</td>
    </tr>
    <tr>
      <td>Reference Types</td>
      <td>✅ 廣泛支援</td>
      <td>Wasm 直接持有 JS 物件引用，wasm-bindgen 更高效</td>
    </tr>
    <tr>
      <td>Wasm SIMD</td>
      <td>✅ 廣泛支援</td>
      <td>向量化計算（128-bit SIMD）加速圖像、ML 推論 2-4x</td>
    </tr>
    <tr>
      <td>Wasm Threads</td>
      <td>✅ 廣泛支援（需 COOP/COEP）</td>
      <td>多核心並行，ffmpeg.wasm 多執行緒轉碼</td>
    </tr>
    <tr>
      <td>Component Model</td>
      <td>⚡ 快速成熟（wasmtime 1.0 支援）</td>
      <td>跨語言模組組合，未來 npm 套件可能是 .wasm 元件</td>
    </tr>
    <tr>
      <td>Exception Handling</td>
      <td>⚡ Chrome / Firefox 支援</td>
      <td>C++ 的 try/catch 可以更自然地映射到 Wasm</td>
    </tr>
    <tr>
      <td>Tail Calls</td>
      <td>⚡ 標準化中</td>
      <td>函數式語言（Scheme、OCaml）的 tail-call 優化</td>
    </tr>
    <tr>
      <td>Relaxed SIMD</td>
      <td>⚡ 進行中</td>
      <td>更廣泛的 SIMD 指令集，ML 推論進一步加速</td>
    </tr>
  </tbody>
</table>

${code('javascript', `// Senior 面試：Wasm 的未來展望問答框架

const wasmFutureQA = {
  question: "你認為 WebAssembly 在未來 5 年對前端的影響是什麼？",

  answer: \`
我看到三個具體的趨勢：

1. **端側 AI 推論的標準路徑**
   WebGPU + Wasm SIMD 讓瀏覽器能跑 1B-7B 參數的模型。
   transformers.js、WebLLM 已經証明可行性。
   對 Microsoft 的產品線而言，部分 Copilot 能力未來可能在端側完成，
   解決隱私和成本問題。

2. **npm 生態的二進位化**
   wasm-bindgen 讓 Rust 套件以 npm 套件形式發布，
   前端工程師不需要知道底層是 Rust。
   Component Model 成熟後，npm 上的高效能計算套件
   可能直接是 .wasm 元件，而不是 JS 包裝器。

3. **Edge Computing 的標準執行格式**
   Cloudflare、Fastly、Shopify 都用 Wasm 做 Edge Function 沙盒。
   WASI 讓同一份 business logic 可以跑在 Edge、瀏覽器、伺服器，
   這會讓「前端/後端」的邊界更模糊。

我不認為 Wasm 會取代 JavaScript——
JavaScript 在 DOM 操作、快速迭代、生態系豐富度上仍是霸主。
Wasm 的價值在於把「無法在瀏覽器做的事」帶進瀏覽器，
以及讓多語言生態能無縫協作。
  \`,
};

// 一行總結：Wasm 不是 JS 的替代，而是 Web Platform 能力的邊界擴展器。`)}

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${prev.title}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${next.title}</span></a>` : ''}
</div>
`
