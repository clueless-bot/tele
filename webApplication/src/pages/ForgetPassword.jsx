import React from 'react';
import playlist from "../assets/video-playlist.png";
import { Link, useNavigate } from 'react-router-dom';
import { IoArrowBackCircleOutline } from "react-icons/io5";

const ForgetPassword = () => {
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
                        <h3 className='landing-title'>Forget Password</h3>
                    </div>
                    <form className='auth-form'>
                        <div className="form-fields">
                            <label htmlFor="email">Email</label>
                            <input type="email" name='email' id='email' placeholder='Enter Email' className='auth-input' />
                        </div>
                        <button className='auth-btn auth-create'>Send OTP</button>
                    </form>
                </div>
                <hr className='landing-hr' />
            </div>
        </div>
    )
}

export default ForgetPassword