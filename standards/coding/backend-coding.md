# 后端编码规范

## 1. 工程结构
- Spring Boot 多模块或按服务分目录，Java 21。
- 每个服务自带单元测试，编译 + 测试必须通过。

## 2. 核心约定
- Controller → Service → Repository 分层，单一职责。
- 事务边界放在 Service 层，@Transactional 只加在有写操作的 Service 方法。
- DTO 校验用 Bean Validation（@Valid + 注解）。

## 3. 单元测试
- 关键 Service 逻辑必须有单测（JUnit 5 + Mockito）。
- 编译命令：mvn test（或 gradle test），必须 0 失败。

## 4. 交付验收
- 应用可启动（mvn spring-boot:run 或打 jar 运行）。
- 核心 REST 接口可用 curl/测试覆盖。
