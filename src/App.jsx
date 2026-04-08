import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import HubDashboardLayout from './components/dashboard/DashboardLayout'
import Home from './pages/Home'
import Course from './pages/Course'
import Login from './pages/Login'
import Player from './pages/Player'
import Register from './pages/Register'
import CoursePlayer from './pages/course/CoursePlayer'
import DashboardHome from './pages/dashboard/DashboardHome'
import BatchesList from './pages/dashboard/BatchesList'
import BatchDetail from './pages/dashboard/BatchDetail'
import CoursesList from './pages/dashboard/CoursesList'
import CreateCourse from './pages/dashboard/CreateCourse'
import CourseDetail from './pages/dashboard/CourseDetail'
import UploadVideo from './pages/dashboard/UploadVideo'
import HubAdminPanel from './pages/hub/HubAdminPanel'
import HubAnalytics from './pages/hub/HubAnalytics'
import HubDashboardRedirect from './pages/hub/HubDashboardRedirect'
import HubPublic from './pages/hub/HubPublic'
import HubSettings from './pages/hub/HubSettings'
import HubStudents from './pages/hub/HubStudents'
import HubTeamManagement from './pages/hub/HubTeamManagement'
import HubVideos from './pages/hub/HubVideos'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/course/:slug" element={<Course />} />
      <Route path="/hub/:slug" element={<HubPublic />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/course/:slug/learn" element={<CoursePlayer />} />
        <Route path="/player/:courseId" element={<Player />} />
      </Route>
      <Route element={<ProtectedRoute requireTeacher />}>
        <Route path="/dashboard" element={<HubDashboardRedirect />} />
        <Route path="/hub/:slug/dashboard" element={<HubDashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="batches" element={<BatchesList />} />
          <Route path="batches/:id" element={<BatchDetail />} />
          <Route path="courses" element={<CoursesList />} />
          <Route path="courses/create" element={<CreateCourse />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="videos" element={<HubVideos />} />
          <Route path="videos/upload" element={<UploadVideo />} />
          <Route path="students" element={<HubStudents />} />
          <Route path="teachers" element={<HubTeamManagement />} />
          <Route path="admin" element={<HubAdminPanel />} />
          <Route path="settings" element={<HubSettings />} />
          <Route path="analytics" element={<HubAnalytics />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
