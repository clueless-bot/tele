import React from 'react'
import TrafficSource from '../components/TrafficSource'
import Upload from "../assets/upload-image.png";
import { useNavigate } from 'react-router-dom';
import { ChartCode } from '../components/ChartCode';

const Analytics = () => {

    const navigate = useNavigate();

    const handleClickUpload = () => navigate("/dashboard/upload")
    return (
        <div className='dashboard-layout'>
            <div className="section-container">
                <div className="section-left">
                    <div className="section-left-header">
                        <h3>Channel Analytics</h3>
                    </div>
                    <div className="section-left-content">
                        <ChartCode />
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
    )
}

export default Analytics