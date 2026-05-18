# Frontend Interview Book

Senior Front-End Engineer 完整學習書籍網站。內容涵蓋瀏覽器底層、HTML 語意、CSS、資源載入、Core Web Vitals、WebAssembly、Canvas/WebGL/WebGPU、前端效能與 GenAI UI 面試常見訊號。

## Tech Stack

- Vite 5
- Lit 3 custom elements
- 原生 hash router
- GitHub Pages deployment

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Vite base path is configured as `/FrontendSkillsRequirement/` for GitHub Pages.

## Content Structure

- `src/chapters/book-data.js`: parts and chapter metadata
- `src/chapters/chapter-template.js`: shared content renderer
- `src/chapters/chXX.js`: generated chapter entry modules
- `src/components/fe-demo-suite.js`: local interactive examples
- `src/components/fe-code-block.js`: multi-language code tabs
