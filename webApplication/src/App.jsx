import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import OtpVerify from './pages/OtpVerify'
import NewPassword from './pages/NewPassword'
import ForgetPassword from './pages/ForgetPassword'
import DashboardLayout from './layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Content from './pages/Content'
import Analytics from './pages/Analytics'
import Earn from './pages/Earn'
import Settings from './pages/Settings'
import Feedback from './pages/Feedback'
import ProtectedRoutes from './components/ProtectedRoutes'
import 'react-toastify/dist/ReactToastify.css';

function App() {

  return (
    <Routes>
      <Route path='/' element={<Landing />} />
      <Route path='/login' element={<Login />} />
      <Route path='/register' element={<Register />} />
      <Route path='/forget-password' element={<ForgetPassword />} />
      <Route path='/verify-otp' element={<OtpVerify />} />
      <Route path='/create-password' element={<NewPassword />} />
      <Route path='/dashboard' element={<DashboardLayout />}>
        <Route index element={<ProtectedRoutes><Dashboard /></ProtectedRoutes>} />
        <Route path='content' element={<ProtectedRoutes><Content /></ProtectedRoutes>} />
        <Route path='upload' element={<ProtectedRoutes><Upload /></ProtectedRoutes>} />
        <Route path='analytics' element={<ProtectedRoutes><Analytics /></ProtectedRoutes>} />
        <Route path='earn' element={<ProtectedRoutes><Earn /></ProtectedRoutes>} />
        <Route path='settings' element={<ProtectedRoutes><Settings /></ProtectedRoutes>} />
        <Route path='feedback' element={<ProtectedRoutes><Feedback /></ProtectedRoutes>} />
      </Route>

    </Routes>
  )
}

export default App
