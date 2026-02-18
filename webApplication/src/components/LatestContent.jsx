import React from 'react';
import Line from "../assets/chart-line.png";
import { GoKebabHorizontal } from "react-icons/go";
import ListItemRecent from './ListItemRecent';

const LatestContent = () => {
    return (
        <div className='recent-section'>
            <div className="recent-header">
                <h3 className='recent-title'>Latest Content <img src={Line} className='recent-icon-line' /></h3>
                <GoKebabHorizontal size={25} color='#D8D8D8' />
            </div>
            <div className="recent-body">
                <ListItemRecent name={"Stree"} />
                <ListItemRecent name={"Animal"} />
            </div>
        </div>
    )
}

export default LatestContent