import React from 'react';
import Line from "../assets/chart-line-green.png";

const ListItemRecent = ({ name }) => {
  return (
    <div className='recent-item'>
        <div className="recent-item-left">
            <div className='recent-item-image'>

            </div>
            <div className="recent-item-left-content">
                <h3>{name || "Jawan"}</h3>
                <p>Hindi, Telugu</p>
            </div>
        </div>
        <div className="recent-item-right">
            <p>326k</p>
            <img src={Line}/>
        </div>
    </div>
  )
}

export default ListItemRecent