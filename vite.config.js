import { defineConfig } from 'vite'

export default defineConfig({
  base: '/FrontendSkillsRequirement/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html'
    }
  }
})
