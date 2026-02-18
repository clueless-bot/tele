import React from 'react'
import { Link } from 'react-router-dom'
import { useSidebarContext } from '../context/SidebarContext'
import { useAuthContext } from '../context/AuthContext'

const Sidebar = () => {

  const sidebarItem = [
    {
      id: 1,
      name: 'Dashboard',
      link: '/dashboard'
    },
    {
      id: 2,
      name: 'Content',
      link: '/dashboard/content'
    },
    {
      id: 3,
      name: 'Analytics',
      link: '/dashboard/analytics'
    },
    {
      id: 4,
      name: 'Earn',
      link: '/dashboard/earn'
    },
    {
      id: 5,
      name: 'Settings',
      link: '/dashboard/settings'
    },
    {
      id: 6,
      name: 'Feedback',
      link: '/dashboard/feedback'
    },
  ]

  const { handleSetTab, currentTab } = useSidebarContext();
  const { currentUser, logout } = useAuthContext();

  const handleSignOut = () => {
    logout()
  }

  return (
    <div className='sidebar'>
        <div className="sidebar-header">
            <div className="channel-logo"></div>
            <h3 className='sidebar-primary'>{currentUser?.name ?? "channel name"}</h3>
            <p className='sidebar-uid'>@{currentUser?.name ?? "user_id"}</p>
        </div>
        <div className="sidebar-nav">
            {sidebarItem?.map(item => (<Link key={item?.id} className={`side-nav ${currentTab === item.name?.toLocaleLowerCase() ? 'active': ''}`} to={`${item.link}`} onClick={() => handleSetTab(item?.name?.toLocaleLowerCase())}>{item.name}</Link>))}
            <Link onClick={handleSignOut} className='side-nav'>Sign Out</Link>
        </div>
    </div>
  )
}

export default Sidebar