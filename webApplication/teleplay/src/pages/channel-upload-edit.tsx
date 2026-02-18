import React, { useState, useEffect, useRef } from "react"
import { useParams, useLocation, useNavigate } from "react-router-dom"
import { ImageIcon } from "lucide-react"



interface ChannelUploadEditProps {
  onUpdateSuccess?: () => void
}

export default function ChannelUploadEdit({ onUpdateSuccess }: ChannelUploadEditProps) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Optionally, pre-fill with state passed from navigation
  const uploadData = location.state?.uploadData

  // Form state
  const [dragActive, setDragActive] = useState(false)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [language, setLanguage] = useState(uploadData?.language || "")
  const [title, setTitle] = useState(uploadData?.title || "")
  const [inputLink, setInputLink] = useState(uploadData?.inputLink || "")

  const fileInputRef = useRef<HTMLInputElement>(null)

  // If you want to fetch data by ID from backend, do it here
  useEffect(() => {
    if (!uploadData && id) {
      // Example: fetch(`/api/uploads/${id}`).then(...)
      // For now, do nothing (or set loading state)
    }
  }, [id, uploadData])

  // Create thumbnail preview when file is selected
  useEffect(() => {
    if (thumbnail) {
      const url = URL.createObjectURL(thumbnail)
      setThumbnailPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setThumbnailPreview(null)
    }
  }, [thumbnail])

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setThumbnail(e.dataTransfer.files[0])
    }
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnail(e.target.files[0])
    }
  }

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here, send updated data to backend
    // Example: await fetch(`/api/uploads/${id}`, { method: "PUT", body: ... })
    // For now, just log and call callback
    console.log("Update form submitted", { id, thumbnail, language, title, inputLink })

    if (onUpdateSuccess) {
      onUpdateSuccess()
    } else {
      // Optionally, navigate back to content page
      navigate("/content")
    }
  }

  return (

    <div id = "channel-upload-edit" className="bg-white h-screen overflow-y-auto channel-upload-edit">
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Header */}
          <div className="flex items-center mb-12">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mr-3"
            >
              <path
                d="M11 4H4C3.44772 4 3 4.44772 3 5V19C3 19.5523 3.44772 20 4 20H18C18.5523 20 19 19.5523 19 19V12"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M8 12H10" stroke="black" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 16H15" stroke="black" strokeWidth="2" strokeLinecap="round" />
              <path
                d="M17.5 4.5L18.5 5.5L22 2"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-4xl font-bold text-gray-800">Edit</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Thumbnail Section */}
            <div>
              <label className="block text-xl font-medium text-gray-800 mb-2">Thumbnail</label>
              <div
                className={`border-2 border-dashed rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer bg-gray-50 ${dragActive ? "border-[#1a9bd7] bg-blue-50" : "border-gray-300"}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Thumbnail preview" className="h-32 object-contain mb-2" />
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-gray-500">Upload Thumbnail</p>
                  </>
                )}
                <input
                  type="file"
                  id="thumbnail-upload"
                  className="hidden"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Language Section */}
            <div>
              <label className="block text-xl font-medium text-gray-800 mb-2">Language</label>
              <select
                className="w-full md:w-1/3 px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700"
                value={language}
                onChange={e => setLanguage(e.target.value)}
                required
              >
                <option value="" disabled>
                  Video Language
                </option>
                <option value="hindi">Hindi</option>
                <option value="english">English</option>
                <option value="telugu">Telugu</option>
                <option value="tamil">Tamil</option>
                <option value="punjabi">Punjabi</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Title Section */}
            <div>
              <label htmlFor="title" className="block text-xl font-medium text-gray-800 mb-2">
                Title
              </label>
              <input
                type="text"
                id="title"
                placeholder="Enter Title"
                className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Input Link Section */}
            {/* <div>
              <label htmlFor="inputLink" className="block text-xl font-medium text-gray-800 mb-2">
                Input Link
              </label>
              <input
                type="text"
                id="inputLink"
                placeholder="Input Link"
                className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700"
                value={inputLink}
                onChange={e => setInputLink(e.target.value)}
                required
              />
            </div> */}

            {/* Update Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="bg-[#1a9bd7] text-white px-8 py-3 rounded-lg text-xl font-semibold hover:bg-[#1689c0] transition-colors flex items-center"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2"
                >
                  <path
                    d="M11 4H4C3.44772 4 3 4.44772 3 5V19C3 19.5523 3.44772 20 4 20H18C18.5523 20 19 19.5523 19 19V12"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M8 12H10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 16H15" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <path
                    d="M17.5 4.5L18.5 5.5L22 2"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Update
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
