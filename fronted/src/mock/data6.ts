// Mock 数据第六部分：知识库管理
export interface KBCategory { id: string; name: string; desc: string; entries: number; refs: number; updated: string; health: number }
export const kbCategories: KBCategory[] = [
  { id: 'product', name: '产品知识库', desc: '追溯平台产品功能、规则与配置说明', entries: 46, refs: 128, updated: '2026-07-16', health: 92 },
  { id: 'industry', name: '行业知识', desc: 'GS1 规范、快消追溯业务模式、监管要求', entries: 32, refs: 86, updated: '2026-07-08', health: 88 },
  { id: 'tech', name: '技术规范', desc: '编码规范、微服务拆分、API 设计、错误码规范', entries: 28, refs: 210, updated: '2026-07-12', health: 95 },
  { id: 'practice', name: '最佳实践', desc: '历史项目沉淀的架构与实施实践', entries: 19, refs: 64, updated: '2026-07-05', health: 81 },
  { id: 'deposit', name: '项目沉淀资产', desc: '各项目复盘沉淀的业务规则、模板与案例', entries: 23, refs: 41, updated: '2026-07-17', health: 76 },
]

export interface KBEntry {
  id: string; title: string; category: string; type: string; source: string; sourceDetail: string
  status: '已发布' | '待审核' | '草稿' | '待更新'; version: string; refs: number
  agents: string[]; updated: string; author: string
  preview?: string[]; history?: { v: string; note: string; time: string }[]
}
export const kbEntries: KBEntry[] = [
  { id: 'k1', title: '微服务拆分规范', category: '技术规范', type: '规范文档', source: '企业架构委员会', sourceDetail: '企业架构委员会 · 年度规范评审发布', status: '已发布', version: 'V2.1', refs: 86, agents: ['Neo', 'Rex', 'Dev-07'], updated: '2026-07-12', author: '唐艺宁',
    preview: ['单一职责：一个服务只负责一个业务域，禁止跨域直接读写数据库。', '变更频率相近的能力聚合：变更频率高且独立的业务能力应独立成服务。', '独立伸缩：存在明显独立伸缩需求的能力（如关联关系、货流事件）独立部署。', '数据归属清晰：服务拥有自有数据，跨服务查询通过 API 或事件。'],
    history: [{ v: 'V2.1', note: '补充独立伸缩判定标准与案例', time: '2026-07-12' }, { v: 'V2.0', note: '增加事件驱动集成章节', time: '2026-01-20' }, { v: 'V1.0', note: '首次发布', time: '2025-06-15' }] },
  { id: 'k2', title: 'API 设计规范', category: '技术规范', type: '规范文档', source: '企业架构委员会', sourceDetail: '企业架构委员会 · 规范评审发布', status: '已发布', version: 'V4.3', refs: 74, agents: ['Neo', 'Rex', 'Dev-07'], updated: '2026-07-10', author: '唐艺宁' },
  { id: 'k3', title: '编码规范（Java）', category: '技术规范', type: '规范文档', source: '研发中心', sourceDetail: '研发中心 · 技术委员会发布', status: '已发布', version: 'V3.4', refs: 52, agents: ['Rex', 'Dev-07'], updated: '2026-06-28', author: '冯子昂' },
  { id: 'k4', title: 'GS1 编码规范解读', category: '行业知识', type: '行业标准', source: '行业标准组织', sourceDetail: '外部引入 · 产品部维护', status: '已发布', version: 'V1.6', refs: 41, agents: ['Ava', 'Neo'], updated: '2026-07-08', author: '李婉清' },
  { id: 'k5', title: '防窜货业务模式白皮书', category: '行业知识', type: '行业研究', source: '产品部', sourceDetail: '产品部 · 行业研究组', status: '已发布', version: 'V2.0', refs: 35, agents: ['Ava'], updated: '2026-07-02', author: '何俊熙' },
  { id: 'k6', title: '多级包装关联规则', category: '项目沉淀资产', type: '业务规则', source: '全域产品追溯平台 · 复盘', sourceDetail: '全域产品追溯平台建设项目 → 项目复盘（07-16）→ 资产候选确认（王志恒）→ 提交入库申请', status: '待审核', version: 'V0.1', refs: 0, agents: [], updated: '2026-07-17', author: '复盘分析师 · Echo',
    preview: ['盒-箱-托三级关联：装箱时建立父子关系，拆箱自动解除。', '关联修正需双人复核，修正前后关系快照均保留可溯。', '箱码破损时允许以盒码反查重新关联。'],
    history: [{ v: 'V0.1', note: 'AI 从项目交付过程提取的草稿', time: '2026-07-17' }] },
  { id: 'k7', title: '标准追溯项目方案', category: '项目沉淀资产', type: '方案模板', source: '一物一码营销平台 · 复盘', sourceDetail: '一物一码营销平台项目 → 复盘沉淀（2026-02）', status: '已发布', version: 'V1.0', refs: 28, agents: ['Neo'], updated: '2026-06-15', author: '复盘分析师 · Echo' },
  { id: 'k8', title: '防窜货需求模板', category: '项目沉淀资产', type: '需求模板', source: '渠道防窜货专项 · 复盘', sourceDetail: '渠道防窜货专项交付 → 项目复盘 → 资产候选确认', status: '待审核', version: 'V0.1', refs: 0, agents: [], updated: '2026-07-16', author: '复盘分析师 · Echo' },
  { id: 'k9', title: 'SAP 接口案例', category: '项目沉淀资产', type: '接口案例', source: 'SAP 集成中台 · 复盘', sourceDetail: 'SAP 集成中台实施项目 → 复盘沉淀（2026-06）', status: '已发布', version: 'V1.0', refs: 19, agents: ['Neo', 'Rex'], updated: '2026-06-30', author: '复盘分析师 · Echo' },
  { id: 'k10', title: '多码关联异常测试', category: '项目沉淀资产', type: '测试案例', source: '一物一码营销平台 · 复盘', sourceDetail: '一物一码营销平台项目 → 复盘沉淀（2026-02）', status: '已发布', version: 'V1.0', refs: 12, agents: ['Tess'], updated: '2026-07-01', author: '复盘分析师 · Echo' },
  { id: 'k11', title: '客户环境 Redis 异常', category: '项目沉淀资产', type: '问题案例', source: '全域产品追溯平台 · 复盘', sourceDetail: '全域产品追溯平台建设项目 → 复盘 → 审核驳回（需补充处置步骤）', status: '待更新', version: 'V0.1', refs: 3, agents: [], updated: '2026-07-11', author: '复盘分析师 · Echo' },
  { id: 'k12', title: '大数据量码查询实践', category: '最佳实践', type: '实践总结', source: '追溯平台研发组', sourceDetail: '研发中心 · 实践总结录入', status: '草稿', version: 'V0.3', refs: 8, agents: ['Neo'], updated: '2026-05-22', author: '孙嘉树' },
]

export interface KBReview {
  id: string; title: string; type: string; from: string; applicant: string; time: string
  score: number; summary: string; status: '待审批' | '已通过' | '已驳回'; note?: string; reviewer?: string
}
export const kbReviews: KBReview[] = [
  { id: 'r1', title: '多级包装关联规则', type: '业务规则', from: '全域产品追溯平台 · 复盘', applicant: '复盘分析师 · Echo', time: '2026-07-17 14:20', score: 88, summary: '盒-箱-托三级关联与拆箱重组规则集，含修正复核机制。', status: '待审批' },
  { id: 'r2', title: '防窜货需求模板', type: '需求模板', from: '渠道防窜货专项 · 复盘', applicant: '复盘分析师 · Echo', time: '2026-07-16 10:05', score: 85, summary: '渠道货流采集与窜货预警需求结构模板。', status: '待审批' },
  { id: 'r3', title: 'SAP 接口案例', type: '接口案例', from: 'SAP 集成中台 · 复盘', applicant: '复盘分析师 · Echo', time: '2026-06-28 16:40', score: 91, summary: 'SAP 中间表集成与对账方案。', status: '已通过', note: '内容完整，发布 V1.0。', reviewer: '罗一帆' },
  { id: 'r4', title: '客户环境 Redis 异常', type: '问题案例', from: '全域产品追溯平台 · 复盘', applicant: '复盘分析师 · Echo', time: '2026-07-11 09:30', score: 72, summary: '客户 UAT 环境 Redis 容量与持久化配置问题。', status: '已驳回', note: '现象描述充分，但缺少根因分析与处置步骤，请补充后重新提交。', reviewer: '罗一帆' },
  { id: 'r5', title: '多码关联异常测试', type: '测试案例', from: '一物一码营销平台 · 复盘', applicant: '复盘分析师 · Echo', time: '2026-07-01 15:12', score: 90, summary: '码冲突、断链、重复关联测试用例集。', status: '已通过', note: '直接发布，建议补充自动化脚本索引。', reviewer: '罗一帆' },
]

export const kbUsage = [
  { name: '微服务拆分规范 V2.1', usage: { Ava: 0, Neo: 32, Rex: 28, 'Dev-07': 26, Tess: 0, Echo: 0 }, total: 86 },
  { name: 'API 设计规范 V4.3', usage: { Ava: 0, Neo: 24, Rex: 30, 'Dev-07': 20, Tess: 0, Echo: 0 }, total: 74 },
  { name: '编码规范（Java）V3.4', usage: { Ava: 0, Neo: 0, Rex: 18, 'Dev-07': 34, Tess: 0, Echo: 0 }, total: 52 },
  { name: 'GS1 编码规范解读', usage: { Ava: 25, Neo: 16, Rex: 0, 'Dev-07': 0, Tess: 0, Echo: 0 }, total: 41 },
  { name: '防窜货业务模式白皮书', usage: { Ava: 35, Neo: 0, Rex: 0, 'Dev-07': 0, Tess: 0, Echo: 0 }, total: 35 },
  { name: '标准追溯项目方案', usage: { Ava: 0, Neo: 28, Rex: 0, 'Dev-07': 0, Tess: 0, Echo: 0 }, total: 28 },
  { name: 'SAP 接口案例', usage: { Ava: 0, Neo: 11, Rex: 8, 'Dev-07': 0, Tess: 0, Echo: 0 }, total: 19 },
  { name: '多码关联异常测试', usage: { Ava: 0, Neo: 0, Rex: 0, 'Dev-07': 0, Tess: 12, Echo: 0 }, total: 12 },
]
export const kbAgents = ['Ava', 'Neo', 'Rex', 'Dev-07', 'Tess', 'Echo'] as const

export const kbGovernance = [
  { level: '中', title: '「大数据量码查询实践」90 天仅被引用 2 次', desc: '长期低引用的知识会在 AI 检索中自动降权，建议评估保留价值或补充适用场景说明。', action: '提醒责任人' },
  { level: '中', title: '「客户环境 Redis 异常」驳回后 6 天未更新', desc: '入库审核被驳回的资产需责任人补充根因与处置步骤后重新提交。', action: '催办' },
  { level: '低', title: '检测到 2 条知识内容重叠 38%', desc: '「防窜货需求模板」与「防窜货业务模式白皮书」存在内容重叠，建议建立引用关系而非复制维护。', action: '查看对比' },
]
