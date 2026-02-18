import React from 'react'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'

const DashboardLayout = () => {

  return (
    <div className='layout__dashboard'>
        <Sidebar />
        <Outlet/>
    </div>
  )
}

export default DashboardLayout