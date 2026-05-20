import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 17)

const prev = chapters.find(c => c.id === 16)
const next = chapters.find(c => c.id === 18)

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
  <div class="chapter-num">Chapter 17 · WebAssembly</div>
  <h1>Wasm Toolchain 與語言生態</h1>
  <p>「我想讓這個 C++ 影像處理庫在瀏覽器跑」——這是最常見的 Wasm 入門場景。但 Wasm toolchain 不是單一工具，而是「來源語言 → 編譯器 → Wasm 格式 → JavaScript glue」的完整鏈條。選錯 toolchain 可能讓你多花數週建立建置環境、卻得到一個 10MB 的 .wasm 檔案。本章建立一張從<strong>來源語言到產物</strong>的完整地圖，讓你依「團隊既有技術棧」而非「語言流行度」做出正確選擇。</p>
  <div class="chapter-tags">
    <span class="tag">wasm</span>
    <span class="tag">tooling</span>
    <span class="tag">rust</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 Emscripten 不只是編譯器，而是提供 POSIX 相容層（MEMFS、pthreads、Asyncify）的完整移植框架；能說出 Rust 為何是「最 Wasm-native」的選擇（無 GC、無 runtime 負擔、wasm-bindgen 自動生成 JS glue）；能說出 AssemblyScript 的根本限制（不是完整 TypeScript，不支援 union types、conditional types，效能上界低於 Rust/C++）；能說出 Blazor WASM 的 Interpreted vs AOT 取捨（Interpreted mode 把整個 Mono runtime 帶進來，AOT mode 直接把 IL 編譯成 Wasm）；在面試中能說「我會先看團隊是否有既有 native codebase，再看 bundle size budget，最後看 team expertise」。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>Toolchain 選擇的三個維度：<strong>① 現有程式碼</strong>（有 C/C++ → Emscripten；有 Rust → wasm-pack；只有 TS → AssemblyScript；有 C# → Blazor）、<strong>② Bundle 預算</strong>（Rust 產物最小；Emscripten 有相容層開銷；AssemblyScript 中等；.NET 最大）、<strong>③ 團隊能力</strong>（不想學新語言 → AssemblyScript 或 Blazor；已有 Rust 基礎 → wasm-bindgen 是最佳路徑）。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>Figma 的 C++ 設計引擎 → Emscripten（既有 codebase 移植）。1Password 的 NaCl 加密庫 → Rust + wasm-bindgen（最小 bundle，高安全性）。StackBlitz 的 Node.js 沙盒 → WASI（需要系統呼叫模擬）。Office web 功能原型 → Blazor WASM（C# 技術棧一致）。小型 hash 計算工具 → AssemblyScript（TypeScript 開發者，簡單計算）。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>Emscripten 預設輸出包含整個 POSIX 相容層（可達 2-5MB）→ 需要 <code>-Os</code>、<code>EXPORTED_FUNCTIONS</code>、<code>MODULARIZE</code> 精確控制輸出；Rust wasm-bindgen 產物 10-50KB（未壓縮）→ 注意 debug build 沒有 strip symbols；AssemblyScript 產物比純 JS 快，但不如 Rust/C++ → 別誤以為 AS ≈ C++ 效能。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>用 <code>wasm-objdump</code>（wabt 工具組）分析 .wasm 二進位內容；<code>twiggy</code> 分析 Rust 產物的 size profile（找出體積最大的函式）；Chrome DevTools Sources 面板查看 Wasm 模組的 WAT（文字格式）；<code>wasm-pack build --profiling</code> 保留 debug symbol 同時優化大小。</p>
  </div>
</div>

<h2 id="toolchain-map">17.1 主流編譯路徑全景</h2>
<p>每條編譯路徑有其設計取捨。了解全景才能在面試或技術選型時給出有根據的判斷，而不是「我聽說 Rust 的 Wasm 很快」。</p>

${diagram(`
graph TD
    subgraph Sources["來源語言"]
        CPP["C / C++"]
        Rust["Rust"]
        AS["AssemblyScript\n（TypeScript 子集）"]
        Go["Go / TinyGo"]
        CS["C# / .NET"]
        Kotlin["Kotlin / Java"]
        Dart["Dart / Flutter"]
    end

    subgraph Tools["編譯工具"]
        Emscripten["Emscripten\n+ POSIX 相容層\n+ pthreads / Asyncify"]
        WasmPack["wasm-pack\n+ wasm-bindgen\n（自動生成 JS glue）"]
        ASC["asc\nAssemblyScript Compiler"]
        TinyGo["TinyGo\n（Go 的 Wasm 友好版本）"]
        Blazor[".NET Blazor\n或 Mono AOT"]
        WasmGC["Wasm GC Toolchain\nKotlin/Dart 原生支援"]
    end

    subgraph Output["產物大小估計"]
        BigBundle["大 bundle\n5 - 20 MB\n含 runtime / 相容層"]
        SmallBundle["小 bundle\n10 - 500 KB\n近乎純 Wasm"]
        MedBundle["中等 bundle\n1 - 5 MB"]
    end

    CPP --> Emscripten --> BigBundle
    Rust --> WasmPack --> SmallBundle
    AS --> ASC --> SmallBundle
    Go --> TinyGo --> MedBundle
    CS --> Blazor --> BigBundle
    Kotlin --> WasmGC --> MedBundle
    Dart --> WasmGC --> MedBundle

    style SmallBundle fill:#1a2332,stroke:#4caf7d
    style MedBundle fill:#1a2332,stroke:#f5a623
    style BigBundle fill:#1a2332,stroke:#e8505b
`, '每條 toolchain 的產物大小差異懸殊，選型前必須先評估 bundle size budget。')}

<h2 id="emscripten">17.2 Emscripten 深度解析</h2>
<p>Emscripten 是把 C/C++ 帶到瀏覽器的最成熟路徑，基於 LLVM 編譯器後端，並提供整套 POSIX 相容層。這讓有幾十年歷史的 C++ 程式碼（CAD、遊戲引擎、圖形庫）能在幾週而非幾年內移植到瀏覽器。</p>

<p><strong>Emscripten 的三大核心貢獻：</strong></p>
<ul>
  <li><strong>MEMFS / IDBFS</strong>：在 Wasm linear memory 內模擬 POSIX 檔案系統，讓呼叫 <code>fopen()</code>、<code>fwrite()</code> 的 C 程式碼無需修改就能執行。IDBFS 更把檔案系統持久化到 IndexedDB。</li>
  <li><strong>pthreads over SharedArrayBuffer</strong>：用 Web Worker + SharedArrayBuffer 模擬 POSIX 多執行緒，讓多執行緒 C++ 程式碼透過 <code>-pthread</code> 旗標移植。</li>
  <li><strong>Asyncify</strong>：把同步的 C 函式（例如等待 socket 的 blocking call）轉換成可以 <code>await</code> 的非同步形式，解決瀏覽器單執行緒環境的根本衝突。</li>
</ul>

${code('bash', `# Emscripten 基本編譯流程
# 安裝（透過 emsdk）
git clone https://github.com/emscripten-core/emsdk.git
./emsdk install latest && ./emsdk activate latest
source ./emsdk_env.sh

# 最簡單的 C → Wasm 編譯
emcc image_filter.c -o image_filter.js \\
  -O3 \\                          # 最積極的優化
  -s MODULARIZE=1 \\              # 把 glue code 包成模組（避免污染 global）
  -s EXPORT_NAME='createModule' \\
  -s EXPORTED_FUNCTIONS='["_apply_filter","_malloc","_free"]' \\
  -s EXPORTED_RUNTIME_METHODS='["cwrap","HEAPU8"]' \\
  --no-entry                      # 沒有 main()（純函式庫）

# 啟用多執行緒（需要 COOP/COEP headers）
emcc heavy_compute.c -o compute.js \\
  -O3 -pthread \\
  -s PTHREAD_POOL_SIZE=4 \\       # 預先建立 4 個 Worker
  -s TOTAL_MEMORY=67108864        # 64MB 記憶體

# Asyncify：讓同步 C 呼叫可以 await
emcc legacy_api.c -o api.js \\
  -O2 -s ASYNCIFY \\
  -s ASYNCIFY_IMPORTS='["js_sleep","js_fetch"]'`)}

${code('javascript', `// 在 JavaScript 中使用 Emscripten 產物
import createModule from './image_filter.js';

const Module = await createModule({
  locateFile: (path) => \`/wasm/\${path}\`,
  onRuntimeInitialized: () => console.log('Wasm runtime ready'),
});

// cwrap 把 C 函式包裝成 JS 可呼叫的形式（有型別）
const applyFilter = Module.cwrap(
  'apply_filter',        // C 函式名稱（加底線前綴）
  'number',              // 回傳型別
  ['number', 'number', 'number', 'number']  // 參數型別
);

const imageSize = width * height * 4;
const inputPtr = Module._malloc(imageSize);
const outputPtr = Module._malloc(imageSize);

try {
  // 把 JS 的 Uint8ClampedArray 複製到 Wasm 記憶體
  Module.HEAPU8.set(imageData.data, inputPtr);

  // 呼叫 C 函式（在 Wasm 中執行）
  applyFilter(inputPtr, outputPtr, width * height, 2 /* BLUR */);

  // 從 Wasm 記憶體讀回結果
  const output = new Uint8ClampedArray(Module.HEAPU8.buffer, outputPtr, imageSize);
  ctx.putImageData(new ImageData(output.slice(), width, height), 0, 0);
} finally {
  // C 風格手動釋放記憶體
  Module._free(inputPtr);
  Module._free(outputPtr);
}`)}

<h2 id="rust-wasm-bindgen">17.3 Rust + wasm-bindgen：最 Wasm-native 的體驗</h2>
<p>Rust 對 Wasm 友好的三個原因：<strong>沒有 GC</strong>（不需要把垃圾回收器打包）、<strong>沒有 runtime 負擔</strong>、<strong>零成本抽象</strong>。結果是 Rust Wasm 產物體積遠小於其他語言，且效能完全可預測。</p>

${code('rust', `// src/lib.rs — Rust 寫的 Wasm 模組
use wasm_bindgen::prelude::*;

// wasm_bindgen 巨集自動生成 JS/Wasm 互通的 glue code
#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

// 接收 JS 的 Uint8Array（零拷貝！）
#[wasm_bindgen]
pub fn grayscale(data: &mut [u8]) {
    // 對每個像素的 RGBA 取 RGB 平均
    for pixel in data.chunks_mut(4) {
        let gray = ((pixel[0] as u32 + pixel[1] as u32 + pixel[2] as u32) / 3) as u8;
        pixel[0] = gray;
        pixel[1] = gray;
        pixel[2] = gray;
        // pixel[3]（alpha）保持不變
    }
}

// 透過 web_sys crate 直接呼叫 Web API
#[wasm_bindgen]
pub fn log_to_console(message: &str) {
    web_sys::console::log_1(&message.into());
}

// 結構體可以暴露給 JS 當成物件
#[wasm_bindgen]
pub struct Hasher {
    state: u64,
}

#[wasm_bindgen]
impl Hasher {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self { Self { state: 0xcbf29ce484222325 } }

    pub fn update(&mut self, byte: u8) {
        self.state ^= byte as u64;
        self.state = self.state.wrapping_mul(0x100000001b3);
    }

    pub fn digest(&self) -> u64 { self.state }
}`)}

${code('bash', `# wasm-pack 建置（比 Emscripten 更自動化）
cargo install wasm-pack

wasm-pack build --target web      # 直接在瀏覽器中用
wasm-pack build --target bundler  # 透過 Vite/Webpack 打包（最常見）
wasm-pack build --target nodejs   # Node.js 環境

# 產物在 pkg/ 目錄：
# pkg/my_module.js          — JavaScript glue
# pkg/my_module.d.ts        — TypeScript 型別定義（自動生成！）
# pkg/my_module_bg.wasm     — Wasm 二進位
# pkg/package.json          — 可直接 npm publish

wasm-pack publish  # 前端工程師 npm install，不知道底層是 Rust`)}

${code('javascript', `// 前端工程師使用 Rust Wasm 套件
import init, { fibonacci, grayscale, Hasher } from 'my-wasm-module';

await init();  // 下載並實例化 .wasm

console.log(fibonacci(40));  // 快速，不阻塞 UI

// 零拷貝操作 ImageData
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, w, h);
grayscale(imageData.data);  // Uint8Array，直接修改（零拷貝）
ctx.putImageData(imageData, 0, 0);

// 使用 Rust 結構體
const hasher = new Hasher();
for (const byte of new TextEncoder().encode('hello')) {
  hasher.update(byte);
}
console.log(hasher.digest().toString(16));
hasher.free();  // 釋放 Rust 物件（觸發 Drop trait）`)}

<h2 id="assemblyscript">17.4 AssemblyScript：TypeScript 風味的 Wasm</h2>
<p>AssemblyScript 讓 TypeScript 開發者用熟悉的語法寫 Wasm 模組，學習曲線最低。但必須清楚理解它的根本限制：它是 TypeScript 的嚴格子集，不支援完整的型別系統，且效能上界低於 Rust/C++。</p>

${code('typescript', `// assembly/index.ts — AssemblyScript 語法
// 看起來像 TypeScript，但有嚴格限制

export function add(a: i32, b: i32): i32 {
  return a + b;  // i32 = 32 位元整數（不是 JS 的 number）
}

// 手動記憶體操作（不用 GC 時效能最好）
export function sumArray(ptr: usize, length: i32): i64 {
  let total: i64 = 0;
  for (let i = 0; i < length; i++) {
    total += load<i32>(ptr + i * 4);  // 從記憶體直接讀取
  }
  return total;
}

// ❌ 不支援：union types
// type Result = string | number;

// ❌ 不支援：any、unknown、conditional types
// function process(val: any): void {}

// ❌ 不支援：標準 JS API（Date、JSON、Regex）
// 需要用 AS 自己的 API 替代

// ⚠ 字串是 UTF-16（不是 UTF-8），與 Rust 互傳需要轉換`)}

${code('bash', `# AssemblyScript 建置（最簡單的路徑）
npm install --save-dev assemblyscript

npx asc assembly/index.ts \\
  --target release \\
  --outFile build/module.wasm \\
  --textFile build/module.wat   # 可讀的文字格式

# 適合場景：
# - 簡單數值計算（hash、校驗和、簡單圖片濾鏡）
# - 純 TypeScript 團隊，計算量中等
# - 快速驗證 Wasm 效能提升（再決定是否用 Rust 重寫）`)}

<h2 id="dotnet-csharp">17.5 .NET / C# 到 Wasm 的特殊性</h2>
<p>C# 是 GC 語言，Blazor WebAssembly 採取「把整個 Mono runtime 編譯成 Wasm」的策略，讓 .NET IL 字節碼在瀏覽器沙盒中執行。</p>

${diagram(`
graph LR
    subgraph Interpreted["Interpreted Mode（預設）"]
        direction TB
        CS1["C# 原始碼"] --> IL[".NET IL (.dll)"]
        IL --> Mono["Mono Runtime\n（已是 Wasm）"]
        Mono --> Run1["執行"]
        note1["✅ 建置快 ✅ 首次下載可快取\n❌ 執行慢（解譯 overhead）\n大小：~10-15MB（含所有 DLL）"]
    end

    subgraph AOT["AOT Mode（.NET 8+）"]
        direction TB
        CS2["C# 原始碼"] --> WasmNative[".wasm（直接編譯）"]
        WasmNative --> Run2["執行"]
        note2["✅ 執行快 2-3x ✅ 無 Mono overhead\n❌ 建置慢（10-30 分鐘）\n❌ .wasm 更大（但 trimming 可縮）"]
    end

    style Interpreted fill:#1a2332,stroke:#0a84ff
    style AOT fill:#1a2332,stroke:#4caf7d
`, 'Blazor WASM 的 Interpreted mode 把整個 Mono runtime 帶到瀏覽器；AOT mode 直接編譯，執行快但建置慢。')}

${code('bash', `# Blazor WASM 的建置選項

# Interpreted Mode（開發時）
dotnet run                         # 幾秒啟動

# AOT Mode（發布時）
dotnet publish -c Release /p:RunAOTCompilation=true  # 可能要 10-30 分鐘

# 在 .csproj 中啟用 IL Trimmer（縮小 bundle）
# <PublishTrimmed>true</PublishTrimmed>

# Lazy loading assemblies（延遲下載特定頁面的 DLL）
# <BlazorWebAssemblyLazyLoad Include="HeavyPage.dll" />

# 典型 bundle 大小對比：
# Interpreted + no-trim: ~15MB
# Interpreted + trimming: ~5-8MB
# AOT + trimming:         ~3-6MB
# Rust wasm-pack:         ~30-500KB`)}

<fe-demo-suite demo="wasm-toolchain"></fe-demo-suite>

<h2 id="toolchain-decision">Toolchain 選擇決策框架</h2>

${code('typescript', `// 面試回答框架：Wasm toolchain 選擇邏輯
function chooseToolchain(constraints: {
  existingNative: 'cpp' | 'rust' | 'csharp' | 'none';
  teamKnows: string[];
  bundleKB: number;
  computeLevel: 'simple' | 'heavy';
}): string {
  // 1. 既有 C/C++ codebase → Emscripten 是唯一現實選擇
  if (constraints.existingNative === 'cpp') {
    return 'Emscripten — 最成熟的 C/C++ 移植框架，bundle 較大但相容性最好';
  }

  // 2. 有 Rust 能力 → 最小 bundle + 最高效能
  if (constraints.existingNative === 'rust' || constraints.teamKnows.includes('rust')) {
    return 'Rust + wasm-pack + wasm-bindgen — 最小 bundle、完整 TS 型別支援';
  }

  // 3. C# 團隊 + 可接受大 bundle
  if (constraints.existingNative === 'csharp' || constraints.teamKnows.includes('csharp')) {
    if (constraints.bundleKB < 1000) {
      return '⚠ Blazor WASM 對 strict bundle budget 不適合，考慮 API 方案';
    }
    return 'Blazor WebAssembly — C# 技術棧一致，但首次載入大';
  }

  // 4. 純 TypeScript 團隊，計算需求不極端
  if (constraints.teamKnows.includes('typescript') && constraints.computeLevel === 'simple') {
    return 'AssemblyScript — TS 語法，學習成本最低，效能中等';
  }

  return 'JavaScript 先，profiling 後再評估 Wasm（避免過早優化）';
}

// Senior 面試回答：
// "我不會因為 Rust 流行就推薦一個團隊沒人能維護的 toolchain。
// 第一問：有沒有 profiling 數據證明 JS 不夠？
// 第二問：有沒有既有 native codebase 需要移植？
// 第三問：bundle size 預算是多少？
// 在這三個問題有答案之前，我不會開始選 toolchain。"`)}

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${prev.title}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${next.title}</span></a>` : ''}
</div>
`
