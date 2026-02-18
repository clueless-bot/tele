import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import React, { useState, useRef, useEffect } from "react";
import { ImageIcon } from "lucide-react";

interface ChannelUploadProps {
  uploadId: string; // <-- Pass the upload ID to edit
  onUploadSuccess?: () => void;
}

function getCookie(name: string): string | undefined {
  const matches = document.cookie.match(
    new RegExp(
      "(?:^|; )" +
      name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") +
      "=([^;]*)"
    )
  );
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

export default function ChannelUpload({
  uploadId,
  onUploadSuccess,
}: ChannelUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    inputLink: "",
    language: "",
    description: "",
    tags: "",
  });

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const uploadid = urlParams.get('id');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefetch upload data for edit
  useEffect(() => {
    const token = getCookie("token");
    if (!uploadid || !token) return;

    fetch(`${import.meta.env.VITE_BASE_URL}/uploads/${uploadid}`, {
      method: "GET",
      headers: { Authorization: token },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch upload data");
        return res.json();
      })
      .then((data) => {
        if (data && data.data) {
          setFormData({
            title: data.data.title || "",
            inputLink: data.data.input_link || "",
            language: data.data.language || "",
            description: data.data.description || "",
            tags: data.data.tags || "",
          });
          setSelectedLanguage(data.data.language || "");
          // If thumbnail is served as a URL, set preview
          if (data.data.thumbnail) {
            setThumbnailPreview(
              typeof data.data.thumbnail === "string"
                ? data.data.thumbnail
                : null
            );
          }
        }
      })
      .catch((err) => {
        alert(err.message || "Could not load upload data.");
      });
    // eslint-disable-next-line
  }, []);

  // Dropdown change handler
  const handleInputChangeDropDown = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedLanguage(event.target.value);
  };

  // Drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Drop event
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setThumbnailFile(e.dataTransfer.files[0]);
      setThumbnailPreview(URL.createObjectURL(e.dataTransfer.files[0]));
    }
  };

  // File input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnailFile(e.target.files[0]);
      setThumbnailPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Form field change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !formData.title ||
      !selectedLanguage ||
      !formData.inputLink
    ) {
      toast.warning("Please fill out all required fields.");
      return;
    }

    const token = getCookie("token");
    if (!token) {
      toast.error("Authentication required.");
      return;
    }

    try {
      const formDataToSend = new FormData();
      if (thumbnailFile) {
        formDataToSend.append("thumbnail", thumbnailFile);
      }
      formDataToSend.append("title", formData.title);
      formDataToSend.append("input_link", formData.inputLink);
      formDataToSend.append("language", selectedLanguage);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("tags", formData.tags);

      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/content/uploadPost/${uploadid}`,
        {
          method: "PATCH",
          headers: { Authorization: token },
          body: formDataToSend,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update content.");
      }

      toast.success("Content updated successfully!");
      if (onUploadSuccess) onUploadSuccess();
    } catch (error: any) {
      toast.warning(error.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="bg-white w-full h-full overflow-y-auto">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
            <div className="flex items-center">
              <div className="mr-3 sm:mr-4">
                <img
                  src="/public/UploadBlack.png"
                  className="h-[45px] sm:h-[65px]"
                  alt="Upload icon"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">
                Edit Upload
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Left Column - Thumbnail, Title, Input Link */}
              <div className="space-y-4">
                <label className="block text-lg sm:text-xl font-medium text-gray-700">
                  Thumbnail
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg h-36 sm:h-48 flex flex-col items-center justify-center cursor-pointer bg-gray-50 ${dragActive
                      ? "border-[#1a9bd7] bg-blue-50"
                      : "border-gray-300"
                    }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {/* <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mb-2" />
                  <p className="text-sm sm:text-base text-gray-500">
                    Upload Thumbnail
                  </p> */}
                  <input
                    type="file"
                    id="thumbnail-upload"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {thumbnailPreview && (
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                </div>

                <div className="mt-6 sm:mt-8">
                  <label
                    htmlFor="title"
                    className="block text-lg sm:text-xl font-medium text-gray-700"
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    placeholder="Enter Title"
                    className="mt-2 w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700 text-sm sm:text-base"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="inputLink"
                    className="block text-lg sm:text-xl font-medium text-gray-700"
                  >
                    Input Link
                  </label>
                  <input
                    type="text"
                    id="inputLink"
                    placeholder="Input Link"
                    className="mt-2 w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700 text-sm sm:text-base"
                    value={formData.inputLink}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              {/* Right Column - Language, Description, Tags */}
              <div className="space-y-4">
                <label className="block text-lg sm:text-xl font-medium text-gray-700">
                  Language
                </label>
                <select
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700 text-sm sm:text-base"
                  value={selectedLanguage}
                  onChange={handleInputChangeDropDown}
                  required
                >
                  <option value="">Video Language</option>
                  <option value="hindi">Hindi</option>
                  <option value="english">English</option>
                  <option value="telugu">Telugu</option>
                  <option value="tamil">Tamil</option>
                  <option value="punjabi">Punjabi</option>
                  <option value="other">Other</option>
                </select>

                <div className="mt-6 sm:mt-8">
                  <label
                    htmlFor="description"
                    className="block text-lg sm:text-xl font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={5}
                    placeholder="Enter video description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="mt-2 w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700 resize-none text-sm sm:text-base"
                  />
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="tags"
                    className="block text-lg sm:text-xl font-medium text-gray-700"
                  >
                    Tags
                  </label>
                  <input
                    type="text"
                    id="tags"
                    placeholder="Add tags separated by commas"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="mt-2 w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700 text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-center sm:justify-end mt-8">
              <button
                type="submit"
                className="bg-[#1a9bd7] text-white px-8 sm:px-12 py-2.5 sm:py-3 rounded-lg text-base sm:text-xl font-semibold hover:bg-[#1689c0] transition-colors uppercase w-full sm:w-auto"
              >
                Update Upload
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
