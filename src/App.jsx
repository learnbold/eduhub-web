import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Course from './pages/Course'
import Player from './pages/Player'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/course/:slug" element={<Course />} />
      <Route path="/player/:courseId" element={<Player />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
