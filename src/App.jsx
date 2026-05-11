import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tripulantes from './pages/Tripulantes'
import Traslados from './pages/Traslados'
import HistoricoETA from './pages/HistoricoETA'
import Carga from './pages/Carga'
import Configuracion from './pages/Configuracion'
import Corredores from './pages/Corredores'
import MapaPage from './pages/MapaPage'
import Navbar from './components/Navbar'

function PrivateRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  return session ? children : <Navigate to="/" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard"    element={<PrivateRoute><Navbar /><Dashboard /></PrivateRoute>} />
        <Route path="/tripulantes"  element={<PrivateRoute><Navbar /><Tripulantes /></PrivateRoute>} />
        <Route path="/traslados"    element={<PrivateRoute><Navbar /><Traslados /></PrivateRoute>} />
        <Route path="/historico-eta" element={<PrivateRoute><Navbar /><HistoricoETA /></PrivateRoute>} />
        <Route path="/carga"        element={<PrivateRoute><Navbar /><Carga /></PrivateRoute>} />
        <Route path="/configuracion" element={<PrivateRoute><Navbar /><Configuracion /></PrivateRoute>} />
        <Route path="/corredores"   element={<PrivateRoute><Navbar /><Corredores /></PrivateRoute>} />
        <Route path="/mapa"         element={<PrivateRoute><MapaPage /></PrivateRoute>} />
        <Route path="*"             element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App