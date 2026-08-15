# 技术标准与规范

## 1. 技术栈
- 后端：Java 21 + Spring Boot 3.x。
- 前端：Vue 3 + TypeScript + Vite。
- 数据库：MySQL 8 / PostgreSQL；缓存：Redis。

## 2. 后端分层规范
- Controller：HTTP 入参校验、协议转换，不含业务逻辑。
- Service：业务逻辑、事务边界。
- Repository / Mapper：数据访问。
- 对象分离：Entity（持久化）、DTO（传输）、VO（展示）不混用。

## 3. REST API 规范
- 路径：小写复数名词（如 /api/v1/trace-codes）。
- HTTP 方法语义：GET 查、POST 增、PUT 改、DELETE 删。
- 状态码：200/201/204 成功，400 参数错，401 未认证，403 无权限，404 不存在，500 服务器错。
- 统一响应体：{ code, message, data }；分页统一 { total, list }（入参 page + size）。

## 4. 命名与代码规范
- 类名 PascalCase，方法/变量 camelCase，常量 UPPER_SNAKE_CASE。
- 异常：业务异常统一异常码，ControllerAdvice 全局兜底。
- 日志：SLF4J，关键操作 info，异常 error 带堆栈。

## 5. 非功能要求
- 接口幂等、超时与重试策略。
- 敏感数据脱敏（手机号等）。
- 可观测：健康检查 /actuator/health、指标、链路追踪。
