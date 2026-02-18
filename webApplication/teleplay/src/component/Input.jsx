import React from 'react'

const Input = ({ type, onChange, value, placeholder }) => {
    return (
        <input type={type} placeholder={placeholder} value={value} onChange={onChange} className='w-[400px]  border-b border-b-amber-400 focus:border-none focus:border-b-amber-950' />
    )
}

export default Input
