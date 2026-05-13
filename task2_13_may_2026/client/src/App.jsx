import { Routes, Route, NavLink } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ProjectListPage from './pages/ProjectListPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import './App.css'

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">PM → Tickets</div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>
            New project
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </main>
    </div>
  )
}
