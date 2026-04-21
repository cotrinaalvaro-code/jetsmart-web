import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tripulantes from './pages/Tripulantes'
import Traslados from './pages/Traslados'
import Carga from './pages/Carga'
import Navbar from './components/Navbar'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<><Navbar /><Dashboard /></>} />
        <Route path="/tripulantes" element={<><Navbar /><Tripulantes /></>} />
        <Route path="/traslados" element={<><Navbar /><Traslados /></>} />
        <Route path="/carga" element={<><Navbar /><Carga /></>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App