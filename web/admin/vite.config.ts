import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    base: env.VITE_BASE_PATH || '/apps/chatdesk/',
    plugins: [react(), tailwindcss()],
    define: {
      // 将 API base URL 暴露给前端代码
      __API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL || '')
    },
    // http://localhost:5173/apps/chatdesk/api/v1/agents/verify,增加跨域处理
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/apps/chatdesk/api': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path.replace(/^\/apps\/cs\/api/, '/api'),
        },
      },
      cors: true
    }

  }
})
