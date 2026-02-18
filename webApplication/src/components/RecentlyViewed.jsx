import React from 'react';
import Line from "../assets/chart-line.png";
import { GoKebabHorizontal } from "react-icons/go";
import ListItemRecent from './ListItemRecent';

const RecentlyViewed = () => {
  return (
    <div className='recent-section'>
        <div className="recent-header">
            <h3 className='recent-title'>Recently Viewed <img src={Line} className='recent-icon-line'/></h3>
            <GoKebabHorizontal size={25} color='#D8D8D8'/>
        </div>
        <div className="recent-body">
            <ListItemRecent name={"Jawan"}/>
            <ListItemRecent name={"Animal"}/>
        </div>
    </div>
  )
}

export default RecentlyViewed