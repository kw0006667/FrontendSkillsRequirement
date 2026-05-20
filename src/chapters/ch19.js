import { chapters } from './book-data.js'

export const metadata = chapters.find(c => c.id === 19)

const prev = chapters.find(c => c.id === 18)
const next = chapters.find(c => c.id === 20)

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
  <div class="chapter-num">Chapter 19 · WebAssembly</div>
  <h1>Wasm 在前端的實戰場景</h1>
  <p>理解 Wasm 的理論只是起點——真正的考驗是在正確的場景選擇它，並在錯誤的場景有勇氣說「不」。本章用真實的產業案例解釋 Wasm 為什麼在特定場景有壓倒性優勢：<strong>影像與媒體處理</strong>（在客戶端做 JavaScript 做不到的事）、<strong>加密與壓縮</strong>（可預測的效能與安全性）、<strong>大型 native codebase 移植</strong>（Figma、AutoCAD、Photoshop）、<strong>端側 ML 推論</strong>（隱私、成本、延遲的三重優勢）。最後同樣重要的一節是：何時不該用 Wasm。</p>
  <div class="chapter-tags">
    <span class="tag">wasm</span>
    <span class="tag">case-study</span>
    <span class="tag">performance</span>
  </div>
</div>

<div class="callout interview-signal">
  <div class="callout-title">本章 Senior 面試訊號</div>
  <p>能說出 ffmpeg.wasm 的基本原理（FFmpeg C 原始碼透過 Emscripten 編譯，MEMFS 模擬檔案系統，SharedArrayBuffer 實作多執行緒）；能說出 Figma 為何選 C++ + Emscripten（既有 C++ codebase 太大無法重寫，且 Canvas rendering 需要可預測效能）；能說出端側 ML 推論的三重優勢（隱私——資料不離開裝置、成本——不需伺服器 GPU、延遲——本地計算更快）；最重要的是：能說出「我不會用 Wasm 做這件事，因為...」並給出具體理由（DOM 操作頻繁 / 團隊沒有 native toolchain 能力 / bundle budget 不允許 / 需要快速迭代）。</p>
</div>

<div class="concept-grid concept-grid-expanded">
  <div class="mini-card">
    <h3>心智模型</h3>
    <p>Wasm 的最佳場景有三個共同特徵：<strong>① 計算密集</strong>（CPU 是瓶頸，不是 DOM 或網路）、<strong>② 可以批次處理</strong>（輸入可以一次傳入，不需要頻繁 boundary crossing）、<strong>③ 有既有 native 程式碼</strong>（移植比重寫更有意義）。端側 ML 推論是新興的第四類場景，因為 WebGPU 讓 GPU 加速也可以在瀏覽器達到。</p>
  </div>
  <div class="mini-card">
    <h3>實務場景</h3>
    <p>影像處理：ffmpeg.wasm 在客戶端轉碼、Squoosh 做 WebP/AVIF 編碼（避免大檔上傳）。加密：1Password 的 NaCl 加密庫（libsodium.js）在客戶端完成端對端加密。ML：transformers.js 的 WebGPU backend 讓 Whisper 語音辨識跑在瀏覽器（隱私、免費）。最大的案例：Figma、AutoCAD Web、Photoshop Web 都用 Wasm 把桌面應用帶進瀏覽器。</p>
  </div>
  <div class="mini-card">
    <h3>Production 訊號</h3>
    <p>ffmpeg.wasm 首次呼叫需要下載 30MB+ 的 Wasm 模組（應使用 lazy loading 和進度提示）；Wasm 影像處理在 iOS Safari 上沒有 SharedArrayBuffer（不能多執行緒），單執行緒 fallback 可能慢 3-5x；端側 ML 在 iPhone 上 WebGPU 已支援（Safari 17+），但在低階 Android 上可能 OOM。</p>
  </div>
  <div class="mini-card">
    <h3>驗證方式</h3>
    <p>影像處理：比較 Wasm 方案 vs Canvas 2D ImageData 操作 vs CSS Filter 的時間和品質；加密：用 NIST 測試向量驗證加密結果正確性，用 benchmark 比較純 JS vs Wasm；端側 ML：在目標裝置上量測推論時間（特別是低階手機）；Wasm 啟動成本：單獨測量 fetch + compile + instantiate 的時間，確認值得。</p>
  </div>
</div>

<h2 id="media-processing">19.1 影像與媒體處理</h2>
<p>影像和媒體處理是 Wasm 最早爆發的應用場景，因為它完美符合「計算密集、批次處理、有成熟 native 庫」三個特徵。</p>

${diagram(`
graph TD
    subgraph Without["沒有 Wasm 的方案"]
        Upload["使用者選擇大影像檔案\n（30MB TIFF / RAW）"]
        SendToServer["上傳到伺服器\n（慢、需等待、費流量）"]
        ProcessServer["伺服器端處理\n（需要 GPU 機器）"]
        DownloadResult["下載結果\n（又一次等待）"]
        Upload --> SendToServer --> ProcessServer --> DownloadResult
    end

    subgraph WithWasm["有 Wasm 的方案（ffmpeg.wasm / libvips.wasm）"]
        FileSelect["使用者選擇大影像"]
        LoadWasm["載入 Wasm 模組\n（一次性，可快取）"]
        ProcessLocal["在客戶端處理\n（全速 CPU，離線可用）"]
        ShowResult["即時顯示結果"]
        FileSelect --> LoadWasm --> ProcessLocal --> ShowResult
    end

    style Without fill:#1a2332,stroke:#e8505b
    style WithWasm fill:#1a2332,stroke:#4caf7d
`, 'Wasm 讓影像處理在客戶端完成，避免大檔案上傳，並支援離線操作。')}

${code('javascript', `// ffmpeg.wasm：在瀏覽器內轉碼影片
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({
  // corePath 指向 ffmpeg-core.wasm（約 25MB，需 SharedArrayBuffer）
  corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
  log: true,  // 顯示 ffmpeg 的 stderr 輸出（便於 debug）
});

// 載入（需要下載 ~25MB 的 Wasm 核心）
await ffmpeg.load();

// 轉碼：MP4 → WebM
const inputFile = await fetchFile(videoFile);
ffmpeg.FS('writeFile', 'input.mp4', inputFile);  // 寫入虛擬 MEMFS

ffmpeg.setProgress(({ ratio }) => {
  progressBar.value = Math.round(ratio * 100);
});

await ffmpeg.run(
  '-i', 'input.mp4',        // 輸入
  '-c:v', 'libvpx-vp9',    // VP9 編碼（WebM 格式）
  '-crf', '30',              // 品質（0-63，越低越好）
  '-b:v', '0',               // 讓 CRF 控制 bitrate
  'output.webm'             // 輸出到 MEMFS
);

const data = ffmpeg.FS('readFile', 'output.webm');
const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/webm' }));
resultVideo.src = url;

// ===== 更輕量的替代方案：純 Wasm 圖片壓縮 =====
// Squoosh（Google）的 WebP/AVIF 編碼器
// 以下展示圖片在客戶端壓縮的核心邏輯

async function compressImageToWebP(imageFile, quality = 75) {
  // 使用 @squoosh/lib（Squoosh 的 Wasm 核心）
  const { ImagePool } = await import('@squoosh/lib');
  const imagePool = new ImagePool();

  const image = imagePool.ingestImage(await imageFile.arrayBuffer());
  await image.decoded;

  await image.encode({ webp: { quality } });

  const { binary } = await image.encodedWith.webp;
  await imagePool.close();

  return new Blob([binary], { type: 'image/webp' });
}

// 使用範例
const webpBlob = await compressImageToWebP(imageFile, 80);
console.log(\`原始大小: \${imageFile.size}B → 壓縮後: \${webpBlob.size}B\`);
console.log(\`壓縮率: \${((1 - webpBlob.size / imageFile.size) * 100).toFixed(1)}%\`);`)}

<h2 id="crypto-compression">19.2 加密、壓縮與資料處理</h2>
<p>加密和壓縮是 Wasm 的另一個強項：它們的計算模式完全符合 Wasm 的優勢——密集的數值計算，沒有 DOM 操作，可預測的執行時間，且安全性要求讓「效能不穩定」變得不可接受。</p>

${code('javascript', `// libsodium.js（NaCl 加密庫的 Wasm 版）
// 1Password 使用此方案在瀏覽器端完成端對端加密

import _sodium from 'libsodium-wrappers-sumo';
await _sodium.ready;  // 等待 Wasm 模組初始化
const sodium = _sodium;

// 非對稱加密（XSalsa20-Poly1305）
const keyPair = sodium.crypto_box_keypair();  // 生成公私鑰對
const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
const message = new TextEncoder().encode('Secret message');

// 加密（發送方用接收方公鑰加密）
const ciphertext = sodium.crypto_box_easy(
  message,
  nonce,
  keyPair.publicKey,   // 接收方公鑰
  keyPair.privateKey   // 發送方私鑰
);

// 解密（接收方用自己私鑰解密）
const decrypted = sodium.crypto_box_open_easy(
  ciphertext,
  nonce,
  keyPair.publicKey,   // 發送方公鑰
  keyPair.privateKey   // 接收方私鑰
);
console.log(new TextDecoder().decode(decrypted));  // 'Secret message'

// 為什麼用 Wasm 而不是 WebCrypto API？
// WebCrypto 支援的演算法有限（沒有 NaCl / ChaCha20-Poly1305 / Ed25519 in older browsers）
// libsodium 提供更豐富的密碼學原語，且跨瀏覽器一致

// === Brotli 壓縮（在瀏覽器端）===
// 用途：應用自訂資料格式的壓縮，或在不支援 Brotli 的舊瀏覽器手動解壓
import { compress, decompress } from 'brotli-wasm';

const data = new TextEncoder().encode(JSON.stringify(largeObject));
const compressed = await compress(data);
console.log(\`壓縮率: \${(compressed.byteLength / data.byteLength * 100).toFixed(1)}%\`);

const restored = await decompress(compressed);
const original = JSON.parse(new TextDecoder().decode(restored));`)}

<h2 id="case-studies">19.3 大型應用案例研究</h2>
<p>三個產業標竿展示了 Wasm 的最大潛力：把數十年的 native codebase 帶進瀏覽器，實現桌面級的功能。</p>

${diagram(`
graph TD
    subgraph Figma["Figma — 設計工具"]
        FigmaC["C++ 設計引擎\n（自訂渲染器、幾何計算、\n效能最優先的架構）"]
        FigmaE["Emscripten 編譯"]
        FigmaW["Wasm（設計引擎核心）"]
        FigmaJS["JavaScript（UI 層、\n協作、外掛系統）"]
        FigmaC --> FigmaE --> FigmaW
        FigmaW <-->|"JS/Wasm 互通"| FigmaJS
    end

    subgraph AutoCAD["AutoCAD Web — CAD 工具"]
        ACADC["數十年 C++ CAD 核心\n（DWG 格式解析、\n幾何引擎、渲染）"]
        ACADE["Emscripten + WASI"]
        ACADW["Wasm（CAD 計算）"]
        ACADC --> ACADE --> ACADW
    end

    subgraph Photoshop["Adobe Photoshop Web"]
        PSC["C++ Photoshop 核心\n（色彩處理、濾鏡引擎、\n圖層合成）"]
        PSW["Wasm\n（+ WebAssembly SIMD\n向量化指令加速）"]
        PSFS["File System Access API\n（讀寫本地 PSD 檔案）"]
        PSC --> PSW
        PSW --> PSFS
    end

    style Figma fill:#1a2332,stroke:#a259ff
    style AutoCAD fill:#1a2332,stroke:#e8505b
    style Photoshop fill:#1a2332,stroke:#f5a623
`, '三個案例的共同點：既有 C++ codebase 太大無法重寫，Wasm 是移植的唯一現實路徑。')}

<p><strong>共同模式分析</strong>：這三個案例的共同點是「既有 C++ codebase 太大、太複雜、太久經過優化，無法在合理時間內以 TypeScript 重寫」。Wasm 讓這些程式碼在瀏覽器中以接近原生的速度執行，JS 層只負責 UI 框架、協作功能和外掛系統。</p>

${code('javascript', `// Figma 架構模式的簡化示意

// 主架構：C++ 核心 + JS UI Shell
class FigmaRenderer {
  constructor(canvasEl) {
    // C++ Wasm 模組負責繪圖計算
    this.wasmModule = null;
    this.canvas = canvasEl;
  }

  async initialize() {
    // 載入 C++ 設計引擎（已編譯成 Wasm）
    this.wasmModule = await createFigmaCore({
      canvas: this.canvas,
      // WebGL context 傳給 C++ 端直接使用
      // C++ 呼叫 GL/WebGL API 是透過 Emscripten 的 WebGL binding
    });
  }

  // UI 層（JS）呼叫 Wasm 核心來更新場景
  moveNode(nodeId, x, y) {
    // 一次 boundary crossing，傳入 nodeId 和座標
    this.wasmModule.exports.move_node(nodeId, x, y);
    // C++ 端在 Wasm memory 中更新場景圖，並呼叫 WebGL 重繪
    // 不需要 JS 端做任何 DOM 操作（繪圖完全在 C++/WebGL 層）
  }

  // 協作：JSON diff 通過 WebSocket 進來，JS 解析後呼叫 Wasm 應用
  applyRemoteChange(diff) {
    const encoded = msgpack.encode(diff);
    const ptr = this.wasmModule.exports.alloc(encoded.length);
    new Uint8Array(this.wasmModule.exports.memory.buffer, ptr, encoded.length).set(encoded);
    this.wasmModule.exports.apply_remote_op(ptr, encoded.length);
    this.wasmModule.exports.free(ptr, encoded.length);
  }
}

// 關鍵洞察（Senior 面試答案）：
// Figma 的 JS 層「薄」但「智慧」：
// - 薄：不做任何圖形計算，全部在 C++ Wasm 中
// - 智慧：管理 WebSocket 協作、外掛 API 沙盒、Electron 整合
// C++ 層「厚」但「無 UI 感知」：
// - 只知道場景圖、幾何、渲染，不知道 React 或 DOM`)}

<h2 id="edge-ml">19.4 端側 ML 推論：Wasm 的新戰場</h2>
<p>端側 ML 推論是 Wasm 最具未來性的應用場景。把模型推論從伺服器移到瀏覽器，同時帶來三個優勢：<strong>隱私</strong>（資料不離開裝置）、<strong>成本</strong>（不需要伺服器 GPU）、<strong>延遲</strong>（本地計算避免網路 round trip）。</p>

${diagram(`
graph LR
    subgraph Server["傳統：伺服器端推論"]
        U1["使用者\n（上傳資料）"]
        S1["伺服器\nGPU 推論"]
        R1["回傳結果\n（延遲：網路 RTT）"]
        U1 --> S1 --> R1 --> U1
        C1["成本：GPU 機器費用\n隱私：資料離開裝置"]
    end

    subgraph Client["端側：瀏覽器推論"]
        U2["使用者資料"]
        WG["WebGPU 加速\n或 Wasm SIMD\n（瀏覽器本地）"]
        R2["即時結果\n（延遲：<100ms）"]
        U2 --> WG --> R2
        C2["成本：零伺服器費用\n隱私：資料不離裝置"]
    end

    style Server fill:#1a2332,stroke:#e8505b
    style Client fill:#1a2332,stroke:#4caf7d
`, '端側 ML 推論同時解決隱私、成本、延遲三個問題。')}

${code('javascript', `// transformers.js：在瀏覽器跑 Transformer 模型

// 安裝：npm install @xenova/transformers

import { pipeline, env } from '@xenova/transformers';

// 設定：讓模型直接在瀏覽器執行（不是 Node.js）
env.allowLocalModels = false;
env.useBrowserCache = true;  // 把下載的模型快取到 Cache API

// Whisper 語音辨識（~100MB 模型，WebGPU 加速）
const transcriber = await pipeline(
  'automatic-speech-recognition',
  'Xenova/whisper-tiny',
  {
    device: 'webgpu',  // 優先使用 WebGPU，回退到 Wasm SIMD
    dtype: 'fp16',     // 半精度浮點，減少記憶體和計算量
  }
);

// 從麥克風錄音並即時轉錄
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
// ... 錄音邏輯 ...
const audioData = new Float32Array(audioBuffer);

const result = await transcriber(audioData, {
  language: 'chinese',
  task: 'transcribe',
  chunk_length_s: 30,   // 每 30 秒為一個處理塊
  return_timestamps: true,
});
console.log(result.text);  // 轉錄文字（全程在本地，不上傳音訊！）

// ===== 情感分析 / NLP（小模型，更輕量）=====
const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
const output = await classifier('This is amazing!');
// [{ label: 'POSITIVE', score: 0.999 }]

// ===== 圖片分類（MobileNet，幾 MB）=====
const imageClassifier = await pipeline('image-classification', 'Xenova/vit-base-patch16-224');
const [canvas] = document.querySelectorAll('canvas');
const predictions = await imageClassifier(canvas);
// [{ label: 'tabby cat', score: 0.85 }, ...]

// WebLLM：在瀏覽器跑 7B 參數 LLM
import * as webllm from '@mlc-ai/web-llm';
const engine = await webllm.CreateMLCEngine(
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',  // 1B 參數，量化後約 700MB
  { initProgressCallback: (progress) => console.log(progress) }
);

const response = await engine.chat.completions.create({
  messages: [{ role: 'user', content: 'Explain WebAssembly in one sentence.' }],
});
console.log(response.choices[0].message.content);`)}

<h2 id="when-not">19.5 何時不該用 Wasm</h2>
<p>Senior 工程師最重要的能力之一是<strong>知道何時不該使用某個技術</strong>。Wasm 是被過度神話的技術，以下是具體的「反指標」：</p>

${diagram(`
graph TD
    Q1{需求是什麼？}
    Q1 -->|"頻繁操作 DOM\n（每幀更新幾百個元素）"| NO1["❌ 不適合 Wasm\nDOM 操作需穿越 boundary\n比直接用 JS 更慢"]
    Q1 -->|"簡單業務邏輯\n（表單驗證、資料格式轉換）"| NO2["❌ 不適合 Wasm\nWasm 啟動成本 > 執行節省\n純 JS 更快且更好維護"]
    Q1 -->|"團隊無 native 工具鏈能力\n（沒人懂 Rust/C++）"| NO3["❌ 不適合 Wasm\n開發和維護成本\n超過效能收益"]
    Q1 -->|"需要快速迭代\n（每天改功能邏輯）"| NO4["❌ 不適合 Wasm\n改一行要重新編譯\nHot reload 體驗差"]
    Q1 -->|"計算密集 + 批次處理\n+ 有 native codebase"| YES["✅ 考慮 Wasm\n（但先 profiling 確認 JS 不夠快）"]
    style NO1 fill:#1a2332,stroke:#e8505b
    style NO2 fill:#1a2332,stroke:#e8505b
    style NO3 fill:#1a2332,stroke:#e8505b
    style NO4 fill:#1a2332,stroke:#e8505b
    style YES fill:#1a2332,stroke:#4caf7d
`, '使用 Wasm 的前提是：計算密集 + 可批次處理 + 有 profiling 數據證明 JS 不夠。')}

${code('javascript', `// 常見的 Wasm 誤用案例（反面教材）

// ❌ 誤用 1：用 Wasm 做 DOM 操作
// 每次 DOM 操作都需要 JS→Wasm→JS boundary crossing
// 比直接用 JS 慢！
for (const item of items) {
  wasmModule.exports.renderItem(item.id);  // 內部透過 JS import 操作 DOM
  // 每次都有兩次 boundary crossing（JS→Wasm + Wasm→JS）
}
// ✅ 正確：JS 做 DOM，Wasm 做計算
const positions = new Float32Array(wasmModule.exports.memory.buffer, posPtr, items.length * 2);
wasmModule.exports.calculatePositions(posPtr, items.length);  // 一次計算
items.forEach((item, i) => {
  item.el.style.transform = \`translate(\${positions[i*2]}px,\${positions[i*2+1]}px)\`;
});

// ❌ 誤用 2：簡單邏輯用 Wasm
// AssemblyScript 實作的 add 函式
const sum = wasmModule.exports.add(1, 2);
// 這不比 JS 快！Wasm 的啟動成本（下載 + compile）遠超過執行節省

// ❌ 誤用 3：頻繁的小型呼叫（已在 18.3 討論）
for (const pixel of pixels) {
  wasmModule.exports.processPixel(pixel);  // 每個像素一次 boundary
}

// ✅ 什麼時候值得引入 Wasm？
// 1. 有 profiling 數據：Chrome DevTools 顯示 JS 計算佔 60%+ 的 frame time
// 2. 計算模式適合批次：整個陣列或整張圖片可以一次傳入
// 3. 改善足夠顯著：benchmark 顯示 Wasm 版本比 JS 快 2x 以上
// 4. 有能力維護：團隊至少有一人熟悉 Rust/C++ 或 AssemblyScript

// Senior 面試回答：
// "我不會因為 Wasm 流行就用 Wasm。我會先用 Chrome DevTools 的 Performance panel
// 確認 JS 計算是實際的瓶頸，再評估計算模式是否適合批次處理，
// 再確認 bundle size 和啟動成本在可接受範圍內，
// 最後確認團隊有能力長期維護這個 Wasm 模組。
// 如果這四個條件有任何一個不滿足，我會先找 JS 層的優化空間。"`)}

<fe-demo-suite demo="wasm-usecase"></fe-demo-suite>

<div class="chapter-footer">
  ${prev ? `<a class="prev" href="#ch${prev.id}"><span class="footer-label">上一章</span><span class="footer-title">${prev.title}</span></a>` : '<span></span>'}
  ${next ? `<a class="next" href="#ch${next.id}"><span class="footer-label">下一章</span><span class="footer-title">${next.title}</span></a>` : ''}
</div>
`
