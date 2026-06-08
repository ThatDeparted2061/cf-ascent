import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
//
// The dev-server proxy lets `npm run dev` reach the LeetCode GraphQL API
// locally (it isn't CORS-enabled, so the browser can't call it directly).
// In production the same path is served by the Netlify function instead.
const LC_HEADERS = {
  Referer: 'https://leetcode.com',
  Origin: 'https://leetcode.com',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    proxy: {
      '/.netlify/functions/leetcode': {
        target: 'https://leetcode.com',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/graphql',
        headers: LC_HEADERS,
      },
      // Codeforces works directly in the browser, but proxy it in dev too so the
      // automatic fallback path can be exercised locally if ever needed.
      '/.netlify/functions/cf': {
        target: 'https://codeforces.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const qs = path.split('?')[1] || ''
          const params = new URLSearchParams(qs)
          const method = params.get('method') || 'user.info'
          params.delete('method')
          return `/api/${method}?${params.toString()}`
        },
      },
    },
  },
})
