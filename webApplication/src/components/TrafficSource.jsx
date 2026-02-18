import React from 'react'
import TrafficItem from './TrafficItem'

const TrafficSource = () => {
  return (
    <div className='traffic-section'>
        <h3 className='traffic-title'>Traffic Source</h3>
        <TrafficItem country={"India"} percentage={"20"}/>
        <TrafficItem country={"America"} percentage={"80"}/>
        <TrafficItem country={"Canada"} percentage={"60"}/>
        <TrafficItem country={"Other"} percentage={"33"}/>
    </div>
  )
}

export default TrafficSource