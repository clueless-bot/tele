import React, { useState } from 'react';
import playlist from "../assets/video-playlist.png";
import { Link, useNavigate } from 'react-router-dom';
import { IoArrowBackCircleOutline } from "react-icons/io5";
import axios from 'axios';
import Loader from '../components/Loader/Loader';
import { toast, ToastContainer } from 'react-toastify';

const Register = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // handle submit 
    const handleRegister = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        let data = {
            name,
            email,
            phoneNumber: phone,
            password
        }

        try {
            const res = await axios.post(`${import.meta.env.VITE_APP_API}/channel/create`, { ...data });
            if (res.status == 201) {
                navigate('/login')
            }
        } catch (error) {
            console.log(error)
            if (error?.response?.data?.message) {
                toast.error(error?.response?.data?.message, {
                    position: "top-right",
                    autoClose: 1000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "light",
                });
            } else if (error?.message) {
                toast.error(error?.message, {
                    position: "top-right",
                    autoClose: 1000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "light",
                });
            } else {
                toast.error("something went wrong", {
                    position: "top-right",
                    autoClose: 1000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "light",
                });
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleBack = () => navigate(-1)
    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={1000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
            {isLoading && <Loader />}
            <div className='landing'>
                <div className="landing-wrapper">
                    <div className="landing-container auth-container">
                        <div className='landing-header'>
                            <IoArrowBackCircleOutline size={30} onClick={handleBack} className='landing-back' />
                        </div>
                        <div className="landing-logo">
                            <img className='landing-title-icon' src={playlist}></img>
                            <h3 className='landing-title'>Create Account</h3>
                        </div>
                        <form className='auth-form' onSubmit={handleRegister}>
                            <div className="form-fields">
                                <label htmlFor="name">Channel Name</label>
                                <input type="text" name='name' id='name' placeholder='Enter Channel' className='auth-input'
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-fields">
                                <label htmlFor="email">Email</label>
                                <input type="email" name='email' id='email' placeholder='Enter Email' className='auth-input'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-fields">
                                <label htmlFor="phone">Phone Number</label>
                                <input type="text" name='phone' id='phone' placeholder='Enter Phone number' className='auth-input'
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    maxLength={10}
                                />
                            </div>
                            <div className="form-fields">
                                <label htmlFor="password">Password</label>
                                <input type="password" name='password' id='password' placeholder='Enter Password' className='auth-input'
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className='auth-btn auth-create'>CREATE</button>
                        </form>
                    </div>
                    <hr className='landing-hr' />
                    <div className='landing-bottom'>
                        <p>Already have an account? <Link to="/login" className='bottom-link'>Login here</Link></p>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Register