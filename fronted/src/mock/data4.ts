// Mock 数据第四部分：节点级信息补全
export interface CompletionItem {
  id: string
  kind: 'missing-upload' | 'prefill' | 'missing-form' | 'ready'
  title: string
  impact?: string
  source?: string
  draft?: string[]
  fields?: { label: string; value: string; ai?: boolean }[]
}

export const completionTask = {
  nodeId: 'n12',
  name: '测试用例生成',
  type: 'AI Task' as const,
  stage: '测试验证',
  agent: '测试工程师 · Tess',
  status: '等待输入',
  paused: '已暂停 2 天',
  aiNote:
    '生成测试用例需要明确的验收标准与码状态规则作为断言依据。当前 4 项输入中 2 项缺失、1 项 AI 已从项目资料中提取草稿待确认。补全后任务将自动恢复执行，预计生成 142 条用例。',
  items: [
    {
      id: 'c1', kind: 'missing-upload', title: '验收要求与验收标准',
      impact: '测试放行 Gate 的判定依据；缺失导致验收类用例（约 35 条）无法生成',
    },
    {
      id: 'c2', kind: 'prefill', title: '退货场景码状态回滚规则',
      source: 'AI 提取自 07-09 会议纪要 §3 · 来源可追溯',
      impact: '影响异常流用例 12 条',
      draft: [
        '退货入库时，码状态由「已出库」回滚至「在库」',
        '回滚操作需双人复核并记录操作日志',
        '已终端激活的码不允许回滚，转入冻结状态',
      ],
    },
    {
      id: 'c3', kind: 'missing-form', title: '性能验收指标',
      impact: '影响性能用例 6 条与验收基准',
      fields: [
        { label: '指标名称', value: '追溯查询响应时间' },
        { label: '目标值', value: '≤ 800ms（P95）', ai: true },
        { label: '并发基准', value: '日均 300 万次查询', ai: true },
        { label: '验证方法', value: 'JMeter 压测 · UAT 环境' },
      ],
    },
    { id: 'c4', kind: 'ready', title: '接口资料（API 清单 23 个）', source: '项目上下文 · 已同步' },
  ] as CompletionItem[],
}
