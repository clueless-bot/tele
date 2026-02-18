import React from 'react'
import playlist from "../assets/video-playlist.png";
import { useNavigate } from 'react-router-dom';
import { IoArrowBackCircleOutline } from "react-icons/io5";

const NewPassword = () => {
    const navigate = useNavigate();

    const handleBack = () => navigate(-1)
    return (
        <div className='landing'>
            <div className="landing-wrapper">
                <div className="landing-container auth-container">
                    <div className='landing-header'>
                        <IoArrowBackCircleOutline size={30} onClick={handleBack} className='landing-back' />
                    </div>
                    <div className="landing-logo">
                        <img className='landing-title-icon' src={playlist}></img>
                        <h3 className='landing-title'>New Password</h3>
                    </div>
                    <form className='auth-form'>
                        <div className="form-fields">
                            <label htmlFor="text">Password</label>
                            <input type="text" name='password' id='password' placeholder='Enter Password' className='auth-input' />
                        </div>
                        <div className="form-fields">
                            <label htmlFor="text">Confirm Password</label>
                            <input type="text" name='confirm-password' id='confirm-password' placeholder='Enter Confirm Password' className='auth-input' />
                        </div>
                        <button className='auth-btn auth-create'>CREATE</button>
                    </form>
                </div>
                <hr className='landing-hr' />
            </div>
        </div>
    )
}

export default NewPassword