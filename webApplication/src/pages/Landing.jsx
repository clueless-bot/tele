import React from 'react';
import playlist from "../assets/video-playlist.png";
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className='landing'>
      <div className="landing-wrapper">
        <div className="landing-container">
          <div className="landing-logo">
            <img className='landing-title-icon' src={playlist}></img>
            <h3 className='landing-title'>Channel</h3>
          </div>
          <Link to="/login" className='landing-btn'>LOGIN</Link>
          <Link to="/register" className='landing-btn'>Create Channel</Link>
          <div className="text-right">
            <p className='forget-password'>Forget Password!</p>
          </div>
        </div>
        <hr className='landing-hr' />
      </div>
    </div>
  )
}

export default Landing