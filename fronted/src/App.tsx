import { Routes, Route, Navigate } from 'react-router'
import AppLayout from '@/components/layout'
import { ProjectProvider } from '@/hooks/project'
import ProjectList from '@/pages/ProjectList'
import ProjectCreate from '@/pages/ProjectCreate'
import ProjectOverview from '@/pages/ProjectOverview'
import ProjectMembers from '@/pages/ProjectMembers'
import ProjectAssets from '@/pages/ProjectAssets'
import DeliveryDashboard from '@/pages/DeliveryDashboard'
import ProjectContext from '@/pages/ProjectContext'
import SpecList from '@/pages/SpecList'
import SpecDetail from '@/pages/SpecDetail'
import WorkflowPage from '@/pages/WorkflowPage'
import AITaskDetail from '@/pages/AITaskDetail'
import CompletionPage from '@/pages/CompletionPage'
import GatePage from '@/pages/GatePage'
import ReleaseList from '@/pages/ReleaseList'
import ReleaseDetail from '@/pages/ReleaseDetail'
import ReleaseCompare from '@/pages/ReleaseCompare'
import Outcomes from '@/pages/Outcomes'
import Retro from '@/pages/Retro'
import AICockpit from '@/pages/AICockpit'
import AgentsCenter from '@/pages/AgentsCenter'
import KnowledgeCenter from '@/pages/KnowledgeCenter'
import MetricsCenter from '@/pages/MetricsCenter'
import './App.css'

export default function App() {
  return (
    <ProjectProvider>
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/new" element={<ProjectCreate />} />
        <Route path="/projects/p1" element={<ProjectOverview />} />
        <Route path="/projects/p1/members" element={<ProjectMembers />} />
        <Route path="/projects/p1/assets" element={<ProjectAssets />} />
        <Route path="/projects/p1/delivery" element={<DeliveryDashboard />} />
        <Route path="/projects/p1/context" element={<ProjectContext />} />
        <Route path="/projects/p1/specs" element={<SpecList />} />
        <Route path="/projects/p1/specs/:id" element={<SpecDetail />} />
        <Route path="/projects/p1/workflow" element={<WorkflowPage />} />
        <Route path="/projects/p1/tasks/:id" element={<AITaskDetail />} />
        <Route path="/projects/p1/tasks/:id/complete" element={<CompletionPage />} />
        <Route path="/projects/p1/gate" element={<GatePage />} />
        <Route path="/projects/p1/releases" element={<ReleaseList />} />
        <Route path="/projects/p1/releases/compare" element={<ReleaseCompare />} />
        <Route path="/projects/p1/releases/v130" element={<ReleaseDetail />} />
        <Route path="/projects/p1/outcomes" element={<Outcomes />} />
        <Route path="/projects/p1/retro" element={<Retro />} />
        <Route path="/cockpit" element={<AICockpit />} />
        <Route path="/agents" element={<AgentsCenter />} />
        <Route path="/knowledge" element={<KnowledgeCenter />} />
        <Route path="/metrics" element={<MetricsCenter />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </AppLayout>
    </ProjectProvider>
  )
}
