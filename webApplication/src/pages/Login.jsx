import React, { useState } from 'react';
import playlist from "../assets/video-playlist.png";
import { Link, useNavigate } from 'react-router-dom';
import { IoArrowBackCircleOutline } from "react-icons/io5";
import axios from 'axios';
import { useSidebarContext } from '../context/SidebarContext';
import { useAuthContext } from '../context/AuthContext';
import Loader from '../components/Loader/Loader';
import { ToastContainer, toast } from "react-toastify";

const Login = () => {

    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const { handleSetTab } = useSidebarContext()
    const { handleSetUser } = useAuthContext()
    const [isLoading, setIsLoading] = useState(false)

    //handle login 
    const handleLogin = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        let data = {
            email,
            password
        }

        try {
            const res = await axios.post(`${import.meta.env.VITE_APP_API}/channel/login`, { ...data });
            if (res.status == 200) {
                handleSetTab("dashboard")
                handleSetUser(res.data?.channel)
                navigate('/dashboard')
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
                            <h3 className='landing-title'>Login Account</h3>
                        </div>
                        <form className='auth-form' onSubmit={handleLogin}>
                            <div className="form-fields">
                                <label htmlFor="email">Email</label>
                                <input type="email" name='email' id='email' placeholder='Enter Email' className='auth-input'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
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
                            <div className="text-right">
                                <Link to="/forget-password" className='forget-password'>Forget Password!</Link>
                            </div>
                            <button type='submit' className='auth-btn'>LOGIN</button>
                        </form>
                    </div>
                    <hr className='landing-hr' />
                    <div className='landing-bottom'>
                        <p>Not a member ? <Link to="/register" className='bottom-link'>Create account</Link></p>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Login