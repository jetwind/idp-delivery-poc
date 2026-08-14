// Mock 数据第二部分：规格 / 流程 / AI Task / Gate / 版本 / 成果 / 复盘
export type SpecStatus = '草稿' | '编制中' | '待确认' | '已确认' | '未开始'
export interface Spec { id: string; name: string; version: string; status: SpecStatus; completeness: number; gate: '已通过' | '待确认' | '未触发'; updated: string; owner: string; summary: string }
export const specs: Spec[] = [
  { id: 'req', name: '需求规格', version: 'V1.5', status: '已确认', completeness: 94, gate: '已通过', updated: '2026-07-10 16:22', owner: '李婉清', summary: '目标、范围、流程、功能、规则、验收条件' },
  { id: 'design', name: '设计规格', version: 'V1.3', status: '已确认', completeness: 91, gate: '已通过', updated: '2026-07-12 11:05', owner: '王志恒', summary: '总体方案、系统设计、数据设计' },
  { id: 'api', name: '接口规格', version: 'V0.9', status: '编制中', completeness: 72, gate: '未触发', updated: '2026-07-17 19:40', owner: '陈以默', summary: 'API、数据结构、异常机制' },
  { id: 'test', name: '测试验收规格', version: 'V0.6', status: '编制中', completeness: 58, gate: '未触发', updated: '2026-07-16 15:18', owner: '周雨桐', summary: '测试范围、用例、验收标准' },
  { id: 'release', name: '发布交付规格', version: '—', status: '未开始', completeness: 0, gate: '未触发', updated: '—', owner: '吴海峰', summary: '发布、部署、回滚、交付要求' },
]

export interface SpecSection { id: string; title: string; status: '完整' | '待补充' | '缺失'; content: string[] }
export const reqSpecSections: SpecSection[] = [
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
]

// ---------------- Workflow ----------------
export type NodeType = 'AI Task' | 'Human Task' | 'System Task' | 'Evaluation' | 'Human Gate' | 'Coding Agent'
export type NodeStatus = '已完成' | '执行中' | '待处理' | '未开始' | '被阻断'
export interface FlowNode { id: string; name: string; type: NodeType; status: NodeStatus; actor?: string; duration?: string; gaps?: number }
export interface FlowStage { name: string; nodes: FlowNode[] }
export const workflow: FlowStage[] = [
  { name: '需求澄清', nodes: [
    { id: 'n1', name: '需求资料整理', type: 'AI Task', status: '已完成', actor: '需求分析师 · Ava', duration: '2h 14m' },
    { id: 'n2', name: '需求完整性检查', type: 'Evaluation', status: '已完成', duration: '8m' },
    { id: 'n3', name: '需求规格确认', type: 'Human Gate', status: '已完成', actor: '李婉清', duration: '2026-07-10' },
  ]},
  { name: '方案设计', nodes: [
    { id: 'n4', name: '方案生成', type: 'AI Task', status: '已完成', actor: '方案架构师 · Neo', duration: '4h 02m' },
    { id: 'n5', name: '方案质量检查', type: 'Evaluation', status: '已完成', duration: '11m' },
    { id: 'n6', name: '方案确认', type: 'Human Gate', status: '已完成', actor: '王志恒 / 陈以默', duration: '2026-07-12' },
  ]},
  { name: '开发实现', nodes: [
    { id: 'n7', name: '开发任务拆解', type: 'AI Task', status: '已完成', actor: '开发主管 · Rex', duration: '1h 36m' },
    { id: 'n8', name: '代码影响分析', type: 'AI Task', status: '已完成', actor: '开发主管 · Rex', duration: '48m' },
    { id: 'n9', name: '代码开发', type: 'Coding Agent', status: '执行中', actor: 'Coding Agent · Dev-07', duration: '已运行 3d 6h' },
    { id: 'n10', name: 'CI 构建', type: 'System Task', status: '执行中', actor: 'CI', duration: '—' },
    { id: 'n11', name: '代码质量检查', type: 'Evaluation', status: '待处理' },
  ]},
  { name: '测试验证', nodes: [
    { id: 'n12', name: '测试用例生成', type: 'AI Task', status: '被阻断', actor: '测试工程师 · Tess', gaps: 3 },
    { id: 'n13', name: '自动测试', type: 'System Task', status: '未开始', actor: '测试平台' },
    { id: 'n14', name: '测试放行', type: 'Human Gate', status: '未开始', actor: '周雨桐' },
  ]},
  { name: '发布交付', nodes: [
    { id: 'n15', name: '创建项目基线', type: 'System Task', status: '未开始' },
    { id: 'n16', name: '发布执行', type: 'System Task', status: '未开始', actor: '发布平台' },
    { id: 'n17', name: '发布确认', type: 'Human Gate', status: '未开始', actor: '张明远' },
  ]},
  { name: '项目复盘', nodes: [
    { id: 'n18', name: 'AI 项目复盘', type: 'AI Task', status: '未开始', actor: '复盘分析师 · Echo' },
    { id: 'n19', name: '资产候选识别', type: 'AI Task', status: '未开始', actor: '复盘分析师 · Echo' },
  ]},
]

// ---------------- AI Task 详情 ----------------
export const aiTaskDetail = {
  id: 'n8', name: '代码影响分析', stage: '开发实现', agent: '开发主管 · Rex', status: '已完成', duration: '48m 32s',
  started: '2026-07-16 09:12', finished: '2026-07-16 10:00',
  goal: '基于需求规格 V1.5 与设计规格 V1.3，分析本次变更对 8 个关联微服务的代码影响范围，输出影响清单与改造建议，供 Coding Agent 执行开发。',
  specRefs: [{ name: '需求规格', version: 'V1.5' }, { name: '设计规格', version: 'V1.3' }, { name: '接口规格', version: 'V0.9（参考）' }],
  engCtx: ['trace-code-service（核心改造）', 'trace-pack-relation（新建）', 'trace-query-gateway（接口适配）', 'sap-connector（接口适配）'],
  knowledge: ['微服务拆分规范 V2.1', '追溯行业最佳实践 · 多级包装关联', '编码规范（Java）V3.4'],
  steps: [
    { name: '获取项目上下文', status: 'done', desc: '加载业务上下文 21 项、工程上下文 5 类、企业知识 4 类', time: '3m 12s' },
    { name: '影响面分析', status: 'done', desc: '解析需求变更点 37 项，映射到 8 个微服务、214 个代码模块', time: '22m 40s' },
    { name: '改造建议生成', status: 'done', desc: '生成改造建议 43 条，标注风险等级与工作量估算', time: '15m 18s' },
    { name: '结构化输出', status: 'done', desc: '输出影响清单、改造任务草案、风险提示', time: '7m 22s' },
  ],
  results: [
    { key: '受影响微服务', value: '6 / 8 个', note: '新建 2、核心改造 2、接口适配 2' },
    { key: '受影响代码模块', value: '214 个', note: '其中高风险模块 17 个' },
    { key: '新增接口', value: '23 个', note: '含 SAP 集成接口 6 个' },
    { key: '改造接口', value: '11 个', note: '向下兼容，无需调用方改造' },
    { key: '预估工作量', value: '186 人日', note: 'AI 估算，置信度 0.82' },
  ],
  risks: [
    { level: '高', title: 'trace-code-service 赋码核心模块改动面大', desc: '赋码生成与校验逻辑集中改动，建议增加灰度发布策略与回滚预案。' },
    { level: '中', title: 'SAP 接口字段映射存在 3 处歧义', desc: '物料主数据 MATNR 与内部物料编码映射规则未在需求规格中明确。' },
    { level: '低', title: '查询网关缓存策略需同步调整', desc: '新增包装层级后，现有缓存 Key 结构命中率预计下降约 8%。' },
  ],
}

// ---------------- Evaluation ----------------
export const evalResult = {
  target: '接口规格 V0.9', score: 86, time: '2026-07-17 19:42',
  dims: [
    { name: '完整性', score: 78, desc: '是否存在必要内容缺失' },
    { name: '一致性', score: 92, desc: '前后规格是否存在冲突' },
    { name: '规范符合度', score: 88, desc: '是否符合企业标准' },
    { name: '可验证性', score: 81, desc: '是否能够被测试和验收' },
    { name: '风险控制', score: 90, desc: '是否存在明显风险' },
  ],
  issues: [
    { type: '阻断问题', title: 'SAP 物料主数据接口缺少异常重试机制定义', source: '接口规格 §3.2', rule: '完整性 · 接口规范 V2.1 第 7 条' },
    { type: '阻断问题', title: '包装关联修正接口缺少幂等性说明', source: '接口规格 §4.1', rule: '规范符合度 · API 设计规范 4.3' },
    { type: '风险问题', title: '追溯查询接口未定义大数据量分页上限', source: '接口规格 §5.3', rule: '风险控制 · 性能基线' },
    { type: '优化建议', title: '建议统一错误码区间分配（4xxxx 业务 / 5xxxx 系统）', source: '接口规格 §6', rule: '规范符合度 · 错误码规范' },
    { type: '优化建议', title: '接口示例报文建议补充异常场景样例', source: '接口规格 附录 A', rule: '可验证性' },
  ],
}

export const humanGate = {
  id: 'GATE-2026-0717-01', title: '设计规格确认（补充评审）', object: '设计规格', version: 'V1.3',
  stage: '方案设计 → 开发实现', requester: '方案架构师 · Neo', evalScore: 91,
  decisions: [
    { q: '多级包装关联采用独立新服务还是并入 trace-code-service？', options: 'AI 建议独立新服务（trace-pack-relation），理由：关联关系变更频率高、独立伸缩', status: '采纳 AI 建议' },
    { q: '码数据保留周期：客户要求 5 年，存储成本预估增加 34%', options: '热数据 13 个月 + 冷数据归档至对象存储', status: '待决策' },
    { q: 'SAP 集成采用 RFC 直连还是中间表方式？', options: 'AI 建议中间表方式，降低耦合、便于对账', status: '采纳 AI 建议' },
  ],
  history: [
    { who: '李婉清', action: '确认通过', target: '需求规格 V1.5', time: '2026-07-10 16:40', comment: '范围与业务侧已对齐，验收条件补充后邮件同步即可。' },
    { who: '王志恒', action: '确认通过', target: '设计规格 V1.2', time: '2026-07-05 10:12', comment: '通过。注意 SAP 侧接口排期依赖客户 IT。' },
    { who: '陈以默', action: '修改后通过', target: '设计规格 V1.2', time: '2026-07-05 10:35', comment: '调整了分库分表方案，其余确认。' },
  ],
}
