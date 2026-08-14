// Mock 数据第三部分：版本基线 / 交付成果 / 复盘沉淀 / 时间线
export interface Release { version: string; status: '当前生产' | '历史版本' | '预发布' | '待发布' | '初始基线'; created: string; env: string; creator: string; serviceCount: number; cr: number }
export const releases: Release[] = [
  { version: 'V1.4.0-rc.1', status: '预发布', created: '2026-07-15', env: 'UAT', creator: '赵启铭', serviceCount: 8, cr: 3 },
  { version: 'V1.3.0', status: '当前生产', created: '2026-06-28', env: 'PROD', creator: '张明远', serviceCount: 8, cr: 5 },
  { version: 'V1.2.0', status: '历史版本', created: '2026-05-30', env: 'PROD', creator: '张明远', serviceCount: 6, cr: 4 },
  { version: 'V1.1.0', status: '历史版本', created: '2026-04-25', env: 'PROD', creator: '赵启铭', serviceCount: 5, cr: 2 },
  { version: 'V1.0.0', status: '历史版本', created: '2026-03-29', env: 'PROD', creator: '张明远', serviceCount: 4, cr: 0 },
  { version: 'V0.1.0', status: '初始基线', created: '2026-03-01', env: '—', creator: '系统（项目初始化）', serviceCount: 0, cr: 0 },
]

export const releaseDetail = {
  version: 'V1.3.0', status: '当前生产', releasedAt: '2026-06-28 10:00', releasedBy: '张明远', env: 'PROD',
  specBaseline: [
    { name: '需求规格', version: 'V1.4' }, { name: '设计规格', version: 'V1.2' },
    { name: '接口规格', version: 'V0.8' }, { name: '测试验收规格', version: 'V0.5' },
  ],
  swBaseline: [
    { service: 'trace-code-service', version: 'v1.2.6', commit: 'a3f8c21' },
    { service: 'trace-pack-relation', version: 'v0.5.2', commit: '7bd0419' },
    { service: 'trace-channel-flow', version: 'v0.4.0', commit: 'e52aa77' },
    { service: 'trace-query-gateway', version: 'v2.2.4', commit: 'c918d03' },
    { service: 'base-master-data', version: 'v3.1.2', commit: 'f10b8e6' },
    { service: 'base-auth-center', version: 'v4.0.1', commit: '884cf2a' },
    { service: 'sap-connector', version: 'v1.0.3', commit: 'd77e19b' },
    { service: 'trace-web-portal', version: 'v1.1.5', commit: 'b20c458' },
  ],
  builds: [
    { service: 'trace-code-service', build: '#482', result: '成功', time: '2026-06-27 22:10' },
    { service: 'trace-pack-relation', build: '#156', result: '成功', time: '2026-06-27 22:18' },
    { service: 'trace-web-portal', build: '#301', result: '成功', time: '2026-06-27 22:31' },
  ],
  tests: { total: 1284, passed: 1279, failed: 5, coverage: '82.4%', conclusion: '通过（5 个失败用例均为已知环境抖动，复测通过）' },
  images: [
    { service: 'trace-code-service', digest: 'sha256:8f3a…c21d' }, { service: 'trace-pack-relation', digest: 'sha256:41bb…90e2' },
    { service: 'trace-channel-flow', digest: 'sha256:7c0d…f5a8' }, { service: 'trace-query-gateway', digest: 'sha256:e9d1…33b7' },
  ],
  crs: ['CR-2026-0041 防窜货规则引擎阈值调整', 'CR-2026-0038 追溯查询门户导出功能', 'CR-2026-0035 SAP 物料同步频率调整', 'CR-2026-0031 箱码补打流程优化', 'CR-2026-0027 仓间调拨扫码容错'],
  trace: [
    { req: 'REQ-防窜货预警规则', task: 'TASK-规则引擎改造', commit: 'a3f8c21', build: '#482', release: 'V1.3.0' },
    { req: 'REQ-门户批量导出', task: 'TASK-导出中心开发', commit: 'b20c458', build: '#301', release: 'V1.3.0' },
    { req: 'REQ-SAP 同步频率', task: 'TASK-连接器调度改造', commit: 'd77e19b', build: '#298', release: 'V1.3.0' },
  ],
}

export const releaseCompare = {
  from: 'V1.2.0', to: 'V1.3.0',
  reqChanges: [
    { type: '新增', items: ['渠道窜货预警规则配置', '追溯门户批量导出', '仓间调拨扫码容错'] },
    { type: '修改', items: ['SAP 物料同步频率（T+1 → 准实时）', '箱码补打审批流'] },
    { type: '删除', items: ['手工台账导入入口（由接口替代）'] },
  ],
  specChanges: [
    { spec: '需求规格', from: 'V1.3', to: 'V1.4' }, { spec: '设计规格', from: 'V1.1', to: 'V1.2' },
    { spec: '接口规格', from: 'V0.7', to: 'V0.8' }, { spec: '测试验收规格', from: 'V0.4', to: 'V0.5' },
  ],
  svcChanges: [
    { service: 'trace-code-service', from: 'v1.1.8', to: 'v1.2.6', commits: 47 },
    { service: 'trace-pack-relation', from: 'v0.4.1', to: 'v0.5.2', commits: 23 },
    { service: 'trace-channel-flow', from: 'v0.3.0', to: 'v0.4.0', commits: 19 },
    { service: 'trace-query-gateway', from: 'v2.2.0', to: 'v2.2.4', commits: 8 },
    { service: 'sap-connector', from: 'v1.0.0', to: 'v1.0.3', commits: 11 },
    { service: 'trace-web-portal', from: 'v1.0.9', to: 'v1.1.5', commits: 34 },
  ],
  envChanges: ['UAT 环境 Redis 由 3 节点扩容至 5 节点', 'PROD 网关限流阈值 2000 QPS → 3000 QPS'],
}

// ---------------- 交付成果 ----------------
export const outcomes = [
  { type: '业务成果', items: [{ name: '需求规格说明书 V1.5', ref: '规格库 · 已确认' }, { name: '业务解决方案 V1.3', ref: '规格库 · 已确认' }] },
  { type: '设计成果', items: [{ name: '技术方案 V1.3', ref: '规格库 · 已确认' }, { name: '接口规格 V0.9', ref: '规格库 · 编制中' }] },
  { type: '软件成果', items: [{ name: 'Project Release V1.3.0', ref: '版本基线' }, { name: '微服务版本清单（8 个服务）', ref: '工程资产' }, { name: '项目源代码（Git Tag release/v1.3.0）', ref: '项目仓库' }] },
  { type: '质量成果', items: [{ name: '测试报告 V1.3.0', ref: '测试平台' }, { name: 'Evaluation 报告（12 份）', ref: '质量中心' }] },
  { type: '发布成果', items: [{ name: '发布记录 PROD-2026-0628', ref: '发布平台' }, { name: 'UAT 预发布 V1.4.0-rc.1', ref: '版本基线' }] },
  { type: '交付材料', items: [{ name: '部署运维手册', ref: '项目仓库 /docs' }, { name: '用户操作手册', ref: '项目仓库 /docs' }, { name: '验收材料包（待补充）', ref: '缺失' }] },
]

// ---------------- 复盘 ----------------
export const retro = {
  summary: '项目整体目标达成度 94%，交付周期较计划偏差 +6 天（主要受 SAP 接口联调等待影响）。AI 数字员工累计执行任务 47 项，人工 Gate 通过率首轮 78%。',
  dims: [
    { name: '目标达成', content: '合同范围 17 项功能全部交付；性能指标（查询 ≤800ms）达成，关联准确率 99.97% 超出目标。' },
    { name: '需求变化', content: '共发生 CR 14 项，其中重大变更 2 项（窜货规则引擎重构、SAP 同步模式调整），均已走变更 Gate。' },
    { name: '关键决策', content: 'Human Gate 9 次：需求确认 1 次、方案确认 2 次、测试放行 2 次、发布确认 3 次、变更确认 1 次。' },
    { name: '主要问题', content: 'SAP 侧接口资料不完整导致接口规格返工 2 轮；UAT 环境 Redis 容量不足引发测试阻塞 3 天。' },
    { name: '返工原因', content: '70% 返工集中于「上游资料不完整」，23% 为需求理解偏差，7% 为技术方案调整。' },
    { name: '质量问题', content: '测试缺陷密度 0.31/功能点，发布后 P3 以上缺陷 2 个，均已热修复。' },
    { name: '客户反馈', content: '验收评分 4.6/5.0；客户建议加强经销商端操作培训与文档。' },
    { name: '经验总结', content: '上游接口资料应在需求 Gate 前置校验；大数据量码查询场景应提前做分片压测。' },
  ],
  assets: [
    { type: '业务规则', name: '多级包装关联规则', desc: '盒-箱-托三级关联与拆箱重组规则集', status: '待处理' },
    { type: '需求模板', name: '防窜货需求模板', desc: '渠道货流采集与窜货预警需求结构', status: '待处理' },
    { type: '方案模板', name: '标准追溯项目方案', desc: '一物一码追溯平台标准架构方案', status: '已沉淀' },
    { type: '接口案例', name: 'SAP 接口案例', desc: 'SAP 中间表集成与对账方案', status: '待处理' },
    { type: '测试案例', name: '多码关联异常测试', desc: '码冲突、断链、重复关联测试用例集', status: '已沉淀' },
    { type: '问题案例', name: '客户环境 Redis 异常', desc: '客户 UAT 环境 Redis 容量与持久化配置问题', status: '待处理' },
    { type: '最佳实践', name: '大数据量码查询实践', desc: '亿级码数据分片查询与缓存方案', status: '已忽略' },
  ],
}

// ---------------- 交付总览时间线 ----------------
export const timeline = [
  { time: '07-18 08:30', type: '系统', text: 'integration-test-daily 每日集成测试开始执行', tone: 'system' },
  { time: '07-17 21:42', type: '系统', text: 'trace-code-service CI 构建成功（#498）', tone: 'system' },
  { time: '07-17 19:42', type: 'Evaluation', text: '接口规格 V0.9 质量评估完成，得分 86，发现 2 个阻断问题', tone: 'eval' },
  { time: '07-17 16:05', type: 'AI', text: 'Coding Agent · Dev-07 完成包装关联服务拆箱重组模块开发，提交 12 个 Commit', tone: 'ai' },
  { time: '07-17 11:20', type: '人工', text: '赵启铭 确认接受「代码影响分析」结果，43 条改造建议转入开发任务', tone: 'human' },
  { time: '07-16 10:00', type: 'AI', text: '开发主管 · Rex 完成「代码影响分析」，识别 6 个受影响微服务、214 个代码模块', tone: 'ai' },
  { time: '07-15 14:20', type: '版本', text: '创建项目预发布基线 V1.4.0-rc.1（UAT 环境）', tone: 'release' },
  { time: '07-14 09:47', type: '变更', text: '客户提交 CR-2026-0044：窜货预警增加微信通知渠道（待评估）', tone: 'change' },
  { time: '07-12 11:05', type: '人工', text: '王志恒 / 陈以默 通过「方案确认」Human Gate，设计规格 V1.3 生效', tone: 'human' },
]

export const risks = [
  { level: '高', kind: '进度风险', title: 'SAP 接口联调依赖客户 IT 排期', desc: '客户侧 BASIS 资源 7 月排期满，联调窗口可能推迟 2 周，影响测试验证阶段入口。', owner: '张明远' },
  { level: '高', kind: '规格风险', title: '验收要求上下文缺失', desc: '验收标准尚未定义，测试验收规格编制受阻，影响测试放行 Gate 判定依据。', owner: '李婉清' },
  { level: '中', kind: '技术风险', title: '赋码核心模块改动面大', desc: 'AI 影响分析显示 17 个高风险模块集中改动，需灰度与回滚预案。', owner: '赵启铭' },
  { level: '中', kind: '质量风险', title: 'trace-channel-flow CI 连续失败', desc: '最近一次构建失败（单测断言错误），需开发介入修复。', owner: '孙嘉树' },
]

export const todoItems = [
  { kind: 'Human Gate', title: '设计规格 V1.3 补充评审确认', due: '今天 18:00', tag: 'gate' },
  { kind: '风险处理', title: 'SAP 接口联排期风险需跟进客户确认', due: '今天', tag: 'risk' },
  { kind: '规格缺失', title: '需求规格 §6 验收条件缺失，需补充', due: '07-19', tag: 'spec' },
  { kind: 'AI 结果待确认', title: '「测试用例生成」预演结果待确认（142 条用例）', due: '07-19', tag: 'ai' },
  { kind: 'AI 结果待确认', title: '接口规格 §3.2 异常重试机制 AI 补全稿待确认', due: '07-20', tag: 'ai' },
  { kind: 'Evaluation', title: '接口规格 2 个阻断问题待修复后复检', due: '07-21', tag: 'eval' },
  { kind: '变更评估', title: 'CR-2026-0044 微信通知渠道变更评估', due: '07-22', tag: 'change' },
]
