# 详细设计

项目：一物一码追溯码管理服务
阶段：02 详细设计
输入：specs/requirements.md（已定稿）

> 段长决策（需求层留待设计阶段确定，全局一致）：**企业前缀定长 3 位、商品代码定长 3 位、序列号定长 8 位（高位补零）**，追溯码总长 14 位纯数字。此取值在演示规模（≤1000 企业、≤1000 商品、单次 ≤1000 件、跨多次可大规模追加）下满足容量需求且可无歧义解析；通过集中配置承载，便于后续调整。

---

## 1. 业务设计（流程 + 领域模型 + 业务规则）

### 1.1 业务流程

#### 主路径一：批量赋码（FR-1）
1. 生产/库存人员或集成方提交 `POST /api/v1/trace-codes`，入参：企业前缀、商品代码、产品名、批次、生产日期、生成数量 N。
2. Controller 做 HTTP 层校验（非空、N∈[1,1000]、前缀/商品代码纯数字且符合定长、生产日期合法）。
3. Service 以 `(企业前缀, 商品代码)` 为粒度加锁，原子预留连续序列号区间 `[next, next+N)`。
4. 组装 N 个追溯码（前缀+商品代码+定长序列号），一并写入内存存储，更新该商品最新序列号。
5. 返回 N 个码及结构化三元组。

#### 主路径二：再生成追加（FR-1 多次/并发）
同一 `(企业前缀, 商品代码)` 再次生成时，序列号在已有最新值基础上继续递增（不断号），新记录追加进内存 Map，**不覆盖**已有记录。故可跨多次生成累加获得任意数量追溯码。

#### 主路径三：按码溯源（FR-2/FR-3）
1. Vue 页输入追溯码，点击查询，调用 `GET /api/v1/trace-codes/{code}`。
2. Controller 校验非空。
3. QueryService 校验纯数字、总长 14，按定长规则无歧义切分成三元组；切分失败判定格式非法。
4. 以原码为 key 检索内存存储：命中返回产品名/批次/生产日期；未命中返回 404。

#### 异常路径
| 触发 | 结果 |
|------|------|
| 生成 N<1 或 N>1000 或非数字 | 400 参数校验错误 |
| 生成必要入参缺失/为空/前缀或商品代码不符定长/生产日期非法 | 400 |
| 查询码为空 | 400 |
| 查询码含非数字或总长非 14 位或无法定长切分 | 400 格式非法 |
| 查询码格式合法但未入库 | 404 未找到 |
| 并发生成同一商品代码 | 分片锁保证序列号严格递增、无重复 |

### 1.2 领域模型

**核心聚合：ProductBatch（生产批次）**，聚合根。原型期仅此一个聚合，关系简单。

| 属性 | 类型 | 说明 |
|------|------|------|
| companyPrefix | 定长 3 位数字串 | 企业前缀 |
| productCode | 定长 3 位数字串 | 商品代码 |
| productName | String | 产品名，非空 |
| batchNo | String | 批次，非空 |
| productionDate | LocalDate | 生产日期 |
| serialNumber | 定长 8 位数字串 | 序列号（按商品独立递增） |
| traceCode | String(14) | 聚合业务唯一标识 = 三段拼接 |

**关系**：一个 ProductBatch 对应一个 `(公司前缀, 商品代码)`；追溯码唯一标识一条记录，可无歧义解析回三元组。内存态用 `Map<追溯码, Record>` 表达记录索引、用 `Map<(前缀,商品代码), 最新序号>` 表达序列计数。

### 1.3 业务规则

- **R1** 追溯码 = 企业前缀(3) + 商品代码(3) + 序列号(8)，总长 14，纯数字，无分隔符、无校验位。
- **R2** 序列号按 `(企业前缀, 商品代码)` 独立从 1 递增、高位补零 8 位。
- **R3** 单请求 N 件共享产品名/批次/生产日期，序列号连续；不同商品代码序列号独立互不影响。
- **R4** 序列号分配必须原子（线程安全），同一商品代码并发不产生重复码。
- **R5** 同一商品代码可多次追加生成，追加不覆盖既有记录。
- **R6** 成功生成的码必可查询且数据与生成一致（生成与查询共用同一存储）。
- **R7** 查询按定长无歧义切分，切分失败判定格式非法 → 400。
- **R8** 段长全局一致，只读集中配置，不散落硬编码。

---

## 2. 架构设计（模块/服务划分 + 数据流 + 技术选型）

### 2.1 模块 / 服务划分

**后端（新建服务）trace-code-service** — Spring Boot 3.x + Java 21，Maven 单模块，按层分包：

- `controller`：`TraceCodeController`（REST 端点、HTTP 校验、协议转换）。
- `service`：`TraceCodeApplicationService`（生成用例编排）、`TraceCodeGenerator`（码组装/序分配）、`TraceCodeQueryService`（按码查询）。码生成与查询逻辑**分离**。
- `store`：`InMemoryTraceCodeStore`（内存态存储）。
- `model`：领域对象与 DTO、`ErrorCode`、`ApiResponse<T>`。
- `config`：`TraceCodeProperties`（段长集中配置）、序列号分片锁管理。
- 全局：`GlobalExceptionHandler`（@RestControllerAdvice 统一错误）。

**前端（新建服务）trace-query-web** — Vue 3 + TypeScript + Vite，单查询页（`App.vue` + `TraceQuery` 组件）。

### 2.2 数据流与通信方式

- 生成数据流：调用方 → `POST /api/v1/trace-codes` → TraceCodeApplicationService → TraceCodeGenerator（原子分配）+ InMemoryTraceCodeStore（写）→ 返回码列表。
- 查询数据流：Vue 页 → `GET /api/v1/trace-codes/{code}` → TraceCodeQueryService → InMemoryTraceCodeStore（读）→ 产品信息或 404。
- 通信方式：**全程同步 REST/HTTP**；前端请求后端地址经 Vite 开发代理或后端 CORS 放开前端源解决跨域。

### 2.3 技术选型

| 项 | 选型 | 说明 |
|----|------|------|
| 后端 | Java 21 + Spring Boot 3.2.x（spring-boot-starter-web、starter-validation） | 固定约束 |
| 前端 | Vue 3 + TypeScript + Vite | 固定约束 |
| 存储 | 无数据库，内存态 `ConcurrentHashMap` | 重启清空，原型定位 |
| 并发 | `ConcurrentHashMap` + 每商品 `ReentrantLock` 分片 + `AtomicLong` 序列 | 原子预留区间，无重复码 |
| 校验 | jakarta validation + 数字/格式手动校验 | 规范 400 |
| 响应 | 统一 `{code, message, data}` | 便于前端/调用方处理 |

---

## 3. 详细模块设计（每个模块：职责/接口/数据结构/依赖）

### 3.1 后端 TraceCodeController（controller 层）
- **职责**：暴露 REST 端点、HTTP 入参校验、协议转换，不含业务逻辑。
- **接口**
  - `POST /api/v1/trace-codes`，body=`TraceCodeGenRequest`；成功 200 → `ApiResponse<TraceCodeGenResponse>`（data.traceCodes[]），400 → 参数错误。
  - `GET /api/v1/trace-codes/{code}`；200 → `ApiResponse<TraceCodeQueryResponse>`；404 未找到；400 空或格式非法。
- **数据结构**：`TraceCodeGenRequest{ companyPrefix:Long; productCode:Long; productName:String; batchNo:String; productionDate:LocalDate; count:@NotNull @Min(1) @Max(1000) Integer }`（前缀/商品代码用 Long 接收自动剔除字母）；`TraceCodeGenResponse{ List<TraceCodeItem> traceCodes }`，`TraceCodeItem{ traceCode; companyPrefix; productCode; serialNumber }`；`TraceCodeQueryResponse{ productName; batchNo; productionDate }`；`ApiResponse<T>{ code:int; message:String; data:T }`。
- **依赖**：`TraceCodeApplicationService`。

### 3.2 后端 TraceCodeApplicationService（生成用例编排）
- **职责**：兜底校验 → 获取/创建该 `(前缀,商品代码)` 的分片锁计数并原子预留 `[next, next+N)` → 委托 Generator 组装 → 写入存储 → 返回。
- **接口**：`TraceCodeGenResponse generateTraceCodes(TraceCodeGenRequest req)`。
- **数据结构**：`ConcurrentHashMap<TraceCodeKey, CounterLock> counterMap`；`CounterLock{ AtomicLong next; ReentrantLock lock; }`；`TraceCodeKey=(companyPrefix, productCode)`。
- **依赖**：TraceCodeGenerator、InMemoryTraceCodeStore、TraceCodeProperties。

### 3.3 后端 TraceCodeGenerator（码生成/序列号分配）
- **职责**：组装追溯码，是序列号唯一性与递增规则唯一实现处。
- **接口**：`List<TraceCodeItem> generate(prefix, productCode, startSerial, count)`。序列号区间由调用方（ApplicationService）在锁内预留后传入，Generator 负责格式化与拼接，保持职责内聚。
- **数据结构**：`TraceCodeItem{ traceCode; companyPrefix; productCode; serialNumber }`；段长常量读自 `TraceCodeProperties`。
- **依赖**：TraceCodeProperties。

### 3.4 后端 TraceCodeQueryService（按码查询）
- **职责**：格式校验（非空、纯数字、总长 14、定长切分）→ 查存储 → 返回或抛 404。与生成逻辑分离。
- **接口**：`TraceCodeQueryResponse queryByCode(String traceCode)`。
- **数据结构**：内部解析三元组；返回 `TraceCodeQueryResponse`。
- **依赖**：InMemoryTraceCodeStore、TraceCodeProperties。

### 3.5 后端 InMemoryTraceCodeStore（内存态存储）
- **职责**：管理全部内存数据：`Map<追溯码, ProductRecord>`；提供按码读写；线程安全；重启清空。
- **接口**：`void save(String traceCode, ProductRecord record)`（Map.put）；`Optional<ProductRecord> findByTraceCode(String traceCode)`。
- **数据结构**：`ConcurrentHashMap<String, ProductRecord> records`；`ProductRecord{ traceCode; companyPrefix; productCode; productName; batchNo; productionDate }`。
- **依赖**：无。

### 3.6 后端 全局异常与配置（GlobalExceptionHandler / TraceCodeProperties）
- **职责**：统一错误响应，将业务异常映射为状态码；集中承载段长配置。
- **接口**：`GlobalExceptionHandler`：`TraceCodeFormatException`/校验异常 → 400，`TraceCodeNotFoundException` → 404，其它 → 500；配置 `trace-code.prefix-length=3 / product-code-length=3 / serial-number-length=8`。
- **数据结构**：`ErrorCode{ CODE_FORMAT_INVALID, COUNT_INVALID, CODE_NOT_FOUND, PARAM_MISSING, ... }`；`ApiResponse<T>`。
- **依赖**：无。

### 3.7 前端 TraceQuery 查询页面（Vue 3 + Vite）
- **职责**：输入框 + 查询按钮；空输入阻止提交；区分 404 未找到 / 200 成功 / 其它错误。
- **接口**：调 `GET /api/v1/trace-codes/{code}`；空输入提示「请输入追溯码」不发请求；404 提示「未找到该追溯码」；200 展示产品名/批次/生产日期。
- **数据结构**：reactive state `{ traceCode, result, message, status }`；API base 走 Vite 环境变量/代理。
- **依赖**：后端 TraceCodeController。

---

## 4. 服务归属清单（新建 vs 升级现有）

| 服务 | 类型 | 说明 |
|------|------|------|
| trace-code-service（后端 Spring Boot 单体） | 新建 | 提供生成与查询 REST API，内存态存储 |
| trace-query-web（前端 Vue 3 + Vite 查询页） | 新建 | 纯查询页面 |

无现有存续服务，本项目全部为新建。

---

## 5. 非功能与失败模式

### 非功能
- **性能**：N≤1000，全部内存写，毫秒级；预留区间一次写。防御上限与长度（序列号 ≤ 8 位容量，超限报 400/409，防止溢出）。
- **并发**：同一商品分片 `ReentrantLock` 串行分配，保证严格递增、无重复。
- **可用性**：统一错误码与消息（400/404/500），前端可一致解析。
- **可维护性**：生成（Generator/ApplicationService）与查询（QueryService）分离，段长集中配置。
- **一致性**：查询与生成共用同一存储，无缓存层，数据天然一致。

### 失败模式与处理
| 失败模式 | 处理 |
|----------|------|
| 序列号超 8 位容量溢出 | 预留前校验，抛业务异常→400/409，避免非法码 |
| 并发同商品生成 | 分片锁保证唯一，无重复码 |
| 格式非法入参 | GlobalExceptionHandler 统一 → 400 |
| 查询未命中 | 404 未找到 |
| 服务重启 | 内存清空（符合原型定位），文档明示 |
| 前端空输入 | 前置校验阻止请求 |

---

## 6. 实施顺序建议

P0（核心可运行，优先）：
1. 搭建后端工程 + `TraceCodeProperties` 段长配置 + `ApiResponse`/`ErrorCode`/全局异常。
2. `InMemoryTraceCodeStore` + `TraceCodeGenerator` + `TraceCodeApplicationService`（含分片锁原子分配）+ `TraceCodeController` 生成端点。
3. `TraceCodeQueryService` + `TraceCodeController` 查询端点。

P1（端到端可用）：
4. 搭建 Vue 工程 + TraceQuery 页面 + 接入查询接口 + 空输入/404/200 交互处理 + Vite 代理/CORS。

P2（健壮性收尾）：
5. 补充分段容量溢出校验、边界测试（N=1/N=1000/并发同商品/跨商品独立计数）、README 运行说明与内存态风险声明。
