import { type ReactNode } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { projects, products } from '@/mock/data'
import { useProject } from '@/hooks/project'
import { Pill } from '@/components/common'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutGrid, FolderPlus, KanbanSquare, Users, Boxes, Gauge, Database, FileStack,
  Workflow, Layers3, PackageCheck, Lightbulb, Bell, Search, ChevronDown, Hexagon, CircleUser,
  Radar, Bot, BookOpen, BarChart3,
  Check,
} from 'lucide-react'

const P = '/projects/p1'

const navGroups = [
  {
    title: '管理视角',
    items: [
      { to: '/metrics', label: '度量中心', icon: BarChart3 },
    ],
  },
  {
    title: '项目中心',
    items: [
      { to: '/projects', label: '项目与产品', icon: LayoutGrid, end: true },
      { to: '/projects/new', label: '创建项目', icon: FolderPlus },
    ],
  },
  {
    title: '项目管理',
    items: [
      { to: `${P}`, label: '项目概览', icon: KanbanSquare, end: true },
      { to: `${P}/members`, label: '项目成员', icon: Users },
      { to: `${P}/assets`, label: '工程资产', icon: Boxes },
    ],
  },
  {
    title: 'AI 原生交付',
    items: [
      { to: `${P}/delivery`, label: '交付总览', icon: Gauge },
      { to: `${P}/flow`, label: 'AI 流水线', icon: Workflow },
      { to: '/cockpit', label: 'AI 驾驶舱', icon: Radar },
      { to: `${P}/context`, label: '项目上下文', icon: Database },
      { to: `${P}/specs`, label: '项目规格', icon: FileStack },
      { to: `${P}/workflow`, label: '交付流程', icon: Workflow },
      { to: `${P}/releases`, label: '版本与基线', icon: Layers3 },
      { to: `${P}/outcomes`, label: '交付成果', icon: PackageCheck },
      { to: `${P}/retro`, label: '复盘沉淀', icon: Lightbulb },
    ],
  },
  {
    title: '平台配置',
    items: [
      { to: '/agents', label: '数字员工', icon: Bot },
      { to: '/knowledge', label: '知识库', icon: BookOpen },
      { to: '/standards', label: '标准与规范', icon: FileStack },
    ],
  },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const loc = useLocation()
  const nav = useNavigate()
  const { obj, setObjId } = useProject()
  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-800 flex">
      {/* 侧边栏 */}
      <aside className="w-[232px] shrink-0 bg-[#0c1428] text-slate-300 flex flex-col fixed inset-y-0 z-30">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-white/[0.06]">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Hexagon className="w-4.5 h-4.5 text-white" size={18} />
          </span>
          <div className="leading-tight">
            <div className="text-[13.5px] font-semibold text-white tracking-wide">AI 交付</div>
            <div className="text-[10px] text-slate-500 tracking-wider">AI-NATIVE DELIVERY</div>
          </div>
        </div>

        {/* 当前项目切换 */}
        <div className="px-3 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] transition-colors px-3 py-2.5 text-left border border-white/[0.06]">
                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold ${obj.kind === '产品' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-indigo-500/20 text-indigo-300'}`}>{obj.name.slice(0, 1)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs text-white truncate">{obj.name}</span>
                  <span className="block text-[10px] text-slate-500">{obj.kind} · {obj.code}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]">
              <DropdownMenuLabel className="text-xs text-slate-400">切换当前对象 · 全局生效</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-slate-400 py-1">交付项目（禅道）</DropdownMenuLabel>
              {projects.map(p => (
                <DropdownMenuItem key={p.id} onClick={() => { setObjId(p.id); nav('/projects/p1') }}
                  className="flex items-center gap-2.5 py-2 cursor-pointer">
                  <span className={cn('w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0',
                    p.id === obj.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500')}>{p.name.slice(0, 1)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-slate-800 truncate">{p.name}</span>
                    <span className="block text-[11px] text-slate-400 font-mono">{p.code}</span>
                  </span>
                  {p.id === obj.id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-slate-400 py-1">自有产品</DropdownMenuLabel>
              {products.map(p => (
                <DropdownMenuItem key={p.id} onClick={() => { setObjId(p.id); nav('/projects/p1') }}
                  className="flex items-center gap-2.5 py-2 cursor-pointer">
                  <span className={cn('w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0',
                    p.id === obj.id ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-500')}>{p.name.slice(0, 1)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-slate-800 truncate">{p.name}</span>
                    <span className="block text-[11px] text-slate-400 font-mono">{p.code}</span>
                  </span>
                  <Pill tone={p.status === '开发中' ? 'blue' : p.status === '运营中' ? 'green' : 'slate'} className="shrink-0">{p.status}</Pill>
                  {p.id === obj.id && <Check className="w-4 h-4 text-cyan-600 shrink-0" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 sidebar-scroll">
          {navGroups.map((g) => (
            <div key={g.title}>
              <div className="px-2 mb-1.5 text-[10.5px] font-medium tracking-[0.14em] text-slate-500">{g.title}</div>
              <div className="space-y-0.5">
                {g.items.map((it) => (
                  <NavLink
                    key={it.to + it.label}
                    to={it.to}
                    end={'end' in it ? it.end : undefined}
                    className={({ isActive }) => cn(
                      'group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors',
                      isActive
                        ? 'bg-indigo-500/15 text-white font-medium shadow-[inset_2px_0_0_0_#818cf8]'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]',
                    )}
                  >
                    <it.icon className="w-4 h-4 opacity-80" />
                    {it.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <CircleUser className="w-7 h-7 text-slate-500" />
            <div className="leading-tight">
              <div className="text-xs text-slate-200">张明远</div>
              <div className="text-[10px] text-slate-500">项目经理</div>
            </div>
          </div>
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex-1 ml-[232px] flex flex-col min-w-0">
        <header className="h-14 bg-white/85 backdrop-blur border-b border-slate-200/80 flex items-center gap-4 px-6 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <Link to="/projects" className="hover:text-slate-800">项目中心</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-medium truncate max-w-[320px]">{obj.name} · {crumbMap(loc.pathname)}</span>
          </div>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2 h-8 w-[280px] rounded-md bg-slate-100 px-3 text-xs text-slate-400">
            <Search className="w-3.5 h-3.5" />搜索项目 / 规格 / 任务…
          </div>
          <button className="relative w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border border-white" />
          </button>
          <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-medium flex items-center justify-center">张</span>
        </header>
        <main className="flex-1 px-6 py-5 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}

function crumbMap(path: string): string {
  const map: [RegExp, string][] = [
    [/^\/cockpit/, 'AI 驾驶舱'], [/^\/agents/, '数字员工中心'], [/^\/knowledge/, '知识库管理'], [/^\/metrics/, '度量中心'], [/^\/standards/, '标准与规范'],
    [/^\/projects$/, '项目与产品'], [/^\/projects\/new/, '创建项目'],
    [/^\/projects\/p1$/, '项目概览'], [/members/, '项目成员'], [/assets/, '工程资产'],
    [/delivery/, '交付总览'], [/flow/, 'AI 流水线'], [/context/, '项目上下文'], [/specs\/req/, '规格详情 · 需求规格'], [/specs\/design/, '规格详情 · 设计规格'], [/specs\/api/, '规格详情 · 接口规格'], [/specs\/test/, '规格详情 · 测试验收规格'], [/specs\/release/, '规格详情 · 发布交付规格'],
    [/specs/, '项目规格'], [/workflow/, '交付流程'], [/tasks\/.*\/complete/, '输入补全 · 测试用例生成'], [/tasks/, 'AI Task 详情'],
    [/gate/, 'Evaluation / Human Gate'], [/releases\/compare/, '版本对比'],
    [/releases\/v/, '版本详情'], [/releases/, '版本与基线'], [/outcomes/, '交付成果'], [/retro/, '复盘沉淀'],
  ]
  for (const [re, label] of map) if (re.test(path)) return label
  return '项目'
}
