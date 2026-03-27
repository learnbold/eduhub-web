import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import Home from './pages/Home'
import './App.css'

function CourseDetailPlaceholder() {
  const { slug } = useParams()

  return (
    <main className="placeholder-page">
      <div className="placeholder-card">
        <p className="placeholder-eyebrow">Course Details</p>
        <h1>{slug}</h1>
        <p>
          This route is ready for your course detail page. Selecting a card on the
          home page will navigate here using the course slug.
        </p>
      </div>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/course/:slug" element={<CourseDetailPlaceholder />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
