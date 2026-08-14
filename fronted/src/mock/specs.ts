// 五类规格的独立详情数据
export interface SpecSectionData { id: string; title: string; status: '完整' | '待补充' | '缺失'; content: string[] }
export interface SpecCheck { type: '阻断问题' | '风险问题' | '优化建议'; title: string; desc: string; action: string }
export interface SpecPending { q: string; from: string; who: string }
export interface SpecData {
  id: string; name: string; version: string; status: string; owner: string; updated: string; evalScore: number; gate: string
  sections: SpecSectionData[]; checks: SpecCheck[]; pendings: SpecPending[]
  apiList?: { method: string; path: string; name: string; status: string }[]
  testCases?: { scene: string; count: number; coverage: string }[]
}

export const specDataMap: Record<string, SpecData> = {
  req: {
    id: 'req', name: '需求规格', version: 'V1.5', status: '已确认', owner: '李婉清', updated: '2026-07-10 16:22', evalScore: 94, gate: '已通过',
    sections: [
      { id: 's1', title: '1. 项目目标', status: '完整', content: [
        '为华润智造集团建立覆盖生产、仓储、渠道、终端的全链路产品追溯体系。',
        '实现一物一码管理，支持盒、箱、托三级包装层级关联，关联准确率 ≥ 99.95%。',
        '建立渠道货流监控能力，实现窜货行为 T+1 识别与预警。',
        '追溯查询平均响应时间 ≤ 800ms（日均 300 万次查询量级）。'] },
      { id: 's2', title: '2. 项目范围', status: '完整', content: [
        '纳入范围：赋码管理、多级包装关联、渠道货流采集、追溯查询门户、SAP 主数据集成。',
        '不纳入范围：产线硬件改造、经销商 ERP 内部流程、消费者端营销玩法（二期）。',
        '涉及组织：集团总部信息中心、3 个生产基地、全国 27 个 RDC 仓库。'] },
      { id: 's3', title: '3. 业务流程', status: '完整', content: [
        '生产赋码：产线赋码设备生成唯一码 → 盒码采集 → 装箱关联 → 托码绑定 → 入库上报。',
        '渠道流转：出库扫码 → 经销商收货确认 → 终端门店扫码入库 → 消费者扫码查询。',
        '异常处理：码冲突自动拦截 → 人工复核 → 黑名单码冻结。'] },
      { id: 's4', title: '4. 功能需求', status: '完整', content: [
        'FR-01 赋码管理：支持批次赋码、补码、作废码，支持 GS1 编码规范。',
        'FR-02 包装关联：支持盒-箱-托三级关联与拆箱重组，支持关联关系修正审批。',
        'FR-03 货流采集：支持 PDA、API、Excel 三种采集方式，断点续传。',
        'FR-04 追溯查询：正向查询（码→流向）与反向溯源（批次→全部码）。',
        'FR-05 窜货预警：按区域规则自动比对，生成窜货嫌疑清单。'] },
      { id: 's5', title: '5. 业务规则', status: '待补充', content: [
        'BR-01 同一码 24 小时内跨区域扫码超过 3 次，标记为窜货嫌疑。',
        'BR-02 箱码破损时允许以盒码反查重新关联，需双人复核。',
        '【待补充】退货场景下码状态回滚规则尚未与业务确认。'] },
      { id: 's6', title: '6. 验收条件', status: '缺失', content: ['【缺失】验收标准、验收流程与性能验收指标尚未定义，建议尽快补充。'] },
    ],
    checks: [
      { type: '阻断问题', title: '§6 验收条件章节缺失', desc: '缺少验收标准与性能验收指标，阻断进入测试验证阶段。', action: 'AI 生成建议稿' },
      { type: '风险问题', title: '§5 退货码状态回滚规则未确认', desc: '与设计规格 §3.4 状态机描述存在潜在冲突，需业务确认。', action: '标记为已确认' },
      { type: '优化建议', title: '建议为 FR-04 补充大数据量性能约束', desc: '当前未约束单次查询返回码数量上限，建议 ≤ 10000 条。', action: '采纳建议' },
    ],
    pendings: [
      { q: '退货场景下码状态是否允许回滚至「已出库」？', from: 'AI 提取自 07-09 会议纪要', who: '产品负责人 · 李婉清' },
      { q: '跨仓调拨的货流归属：发出仓还是接收仓？', from: 'AI 提取自需求文档 §2.3', who: '产品负责人 · 李婉清' },
    ],
  },

  design: {
    id: 'design', name: '设计规格', version: 'V1.3', status: '已确认', owner: '王志恒', updated: '2026-07-12 11:05', evalScore: 91, gate: '已通过',
    sections: [
      { id: 's1', title: '1. 总体架构', status: '完整', content: [
        '采用微服务架构，新建 2 个服务（包装关联、渠道货流），核心改造 2 个（赋码、门户），接口适配 2 个（查询网关、SAP 连接器），直接复用 2 个（主数据、认证中心）。',
        '包装关联独立成服务：关联关系变更频率高、需独立伸缩，经 Human Gate 评审采纳 AI 建议。',
        '整体部署于客户私有云 K8s 集群，网关统一入口，服务间 gRPC 通信。'] },
      { id: 's2', title: '2. 服务划分与职责', status: '完整', content: [
        'trace-pack-relation：盒-箱-托三级关联关系的建立、拆解、修正与查询，独立分库。',
        'trace-channel-flow：渠道货流事件的采集、清洗、归集，按区域分片存储。',
        'trace-code-service：赋码生成、校验、状态机管理，本次改造状态机支持退货回滚。',
        'sap-connector：SAP 主数据同步（中间表方式），支持准实时增量同步。'] },
      { id: 's3', title: '3. 数据设计', status: '完整', content: [
        '码主表按赋码批次哈希分 16 库 256 表，预计年增 40 亿条；冷热分离：热数据 13 个月在线，冷数据归档至对象存储。',
        '关联关系表引入「关系版本」字段，支持修正历史追溯；状态变更全部记录审计流水。',
        '货流事件表按「区域 + 月份」二级分区，支撑窜货预警的窗口扫描。'] },
      { id: 's4', title: '4. 关键机制设计', status: '待补充', content: [
        '窜货预警：规则引擎每日 T+1 扫描货流事件，命中规则生成嫌疑单，支持规则热更新。',
        '关联修正：双人复核 + 审批流，修正前后关系快照均保留。',
        '【待补充】码数据归档后的查询降级方案：归档期数据的查询路径与 SLA 尚未定义。'] },
      { id: 's5', title: '5. 非功能设计', status: '完整', content: [
        '性能：追溯查询 P95 ≤ 800ms，码写入峰值 2000 TPS；网关限流 3000 QPS。',
        '可用性：核心服务双 AZ 部署，RTO ≤ 30 分钟，RPO ≤ 5 分钟。',
        '安全：码数据脱敏展示，接口签名验签，操作审计全量留痕。'] },
    ],
    checks: [
      { type: '阻断问题', title: '§4 归档数据查询降级方案缺失', desc: '5 年数据保留要求下，归档数据的查询路径未定义，影响非功能指标可达性。', action: 'AI 生成建议稿' },
      { type: '风险问题', title: '码主表分片键与窜货扫描维度不一致', desc: '按批次哈希分片后，区域窗口扫描需跨全分片，建议增加区域维度冗余索引。', action: '采纳建议' },
      { type: '优化建议', title: '建议补充服务依赖拓扑图', desc: '当前仅有文字描述，建议由 AI 根据服务清单自动生成拓扑图嵌入。', action: 'AI 生成拓扑图' },
    ],
    pendings: [
      { q: '码数据保留周期 5 年：热数据 13 个月 + 冷归档方案是否接受？', from: 'Human Gate 决策事项 · 存储成本预估增加 34%', who: '架构负责人 · 陈以默' },
    ],
  },

  api: {
    id: 'api', name: '接口规格', version: 'V0.9', status: '编制中', owner: '陈以默', updated: '2026-07-17 19:40', evalScore: 86, gate: '未触发',
    sections: [
      { id: 's1', title: '1. 接口设计原则', status: '完整', content: [
        'RESTful 风格，统一前缀 /api/v1；写操作幂等设计，重试不产生副作用。',
        '错误码分段：4xxxx 业务错误，5xxxx 系统错误；统一响应结构 { code, message, data, traceId }。',
        '分页统一 cursor 模式，单页上限 500 条；查询类接口必须声明数据量级与性能基线。'] },
      { id: 's2', title: '2. 赋码管理接口（6 个）', status: '完整', content: ['见右侧接口清单 · 已全部定义，含请求/响应示例。'] },
      { id: 's3', title: '3. 包装关联接口（8 个）', status: '待补充', content: [
        '已定义 6/8 个接口。',
        '【待补充】POST /relations/correct 关联修正接口缺少幂等性说明（阻断问题）。',
        '【待补充】GET /relations/tree 关系树查询未定义深度上限与返回结构。'] },
      { id: 's4', title: '4. 渠道货流接口（5 个）', status: '完整', content: ['见右侧接口清单 · 已全部定义。'] },
      { id: 's5', title: '5. SAP 集成接口（6 个）', status: '待补充', content: [
        '已定义 4/6 个接口。',
        '【阻断】物料主数据同步接口缺少异常重试机制定义（重试策略、死信处理、对账补偿）。',
        '【待补充】库存状态回传接口的字段映射存在 3 处歧义，待客户 IT 确认。'] },
      { id: 's6', title: '6. 异常与错误码', status: '完整', content: [
        '业务错误：40101 码不存在 / 40102 码状态非法 / 40103 关联关系冲突 / 40104 重复关联。',
        '系统错误：50001 上游超时 / 50002 存储异常 / 50003 限流熔断。',
        '所有 5xx 错误自动触发告警并写入运维事件流。'] },
    ],
    checks: [
      { type: '阻断问题', title: 'SAP 物料主数据接口缺少异常重试机制定义', desc: '接口规范 V2.1 第 7 条：集成接口必须定义重试策略、死信处理与对账补偿。', action: 'AI 生成建议稿' },
      { type: '阻断问题', title: '包装关联修正接口缺少幂等性说明', desc: 'API 设计规范 4.3：修正类写接口必须声明幂等键与重入行为。', action: 'AI 补全幂等设计' },
      { type: '风险问题', title: '追溯查询接口未定义大数据量分页上限', desc: '单批次可能返回数十万码记录，需约束分页策略与超时阈值。', action: '采纳建议' },
      { type: '优化建议', title: '接口示例报文建议补充异常场景样例', desc: '当前示例仅覆盖成功路径，建议补充 40103、50001 样例。', action: 'AI 生成示例' },
    ],
    pendings: [
      { q: '物料主数据 MATNR 与内部物料编码映射规则（3 处歧义）', from: 'AI 提取自客户接口文档批注', who: '架构负责人 · 陈以默 / 客户 IT' },
      { q: '货流采集接口是否向经销商开放直连？', from: '待与客户业务确认', who: '产品负责人 · 李婉清' },
    ],
    apiList: [
      { method: 'POST', path: '/api/v1/codes/batch', name: '批次赋码', status: '已定义' },
      { method: 'POST', path: '/api/v1/codes/void', name: '作废码', status: '已定义' },
      { method: 'GET', path: '/api/v1/codes/{code}', name: '码详情查询', status: '已定义' },
      { method: 'POST', path: '/api/v1/relations/bind', name: '包装关联绑定', status: '已定义' },
      { method: 'POST', path: '/api/v1/relations/unbind', name: '拆箱解绑', status: '已定义' },
      { method: 'POST', path: '/api/v1/relations/correct', name: '关联修正', status: '待补充' },
      { method: 'GET', path: '/api/v1/relations/tree', name: '关系树查询', status: '待补充' },
      { method: 'POST', path: '/api/v1/flows/collect', name: '货流采集上报', status: '已定义' },
      { method: 'GET', path: '/api/v1/trace/forward/{code}', name: '正向追溯', status: '已定义' },
      { method: 'POST', path: '/api/v1/sap/material/sync', name: '物料主数据同步', status: '待补充' },
    ],
  },

  test: {
    id: 'test', name: '测试验收规格', version: 'V0.6', status: '编制中', owner: '周雨桐', updated: '2026-07-16 15:18', evalScore: 72, gate: '未触发',
    sections: [
      { id: 's1', title: '1. 测试范围与策略', status: '完整', content: [
        '覆盖范围：8 个微服务的功能测试、接口测试、性能测试与 UAT 验收测试。',
        '策略：单元测试由 Coding Agent 随码生成（覆盖率门槛 70%）；接口与场景用例由测试工程师 Tess 基于需求规格 V1.5 生成；性能测试基于接口规格基线执行。',
        '准入条件：需求规格已确认 + 接口规格通过 Evaluation（当前存在 2 个阻断问题）。'] },
      { id: 's2', title: '2. 功能测试用例（AI 生成中）', status: '待补充', content: [
        '计划生成 142 条用例，当前已生成 96 条；剩余 46 条等待「验收要求」等 3 项输入补全后继续。',
        '详见右侧用例场景分布。'] },
      { id: 's3', title: '3. 性能测试方案', status: '完整', content: [
        '基准场景：追溯查询 P95 ≤ 800ms（300 万次/日）；码写入 2000 TPS 峰值持续 30 分钟。',
        '工具与环境：JMeter，UAT 环境（与生产同构 1:4 缩容），数据准备 10 亿条码记录。',
        '验收口径：连续 3 轮压测达标且资源水位 ≤ 65%。'] },
      { id: 's4', title: '4. 验收标准', status: '缺失', content: ['【缺失】验收要求上下文缺失，验收标准无法定义——已在输入补全中心挂起，需产品负责人补充。'] },
      { id: 's5', title: '5. 缺陷管理与放行', status: '待补充', content: [
        '缺陷分级：P1 阻断 / P2 严重 / P3 一般 / P4 建议；P1/P2 清零方可申请测试放行 Gate。',
        '【待补充】回归范围界定规则：CR 合入后的回归圈定策略尚未定义。'] },
    ],
    checks: [
      { type: '阻断问题', title: '§4 验收标准缺失', desc: '测试放行 Gate 无判定依据，依赖项目上下文「验收要求」补全。', action: '前往输入补全' },
      { type: '风险问题', title: '退货回滚场景未覆盖', desc: '需求规格 §5 该规则待确认，对应 12 条异常流用例无法定稿。', action: '关联需求待确认' },
      { type: '优化建议', title: '建议增加码冲突并发场景压测', desc: '多产线并发赋码冲突场景当前无专项用例，建议补充 8 条。', action: 'AI 生成用例' },
    ],
    pendings: [
      { q: '性能验收按 UAT 1:4 缩容环境结果线性外推，客户是否认可？', from: 'AI 风险提示', who: '测试负责人 · 周雨桐 / 客户 IT' },
    ],
    testCases: [
      { scene: '赋码管理', count: 28, coverage: '92%' },
      { scene: '包装关联（绑定/拆箱/修正）', count: 34, coverage: '88%' },
      { scene: '渠道货流采集', count: 22, coverage: '85%' },
      { scene: '追溯查询', count: 18, coverage: '90%' },
      { scene: '窜货预警', count: 16, coverage: '76%' },
      { scene: 'SAP 集成', count: 14, coverage: '64%' },
      { scene: '异常流（退货/冲突/断链）', count: 10, coverage: '41%' },
    ],
  },

  release: {
    id: 'release', name: '发布交付规格', version: '—', status: '未开始', owner: '吴海峰', updated: '—', evalScore: 0, gate: '未触发',
    sections: [
      { id: 's1', title: '1. 发布策略', status: '缺失', content: ['【未开始】定义发布窗口、灰度策略（按区域分批）、审批链与通知机制。', 'AI 建议：首次生产发布按「1 个基地 + 3 个 RDC」灰度 2 周后全量，可由 AI 基于最佳实践生成建议稿。'] },
      { id: 's2', title: '2. 部署方案', status: '缺失', content: ['【未开始】定义部署拓扑、配置项清单、数据初始化与迁移步骤。'] },
      { id: 's3', title: '3. 回滚预案', status: '缺失', content: ['【未开始】定义回滚触发条件、回滚步骤、数据回滚边界（码数据不可回滚，仅应用层回滚）。'] },
      { id: 's4', title: '4. 交付物清单', status: '缺失', content: ['【未开始】定义向客户交付的材料：部署运维手册、用户操作手册、培训材料、验收材料包。'] },
      { id: 's5', title: '5. 运维交接', status: '缺失', content: ['【未开始】定义监控告警基线、巡检项、SLA 与运维交接流程。'] },
    ],
    checks: [
      { type: '优化建议', title: '建议在前置规格确认后启动编制', desc: '发布交付规格依赖接口规格（部署接口清单）与测试验收规格（验收口径），当前两者均有阻断问题。', action: '查看依赖状态' },
    ],
    pendings: [],
  },
}
