import React from 'react';
import playlist from "../assets/video-playlist.png";
import { Link, useNavigate } from 'react-router-dom';
import { IoArrowBackCircleOutline } from "react-icons/io5";

const OtpVerify = () => {
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
                        <h3 className='landing-title'>Verify OTP</h3>
                    </div>
                    <form className='auth-form'>
                        <div className="form-fields">
                            <label htmlFor="otp">Email</label>
                            <input type="text" name='otp' id='otp' placeholder='Enter OTP' className='auth-input' />
                        </div>
                        <button className='auth-btn auth-create'>VERIFY</button>
                    </form>
                </div>
                <hr className='landing-hr' />
            </div>
        </div>
    )
}

export default OtpVerify