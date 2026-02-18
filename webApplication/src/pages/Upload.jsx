import React, { useRef, useState } from 'react';
import upload from "../assets/upload-black.png";
import { useAuthContext } from '../context/AuthContext';
import axios from 'axios';
import Loader from '../components/Loader/Loader';
import { toast, ToastContainer } from 'react-toastify';

const Upload = () => {

  const [language, setlanguage] = useState('');
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [thumbnail, setThumbnail] = useState(null)
  const [file, setFile] = useState(null)
  const { currentUser } = useAuthContext();
  const [copySuccess, setCopySuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // uploaded states
  const [uploadedData, setUploadedData] = useState(null);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file)
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnail(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }


  const thumbnailRef = useRef(null)
  const handleOpenThumbnail = () => {
    thumbnailRef.current.click()
  }

  // handle submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.target);
    formData.append("channel", currentUser?.id)

    try {
      const res = await axios.post(`${import.meta.env.VITE_APP_API}/generate/short`, formData, {
        headers: {
          'Content-Type': "multipart/form-data"
        }
      });

      console.log(res.data)
      setUploadedData(res.data);
    } catch (error) {
      console.log(error)
      if (error?.response?.data?.message) {
        toast.error(error?.response?.data?.message, {
          position: "top-right",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      } else if (error?.message) {
        toast.error(error?.message, {
          position: "top-right",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      } else {
        toast.error("something went wrong", {
          position: "top-right",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkCopy = (e) => {
    e.preventDefault();
    if (uploadedData?.shortLink) {
      navigator.clipboard.writeText(uploadedData?.shortLink).then(() => {
        setCopySuccess('Link copied to clipboard!');
      }).catch((err) => {
        console.error('Failed to copy: ', err);
        setCopySuccess('Failed to copy the link. Please try again.');
      });
    }
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      {isLoading && <Loader />}
      <div className='upload-layout'>
        <div className="upload-section">
          <div className="upload-section-header">
            <img src={upload} alt="upload image" />
            <h3>Upload</h3>
          </div>
          {!uploadedData ? <form className='upload-form' onSubmit={handleSubmit}>
            <div className="upload-form-grid">
              <div className="upload-form-item">
                <label htmlFor="thumbnail">Thumbnail</label>
                <input type="file" className='upload-form-thumbnail' name='file' id='file' ref={thumbnailRef}
                  onChange={handleThumbnailChange}
                />
                <div className='upload-form-btn' onClick={handleOpenThumbnail}>
                  {!thumbnail ?
                    <p>Upload Thumbnail</p>
                    :
                    <img src={thumbnail} className='thumbnail-preview' />
                  }
                </div>
              </div>
              <div className="upload-form-item">
                <label htmlFor="language">Language</label>
                <input type="text" className='upload-form-language form-input' name='language' id='language' placeholder='video language'
                  value={language}
                  onChange={(e) => setlanguage(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="upload-form-item">
              <label htmlFor="title">Title</label>
              <input type="text" className='upload-form-title form-input' name='title' id='title' placeholder='Enter title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="upload-form-item">
              <label htmlFor="link">Input Link</label>
              <input type="text" className='upload-form-link form-input' name='magnet' id='magnet' placeholder='Enter link'
                value={link}
                onChange={(e) => setLink(e.target.value)}
                required
              />
            </div>
            <div className="upload-form-item">
              <button type='submit' className='submit-btn'>Upload</button>
            </div>
          </form> :
            <form className='upload-form'>
              <div className="upload-form-item">
                <label htmlFor="output-link">Output Link</label>
                <input type="text" className='upload-form-title form-input' name='output-link' id='output-link'
                  value={uploadedData?.shortLink}
                  disabled
                />
              </div>
              <div className="upload-form-item">
                <button type='button' className='submit-btn' onClick={handleLinkCopy}>Copy Link</button>
              </div>
              <div className="upload-form-item">
                <img src={uploadedData?.qrCode} alt="qrcode" className='qr-code' />
              </div>
              <div className="upload-form-item">
                <button type='button' className='submit-btn' onClick={handleLinkCopy}>Copy Link</button>
              </div>
            </form>}
        </div>
      </div>
    </>
  )
}

export default Upload