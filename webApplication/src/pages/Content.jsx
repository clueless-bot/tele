import React, { useEffect, useState } from 'react'
import TrafficSource from '../components/TrafficSource'
import Upload from "../assets/upload-image.png";
import { useNavigate } from 'react-router-dom';
import MovieTile from '../components/MovieTile';
import axios from 'axios';
import { useAuthContext } from '../context/AuthContext';
import Loader from '../components/Loader/Loader';
import { toast, ToastContainer } from 'react-toastify';


const Content = () => {
    const navigate = useNavigate();
    const [content, setContent] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleClickUpload = () => navigate("/dashboard/upload")
    const { currentUser } = useAuthContext()

    const handleFetchContent = async () => {
        setIsLoading(true)
        try {
            const res = await axios.get(`${import.meta.env.VITE_APP_API}/content/${currentUser?.id}`)
            setContent(res.data?.content)
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

    // delete tile 
    const handleDeleteTile = async (uid) => {
        setIsLoading(true);

        try {
            const res = await axios.delete(`${import.meta.env.VITE_APP_API}/content/${uid}`);
            if (res) {
                toast.success(res.data?.message || 'content deleted successfully', {
                    position: "top-right",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "light",
                });
                handleFetchContent()
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

    useEffect(() => {
        handleFetchContent();
    }, [])
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
            <div className='dashboard-layout'>
                <div className="section-container">
                    <div className="section-left">
                        <div className="section-left-header">
                            <h3>Content</h3>
                        </div>
                        <div className="section-left-content">
                            {content?.map(movie => <MovieTile data={movie} handleDeleteTile={handleDeleteTile}/>)}
                        </div>
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
        </>
    )
}

export default Content