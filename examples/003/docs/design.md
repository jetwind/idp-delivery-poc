# 详细设计

> 项目：一物一码追溯码管理服务
> 阶段：02 详细设计
> 依据：specs/requirements.md
>
> 已确认的两项设计决策（来自需求 §6 待确认问题）：
> 1. **前端仅做查询页面**：后端暴露「批量生成」REST API 供调用方/开发者复用；Vue 只实现 FR-3 查询。批量生成的 GUI 入口不在本次范围。
> 2. **产品名为独立入参**：`productName`（产品名）与 `productCode`（商品代码）是两个独立字段，均作为批量生成入参并入库；查询接口返回产品名。

---

## 1. 业务设计（流程 + 领域模型 + 业务规则）

### 1.1 业务流程

#### 关键路径 1：批量生成追溯码（FR-1）
```
调用方（Postman / 脚本 / 未来 GUI）
   │  1. POST /api/v1/trace-codes/generate
   │     入参: enterprisePrefix, productCode, productName,
   │           batchNo, productionDate, quantity
   ▼
Controller（参数合法性与业务校验）── 校验失败 → 400
   │  校验通过
   ▼
TraceCodeService.generateBatch()
   │  a. SerialAllocator.alloc(enterprisePrefix + productCode, quantity)
   │     → 一次性原子分配 quantity 个唯一连续序列号，返回起始序列号
   │  b. 循环 quantity 次构造追溯码 = enterprisePrefix + productCode + 序列号
   │  c. 逐条构造 ProductInfo 记录并写入 MemoryStore（ConcurrentHashMap）
   ▲
   │  （如果 memoryStore.put 相同码发现冲突 —— 理论上不出现，兜底抛 500）
   ▼
返回 GenerateResult { traceCodes: [...], count }
```

#### 关键路径 2：按追溯码查询（FR-2）
```
调用方 / Vue 页面
   │  2. GET /api/v1/trace-codes/{code}
   ▼
Controller（format 校验）── 空/格式非法 → 400
   │  校验通过
   ▼
TraceCodeService.query(code)
   │  MemoryStore.get(code)
   ▼
存在 → 返回 ProductInfoView { traceCode, productName, batchNo, productionDate }
不存在 → 抛 Not Found 业务异常 → ControllerAdvice 兜底 → 404
```

#### 异常路径
| 场景 | 触发点 | 结果 |
|------|--------|------|
| quantity 越界/非数字 | Controller @Valid | 400，message 指明错误字段 |
| 必填入参缺失/空白 | Controller @Valid | 400 |
| 追溯码为空/格式非法 | Controller format 校验 | 400 |
| 追溯码不存在 | MemoryStore.get 返回 null | 404（NotFound 业务异常） |
| 序列号分配并发溢出 | SerialAllocator 内部 | 500（Logic/IllegalBusiness） |
| 内存写入相同码冲突（理论不应发生） | MemoryStore.put 返回旧值非空 | 500 |

### 1.2 领域模型

**实体 / 聚合：TraceCode（追溯码）**
- 值类型：追溯码 `code`（String），唯一标识。
- 结构：`code = enterprisePrefix + productCode + serialNumber`（无校验位、无分隔符，拼接后为纯数字/字符串）。

**值对象：ProductInfo（产品信息）**
聚合根 `TraceCode` 内部，直接以**追溯码为 key** 关联的业务数据载体，非独立表：
| 字段 | 类型 | 说明 |
|------|------|------|
| traceCode | String | 追溯码（主键，即聚合根标识） |
| productName | String | 产品名（独立入参） |
| productCode | String | 商品代码 |
| batchNo | String | 批次号 |
| productionDate | LocalDate | 生产日期 |
| serialNumber | long | 序列号（派生字段，便于溯源与统计） |

**序列号分配器（SerialAllocator）域服务**
- 状态：`ConcurrentHashMap<String, AtomicLong>`，key = `enterprisePrefix + productCode`，value = 当前已分配的最后一个序列号。
- 行为：`alloc(key, quantity) → long startSerial`，原子分配；首次分配时起始序列号为 1。
- 职责：保证**同一 key 下序列号严格递增且全局唯一**（并发安全，见 1.3）。

### 1.3 业务规则

- **R1 码结构**：`code = enterprisePrefix + productCode + serialNumber`，无分隔符、无校验位；序列号为顺序号，从 1 递增。
- **R2 序列号唯一性**：以 `enterprisePrefix + productCode` 为序列号分配域（key），同一域内序列号**严格递增、全局唯一、绝不重复**，跨域互不影响。分配用 `AtomicLong.getAndAdd(quantity)` 一次性预留 `quantity` 个号，天然并发安全。
- **R3 数量约束**：`1 ≤ quantity ≤ 1000`；非数字、<1、>1000 均返回 400。
- **R4 必填字段**：`enterprisePrefix`、`productCode`、`productName`、`batchNo`、`productionDate` 均必填，缺失/空白返回 400。
- **R5 查询一致**：查询到的 `productName/batchNo/productionDate` 与生成时写入的 `ProductInfo` 完全一致（内存态单对象写入，无二次修改路径）。
- **R6 追溯码格式校验**：非空、非空白，且仅允许字母数字与 `-`（前缀/代码/序列号拼接产物），格式非法返回 400。
- **R7 前端空输入**：Vue 页面输入为空时阻止提交并提示「请输入追溯码」，不发网络请求。

---

## 2. 架构设计（模块/服务划分 + 数据流 + 技术选型）

### 2.1 总体结构

单仓库、前后端分离；后端为单体 Spring Boot 3 应用，前端为独立 Vue 3 静态页，通过 HTTP 调用后端 REST API。

```
┌────────────────────────────┐        GET /api/v1/trace-codes/{code}
│  Vue 3 + Vite 前端（查询页） │ ───────────────────────────►┐
└────────────────────────────┘                             │
                                      ┌─────────────────────▼─────┐
                                      │ Spring Boot 3 (Java 21) 后端 │
┌────────────────────────────┐        │  ┌──────────────────────┐  │
│ 调用方/开发者               │ ──────►│  │ Controller 层         │  │
│（Postman/脚本，可复用生成API）│ POST   │  │  - TraceCodeController│  │
└────────────────────────────┘ generate│  └──────────────────────┘  │
                                      │  ┌──────────────────────┐  │
                                      │  │ Service 层           │  │
                                      │  │  - TraceCodeService   │  │
                                      │  │  - SerialAllocator    │  │
                                      │  └──────────────────────┘  │
                                      │  ┌──────────────────────┐  │
                                      │  │ 存储层                │  │
                                      │  │  MemoryStore (内存态)  │  │
                                      │  └──────────────────────┘  │
                                      │  ┌──────────────────────┐  │
                                      │  │ 异常/响应统一          │  │
                                      │  │  GlobalExceptionHandler│ │
                                      │  └──────────────────────┘  │
                                      └─────────────────────────────┘
```

### 2.2 模块/包划分（后端，`com.example.trace` 包根）

| 包 | 职责 | 是否新建 |
|----|------|---------|
| `controller` | `TraceCodeController`：REST 端点、入参格式校验（不含业务） | 新建 |
| `dto` | `request`、`response`：入参/出参对象（DTO） | 新建 |
| `service` | `TraceCodeService`：生成/查询业务编排 | 新建 |
| `service` | `SerialAllocator`：并发安全的序列号分配（域服务） | 新建 |
| `store` | `MemoryStore`：内存态存储（ConcurrentHashMap） | 新建 |
| `model`/`entity` | `ProductInfo` 领域对象 | 新建 |
| `exception` | `BusinessException`、`GlobalExceptionHandler` | 新建 |
| `config` | `TraceConfig`：序列号规则集中配置（起始值等） | 新建 |

前端（`frontend/`）：
| 目录 | 职责 | 是否新建 |
|------|------|---------|
| `src/App.vue` | 单页查询界面（输入框+按钮+结果展示+错误提示） | 新建 |
| `src/api/trace.ts` | 封装 `GET /api/v1/trace-codes/{code}` | 新建 |
| `src/types.ts` | 响应类型定义 | 新建 |
| `vite.config.ts` | 开发代理 `/api` → `http://localhost:8080` | 新建 |

### 2.3 数据流与通信方式

- **通信方式**：全部同步 REST（HTTP/JSON）。无异步/消息队列——原型级且内存态，无跨节点一致性问题。
- **数据流（生成）**：POST body(DTO) → Controller 校验 → TraceCodeService → SerialAllocator 分配号 → 构造产品信息 → MemoryStore.put → 返回结果。
- **数据流（查询）**：GET path 参数 → Controller 格式校验 → TraceCodeService → MemoryStore.get → 返回或 404。
- **存储**：`ConcurrentHashMap<String, ProductInfo>`，key=追溯码，value=产品信息。单一 JVM，重启即清空（符合内存态要求）。

### 2.4 技术选型

| 项 | 选择 | 说明 |
|----|------|------|
| 后端语言 | Java 21 | 需求指定 |
| 后端框架 | Spring Boot 3.x（≥3.2，依赖 Java 21） | 标准 + 需求指定 |
| 校验 | spring-boot-starter-validation（jakarta） | `@NotNull`/`@NotBlank`/`@Min`/`@Max` |
| 存储 | JVM 内存 `ConcurrentHashMap` | 原型/演示，无需数据库 |
| 并发 | `java.util.concurrent.atomic.AtomicLong` + `ConcurrentHashMap` | 序列号并发安全 |
| 日期 | `java.time.LocalDate`，Jackson 序列化为 `yyyy-MM-dd` | Java 21 内置 |
| 构建 | Maven（Spring Boot maven plugin） | 默认 |
| 前端 | Vue 3 + TypeScript + Vite | 技术标准 |
| 前端 HTTP | `fetch`（无需额外库） | 简化 |
| 交互说明 | 开放API选装 | 可选，不影响交付 |

---

## 3. 详细模块设计（每个模块：职责/接口/数据结构/依赖）

### 模块 A：TraceCodeController（controller 层）

**职责**：暴露 REST 端点；接收请求、做协议/格式校验（`@Valid` + 手动 format 校验），调用 Service；不含业务逻辑。

**对外接口**：
1. **生成接口**
   - 路径：`POST /api/v1/trace-codes/generate`
   - 入参（JSON body，`GenerateTraceCodeRequest`）：见数据结构。
   - 出参（`GenerateTraceCodeResponse`）：`{ code: 0, message: "success", data: { count, traceCodes: [...] , traceCodeInfos: [...] } }`
     - 成功 HTTP 200。
     - 校验失败 HTTP 400，body 统一错误结构。
2. **查询接口**
   - 路径：`GET /api/v1/trace-codes/{code}`
   - 入参：path 参数 `code`。
   - 出参（`TraceCodeQueryResponse`）：`{ code: 0, message: "success", data: { traceCode, productName, batchNo, productionDate } }`
     - 成功 HTTP 200；不存在 HTTP 404；格式非法 HTTP 400。

**关键实现**：
- 统一响应体 `ApiResponse<T> { int code; String message; T data; }`，`code=0` 表成功；失败用 `GlobalExceptionHandler` 统一封装。
- `@RestController` + `@Validated`；集合/字符串用 `@Valid`，或函数内调用 `Assert`/手动校验保证格式。

**依赖**：`TraceCodeService`、`dto` 包、`exception` 的 `ApiResponse`。

**失败模式**：入参非法返回 400（不进入 Service）；后端异常由全局兜底返回 500。

### 模块 B：TraceCodeService（service 层）

**职责**：生成/查询业务流程编排、业务规则校验（quantity 边界、字段逻辑）、协调序列号分配与存储。

**对外接口**：
- `GenerateResult generate(GenerateTraceCodeRequest req)`：校验 → `SerialAllocator.alloc` → 构造 N 条 `ProductInfo` → `MemoryStore.putAll` → 返回。
- `ProductInfoView query(String code)`：`MemoryStore.get`；null 时抛 `BusinessException(NOT_FOUND)`。

**内部数据结构**：
- `GenerateResult { int count; List<String> traceCodes; }` —— traceCodes 为按序生成的 N 个码。
- `ProductInfoView { String traceCode; String productName; String batchNo; LocalDate productionDate; }`（查询出参视图）。

**关键实现**：
- 先调用 `alloc` 拿到 `startSerial`，再循环 `i in [0,quantity)` 计算 `serial = startSerial + i`，拼接码、构造 ProductInfo、`put` 到 MemoryStore。
- 码拼接统一走一个「构造追溯码」私有方法 `buildCode(prefix, productCode, serial)`，保证结构一致。
- **同一事务内强一致**：内存操作为单对象写入，无跨操作一致性问题。

**依赖**：`SerialAllocator`、`MemoryStore`、`dto`、领域对象 `ProductInfo`、`exception`。

**失败模式**：查询未命中抛业务异常→404；若 MemoryStore.put 发现 key 已存在（理论上由序列号唯一性保证不出现），抛 500。

### 模块 C：SerialAllocator（service 层域服务）

**职责**：为「企业前缀+商品代码」分配**线程安全、严格递增、全局唯一**的序列号；集中维护序列号规则。

**对外接口**：
- `long alloc(String prefix, String productCode, int quantity)`：返回本次分配序列的**起始号** `startSerial`；本次占用 `[startSerial, startSerial+quantity)`。

**内部数据结构**：
- `ConcurrentHashMap<String, AtomicLong> counters`：key=`prefix + productCode`，value=该 key 下**已分配的最大序列号**。
- 配置常量（经 `TraceConfig` 注入）：起始序列号默认 1，注入 `ATOMIC_INCREMENT` 步长。

**关键实现**：
- 原子性：`counters.computeIfAbsent(key, k -> new AtomicLong(0))` 初始化；用 `AtomicLong.getAndAdd(quantity)` 一次性预留，先到先得。
- 返回 `start = oldValue + 1`（起始为 1）。因 `getAndAdd` 原子，**并发生成同一 key 的 quantity 区间绝不重叠**，满足 R2。
- 序列号规则（起始值、步长）集中在配置，不在 Service 硬编码，满足 NFR-5。

**依赖**：`config`（`TraceConfig` 提供起始值/步长）。

**失败模式**：若 `oldValue + quantity` 溢出 long（不可达的业务级别），抛 `BusinessException(ILLEGAL_BUSINESS)`→500，防御性兜底。

### 模块 D：MemoryStore（store 层）

**职责**：内存态存储，作为唯一存储源；提供 traceCode → ProductInfo 的读写与并发安全。

**对外接口**：
- `void put(String code, ProductInfo info)`：写入，若 key 已存在则抛冲突异常（防御）。
- `ProductInfo get(String code)`：按码读取，未找到返回 null。
- （可选）`int size()`：便于演示/自检。

**内部数据结构**：`ConcurrentHashMap<String, ProductInfo> store`。

**关键实现**：
- 使用 `ConcurrentHashMap`，读写并发安全（NFR-2 / 数据一致性 NFR-6）。
- 本模块不持有业务逻辑，只做存储。

**依赖**：领域对象 `ProductInfo`。

**失败模式**：put 命中已存在键（理论被序列号唯一性排除），抛 500 防御。

### 模块 E：ProductInfo（model 领域对象）

**职责**：不可变（immutable）产品信息载体，聚合在追溯码下。

**数据结构**：`traceCode`(String)、`productName`(String)、`productCode`(String)、`batchNo`(String)、`productionDate`(LocalDate)、`serialNumber`(long)。

**依赖**：无（纯 POJO / 可选 record）。

### 模块 F：DTO（dto 包）

**职责**：请求/响应的传输对象，与领域对象分开（技术标准：DTO/VO 分离）。

**数据结构**：
- `GenerateTraceCodeRequest`：`enterprisePrefix`(String,@NotBlank)、`productCode`(String,@NotBlank)、`productName`(String,@NotBlank)、`batchNo`(String,@NotBlank)、`productionDate`(LocalDate,@NotNull,@PastOrPresent)、`quantity`(int,@NotNull,@Min(1),@Max(1000))。
- `GenerateTraceCodeResponse extends ApiResponse<Data>`：`Data{ int count; List<String> traceCodes; }`。
- `TraceCodeQueryResponse extends ApiResponse<Data>`：`Data{ traceCode, productName, batchNo, productionDate }`。
- `ApiResponse<T> { int code; String message; T data; boolean success; }`。

**依赖**：jakarta validation、Jackson。

### 模块 G：异常处理（exception 包）

**负责**：统一错误结构 `{ code, message, data }`，将校验错误、业务异常、系统异常归一化（满足 NFR-3）。

**对外接口/能力**：
- `BusinessException(code, message)`：业务异常（如定位 NOT_FOUND）。
- `GlobalExceptionHandler(ControllerAdvice)`：捕获 `MethodArgumentNotValidException` / `ConstraintViolationException` → 400；`BusinessException.NOT_FOUND` → 404；其他 → 500。

**关键实现**：错误码常量集中（`ErrorCode`：`VALIDATION_ERROR`、`NOT_FOUND`、`INTERNAL_ERROR`）；错误消息前后端约定。

**依赖**：无（或仅依赖自身常量）。

### 模块 H：TraceConfig（config 包）

**职责**：集中序列号规则配置（起始值、步长），满足 NFR-5「序列号规则集中配置」。

**数据结构**：`int initialSerial=1`、`int incrementalStep=1`（可经 `@ConfigurationProperties` 或常量提供）。

**依赖**：无。

### 模块 I：Vue 前端（frontend/）

**职责**：FR-3 单页查询——输入追溯码 → 调后端查询 → 展示产品名/批次/生产日期；空输入拦截；未找到提示。

**对外接口**（HTTP，仅消费后端）：
- `GET {API_BASE}/api/v1/trace-codes/{code}`：返回 `{ code, message, data:{ traceCode, productName, batchNo, productionDate } }`。

**关键实现**：
- `App.vue`：`<input>` + `<button>`；空输入时 `preventDefault` 并提示「请输入追溯码」，不发请求。
- `api/trace.ts`：用 `fetch` 封装查询，处理 404 → 展示「未找到该追溯码」；其他错误展示 message。
- `vite.config.ts`：`server.proxy { '/api': { target:'http://localhost:8080' } }` 避免跨域（开发态）。
- 展示区：命中时展示字段；未命中时展示错误提示。

**依赖**：后端查询接口。

**失败模式**：后端未启动→网络错误提示；空输入→前端直接拦截。

---

## 4. 服务归属清单（新建 vs 升级现有）

| 服务 | 类型 | 说明 |
|------|------|------|
| 后端 Spring Boot 应用（新增工程，模块 A–H） | 新建 | 全新单应用，Java 21 + Spring Boot 3，内存态 |
| 前端 Vue 3 + Vite 查询页（模块 I） | 新建 | 全新单页应用，仅查询 |
| 既有服务 | — | 仓库无既有实现（仅 specs），无升级项 |

注：无任何「升级现有服务」项；后端为单体新建服务，前端为单体新建应用。

---

## 5. 非功能与失败模式

### 5.1 非功能保障映射
| NFR | 实现 |
|-----|------|
| 性能（N≤1000 毫秒~秒级） | 单次 O(N) 内存写入 + 原子序列号，N≤1000 在若干毫秒内完成 |
| 并发唯一（NFR-2） | AtomicLong.getAndAdd + ConcurrentHashMap，天然线程安全 |
| 可用性/规范错误码（NFR-3） | GlobalExceptionHandler 统一 400/404/500 结构 |
| 技术栈（NFR-4） | Java 21 + Spring Boot 3 + Vue 3 |
| 可维护性（NFR-5） | 生成/查询分层，序列号规则在 TraceConfig 集中配置 |
| 数据一致性（NFR-6） | 内存单对象写入，查询只读，无漂移 |

### 5.2 失败模式与兜底
| 失败 | 检测 | 兜底/恢复 |
|------|------|----------|
| 入参校验失败 | @Valid / format 校验 | 400 + 字段消息 |
| 查询码不存在 | MemoryStore.get==null | 业务异常→404 |
| 并发序列号溢出 | SerialAllocator 检查 | 500 防御 |
| 内存冲突（理论不出现） | put 前置检查 | 500 防御 |
| 前端后端未连通 | fetch 异常 | 页面错误提示 |
| 服务重启 | — | 内存清空（符合定位，README 注明） |

### 5.3 部署/运行
- 后端：`mvn spring-boot:run`，监听 `8080`。
- 前端：`npm run dev`，Vite 默认 `5173`，`/api` 代理到 `8080`；或构建后由后端/静态服务器托管。
- 交接文档 `docs/README.md`（运行方式、接口示例、重启清空说明）。

---

## 6. 实施顺序建议

按依赖次序分四个阶段，便于逐步验收：

**阶段 1：后端骨架 + 领域 + 配置**
- 建 Maven 工程（Java 21、Spring Boot 3.x、validation 依赖）。
- ProductInfo、DTO、ApiResponse、ErrorCode、TraceConfig、MemoryStore、SerialAllocator。
- 可交付：空壳可启动。

**阶段 2：生成 + 查询接口（FR-1、FR-2）**
- TraceCodeService、TraceCodeController、GlobalExceptionHandler。
- 手写 /Postman 自测：生成 N 个码、并发生成唯一性、查询命中/未命中、400/404。
- 可交付：后端 REST 全部通过需求验收（FR-1、FR-2）。

**阶段 3：前端查询页（FR-3）**
- Vue 3 + Vite 工程、App.vue、api/trace.ts、vite proxy。
- 验证空输入拦截、命中展示、未命中提示。
- 可交付：FR-3 通过；前后端联调成功。

**阶段 4：收尾**
- 并发压测脚本验证序列号唯一（简易并发生成自检）。
- README 运行文档；回归全部 FR 验收标准。
- 可交付：完整可运行交付物。

每阶段独立可回归；阶段 2 是核心、阶段 3 依赖后端查询接口（阶段 2）。
