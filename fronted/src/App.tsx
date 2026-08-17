import { Routes, Route, Navigate } from 'react-router'
import AppLayout from '@/components/layout'
import { ProjectProvider } from '@/hooks/project'
import ProjectList from '@/pages/ProjectList'
import ProjectCreate from '@/pages/ProjectCreate'
import ProjectDetail from '@/pages/ProjectDetail'
import FlowPage from '@/pages/FlowPage'
import StandardsManagePage from '@/pages/StandardsManagePage'
import AgentsCenter from '@/pages/AgentsCenter'
import KnowledgeCenter from '@/pages/KnowledgeCenter'
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
        <Route path="/projects/:pid" element={<ProjectDetail />} />
        <Route path="/projects/:pid/versions/:vid/flow" element={<FlowPage />} />
        <Route path="/cockpit" element={<AICockpit />} />
        <Route path="/agents" element={<AgentsCenter />} />
        <Route path="/knowledge" element={<KnowledgeCenter />} />
        <Route path="/knowledge/standards" element={<StandardsManagePage />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </AppLayout>
    </ProjectProvider>
  )
}
