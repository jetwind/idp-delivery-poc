# 前端编码规范

## 1. 技术栈
- Vue 3 + TypeScript + Vite，组合式 API（<script setup>）。

## 2. 核心约定
- 组件单一职责，复用 UI 组件抽离。
- 类型优先：接口/类型定义清晰，避免 any。
- 状态管理按需（Pinia），简单页面不强行引入。

## 3. 单元测试
- 关键工具函数/组件有单测（Vitest）。
- npm test 必须通过。

## 4. 交付验收
- npm run dev / build 无错误。
- 页面可交互、路由正常。
