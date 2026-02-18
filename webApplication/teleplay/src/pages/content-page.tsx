import { TrendingUp, QrCode, X } from "lucide-react"
import React from "react"
import { useEffect, useState } from "react"
import {Link} from "react-router-dom"
import ChannelUpload from "./edit-post"
import { onEditClicks } from "./helpers"
import Cookies from "js-cookie"

// Interface for upload items
interface UploadItem {
  id: number
  title: string
  language: string
  thumbnail: string | null
  input_link: string
  output_link?: string
  description: string
  customer_id: number | null
  tags?: string
}

interface ContentPageProps {
  onUploadClick?: () => void
  onEditClick?: (uploadId: number, uploadData: UploadItem) => void
}


export default function ContentPage({ onUploadClick, onEditClick }: ContentPageProps) {
  // State to store uploads data
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewUpload, setViewUpload] = useState<UploadItem | null>(null)
  const [viewQrCode, setViewQrCode] = useState<string | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Calculate total pages and paginated uploads
  const totalPages = Math.ceil(uploads.length / itemsPerPage)
  const paginatedUploads = uploads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Fetch uploads when component mounts
  useEffect(() => {
    const fetchUploads = async () => {
      try {
        setLoading(true)
        const token = Cookies.get("token")
        if (!token) {
          throw new Error("Please login first")
        }

        const response = await fetch(`${import.meta.env.VITE_BASE_URL}/admin/uploads`, {
          method: "GET",
          headers: {
            Authorization: `${token}`,
            // Avoid ngrok's browser warning HTML response (breaks JSON parsing)
            "ngrok-skip-browser-warning": "true",
          },
        })

        if (!response.ok) {
          const contentType = response.headers.get("content-type") || ""
          const bodyText = await response.text().catch(() => "")
          if (contentType.includes("application/json")) {
            try {
              const errorData = JSON.parse(bodyText)
              throw new Error(errorData.message || "Failed to fetch uploads")
            } catch {
              // fall through to generic error below
            }
          }
          throw new Error(bodyText || `Failed to fetch uploads (HTTP ${response.status})`)
        }

        const contentType = response.headers.get("content-type") || ""
        if (!contentType.includes("application/json")) {
          const text = await response.text().catch(() => "")
          throw new Error(
            `Expected JSON but got ${contentType || "unknown"} (HTTP ${response.status}): ${text.slice(0, 120)}`,
          )
        }

        const result = await response.json()
        if (result.success) {
          setUploads(result.data)
        } else {
          throw new Error(result.message || "Failed to fetch uploads")
        }
      } catch (err: any) {
        console.error("Error fetching uploads:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUploads()
  }, [])

  const resolveShortUrl = (value?: string) => {
    if (!value) return ""
    if (value.startsWith("http://") || value.startsWith("https://")) return value
    if (value.startsWith("/")) return `${window.location.origin}${value}`
    return value
  }

  const openView = async (upload: UploadItem) => {
    setViewUpload(upload)
    setViewQrCode(null)
    setViewError(null)

    const shortUrl = resolveShortUrl(upload.output_link)
    if (!shortUrl) {
      setViewError("Short link not available for this upload.")
      return
    }

    try {
      setViewLoading(true)
      const token = Cookies.get("token") || ""
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/qrcode/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: token } : {}),
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ url: shortUrl }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(text || `Failed to generate QR (HTTP ${response.status})`)
      }

      const contentType = response.headers.get("content-type") || ""
      if (!contentType.includes("application/json")) {
        const text = await response.text().catch(() => "")
        throw new Error(`Expected JSON but got ${contentType || "unknown"}: ${text.slice(0, 120)}`)
      }

      const data = await response.json()
      if (data?.qrCode) setViewQrCode(data.qrCode)
      else setViewError("QR code could not be generated.")
    } catch (err: any) {
      console.error("Error generating QR:", err)
      setViewError(err.message || "Failed to generate QR code")
    } finally {
      setViewLoading(false)
    }
  }

  const closeView = () => {
    setViewUpload(null)
    setViewQrCode(null)
    setViewLoading(false)
    setViewError(null)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
  }

  return (
    <>
      <div className="flex-1 bg-white h-full overflow-y-auto">
      <div className="ml-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 h-full">
          {/* Content Items - Takes up 2/3 of the grid on larger screens */}
          <div className="md:col-span-2 space-y-4">
            {/* Content Header */}
            <header className="mb-4 md:mb-6 lg:mb-8">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">Content</h1>
            </header>

            {/* Loading/Error/No Content Handling */}
            {loading ? (
              <div className="text-center py-8">Loading content...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">Error: {error}</div>
            ) : uploads.length === 0 ? (
              <div className="text-center py-8">No content found. Upload something to get started!</div>
            ) : (
              <>
                {/* Display Paginated Content */}
                {paginatedUploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="border rounded-lg overflow-hidden flex flex-col sm:flex-row items-stretch"
                  >
                    <div className="w-full sm:w-32 h-36 sm:h-24 bg-gray-200 flex-shrink-0">
                      {upload.thumbnail ? (
                        <img
                          src={upload.thumbnail || "/placeholder.svg"}
                          alt={upload.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300"></div>
                      )}
                    </div>
                    <div className="flex-1 p-3 md:p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-medium truncate">{upload.title}</h3>
                        <p className="text-gray-500 text-xs sm:text-sm truncate">{upload.language}</p>
                      </div>
                    </div>
	                    <div className="flex flex-col justify-between items-end p-3 sm:p-4">
	                      <div className="flex items-center">
	                        <span className="font-semibold mr-1 text-sm sm:text-base">0</span>
	                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
	                      </div>
	                      <div className="mt-2 flex gap-2">
	                        <button
	                          onClick={() => openView(upload)}
	                          className="px-3 py-1 text-sm font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors inline-flex items-center gap-2"
	                        >
	                          <QrCode className="h-4 w-4" />
	                          View
	                        </button>
	                        <Link to = {`channel-upload-edit/?id=${upload.id}`} >
	                          <button
	                            onClick={() => onEditClicks(upload.id, upload)}
	                            className="px-3 py-1 text-sm font-medium text-white bg-[#1a9bd7] rounded hover:bg-blue-600 transition-colors"
	                          >
	                            Edit
	                          </button>
	                        </Link>
	                      </div>
	                    </div>
	                  </div>
	                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    {(() => {
                      // Calculate visible page range
                      let startPage = Math.max(1, currentPage - 2);
                      let endPage = Math.min(startPage + 4, totalPages);
                      
                      // Adjust if near the end
                      if (endPage - startPage < 4) {
                        startPage = Math.max(1, endPage - 4);
                      }

                      return Array.from({ length: endPage - startPage + 1 }, (_, i) => (
                        <button
                          key={startPage + i}
                          onClick={() => handlePageChange(startPage + i)}
                          className={`px-4 py-2 rounded-md ${
                            currentPage === startPage + i 
                              ? "bg-[#1a9bd7] text-white" 
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                        >
                          {startPage + i}
                        </button>
                      ));
                    })()}

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar - Takes up 1/3 of the grid */}
          <div className="bg-[#f9f9f9] p-3 sm:p-4 md:p-6 rounded-lg flex flex-col w-full lg:w-[100%] h-full">
            {/* Recently Viewed Section */}
            <div className="flex-grow overflow-y-auto">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 sticky top-0 bg-[#f9f9f9] py-2 z-10">
                Recently viewed
              </h2>
              <div className="space-y-3 md:space-y-4 pr-1">
                {[
                  { title: "Jawan", lang: "Hindi, Telugu", views: "326k" },
                  { title: "Padmam", lang: "Hindi, Telugu", views: "326k" },
                  { title: "Animal", lang: "Hindi, Telugu", views: "326k" },
                  { title: "Jawan", lang: "Hindi, Telugu", views: "326k" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between w-full">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-lg mr-2 sm:mr-3 flex-shrink-0"></div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm sm:text-base truncate">{item.title}</h3>
                        <p className="text-gray-500 text-xs sm:text-sm truncate">{item.lang}</p>
                      </div>
                    </div>
                    <div className="text-green-600 font-semibold flex items-center flex-shrink-0 ml-2 text-xs sm:text-sm">
                      {item.views}
                      <TrendingUp className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Button */}
            <div className="mt-4 sm:mt-6 md:mt-8 flex-shrink-0 pt-40 ml-8 mr-5">
              <button
                onClick={onUploadClick}
                className="bg-[#1a9bd7] text-white p-4 sm:p-5 md:p-6 rounded-lg w-full flex flex-col items-center hover:bg-[#1689c0] transition-colors"
              >
                <div className="bg-[#1a9bd7] p-3 sm:p-4 mb-2 sm:mb-3 md:mb-4">
                  <img src="Upload.png" alt="Upload" className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12" />
                </div>
                <span className="text-lg sm:text-xl md:text-2xl font-bold">Upload</span>
              </button>
            </div>
	          </div>
	        </div>
	      </div>
	    </div>
      {viewUpload && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">Share Content</h3>
                <p className="text-xs text-gray-500 truncate">{viewUpload.title}</p>
              </div>
              <button
                onClick={closeView}
                className="p-2 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Short link</label>
                <div className="mt-1 flex gap-2">
                  <input
                    readOnly
                    value={resolveShortUrl(viewUpload.output_link)}
                    className="flex-1 border rounded px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      const url = resolveShortUrl(viewUpload.output_link)
                      if (url) copyToClipboard(url)
                    }}
                    className="px-3 py-2 text-sm font-medium text-white bg-[#1a9bd7] rounded hover:bg-blue-600 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                {resolveShortUrl(viewUpload.output_link) && (
                  <a
                    className="mt-2 block text-sm text-[#1a9bd7] hover:underline break-all"
                    href={resolveShortUrl(viewUpload.output_link)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open link
                  </a>
                )}
              </div>

              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="text-sm font-medium text-gray-700 mb-2">QR code</div>
                {viewLoading ? (
                  <div className="text-sm text-gray-600">Generating QR code...</div>
                ) : viewError ? (
                  <div className="text-sm text-red-600">{viewError}</div>
                ) : viewQrCode ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={viewQrCode}
                      alt="QR code"
                      className="w-56 h-56 object-contain bg-white p-2 rounded"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">No QR code available.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
