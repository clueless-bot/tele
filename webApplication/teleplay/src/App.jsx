import React from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import ChannelLogin from './pages/channel-login'
import ContentPage from './pages/content-page'
import ChannelUploadEdit from './pages/channel-upload-edit'
import ChannelUploadSuccess from './pages/channel-upload-success'
import EditPost from './pages/edit-post'
import ShortLinkRedirect from './pages/short-link'

// Wrapper to use hooks in props
function ContentPageWithNavigation() {
  const navigate = useNavigate()
  return (
    <ContentPage
      onEditClick={(uploadId, uploadData) => navigate(`/content/edit/${uploadId}`, { state: { uploadData } })}
    />
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChannelLogin />} />
        <Route path="/content" element={<ContentPageWithNavigation />} />
        <Route path="/content/edit/:id" element={<ChannelUploadEdit />} />
        <Route path="/channel-upload-edit" element={<EditPost/>} />
        <Route path="/channel-upload-success" element={<ChannelUploadSuccess />} />
        <Route path="/s/:code" element={<ShortLinkRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
