import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// 后端联调地址：本机已运行的 dsh 实例。默认 3086（挂 spec 插件的联调后端，
// 同时提供 session API 与 specStore）；可用 DSH_BACKEND 覆盖。
// 前端通过 Vite 同源代理访问 /api/*，规避 dsh 的跨站写围栏（只收 application/json、
// 强制 CORS preflight，而 dsh 从不回 preflight）。
const DSH_BACKEND = process.env.DSH_BACKEND || 'http://127.0.0.1:3086'
// LangGraph 编排服务（Python FastAPI，orchestrator/）。
const FLOW_BACKEND = process.env.FLOW_BACKEND || 'http://127.0.0.1:8080'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    watch: {
      // 编辑工具用「临时目录 + 原子改名」写文件，chokidar 在 Windows 上 watch
      // 这些临时文件会 EBUSY 崩溃；忽略掉它们（含前导点的隐藏临时目录）。
      ignored: (path: string) => path.includes('node_modules') || path.includes('.tmpdir') || path.endsWith('.tmp'),
    },
    proxy: {
      '/api': {
        target: DSH_BACKEND,
        // 保持 Host 与浏览器 Origin 一致（都是 localhost:3000），否则 dsh 的
        // Origin 围栏会把 changeOrigin 改过的 Host 判成跨站而返回 403。
        changeOrigin: false,
      },
      '/flow': {
        target: FLOW_BACKEND,
        changeOrigin: false,
        // /flow/start 会同步跑到第一个 interrupt（agent 跑几分钟），默认 30s 超时会 502。
        timeout: 600000,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
