// 全局 Mock 数据 —— AI 原生交付平台原型
export type ProjectStatus = '进行中' | '准备中' | '暂停' | '已完成'
export type Stage = '需求' | '方案' | '开发' | '测试' | '交付' | '复盘'

export interface Project {
  id: string
  name: string
  code: string
  client: string
  owner: string
  status: ProjectStatus
  stage: Stage
  risks: number
  todos: number
  release: string
  progress: number
  period: string
  type: string
  desc: string
}

export const projects: Project[] = [
  {
    id: 'p1', name: '全域产品追溯平台建设项目', code: 'PRJ-2026-0118', client: '华润智造集团', owner: '张明远',
    status: '进行中', stage: '开发', risks: 4, todos: 7, release: 'V1.3.0', progress: 62,
    period: '2026-03-01 ~ 2026-09-30', type: '标准交付项目',
    desc: '为客户建立覆盖生产、仓储、渠道、终端的全链路产品追溯体系，实现一物一码、多级包装关联与防窜货管理。',
  },
  {
    id: 'p2', name: '智慧仓储 WMS 升级项目', code: 'PRJ-2026-0097', client: '北辰物流股份', owner: '李婉清',
    status: '进行中', stage: '测试', risks: 2, todos: 3, release: 'V2.1.0', progress: 81,
    period: '2026-01-15 ~ 2026-08-20', type: '标准交付项目', desc: 'WMS 核心升级与自动化立库对接。',
  },
  {
    id: 'p3', name: '渠道防窜货专项交付', code: 'PRJ-2026-0126', client: '岭南乳业', owner: '王志恒',
    status: '进行中', stage: '需求', risks: 1, todos: 5, release: '—', progress: 18,
    period: '2026-06-01 ~ 2026-12-31', type: '定制交付项目', desc: '渠道货流监控与窜货预警。',
  },
  {
    id: 'p4', name: 'SAP 集成中台实施项目', code: 'PRJ-2025-0866', client: '华润智造集团', owner: '陈以默',
    status: '暂停', stage: '开发', risks: 6, todos: 2, release: 'V0.9.2', progress: 47,
    period: '2025-11-01 ~ 2026-07-15', type: '定制交付项目', desc: 'SAP ECC 与追溯中台的双向集成。',
  },
  {
    id: 'p5', name: '一物一码营销平台项目', code: 'PRJ-2025-0791', client: '蜀香食品集团', owner: '张明远',
    status: '已完成', stage: '复盘', risks: 0, todos: 0, release: 'V3.0.0', progress: 100,
    period: '2025-08-01 ~ 2026-02-28', type: '标准交付项目', desc: '扫码营销、红包与会员运营平台。',
  },
  {
    id: 'p6', name: '赋码产线改造项目（三期）', code: 'PRJ-2026-0133', client: '东海药业', owner: '赵启铭',
    status: '准备中', stage: '需求', risks: 0, todos: 4, release: '—', progress: 5,
    period: '2026-08-01 ~ 2027-01-31', type: '标准交付项目', desc: '12 条产线赋码设备改造与数据采集。',
  },
]

export const currentProject = projects[0]

// ---------------- 项目成员 ----------------
export interface Member { name: string; dept: string; roles: string[]; email: string; joined: string; active?: boolean }
export const members: Member[] = [
  { name: '张明远', dept: '交付管理部', roles: ['项目经理'], email: 'zhangmy@example.com', joined: '2026-03-01', active: true },
  { name: '李婉清', dept: '产品部', roles: ['产品负责人'], email: 'liwq@example.com', joined: '2026-03-01' },
  { name: '王志恒', dept: '解决方案部', roles: ['方案负责人'], email: 'wangzh@example.com', joined: '2026-03-02' },
  { name: '陈以默', dept: '架构委员会', roles: ['架构负责人'], email: 'chenym@example.com', joined: '2026-03-02' },
  { name: '赵启铭', dept: '研发中心', roles: ['开发负责人'], email: 'zhaoqm@example.com', joined: '2026-03-05' },
  { name: '孙嘉树', dept: '研发中心', roles: ['开发成员'], email: 'sunjs@example.com', joined: '2026-03-05' },
  { name: '周雨桐', dept: '研发中心', roles: ['开发成员', '测试负责人'], email: 'zhouyt@example.com', joined: '2026-03-08' },
  { name: '吴海峰', dept: '实施交付部', roles: ['实施负责人'], email: 'wuhf@example.com', joined: '2026-03-10' },
  { name: '郑晓萌', dept: '运维保障部', roles: ['运维负责人'], email: 'zhengxm@example.com', joined: '2026-03-10' },
]

export const orgCandidates = [
  { name: '林书瑶', dept: '研发中心' }, { name: '何俊熙', dept: '产品部' }, { name: '罗一帆', dept: '质量部' },
  { name: '高鹏飞', dept: '实施交付部' }, { name: '唐艺宁', dept: '架构委员会' }, { name: '冯子昂', dept: '研发中心' },
]

export const allRoles = ['项目经理', '产品负责人', '方案负责人', '架构负责人', '开发负责人', '开发成员', '测试负责人', '实施负责人', '运维负责人']

// ---------------- 工程资产 ----------------
export interface ServiceAsset { name: string; cnName: string; role: '新建' | '核心改造' | '接口适配' | '直接复用'; version: string; owner: string; repo: string; branch: string }
export const services: ServiceAsset[] = [
  { name: 'trace-code-service', cnName: '赋码管理服务', role: '核心改造', version: 'v1.4.0-dev', owner: '赵启铭', repo: 'git@git.example.com:trace/trace-code-service.git', branch: 'feature/PRJ-2026-0118' },
  { name: 'trace-pack-relation', cnName: '多级包装关联服务', role: '新建', version: 'v0.8.1-dev', owner: '孙嘉树', repo: 'git@git.example.com:trace/trace-pack-relation.git', branch: 'feature/PRJ-2026-0118' },
  { name: 'trace-channel-flow', cnName: '渠道货流服务', role: '新建', version: 'v0.6.0-dev', owner: '孙嘉树', repo: 'git@git.example.com:trace/trace-channel-flow.git', branch: 'feature/PRJ-2026-0118' },
  { name: 'trace-query-gateway', cnName: '追溯查询网关', role: '接口适配', version: 'v2.3.0', owner: '赵启铭', repo: 'git@git.example.com:trace/trace-query-gateway.git', branch: 'feature/PRJ-2026-0118' },
  { name: 'base-master-data', cnName: '主数据服务', role: '直接复用', version: 'v3.1.2', owner: '平台组', repo: 'git@git.example.com:base/base-master-data.git', branch: '—' },
  { name: 'base-auth-center', cnName: '统一认证中心', role: '直接复用', version: 'v4.0.1', owner: '平台组', repo: 'git@git.example.com:base/base-auth-center.git', branch: '—' },
  { name: 'sap-connector', cnName: 'SAP 集成连接器', role: '接口适配', version: 'v1.1.0-dev', owner: '周雨桐', repo: 'git@git.example.com:integration/sap-connector.git', branch: 'feature/PRJ-2026-0118' },
  { name: 'trace-web-portal', cnName: '追溯门户前端', role: '核心改造', version: 'v1.2.0-dev', owner: '赵启铭', repo: 'git@git.example.com:trace/trace-web-portal.git', branch: 'feature/PRJ-2026-0118' },
]

export interface Pipeline { name: string; service: string; type: '构建' | '测试' | '发布'; lastStatus: '成功' | '失败' | '运行中'; lastTime: string; duration: string }
export const pipelines: Pipeline[] = [
  { name: 'trace-code-service-ci', service: 'trace-code-service', type: '构建', lastStatus: '成功', lastTime: '2026-07-17 21:42', duration: '6m 12s' },
  { name: 'trace-pack-relation-ci', service: 'trace-pack-relation', type: '构建', lastStatus: '成功', lastTime: '2026-07-17 20:15', duration: '5m 48s' },
  { name: 'trace-channel-flow-ci', service: 'trace-channel-flow', type: '构建', lastStatus: '失败', lastTime: '2026-07-17 18:03', duration: '3m 57s' },
  { name: 'integration-test-daily', service: '全部服务', type: '测试', lastStatus: '运行中', lastTime: '2026-07-18 08:30', duration: '—' },
  { name: 'uat-release-pipeline', service: '全部服务', type: '发布', lastStatus: '成功', lastTime: '2026-07-15 14:20', duration: '18m 02s' },
]

export interface EnvDeploy { env: 'DEV' | 'TEST' | 'UAT' | 'PROD'; services: { name: string; version: string; updated: string }[] }
export const envDeploys: EnvDeploy[] = [
  { env: 'DEV', services: [{ name: 'trace-code-service', version: 'v1.4.0-dev.37', updated: '07-17 21:50' }, { name: 'trace-pack-relation', version: 'v0.8.1-dev.12', updated: '07-17 20:22' }, { name: 'trace-channel-flow', version: 'v0.6.0-dev.08', updated: '07-17 16:40' }] },
  { env: 'TEST', services: [{ name: 'trace-code-service', version: 'v1.4.0-dev.31', updated: '07-16 19:12' }, { name: 'trace-pack-relation', version: 'v0.8.1-dev.09', updated: '07-16 19:12' }] },
  { env: 'UAT', services: [{ name: 'trace-code-service', version: 'v1.3.0-rc.2', updated: '07-15 14:30' }, { name: 'trace-query-gateway', version: 'v2.3.0-rc.1', updated: '07-15 14:30' }] },
  { env: 'PROD', services: [{ name: 'trace-code-service', version: 'v1.2.6', updated: '06-28 10:00' }, { name: 'base-master-data', version: 'v3.1.2', updated: '06-28 10:00' }] },
]

// ---------------- 项目上下文 ----------------
export interface ContextItem { category: string; name: string; source: string; maintain: string; status: '已确认' | '待确认' | '已同步' | '已引用' | '缺失'; updated: string }
export const contextItems: ContextItem[] = [
  { category: '项目基础上下文', name: '项目基本信息', source: '项目中心', maintain: '自动', status: '已同步', updated: '2026-07-01' },
  { category: '项目基础上下文', name: '客户信息', source: '项目中心', maintain: '自动', status: '已同步', updated: '2026-07-01' },
  { category: '项目基础上下文', name: '项目成员', source: '项目成员', maintain: '自动', status: '已同步', updated: '2026-07-10' },
  { category: '业务上下文', name: '客户需求文档', source: '项目资料', maintain: '上传/录入', status: '已确认', updated: '2026-07-08' },
  { category: '业务上下文', name: '项目背景', source: '项目资料', maintain: '上传/AI提取', status: '已确认', updated: '2026-07-08' },
  { category: '业务上下文', name: '业务目标', source: '项目资料', maintain: 'AI提取+人工确认', status: '已确认', updated: '2026-07-09' },
  { category: '业务上下文', name: '项目范围', source: '项目资料', maintain: 'AI提取+人工确认', status: '待确认', updated: '2026-07-12' },
  { category: '业务上下文', name: '业务流程', source: '项目资料', maintain: 'AI提取/录入', status: '已确认', updated: '2026-07-11' },
  { category: '业务上下文', name: '业务规则', source: '项目资料', maintain: 'AI提取/录入', status: '待确认', updated: '2026-07-14' },
  { category: '业务上下文', name: '会议纪要（12 份）', source: '文件/在线文档', maintain: '上传', status: '已确认', updated: '2026-07-16' },
  { category: '业务上下文', name: '接口资料', source: '文件', maintain: '上传', status: '已确认', updated: '2026-07-05' },
  { category: '业务上下文', name: '验收要求', source: '项目资料', maintain: '上传/录入', status: '缺失', updated: '—' },
  { category: '工程上下文', name: '微服务清单', source: '平台', maintain: '自动', status: '已同步', updated: '2026-07-17' },
  { category: '工程上下文', name: 'Git 仓库', source: '平台', maintain: '自动', status: '已同步', updated: '2026-07-17' },
  { category: '工程上下文', name: '代码索引', source: 'Git', maintain: '自动获取', status: '已同步', updated: '2026-07-18' },
  { category: '工程上下文', name: 'CI/CD 流水线', source: '平台', maintain: '自动', status: '已同步', updated: '2026-07-17' },
  { category: '工程上下文', name: '环境信息', source: '平台', maintain: '自动', status: '已同步', updated: '2026-07-15' },
  { category: '企业知识', name: '产品知识库', source: 'PAI/知识库', maintain: '引用', status: '已引用', updated: '—' },
  { category: '企业知识', name: '行业知识（快消追溯）', source: 'PAI/知识库', maintain: '引用', status: '已引用', updated: '—' },
  { category: '企业知识', name: '技术规范', source: 'PAI/知识库', maintain: '引用', status: '已引用', updated: '—' },
  { category: '企业知识', name: '最佳实践', source: 'PAI/知识库', maintain: '引用', status: '已引用', updated: '—' },
]

export const contextCompleteness = [
  { dim: '需求资料', score: 92 }, { dim: '业务规则', score: 74 }, { dim: '接口资料', score: 85 },
  { dim: '工程信息', score: 98 }, { dim: '验收要求', score: 41 },
]

// ---------------- 禅道项目（外部系统同步） ----------------
export interface ZentaoProject {
  id: string; name: string; client: string; owner: string; status: string
  reqs: number; product: string; period: string; synced: string; type: string; desc: string
}
export const zentaoProjects: ZentaoProject[] = [
  { id: 'ZT-4218', name: '全域产品追溯平台建设项目', client: '华润智造集团', owner: '张明远', status: '进行中', reqs: 87, product: '追溯平台 V3', period: '2026-08-01 ~ 2027-01-31', synced: '10 分钟前', type: '标准交付项目', desc: '为客户建立覆盖生产、仓储、渠道、终端的全链路产品追溯体系，实现一物一码与防窜货管理。' },
  { id: 'ZT-4096', name: '赋码产线改造项目（三期）', client: '东海药业', owner: '赵启铭', status: '未开始', reqs: 42, product: '赋码采集系统', period: '2026-08-01 ~ 2027-01-31', synced: '1 小时前', type: '标准交付项目', desc: '12 条产线赋码设备改造与数据自动采集。' },
  { id: 'ZT-4155', name: '渠道防窜货专项交付', client: '岭南乳业', owner: '王志恒', status: '进行中', reqs: 35, product: '防窜货平台', period: '2026-06-01 ~ 2026-12-31', synced: '32 分钟前', type: '定制交付项目', desc: '渠道货流监控与窜货预警专项。' },
  { id: 'ZT-3987', name: '经销商协同门户建设项目', client: '蜀香食品集团', owner: '李婉清', status: '未开始', reqs: 28, product: '协同门户', period: '2026-09-01 ~ 2027-03-31', synced: '2 小时前', type: '标准交付项目', desc: '经销商订货、对账与协同门户。' },
  { id: 'ZT-3902', name: '冷链仓储温控追溯项目', client: '北辰物流股份', owner: '陈以默', status: '已关闭', reqs: 51, product: '追溯平台 V3', period: '2025-10-01 ~ 2026-04-30', synced: '昨天', type: '定制交付项目', desc: '冷链运输温控数据接入与追溯。' },
]

// ---------------- 产品（自有产品，非禅道交付） ----------------
export interface Product {
  id: string; name: string; code: string; kind: '产品'
  owner: string; status: '规划中' | '开发中' | '运营中'; stage: '规划' | '研发' | '运营'
  risks: number; todos: number; release: string; progress: number
  period: string; line: string; desc: string
}
export const products: Product[] = [
  { id: 'pd1', name: '追溯云平台', code: 'PRD-TRACE-CLOUD', kind: '产品', owner: '李婉清', status: '开发中', stage: '研发', risks: 1, todos: 6, release: 'V3.2.0', progress: 74, period: '2026-01-01 起 · 持续演进', line: '追溯产品线', desc: '公司核心 SaaS 产品：一物一码追溯、渠道管理、防窜货与数据服务能力。' },
  { id: 'pd2', name: '一物一码营销平台', code: 'PRD-MKT', kind: '产品', owner: '何俊熙', status: '运营中', stage: '运营', risks: 0, todos: 2, release: 'V2.4.1', progress: 100, period: '2024-06-01 起 · 持续运营', line: '营销产品线', desc: '扫码营销、红包裂变、会员运营的 SaaS 产品。' },
  { id: 'pd3', name: '赋码云', code: 'PRD-CODING', kind: '产品', owner: '赵启铭', status: '规划中', stage: '规划', risks: 0, todos: 3, release: '—', progress: 12, period: '2026-08-01 起', line: '追溯产品线', desc: '面向中小工厂的轻量赋码 SaaS，产线数据采集 + 码管理。' },
]

// ---------------- 微服务库（供关联选择） ----------------
export interface HiveService { name: string; cnName: string; version: string; owner: string; desc: string }
export const hiveServiceLibrary: HiveService[] = [
  { name: 'base-msg-center', cnName: '消息中心', version: 'v2.6.0', owner: '平台组', desc: '站内信、短信、邮件、微信模板消息统一发送' },
  { name: 'base-file-service', cnName: '文件服务', version: 'v3.0.2', owner: '平台组', desc: '对象存储上传下载、临时凭证、图片处理' },
  { name: 'base-report-engine', cnName: '报表引擎', version: 'v1.8.4', owner: '平台组', desc: '拖拽式报表设计与定时导出' },
  { name: 'trace-rule-engine', cnName: '追溯规则引擎', version: 'v1.5.0', owner: '追溯产品组', desc: '防窜货/预警规则配置与执行' },
  { name: 'trace-open-api', cnName: '追溯开放平台', version: 'v2.1.0', owner: '追溯产品组', desc: '对外的开放 API 网关与签名验签' },
  { name: 'data-sync-hub', cnName: '数据同步中心', version: 'v2.3.1', owner: '数据组', desc: '异构系统数据同步、CDC 采集、对账' },
  { name: 'iam-sso', cnName: '单点登录服务', version: 'v4.2.0', owner: '平台组', desc: '企业 IdP 对接、OAuth2/OIDC 认证' },
  { name: 'base-scheduler', cnName: '任务调度中心', version: 'v3.1.0', owner: '平台组', desc: '分布式定时任务调度与执行日志' },
]
