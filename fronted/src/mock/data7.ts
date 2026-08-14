// Mock 数据第七部分：度量中心（管理人员视角）
export const metricsOverview = {
  projects: { total: 6, running: 3, paused: 1, done: 1, preparing: 1 },
  ai: { monthTasks: 126, acceptance: 84, gateFirstPass: 76, avgCycleDays: 4.2 },
  quality: { evalAvg: 87, specConfirmedRate: 68, defectDensity: 0.31, reworkRate: 14 },
  cost: { monthAiCost: 8940, budget: 20000, estSavedDays: 412, roi: 3.8 },
}

export const projectMetrics = [
  { id: 'p1', name: '全域产品追溯平台', owner: '张明远', stage: '开发', progress: 62, health: 72, risks: 4, aiTasks: 47, acceptance: 82, evalAvg: 88, aiCost: 3357, cycle: '按计划 +6 天' },
  { id: 'p2', name: '智慧仓储 WMS 升级', owner: '李婉清', stage: '测试', progress: 81, health: 90, risks: 2, aiTasks: 38, acceptance: 89, evalAvg: 91, aiCost: 2410, cycle: '提前 3 天' },
  { id: 'p3', name: '渠道防窜货专项', owner: '王志恒', stage: '需求', progress: 18, health: 85, risks: 1, aiTasks: 12, acceptance: 86, evalAvg: 84, aiCost: 680, cycle: '按计划' },
  { id: 'p4', name: 'SAP 集成中台实施', owner: '陈以默', stage: '开发', progress: 47, health: 55, risks: 6, aiTasks: 29, acceptance: 71, evalAvg: 79, aiCost: 1890, cycle: '滞后 12 天' },
  { id: 'p5', name: '一物一码营销平台', owner: '张明远', stage: '复盘', progress: 100, health: 96, risks: 0, aiTasks: 52, acceptance: 91, evalAvg: 93, aiCost: 2980, cycle: '按计划 +4 天' },
  { id: 'p6', name: '赋码产线改造（三期）', owner: '赵启铭', stage: '需求', progress: 5, health: 88, risks: 0, aiTasks: 3, acceptance: 100, evalAvg: 82, aiCost: 120, cycle: '未启动' },
]

export const aiEfficiency = {
  byStage: [
    { stage: '需求澄清', tasks: 26, aiAuto: 71, avgDays: 2.1, saved: '约 5.5 人日/项目' },
    { stage: '方案设计', tasks: 18, aiAuto: 64, avgDays: 3.4, saved: '约 8 人日/项目' },
    { stage: '开发实现', tasks: 52, aiAuto: 58, avgDays: 6.8, saved: '约 22 人日/项目' },
    { stage: '测试验证', tasks: 21, aiAuto: 76, avgDays: 2.6, saved: '约 9 人日/项目' },
    { stage: '发布交付', tasks: 6, aiAuto: 83, avgDays: 0.8, saved: '约 2 人日/项目' },
    { stage: '项目复盘', tasks: 3, aiAuto: 90, avgDays: 0.5, saved: '约 3 人日/项目' },
  ],
  topAgents: [
    { name: 'Coding Agent · Dev-07', tasks: 27, acceptance: 84, cost: 1684, note: '代码接受率最高' },
    { name: '需求分析师 · Ava', tasks: 14, acceptance: 93, cost: 386, note: '首轮通过率最高' },
    { name: '开发主管 · Rex', tasks: 11, acceptance: 82, cost: 521, note: '影响分析被采纳 43/48 条' },
    { name: '方案架构师 · Neo', tasks: 9, acceptance: 78, cost: 452, note: '方案返工 2 次需关注' },
  ],
  trend: [
    { m: '2月', tasks: 32, acceptance: 72 }, { m: '3月', tasks: 58, acceptance: 76 }, { m: '4月', tasks: 74, acceptance: 79 },
    { m: '5月', tasks: 96, acceptance: 81 }, { m: '6月', tasks: 118, acceptance: 83 }, { m: '7月', tasks: 126, acceptance: 84 },
  ],
}

export const qualityMetrics = {
  evalDist: [
    { range: '90+', count: 8, tone: 'bg-emerald-500' }, { range: '80-89', count: 11, tone: 'bg-indigo-500' },
    { range: '70-79', count: 5, tone: 'bg-amber-500' }, { range: '<70', count: 2, tone: 'bg-rose-500' },
  ],
  blockedTop: [
    { rule: '接口缺少异常重试机制定义', hits: 6, projects: '3 个项目' },
    { rule: '验收标准缺失', hits: 4, projects: '2 个项目' },
    { rule: '幂等性说明缺失', hits: 3, projects: '2 个项目' },
    { rule: '性能基线未定义', hits: 3, projects: '2 个项目' },
  ],
  riskBoard: [
    { project: 'SAP 集成中台实施', risks: 6, high: 3, top: 'SAP 侧资源与客户环境不可控', owner: '陈以默' },
    { project: '全域产品追溯平台', risks: 4, high: 2, top: 'SAP 联调排期 + 验收要求缺失', owner: '张明远' },
    { project: '智慧仓储 WMS 升级', risks: 2, high: 0, top: '性能压测环境数据量不足', owner: '李婉清' },
  ],
  gates: { total: 34, passed: 26, modified: 6, rejected: 2, avgHours: 5.2 },
}

export const costMetrics = {
  monthly: [
    { m: '2月', v: 2100 }, { m: '3月', v: 3600 }, { m: '4月', v: 4900 },
    { m: '5月', v: 6200 }, { m: '6月', v: 7800 }, { m: '7月', v: 8940 },
  ],
  byProject: projectMetrics.map(p => ({ name: p.name, cost: p.aiCost })),
  value: [
    { k: '预估节省人力', v: '412 人日', d: '按任务复杂度与历史人日基线折算' },
    { k: 'AI 投入', v: '¥33,460', d: '近 6 个月累计模型与算力成本' },
    { k: '人力等效成本', v: '¥127 万', d: '按 3,080 元/人日综合成本' },
    { k: 'ROI', v: '3.8x', d: '等效人力成本 ÷ AI 投入' },
  ],
}
