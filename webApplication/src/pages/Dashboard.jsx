import React from 'react'
import RecentlyViewed from '../components/RecentlyViewed'
import LatestContent from '../components/LatestContent'
import TrafficSource from '../components/TrafficSource'
import Upload from "../assets/upload-image.png";
import { useNavigate } from 'react-router-dom';


const Dashboard = () => {

  const navigate = useNavigate();

  const handleClickUpload = () => navigate("upload")

  return (
    <div className='dashboard-layout'>
      <div className="section-container">
        <div className="section-left">
          <h1 className='section-header'>Channel Dashboard</h1>
          <p className='section-date'>01 - 25 March, 2024</p>

          {/* recently viewed */}
          <RecentlyViewed />
          {/* latest content */}
          <LatestContent />
        </div>
        <div className="section-right">
          <TrafficSource />
          <div className='upload-btn' onClick={handleClickUpload}>
            <img src={Upload} className='upload-image' />
            <h3 className='upload-btn-text'>Upload</h3>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard