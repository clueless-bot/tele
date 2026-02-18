import React from 'react'
import { FaEye } from "react-icons/fa";
import { MdDelete } from "react-icons/md";

const MovieTile = ({ data, handleDeleteTile }) => {

  const filePath = `${import.meta.env.VITE_APP_API}/public/`
  return (
    <div className='content-item'>
      <div className="tile-image">
        <img src={`${filePath}${data?.fileUrl}`} alt="" />
      </div>
      <div className="tile-content">
        <h3 className='tile-content-name'>{data?.title}</h3>
        <div className='tile-content-details'>
          <div className="tile-language">{data?.language}</div>
          <div className="title-icons">
            <div className="tile-views">{data?.clicks}</div>
            <FaEye size={20} className='tile-eye'/>
            <MdDelete size={20} className='tile-delete' onClick={() => handleDeleteTile(data?.uid)}/>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MovieTile