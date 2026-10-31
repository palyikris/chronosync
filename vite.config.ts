import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const buildId = randomUUID();

// https://vite.dev/config/
export default defineConfig({
  define: { __APP_BUILD_ID__: JSON.stringify(buildId) },
  plugins: [react(), tailwindcss(), {
    name: 'chronosync-pwa',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `// ChronoSync build: ${buildId}\n${readFileSync(new URL('./src/pwa/service-worker.js', import.meta.url), 'utf8')}`,
      });
    },
  }],
});
