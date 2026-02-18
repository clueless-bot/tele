import React from 'react'

const TrafficItem = ({ country, percentage }) => {
    return (
        <div className='traffic-item'>
            <div className="traffic-item-content">
                <p>{country}</p>
                <p>{percentage}%</p>
            </div>
            <div className='traffic-item-bar'>
                <div className="traffic-item-range" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    )
}

export default TrafficItem