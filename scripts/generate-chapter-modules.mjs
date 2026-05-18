import { mkdir, writeFile } from 'node:fs/promises'

await mkdir(new URL('../src/chapters/', import.meta.url), { recursive: true })

for (let id = 1; id <= 38; id += 1) {
  const padded = String(id).padStart(2, '0')
  const source = `import { createChapterModule } from './chapter-template.js'

export const { metadata, content } = createChapterModule(${id})
`
  await writeFile(new URL(`../src/chapters/ch${padded}.js`, import.meta.url), source)
}

console.log('Generated 38 chapter modules.')
