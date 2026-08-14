import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// 后端联调地址：本机已运行的 dsh 实例。默认 3086（挂 spec 插件的联调后端，
// 同时提供 session API 与 specStore）；可用 DSH_BACKEND 覆盖。
// 前端通过 Vite 同源代理访问 /api/*，规避 dsh 的跨站写围栏（只收 application/json、
// 强制 CORS preflight，而 dsh 从不回 preflight）。
const DSH_BACKEND = process.env.DSH_BACKEND || 'http://127.0.0.1:3086'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: DSH_BACKEND,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
