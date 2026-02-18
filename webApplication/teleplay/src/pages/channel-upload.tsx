import React, { useState, useRef, useEffect } from "react";
import { Video, ImageIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom"
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
interface ChannelUploadProps {
  onUploadSuccess?: () => void;
}

export default function ChannelUpload({ onUploadSuccess }: ChannelUploadProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const [dragActive, setDragActive] = useState(false);
  // const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null); // To store the file object
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null); // To store the image URL for preview

  const [selectedLanguage, setSelectedLanguage] = useState("");
  function getCookie(name) {
    // Create a RegExp to match the cookie name
    let matches = document.cookie.match(
      new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)")
    );
    // Return the decoded cookie value or undefined if not found
    return matches ? decodeURIComponent(matches[1]) : undefined;
  }
  
  // Example usage:
  const token = getCookie("token");
  // console.log("Token:", token);


  const handleInputChangeDropDown = (event) => {
    setSelectedLanguage(event.target.value);
  };
  const [formData, setFormData] = useState({
    thumbnail: "",
    title: "",
    inputLink: "",
    language: "",
    description: "",
    tags: "",
  });

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setThumbnailFile(e.dataTransfer.files[0]);
      console.log("Thumbnail file dropped:", e.dataTransfer.files[0]);
    }
  };

  // Handle file selection
  const handleFileChange1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnailFile(e.target.files[0]);
      console.log("Thumbnail file selected:", e.target.files[0]);
    }

    // const file = e.target.files[0];
    // setThumbnailFile(file);


  };

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files ? e.target.files[0] : null;
  
      if (file) {
        setThumbnailFile(file); // Store the file object
        const filePreviewUrl = URL.createObjectURL(file); // Create a preview URL for the file
        setThumbnailPreview(filePreviewUrl); // Store the preview URL for displaying the image
        console.log("Thumbnail file selected:", file); // Log the file object
      }
    };
  

  // Handle form field changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Handle form submission
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  
  //   // Basic validation
  //   if (!formData.title || !selectedLanguage || !formData.inputLink || !thumbnailFile) {
  //     alert("Please fill out all required fields and upload a thumbnail.");
  //     return;
  //   }
  
  //   try {
  //     const formDataToSend = new FormData();
  //     // formDataToSend.append("admin_id", "66"); // Replace with dynamic value
  //     // formDataToSend.append("customer_id", "7"); // Replace with dynamic value
  //     formDataToSend.append("thumbnail", thumbnailFile); // File object
  //     formDataToSend.append("title", formData.title);
  //     formDataToSend.append("input_link", formData.inputLink);
  //     formDataToSend.append("language", selectedLanguage);
  //     formDataToSend.append("description", formData.description);
  //     formDataToSend.append("tags", formData.tags);
  //     formDataToSend.append("output_link", ""); // Optional field
  
  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault(); // Prevents page reload[3][4]
  
    // Basic validation
    if (!formData.title || !selectedLanguage || !formData.inputLink || !thumbnailFile) {
      toast.error("Please fill out all required fields and upload a thumbnail.");
      return;
    }
  
    try {
      
      // console.log(FormData)
      const formDataToSend = new FormData();
      if (token) formDataToSend.append("admin_id", token);
      formDataToSend.append("thumbnail", thumbnailFile);
      formDataToSend.append("title", formData.title);
      formDataToSend.append("input_link", formData.inputLink);
      formDataToSend.append("language", selectedLanguage);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("tags", formData.tags);
      formDataToSend.append("output_link", "");
  
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`${key}:`, value);
      }
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/content/uploadPost`, {
        method: "POST",
        body: formDataToSend,
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error response:", errorText);
        throw new Error("Failed to upload content.");
      }
  
      const data = await response.json();
      console.log("Upload successful:", data);
  
      toast.success("Content uploaded successfully!");
      // alert("Content uploaded successfully!");
      // Optionally, reset the form fields here (but do not navigate)
      setFormData({
        thumbnail: "",
        title: "",
        inputLink: "",
        language: "",
        description: "",
        tags: "",
      });
      setThumbnailFile(null);
      setSelectedLanguage("");
      // Do NOT call any navigation/redirect here.
      // navigate(`/channel-upload-success/${data.id}`)
      navigate(`/channel-upload-success?link=${encodeURIComponent(data.shortUrl)}`);

  
    } catch (error) {
      console.error("Error uploading content:", error);
      toast.warning("Something went wrong. Please try again.");
    }
  };


  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  
  //   // Basic validation
  //   if (!formData.title || !selectedLanguage || !formData.inputLink || !thumbnailFile) {
  //     alert("Please fill out all required fields and upload a thumbnail.");
  //     return;
  //   }
  
  //   try {
  //     const formDataToSend = new FormData();
  //     formDataToSend.append("admin_id", "66"); // Replace with dynamic admin ID
  //     formDataToSend.append("customer_id", "7"); // Replace with dynamic customer ID
  //     formDataToSend.append("thumbnail", thumbnailFile); // File object
  //     formDataToSend.append("title", formData.title);
  //     formDataToSend.append("input_link", formData.inputLink);
  //     formDataToSend.append("language", selectedLanguage);
  //     formDataToSend.append("description", formData.description);
  //     formDataToSend.append("tags", formData.tags);
  //     formDataToSend.append("output_link", ""); // Optional field
  
  //     // Send POST request to server
  //     const response = await fetch("http://localhost:9898/content/uploadPost", {
  //       method: "POST",
  //       body: formDataToSend,
  //     });
  
  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       console.error("Server error response:", errorText);
  //       throw new Error("Failed to upload content.");
  //     }
  
  //     const data = await response.json();
  //     console.log("Upload successful:", data);
  
  //     alert("Content uploaded successfully!");
  //   } catch (error) {
  //     console.error("Error uploading content:", error);
  //     alert("Something went wrong. Please try again.");
  //   }
  // };
  

  const fileInputRef = useRef<HTMLInputElement>(null);

  

  return (
    <div className="bg-white w-full h-full overflow-y-auto">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:p-8">
          {/* Header - Responsive layout for the header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
            <div className="flex items-center">
              <div className="mr-3 sm:mr-4">
                {/* <UploadIcon className="h-8 w-8 sm:h-10 sm:w-10 text-black" /> */}
                <img src="UploadBlack.png" className="h-[45px] sm:h-[65px]" alt="Upload icon" />


              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">Upload</h1>
            </div>
            {/* <button className="bg-[#1a9bd7] text-white px-3 py-2 sm:px-4 sm:py-2 rounded-full flex items-center justify-center sm:justify-start w-full sm:w-auto">
              <Video className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="font-semibold text-sm sm:text-base">Add video</span>
            </button> */}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Left Column - Thumbnail */}
              <div className="space-y-4">
                <label className="block text-lg sm:text-xl font-medium text-gray-700">Thumbnail</label>
                <div
                  className={`
                    w-56 h-52
                    border-2 border-dashed rounded-lg 
                    flex items-center justify-center cursor-pointer 
                    bg-gray-50 
                    overflow-hidden
                    ${dragActive ? "border-[#1a9bd7] bg-blue-50" : "border-gray-300"}
                  `}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("thumbnail-upload")?.click()}
                 >
	                  <img
	                    src={thumbnailPreview || "/default-avatar.png"}
	                    alt="Upload Thumbnail"
	                    className="w-full h-full object-cover rounded-md"
	                  />

                  <input
                    type="file"
                    id="thumbnail-upload"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>


                {/* Title */}
                <div className="mt-6 sm:mt-8">
                  <label htmlFor="title" className="block text-lg sm:text-xl font-medium text-gray-700">
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

                {/* Input Link */}
                <div className="mt-4">
                  <label htmlFor="inputLink" className="block text-lg sm:text-xl font-medium text-gray-700">
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

              {/* Right Column - Language and other options */}
              <div className="space-y-4">
                <label className="block text-lg sm:text-xl font-medium text-gray-700">Language</label>
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

                {/* Additional fields can be added here */}
                <div className="mt-6 sm:mt-8">
                  <label htmlFor="description" className="block text-lg sm:text-xl font-medium text-gray-700">
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
                  <label htmlFor="tags" className="block text-lg sm:text-xl font-medium text-gray-700">
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

            {/* Upload Button */}
            <div className="flex justify-center sm:justify-end mt-8">
              <button
                type="submit"
                onSubmit={handleSubmit}
                
                className="bg-[#1a9bd7] text-white px-8 sm:px-12 py-2.5 sm:py-3 rounded-lg text-base sm:text-xl font-semibold hover:bg-[#1689c0] transition-colors uppercase w-full sm:w-auto"
               >
                Upload
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
