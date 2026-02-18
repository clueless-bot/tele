import React from 'react'

const Earn = () => {
  return (
    <div className='dashboard-layout'>
      <div className="earn-container">
        <h3 className='earn-title'>Channel Earn</h3>
        <div className='earn-block'>
          <div className='earn-block-item'>
            <p className='earn-block-item-para'>Available to withdraw</p>
            <h3 className='earn-block-item-value'>$1,567.99</h3>
            <p className='earn-block-item-foot'>Wed, Jul 20</p>
          </div>
          <div className='earn-block-item'>
            <p className='earn-block-item-para'>Total Revenue</p>
            <h3 className='earn-block-item-value'>$2,868.99</h3>
            <p className='earn-block-item-foot'>143 Orders</p>
          </div>
          <div className='earn-block-item'>
            <p className='earn-block-item-para'>Today Sessions</p>
            <h3 className='earn-block-item-value'>156k</h3>
            <p className='earn-block-item-foot'>32k Visitors</p>
          </div>
          <div className='earn-block-item'>
            <p className='earn-block-item-para'>Subscribers</p>
            <h3 className='earn-block-item-value'>3,422</h3>
            <p className='earn-block-item-foot'>$34.28 Average Order</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Earn