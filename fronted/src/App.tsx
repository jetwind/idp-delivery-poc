import { Routes, Route, Navigate } from 'react-router'
import AppLayout from '@/components/layout'
import { ProjectProvider } from '@/hooks/project'
import ProjectList from '@/pages/ProjectList'
import ProjectCreate from '@/pages/ProjectCreate'
import FlowPage from '@/pages/FlowPage'
import StandardsManagePage from '@/pages/StandardsManagePage'
import AgentsCenter from '@/pages/AgentsCenter'
import KnowledgeCenter from '@/pages/KnowledgeCenter'
import MetricsCenter from '@/pages/MetricsCenter'
import AICockpit from '@/pages/AICockpit'
import './App.css'

export default function App() {
  return (
    <ProjectProvider>
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/new" element={<ProjectCreate />} />
        <Route path="/projects/:pid/flow" element={<FlowPage />} />
        <Route path="/cockpit" element={<AICockpit />} />
        <Route path="/agents" element={<AgentsCenter />} />
        <Route path="/knowledge" element={<KnowledgeCenter />} />
        <Route path="/metrics" element={<MetricsCenter />} />
        <Route path="/standards" element={<StandardsManagePage />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </AppLayout>
    </ProjectProvider>
  )
}
