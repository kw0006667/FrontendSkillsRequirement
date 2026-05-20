import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 16)

const prev = chapters.find(c => c.id === 15)
const next = chapters.find(c => c.id === 17)

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
  <div class="chapter-num">Chapter 16 · WebAssembly</div>
  <h1>WebAssembly 起源與設計哲學</h1>
  <p>WebAssembly（Wasm）在 2017 年成為 W3C 標準，是繼 HTML、CSS、JavaScript 之後，瀏覽器正式支援的第四種語言格式。但它不是 JavaScript 的競爭者，而是一種<strong>低階可攜式執行格式</strong>，讓 C、C++、Rust、Go、C# 等語言的程式碼能以接近原生速度在瀏覽器沙盒中執行。理解 Wasm 的設計哲學——capability-based security、linear memory model、stack machine 指令集——是能正確評估「何時用 Wasm」的前提。</p>
  <div class="chapter-tags">
    <span class="tag">wasm</span>
    <span class="tag">security</span>
    <span class="tag">performance</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 Wasm 與 JavaScript 的根本差異（Wasm 是低階 stack machine bytecode，JS 是高階動態語言；Wasm 不能直接碰 DOM）；能解釋 Wasm sandbox 的 capability-based 模型（所有外部能力必須由 host 顯式注入 imports 物件）；能說出 asm.js 的歷史意義與它的限制（TypeScript 的嚴格子集，靠 JIT 特判優化，但 parse 慢、無 binary format）；能說出 Wasm GC proposal 解決了什麼問題（讓 Java/Kotlin/Dart 這類 GC 語言不用把整個 runtime 打包進去）；能說出 Blazor WASM 的 interpreted vs AOT 取捨。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>把 Wasm 想成「LLVM IR 的瀏覽器版本」：它是高階語言的編譯目標，不是給人直接寫的語言。一個 <strong>Module</strong>（<code>.wasm</code> 檔案）是靜態描述，<strong>Instance</strong> 是執行期實例，<strong>Linear Memory</strong> 是唯一可讀寫的記憶體空間（一段 ArrayBuffer），<strong>Table</strong> 存放函式引用。JS 與 Wasm 透過 imports/exports 互通。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>既有 C++ codebase（CAD、影像處理、遊戲引擎）透過 Emscripten 移植到瀏覽器。Rust 實作密集計算核心，用 wasm-bindgen 生成 JS 接口，發布為 npm 套件。Blazor WASM 讓 C# 團隊不學 TypeScript 也能做前端。AssemblyScript 讓 TS 開發者寫出接近原生效能的 Wasm 模組。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>首屏白屏但 Wasm 模組未下載完成（啟動成本未被計入）；JS/Wasm boundary 呼叫過於頻繁導致比純 JS 更慢；Wasm 模組下載後仍需 compile+instantiate 時間（應使用 <code>instantiateStreaming</code>）；Blazor WASM 首次載入 10MB+ DLL（未啟用 AOT 或 lazy loading）。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>Chrome DevTools Performance 面板中，Wasm 函式會出現在 Main thread timeline；Network 面板確認 <code>.wasm</code> 下載啟用 streaming compile（Response Type 為 <code>application/wasm</code>）；<code>performance.mark()</code> 分別標記 instantiate 前後；Chrome DevTools Memory 面板觀察 Wasm linear memory 成長。</p>
  </div>
</div>

<h2 id="asmjs-to-wasm">16.1 從 asm.js 到 Wasm 的演進</h2>
<p>WebAssembly 的誕生不是憑空而來，它建立在 2013 年 Mozilla 提出的 <strong>asm.js</strong> 實驗上。asm.js 是 JavaScript 的嚴格型別子集：透過 <code>|0</code>（整數轉型）、<code>+x</code>（浮點轉型）等特殊語法，告訴 JS 引擎這段程式碼只使用靜態可推斷的型別，讓 JIT 能做出接近原生的優化。</p>

<p>asm.js 的概念驗證了「JavaScript 引擎有能力接近 native 效能」，但它有根本限制：</p>
<ul>
  <li><strong>Text format</strong>：asm.js 是純文字 JavaScript，必須先被 JS parser 完整解析，再由 JIT 識別 asm.js pragma 做特別處理，parse 時間與記憶體消耗遠高於必要。</li>
  <li><strong>引擎依賴</strong>：asm.js 優化只在 Firefox SpiderMonkey 上效果最好，Chrome V8 與 Safari JSC 的優化程度差異很大。</li>
  <li><strong>無 binary format</strong>：所有程式碼都以 ASCII 傳輸，不必要地佔用頻寬。</li>
</ul>

${diagram(`
timeline
    title WebAssembly 演進時間線
    2013 : Mozilla 發布 asm.js
         : Emscripten 支援 asm.js 目標
    2015 : Chrome / Firefox / Edge 達成 Wasm MVP 共識
         : 第一個 Wasm 瀏覽器 demo（Unity 遊戲引擎）
    2017 : W3C 正式 WebAssembly 1.0 標準
         : 四大瀏覽器同時發布支援
    2019 : WASI 草案（伺服器端 Wasm 標準）
         : wasm-bindgen 1.0、Blazor WebAssembly preview
    2022 : Wasm GC proposal 進入 Phase 4
         : WasmThreads 廣泛支援（需 COOP/COEP）
    2023 : Wasm GC 正式標準化（Chrome 119+）
         : Component Model / WIT 草案成熟
    2024 : WASM GC 全瀏覽器支援
         : Blazor .NET 8 AOT 改善啟動時間
`, 'asm.js 是 Wasm 的先驅實驗，Wasm 在 2017 年成為四大瀏覽器的共同標準。')}

<p>Wasm 二進位格式（<code>.wasm</code>）解決了 asm.js 的所有痛點：parse 速度比等效 JS 快 10-20 倍（因為格式設計就是為了快速解碼），檔案體積更小，跨引擎行為一致，且不依賴 JIT 特判優化。</p>

${code('javascript', `// asm.js 風格（2013 年的寫法，現已被 Wasm 取代）
"use asm"; // pragma：告訴引擎這是 asm.js
function add(x, y) {
  x = x | 0;  // |0 強制轉 int32
  y = y | 0;
  return (x + y) | 0;
}

// 等價的 Wasm WAT（WebAssembly Text Format）
// 這是 Wasm 二進位的人類可讀版本，通常不會手寫
/*
(module
  (func $add (export "add") (param $x i32) (param $y i32) (result i32)
    local.get $x
    local.get $y
    i32.add
  )
)
*/

// 現代做法：載入 .wasm 二進位（由 Rust/C++/AssemblyScript 編譯而來）
const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/math.wasm'),
  {} // imports 物件（這個模組不需要任何外部能力）
);

const result = instance.exports.add(3, 4); // 7
console.log('3 + 4 =', result);`)}

<h2 id="execution-model">16.2 Module、Instance、Memory、Table 的執行模型</h2>
<p>Wasm 的執行模型由四個核心概念組成，它們的關係就像「程式 → 行程 → 記憶體 → 函式指標表」：</p>

${diagram(`
graph TD
    subgraph Module["Wasm Module（.wasm 二進位）"]
        M1["型別定義\n函式簽名"]
        M2["匯入聲明\n需要從 host 取得的能力"]
        M3["函式定義\n字節碼指令序列"]
        M4["匯出聲明\n對外暴露的函式/記憶體"]
        M5["資料段\n初始記憶體內容"]
    end

    subgraph Instance["Wasm Instance（執行期）"]
        I1["執行狀態\n程式計數器、Call Stack"]
        I2["全域變數"]
    end

    subgraph Memory["Linear Memory（ArrayBuffer）"]
        MEM["0x0000 ──────────────── 0xFFFF...\n連續位元組陣列\nJS: new Uint8Array(instance.exports.memory.buffer)"]
    end

    subgraph Table["Wasm Table"]
        T1["[0] funcref → add"]
        T2["[1] funcref → multiply"]
        T3["用於間接呼叫 / 函式指標"]
    end

    Module -->|"WebAssembly.instantiate()"| Instance
    Instance -->|"exports.memory"| Memory
    Instance -->|"exports.table"| Table
    Memory <-->|"TypedArray view 讀寫"| JS["JavaScript\n（Host）"]
    JS -->|"imports\n注入外部能力（log、DOM操作）"| Instance

    style Module fill:#1a2332,stroke:#0a84ff
    style Instance fill:#1a2332,stroke:#4caf7d
    style Memory fill:#1a2332,stroke:#f5a623
    style Table fill:#1a2332,stroke:#9d6af5
`, 'Module 是靜態描述（類比 .exe 檔），Instance 是執行期實例（類比行程），Memory 是共享的連續位元組陣列，Table 存放間接呼叫的函式引用。')}

<p>關鍵理解：<strong>Linear Memory 是 Wasm 的唯一可寫記憶體空間</strong>。Wasm 程式的所有「堆積記憶體」（字串、陣列、物件）都手動管理在這個 ArrayBuffer 內。JavaScript 透過 <code>TypedArray</code> view 可以直接讀寫這塊記憶體，這是兩者高效溝通的橋樑。</p>

${code('javascript', `// Wasm 執行模型的完整示範

// 1. 準備 imports（注入外部能力）
const memory = new WebAssembly.Memory({
  initial: 16,  // 16 pages × 64KB = 1MB 初始記憶體
  maximum: 256, // 最多 256 pages = 16MB
});

const imports = {
  env: {
    memory,                          // 共享記憶體（也可讓 Wasm 自己建立）
    log: (ptr, len) => {            // Wasm 無法直接呼叫 console.log
      const bytes = new Uint8Array(memory.buffer, ptr, len);
      console.log(new TextDecoder().decode(bytes));
    },
    now: () => performance.now(),   // 取得時間戳
  },
  // 如果 Wasm 模組有 JS 函式的引用，也放在這裡
};

// 2. Streaming instantiate（下載過程中同時編譯）
const { module, instance } = await WebAssembly.instantiateStreaming(
  fetch('/image-kernel.wasm'),
  imports
);

// 3. 透過 TypedArray 讀寫 Linear Memory
const mem = new Uint8Array(instance.exports.memory.buffer);
// 或取 imports 中共享的記憶體：
// const mem = new Uint8Array(memory.buffer);

// 4. 呼叫 Wasm 匯出的函式
const ptr = instance.exports.malloc(1024);  // Wasm 內部的記憶體分配
mem.set(imageData, ptr);                    // JS 把資料寫進 Wasm 記憶體
instance.exports.processImage(ptr, width, height);
const result = new Uint8ClampedArray(instance.exports.memory.buffer, ptr, width * height * 4);

// 5. 取得 Table（間接函式呼叫）
const table = instance.exports.table;
const funcRef = table.get(0); // 取得 index 0 的函式引用
funcRef();                    // 間接呼叫（virtual dispatch 模式）

// 6. 複用已編譯的 Module（避免重複 compile 成本）
// module 物件可以存到 IndexedDB 或傳給 Worker
const worker = new Worker('/worker.js');
worker.postMessage({ type: 'init', module }, []);
// 注意：module 是 structured cloneable（可跨 Worker 傳遞）`)}

<p>Stack Machine 模型：Wasm 的指令集基於<strong>虛擬堆疊（Virtual Stack）</strong>。每條指令從堆疊彈出運算元、執行、結果推回堆疊。這個設計讓 Wasm 字節碼極度緊湊，也讓硬體加速解碼成為可能。</p>

${code('javascript', `// Wasm WAT（文字格式）展示 Stack Machine 指令
// 這是 (a + b) * c 的計算：
/*
(func $calc (param $a i32) (param $b i32) (param $c i32) (result i32)
  local.get $a    ;; stack: [a]
  local.get $b    ;; stack: [a, b]
  i32.add         ;; stack: [a+b]
  local.get $c    ;; stack: [a+b, c]
  i32.mul         ;; stack: [(a+b)*c]
)                 ;; 返回 stack top
*/

// 對比 JavaScript 的寄存器式語義（有 hidden class、deopt 風險）
function calcJS(a, b, c) {
  return (a + b) * c; // V8 需要推斷 a/b/c 的型別
}

// Wasm 版本：型別在 param 宣告時已確定，沒有型別推斷成本
// 對引擎來說，Wasm 類似「預先 JIT 過的 IR」`)}

<h2 id="sandbox-security">16.3 Sandbox Security Model</h2>
<p>Wasm 的安全模型是<strong>能力制（Capability-Based Security）</strong>的教科書範例。設計原則是「預設什麼都不能做」，所有外部能力（DOM 操作、網路請求、檔案系統、時鐘）都必須由宿主（瀏覽器）<strong>顯式注入</strong>到 imports 物件中。</p>

${diagram(`
graph LR
    subgraph Sandbox["Wasm Sandbox（信任邊界）"]
        W1["Wasm 程式碼"]
        W2["Linear Memory\n（自己的 ArrayBuffer）"]
        W3["Wasm Table\n（函式引用）"]
    end

    subgraph Host["Host Environment（瀏覽器）"]
        H1["DOM API"]
        H2["Fetch / XMLHttpRequest"]
        H3["File System API"]
        H4["console.log"]
        H5["performance.now()"]
        H6["Canvas / WebGL"]
    end

    W1 -.->|"❌ 直接呼叫\n無法存取"| H1
    W1 -.->|"❌ 直接呼叫\n無法存取"| H2
    W1 -.->|"❌ 直接呼叫\n無法存取"| H3

    Host -->|"顯式注入 imports.env\n只暴露必要能力"| W1

    style Sandbox fill:#1a2332,stroke:#e8505b
    style Host fill:#1a2332,stroke:#4caf7d
`, 'Wasm 沙盒預設無法存取任何外部能力；宿主必須明確決定賦予哪些能力。')}

<p>這個設計帶來的安全保證：即使 Wasm 模組來自不受信任的第三方（例如用戶上傳的外掛），它也無法逃出沙盒。相比之下，JavaScript 有豐富的全域物件（<code>window</code>、<code>document</code>、<code>fetch</code>），必須靠 Content Security Policy 才能限制。</p>

${code('javascript', `// 安全的外掛系統設計：只暴露最小能力集
function createSandboxedPlugin(wasmBytes) {
  // 為這個外掛建立隔離的記憶體（無法存取主程式的記憶體）
  const pluginMemory = new WebAssembly.Memory({ initial: 4, maximum: 16 });

  // 精心控制哪些能力可以被外掛使用
  const safeImports = {
    env: {
      memory: pluginMemory,
      // ✅ 允許：記錄日誌（但過濾敏感資訊）
      log: (ptr, len) => {
        const text = readString(pluginMemory, ptr, len);
        if (!text.includes('secret') && !text.includes('token')) {
          console.log('[Plugin]', text);
        }
      },
      // ✅ 允許：取得當前時間（但不暴露高精度，防 timing attack）
      now: () => Math.round(performance.now() / 10) * 10,
      // ❌ 不暴露：fetch、DOM、localStorage、cookie
    },
    // 每個外掛只能呼叫白名單內的函式
  };

  return WebAssembly.instantiate(wasmBytes, safeImports);
}

function readString(memory, ptr, len) {
  const bytes = new Uint8Array(memory.buffer, ptr, len);
  return new TextDecoder().decode(bytes);
}

// 對比：JavaScript 天生就有 window.fetch、document 等全域存取
// 限制 JS 需要透過 iframe sandbox、CSP、SES（Secure ECMAScript）等複雜機制`)}

<p><strong>Wasm vs JavaScript 的安全邊界差異</strong>：JavaScript 在同一個 origin 下可以自由讀取任何 DOM 節點、LocalStorage、Cookie；而 Wasm 連 <code>console.log</code> 都必須由 host 注入才能使用。這讓 Wasm 成為外掛系統、程式碼沙盒、WebContainers（如 StackBlitz）的理想選擇。</p>

<h2 id="promise-limitations">16.4 Wasm 的核心承諾與根本限制</h2>
<p>Senior 工程師評估技術時，必須同時理解承諾與限制。Wasm 是被過度神話的技術之一——許多人以為「用 Wasm 就會更快」，但實際上有很多情境 Wasm 會比 JavaScript 慢。</p>

${diagram(`
graph TD
    subgraph Promises["Wasm 的核心承諾"]
        P1["可預期的效能\n（Predictable Performance）\n無 JIT warmup、無 deoptimization\n計算密集任務比 JS 更穩定"]
        P2["語言可移植性\n現有 C/C++/Rust/Go/C# 程式碼\n可以在瀏覽器執行"]
        P3["快速 Parse\n Binary format 解碼速度\n比等效 JS 快 10-20x"]
        P4["可攜式沙盒\n相同 .wasm 在\n瀏覽器/Node/邊緣環境執行"]
    end

    subgraph Limits["根本限制（到 2024 年為止）"]
        L1["DOM Bridge 成本\n每次 JS⟷Wasm 呼叫有 overhead\nDOM-heavy 工作反而更慢"]
        L2["Debugging 體驗\n雖支援 DWARF，\n但遠不如 JS DevTools"]
        L3["GC 語言成本\nJava/Kotlin/Dart 需帶 runtime\n（直到 Wasm GC 標準化）"]
        L4["啟動成本\n大型模組的下載+compile+instantiate\n可能是秒級延遲"]
    end

    style Promises fill:#1a2332,stroke:#4caf7d
    style Limits fill:#1a2332,stroke:#e8505b
`, 'Wasm 的承諾集中在計算密集、現有 native codebase 的移植；限制集中在 DOM 互動、啟動成本、Debugging 體驗。')}

${code('javascript', `// 測量 Wasm 的真實效能（包含所有成本）
const measurements = {};

// 1. 測量 instantiate 成本（只發生一次，但不可忽略）
performance.mark('wasm-start');
const { instance } = await WebAssembly.instantiateStreaming(fetch('/heavy.wasm'));
performance.mark('wasm-ready');
measurements.instantiate = performance.measure('wasm-init', 'wasm-start', 'wasm-ready').duration;
// 可能是 50ms-2000ms（取決於 .wasm 大小）

// 2. 測量計算核心（Wasm 的強項）
performance.mark('compute-start');
instance.exports.processMatrix(inputPtr, outputPtr, 1024);
performance.mark('compute-end');
measurements.compute = performance.measure('wasm-compute', 'compute-start', 'compute-end').duration;

// 3. 比較：如果 Wasm 做的是 DOM 互動，會更慢
// ❌ 錯誤使用：讓 Wasm 逐個操作 DOM 元素
// 每次呼叫都要穿越 JS/Wasm boundary
for (let i = 0; i < 1000; i++) {
  instance.exports.updateElement(i); // 內部呼叫 JS import 來操作 DOM
  // 1000 次 boundary crossing > 1000 次純 JS DOM 操作
}

// ✅ 正確使用：Wasm 計算，JS 批次更新 DOM
const results = new Float32Array(instance.exports.memory.buffer, outputPtr, 1000);
elements.forEach((el, i) => { el.style.transform = \`translateY(\${results[i]}px)\`; });

console.table(measurements);
console.log('結論：instantiate 成本是一次性的，但 boundary 呼叫次數要最小化');`)}

<h2 id="blazor">16.5 Blazor WebAssembly 與 Microsoft 生態</h2>
<p>Blazor WebAssembly 是 Microsoft 推出的框架，讓 C# 開發者可以用 Razor 元件語法（類似 Vue/React 的元件模型）開發前端，並編譯成 Wasm 在瀏覽器執行。對已有 C#/.NET 技術棧的團隊而言，這代表「一個語言走天下」的可能性。</p>

${diagram(`
graph LR
    subgraph BlazorWasm["Blazor WebAssembly 架構"]
        RazorComp["Razor 元件\n(.razor 檔案)\nC# + HTML 語法"]
        DotNet["Microsoft.NET\n執行環境"]
        JSInterop[".NET/JS Interop\n透過 JSRuntime 呼叫 JS\n透過 DotNetObjectRef 讓 JS 呼叫 C#"]
    end

    subgraph Modes["兩種執行模式"]
        Interpreted["Interpreted Mode\n(.NET IL → Mono runtime → Wasm)\n啟動快，執行較慢\n首次載入約 10-15MB"]
        AOT["AOT Mode\n(.NET IL → 直接編譯成 Wasm)\n啟動慢，執行快\n.NET 8 改善：Bundle trimming 減少體積"]
    end

    subgraph Compare["vs Blazor Server"]
        Server["Blazor Server\n(SignalR + Server-side rendering)\n優：首次載入小\n缺：需要穩定網路連線"]
        Client["Blazor WASM\n優：離線可用、無伺服器狀態\n缺：首次載入大、JS 互通複雜"]
    end

    RazorComp --> DotNet
    DotNet --> JSInterop
    DotNet --> Interpreted
    DotNet --> AOT

    style BlazorWasm fill:#1a2332,stroke:#512bd4
    style Modes fill:#1a2332,stroke:#0a84ff
`, 'Blazor WASM 把整個 .NET 執行環境帶到瀏覽器；Interpreted mode 啟動快但執行慢，AOT mode 相反。')}

${code('csharp', `// Blazor WebAssembly 元件範例（Counter.razor）
@page "/counter"
@inject IJSRuntime JSRuntime  // 透過 DI 注入 JS 互通服務

<h1>計數器</h1>
<p>目前計數：@currentCount</p>
<button class="btn btn-primary" @onclick="IncrementCount">+1</button>
<button @onclick="CallJavaScript">呼叫 JS Alert</button>

@code {
    private int currentCount = 0;

    private void IncrementCount()
    {
        currentCount++;
        // 這段 C# 程式碼在瀏覽器的 Wasm 沙盒中執行
    }

    private async Task CallJavaScript()
    {
        // .NET 透過 JSRuntime 呼叫 JavaScript（需要穿越 Wasm/JS boundary）
        await JSRuntime.InvokeVoidAsync("alert", "Hello from C# in Wasm!");
    }

    // 在 Blazor WASM 中，DOM 的更新透過 .NET 的 Virtual DOM diff 完成
    // 最終仍是 JavaScript 操作 DOM——C# 本身無法直接碰 DOM
}`)}

${code('javascript', `// 從 JavaScript 角度看 Blazor WASM 的啟動
// 在 HTML 中引入 Blazor WASM
// <script src="_framework/blazor.webassembly.js"></script>

// Blazor WASM 載入流程（開發者工具 Network 面板可見）：
// 1. blazor.webassembly.js（小型啟動器）
// 2. _framework/dotnet.wasm（Mono runtime，幾 MB）
// 3. _framework/blazor.boot.json（清單，列出需要下載的 DLL）
// 4. 應用 DLL（e.g. MyApp.dll、Microsoft.AspNetCore.Components.dll...）

// .NET 8 的改善：
// - Ahead-of-Time (AOT) 編譯：將 .NET IL 直接編譯成 Wasm bytecode
//   優點：執行速度提升 2-3x
//   缺點：需要更長的 publish 時間，初始 .wasm 更大
// - IL Linker（trimming）：移除未使用的 .NET API
//   可以把 runtime 從 ~10MB 壓縮到 ~2-3MB（取決於使用的 API）
// - Lazy loading assemblies：只在需要時下載特定路由的 DLL

// 何時選 Blazor WASM？
// ✅ 團隊只有 C# 工程師，不想維護 TypeScript 前端
// ✅ 內部工具，首次載入時間不是最高優先
// ✅ 業務邏輯需要在前後端共享（.NET Standard 程式碼重用）
// ❌ 需要極致的首次載入速度（公開網站 LCP 目標 <2.5s）
// ❌ 需要豐富的 npm 生態系套件`)}

<fe-demo-suite demo="wasm-execution-model"></fe-demo-suite>

<h2 id="wasm-vs-js-summary">小結：Wasm 不是 JavaScript 的替代品</h2>
<p>Wasm 和 JavaScript 是<strong>互補關係</strong>，不是競爭關係。理解兩者適合的場景，是 Senior 工程師最重要的判斷能力：</p>

<table class="issue-map">
  <thead>
    <tr>
      <th>面向</th>
      <th>JavaScript</th>
      <th>WebAssembly</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>DOM 操作</td>
      <td>✅ 原生，無額外成本</td>
      <td>❌ 必須透過 JS bridge，每次呼叫有 overhead</td>
    </tr>
    <tr>
      <td>計算密集任務</td>
      <td>⚠ JIT 優化後勉強，但有 deopt 風險</td>
      <td>✅ 可預測效能，無 deoptimization</td>
    </tr>
    <tr>
      <td>既有 Native 程式碼</td>
      <td>❌ 無法直接使用</td>
      <td>✅ Emscripten/Rust 編譯路徑</td>
    </tr>
    <tr>
      <td>啟動時間</td>
      <td>✅ 快速</td>
      <td>⚠ 下載 + compile + instantiate 成本</td>
    </tr>
    <tr>
      <td>Debugging</td>
      <td>✅ 完整 DevTools 支援</td>
      <td>⚠ DWARF 支援改善中，但仍較難</td>
    </tr>
    <tr>
      <td>生態系</td>
      <td>✅ npm 數百萬套件</td>
      <td>⚠ 快速成長但遠小於 npm</td>
    </tr>
    <tr>
      <td>安全沙盒</td>
      <td>⚠ 需要 CSP + iframe sandbox</td>
      <td>✅ Capability-based，預設隔離</td>
    </tr>
  </tbody>
</table>

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${prev.title}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${next.title}</span></a>` : ''}
</div>
`
