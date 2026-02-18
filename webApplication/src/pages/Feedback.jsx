import React from 'react'

const Feedback = () => {
    return (
        <div className='dashboard-layout'>
            <div className="feedback-container">
                <h3 className='earn-title'>Feedback</h3>
                <form className="feedback-form">
                    <div className="upload-form-item">
                        <input type="email" className='form-input' name='email' id='email' placeholder='Email Address' />
                    </div>
                    <div className="upload-form-item">
                        <textarea className='form-input' name='message' id='message' placeholder='Message...' 
                        rows={8}/>
                    </div>
                    <div className="upload-form-item">
                    <button className='submit-btn'>Submit</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Feedback