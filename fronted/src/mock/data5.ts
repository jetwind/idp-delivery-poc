// Mock 数据第五部分：AI 驾驶舱 + 数字员工治理
export interface Agent {
  id: string; name: string; enName: string; role: string; desc: string
  status: '执行中' | '待命' | '停用'
  todayTasks: number; totalTasks: number; avgScore: number; todayCost: number; monthCost: number
  tools: string[]; knowledge: string[]
}
export const agents: Agent[] = [
  { id: 'ava', name: '需求分析师', enName: 'Ava', role: '需求澄清', desc: '需求资料整理、业务规则提取、需求规格初稿生成', status: '待命', todayTasks: 0, totalTasks: 14, avgScore: 91, todayCost: 0, monthCost: 386, tools: ['文档解析', 'Git 只读', '知识库检索'], knowledge: ['产品知识库', '行业知识（快消追溯）'] },
  { id: 'neo', name: '方案架构师', enName: 'Neo', role: '方案设计', desc: '解决方案生成、技术选型建议、设计规格编制', status: '待命', todayTasks: 0, totalTasks: 9, avgScore: 88, todayCost: 0, monthCost: 452, tools: ['文档解析', '代码索引', '知识库检索', '架构图绘制'], knowledge: ['技术规范', '最佳实践'] },
  { id: 'rex', name: '开发主管', enName: 'Rex', role: '开发实现', desc: '开发任务拆解、代码影响分析、改造建议生成', status: '待命', todayTasks: 0, totalTasks: 11, avgScore: 86, todayCost: 0, monthCost: 521, tools: ['Git 读写（项目分支）', '代码索引', '静态分析'], knowledge: ['技术规范', '编码规范'] },
  { id: 'dev07', name: 'Coding Agent', enName: 'Dev-07', role: '开发实现', desc: '代码开发、单元测试编写、Commit 提交与 PR 创建', status: '执行中', todayTasks: 3, totalTasks: 27, avgScore: 84, todayCost: 46.2, monthCost: 1684, tools: ['Git 读写（项目分支）', '编译构建', '单元测试执行'], knowledge: ['编码规范', '技术规范'] },
  { id: 'tess', name: '测试工程师', enName: 'Tess', role: '测试验证', desc: '测试用例生成、测试结果分析、缺陷归因', status: '待命', todayTasks: 0, totalTasks: 6, avgScore: 89, todayCost: 0, monthCost: 218, tools: ['测试平台调用', '文档解析'], knowledge: ['测试案例库', '技术规范'] },
  { id: 'echo', name: '复盘分析师', enName: 'Echo', role: '项目复盘', desc: '项目复盘报告生成、资产候选识别', status: '待命', todayTasks: 0, totalTasks: 4, avgScore: 92, todayCost: 0, monthCost: 96, tools: ['流程数据读取', '知识库写入（需审批）'], knowledge: ['最佳实践', '企业知识库'] },
]
export const permDomains = ['项目上下文', '项目规格', 'Git 仓库', 'CI/CD', '环境', '企业知识', '发布执行'] as const
export type PermLevel = 'none' | 'read' | 'write' | 'approval'
export const permMatrix: Record<string, PermLevel[]> = {
  ava: ['write', 'write', 'read', 'none', 'none', 'read', 'none'],
  neo: ['write', 'write', 'read', 'none', 'none', 'read', 'none'],
  rex: ['read', 'read', 'write', 'read', 'none', 'read', 'none'],
  dev07: ['read', 'read', 'write', 'write', 'none', 'read', 'none'],
  tess: ['read', 'read', 'read', 'read', 'read', 'read', 'none'],
  echo: ['read', 'read', 'none', 'none', 'none', 'approval', 'none'],
}
export const agentRuns = [
  { time: '07-18 09:42', agent: 'Coding Agent · Dev-07', action: '提交 Commit a3f8c2e（拆箱重组模块）', target: 'trace-pack-relation', tokens: '184K', cost: 8.4, result: '成功' },
  { time: '07-18 08:15', agent: 'Coding Agent · Dev-07', action: '执行单元测试（47 个用例）', target: 'trace-pack-relation', tokens: '62K', cost: 2.8, result: '成功' },
  { time: '07-17 22:03', agent: 'Coding Agent · Dev-07', action: '创建 PR #86 → feature/PRJ-2026-0118', target: 'trace-pack-relation', tokens: '—', cost: 0, result: '成功' },
  { time: '07-17 19:42', agent: '系统 Evaluation', action: '接口规格 V0.9 质量评估', target: '接口规格', tokens: '96K', cost: 4.1, result: '2 阻断问题' },
  { time: '07-17 16:05', agent: '开发主管 · Rex', action: '代码影响分析任务完成', target: '8 个微服务', tokens: '412K', cost: 18.6, result: '成功' },
  { time: '07-17 11:02', agent: 'Coding Agent · Dev-07', action: '尝试访问 PROD 环境配置', target: '环境 · PROD', tokens: '—', cost: 0, result: '已拦截' },
  { time: '07-17 09:30', agent: '测试工程师 · Tess', action: '测试用例预生成（等待输入后暂停）', target: '测试验收规格', tokens: '128K', cost: 5.9, result: '已暂停' },
]
export const costDaily = [
  { d: '07-12', v: 62 }, { d: '07-13', v: 88 }, { d: '07-14', v: 41 }, { d: '07-15', v: 74 },
  { d: '07-16', v: 126 }, { d: '07-17', v: 158 }, { d: '07-18', v: 46 },
]
export const costByAgent = agents.map(a => ({ name: `${a.name} · ${a.enName}`, cost: a.monthCost }))
export const costByType = [
  { name: '代码开发', pct: 52 }, { name: '分析评估', pct: 24 }, { name: '规格生成', pct: 15 }, { name: '其他', pct: 9 },
]
export const auditLogs = [
  { time: '07-17 11:02:14', agent: 'Dev-07', type: '越权拦截', level: '高', detail: '尝试读取 PROD 环境变量 DB_PASSWORD，被策略 P-ENV-02 拦截，已记录并通知项目经理', status: '已处置' },
  { time: '07-16 15:44:02', agent: 'Dev-07', type: '分支外提交', level: '中', detail: '尝试向 main 分支直接提交，被策略 P-GIT-01 拦截，已引导至项目分支', status: '已处置' },
  { time: '07-15 10:20:33', agent: 'Rex', type: '权限变更', level: '中', detail: '张明远 将「CI/CD」权限由只读调整为读写（限项目流水线）', status: '已生效' },
  { time: '07-14 09:12:08', agent: 'Echo', type: '知识写入审批', level: '低', detail: '申请向企业知识库写入「多级包装关联规则」，等待知识管理员审批', status: '待审批' },
  { time: '07-12 16:30:51', agent: 'Neo', type: '工具调用', level: '低', detail: '调用架构图绘制工具 12 次，产出 4 张设计图，纳入设计规格 V1.3', status: '正常' },
]
export const cockpit = {
  running: [
    { agent: 'Coding Agent · Dev-07', task: '代码开发 · 拆箱重组模块', stage: '开发实现', progress: 58, sub: '7/12 子任务 · 今日 12 个 Commit', eta: '预计 07-19 完成', tokens: '今日 246K tokens' },
    { agent: 'CI（系统联动）', task: 'integration-test-daily', stage: '开发实现', progress: 34, sub: '已运行 42 分钟', eta: '预计 1h 20m', tokens: '—' },
  ],
  waitingHuman: [
    { kind: 'Human Gate', title: '设计规格 V1.3 补充评审', who: '王志恒 / 陈以默', due: '今天 18:00', blocking: '阻塞开发实现阶段闭环' },
    { kind: '输入补全', title: '测试用例生成缺少 3 项输入', who: '李婉清 / 周雨桐', due: '已暂停 2 天', blocking: '阻塞测试验证阶段启动' },
    { kind: 'AI 结果确认', title: '「代码影响分析」43 条改造建议', who: '赵启铭', due: '07-19', blocking: '不阻塞流程' },
    { kind: '审批', title: 'Echo 申请知识库写入权限', who: '知识管理员', due: '07-20', blocking: '不阻塞流程' },
  ],
  policyHits: [
    { time: '07-17 11:02', text: 'Dev-07 越权访问 PROD 环境变量，已拦截', level: '高' },
    { time: '07-16 15:44', text: 'Dev-07 尝试直提 main 分支，已引导至项目分支', level: '中' },
    { time: '07-14 09:12', text: 'Echo 知识库写入申请，待审批', level: '低' },
  ],
  stats: {
    todayTasks: 3, weekTasks: 18, acceptance: 87, rework: 12,
    todayCost: 46.2, monthCost: 3357, budget: 8000,
    gates: 9, firstPass: 78,
  },
}
