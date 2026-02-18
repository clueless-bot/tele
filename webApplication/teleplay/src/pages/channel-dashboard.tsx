import { useState, useEffect } from "react"
import {
  BarChart,
  Settings,
  MessageSquare,
  DollarSign,
  PieChart,
  Home,
  MoreHorizontal,
  TrendingUp,
  Menu,
  LogOut,
} from "lucide-react"
import ContentPage from "./content-page"
import ChannelEarn from "./channel-earn"
import ChannelSettings from "./channel-settings"
import ChannelFeedback from "./channel-feedback"
import ChannelProfile from "./channel-profile"
import ChannelUpload from "./channel-upload"
import ChannelUploadSuccess from "./channel-upload-success"
import ChannelUploadEdit from "./channel-upload-edit"
import ChannelAnalytics from "./channel-analytics"
import React from "react"
import Cookies from 'js-cookie'; // Using js-cookie library for cookie management
import { ToastContainer, toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

// Define the type for channel profile
interface ChannelProfileType {
  name?: string;
  username?: string;
  user_id?: string;
  profile_image?: string;
  // Add more fields if needed
}

// Add onSignOut prop to the component
export default function ChannelDashboard({ onSignOut }: { onSignOut?: () => void } = {}) {
  const allowedTabs = [
    "dashboard",
    "content",
    "analytics",
    "earn",
    "settings",
    "feedback",
    "profile",
    "upload",
  ] as const
  type AllowedTab = (typeof allowedTabs)[number]

  const [activeTab, setActiveTab] = useState<AllowedTab>(() => {
    try {
      const stored = localStorage.getItem("teleplay:dashboard-active-tab")
      if (stored && (allowedTabs as readonly string[]).includes(stored)) {
        return stored as AllowedTab
      }
    } catch {
      // ignore storage access issues (private mode, etc.)
    }
    return "dashboard"
  })
  const [sidebarOpen, setSidebarOpen] = useState(true) // Default open for desktop
  const [isMobile, setIsMobile] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [recentUploads, setRecentUploads] = useState([]);
  const adminId = Cookies.get('token'); // Assuming token is used as admin ID
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Calculate total pages and paginated uploads
  const totalPages = Math.ceil(uploads.length / itemsPerPage);
  const paginatedUploads = uploads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Channel profile state
  const [channelProfile, setChannelProfile] = useState<ChannelProfileType | null>(null);
  const [profileImageDisplaySrc, setProfileImageDisplaySrc] = useState<string>("/default-avatar.png");
  console.log(channelProfile?.profile_image)

  const baseURL: string = import.meta.env.VITE_BASE_URL || "http://localhost:9898";
  const resolveProfileImageSrc = (profileImage: string | undefined) => {
    if (!profileImage) return "/default-avatar.png";
    if (profileImage.startsWith("blob:")) return profileImage;

    const cacheBuster = `t=${Date.now()}`;

    try {
      const url = new URL(profileImage);
      url.searchParams.set("t", String(Date.now()));
      return url.toString();
    } catch {
      const url = new URL(profileImage.startsWith("/") ? profileImage : `/${profileImage}`, baseURL);
      url.search = url.search ? `${url.search}&${cacheBuster}` : `?${cacheBuster}`;
      return url.toString();
    }
  };

  const isNgrokBaseUrl = () => {
    try {
      const parsed = new URL(baseURL);
      return parsed.hostname.includes("ngrok");
    } catch {
      return baseURL.includes("ngrok");
    }
  };

  useEffect(() => {
    let cancelled = false;
    let objectUrlToRevoke: string | null = null;

    const loadForDisplay = async () => {
      const raw = channelProfile?.profile_image;
      const resolved = resolveProfileImageSrc(raw);

      if (!raw) {
        setProfileImageDisplaySrc("/default-avatar.png");
        return;
      }
      if (raw.startsWith("blob:") || raw.startsWith("data:")) {
        setProfileImageDisplaySrc(raw);
        return;
      }

      // If backend is behind ngrok, <img> can receive ngrok's warning HTML (can't set headers).
      // Fetch the image with the skip header and display it as a blob URL.
      if (isNgrokBaseUrl()) {
        try {
          const resp = await fetch(resolved, {
            headers: { "ngrok-skip-browser-warning": "true" },
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          if (!blob.type.startsWith("image/")) {
            throw new Error("Not an image response");
          }
          objectUrlToRevoke = URL.createObjectURL(blob);
          if (!cancelled) setProfileImageDisplaySrc(objectUrlToRevoke);
          return;
        } catch {
          // fall back to direct src below
        }
      }

      setProfileImageDisplaySrc(resolved);
    };

    loadForDisplay();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [channelProfile?.profile_image, baseURL]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<ChannelProfileType>>;
      if (!customEvent.detail) return;
      setChannelProfile((prev) => ({ ...(prev || {}), ...customEvent.detail }));
    };

    window.addEventListener("teleplay:profile-updated", handler);
    return () => window.removeEventListener("teleplay:profile-updated", handler);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("teleplay:dashboard-active-tab", activeTab)
    } catch {
      // ignore
    }
  }, [activeTab])
  // Fetch channel profile for sidebar
  useEffect(() => {
    async function fetchProfile() {
      try {
        // Get token from cookies
        function getCookie(name: string) {
          let matches = document.cookie.match(
            new RegExp(
              "(?:^|; )" +
              name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") +
              "=([^;]*)"
            )
          );
          return matches ? decodeURIComponent(matches[1]) : undefined;
        }
        const token = getCookie("token");
        if (!token) return;

        const response = await fetch(`${import.meta.env.VITE_BASE_URL}/channel/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            // Avoid ngrok's browser warning HTML response (breaks JSON parsing)
            "ngrok-skip-browser-warning": "true",
          },
        });
        if (response.ok) {
          const data = await response.json();
          setChannelProfile(data.user);
        }
      } catch (err) {
        // Optionally handle error
      }
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchUploads = async () => {
      try {
        setLoading(true);

        const token = Cookies.get("token");
        if (!token) {
          throw new Error("Please login first");
        }

        const response = await fetch(`${import.meta.env.VITE_BASE_URL}/admin/uploads`, {
          method: "GET",
          headers: {
            Authorization: `${token}`,
            // Avoid ngrok's browser warning HTML response (breaks JSON parsing)
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (!response.ok) {
          const contentType = response.headers.get("content-type") || "";
          const bodyText = await response.text().catch(() => "");
          if (contentType.includes("application/json")) {
            try {
              const errorData = JSON.parse(bodyText);
              throw new Error(errorData.message || "Failed to fetch uploads");
            } catch {
              // fall through to generic error below
            }
          }
          throw new Error(bodyText || `Failed to fetch uploads (HTTP ${response.status})`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const text = await response.text().catch(() => "");
          throw new Error(
            `Expected JSON but got ${contentType || "unknown"} (HTTP ${response.status}): ${text.slice(0, 120)}`
          );
        }

        const result = await response.json();
        if (result.success) {
          setUploads(result.data);
        } else {
          throw new Error(result.message || "Failed to fetch uploads");
        }
      } catch (err: any) {
        console.error("Error fetching uploads:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUploads();
  }, []);

  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)

      // Only auto-close on initial load or when switching to mobile
      if (mobile && !isMobile) {
        setSidebarOpen(false)
      } else if (!mobile && isMobile) {
        setSidebarOpen(true)
      }
    }

    // Initial check
    checkIfMobile()

    // Add event listener
    window.addEventListener("resize", checkIfMobile)

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [isMobile])

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  const handleUploadClick = () => {
    setActiveTab("upload")
    setUploadComplete(false)
    setIsEditing(false)
  }

  const handleUploadSuccess = () => {
    setUploadComplete(true)
    setIsEditing(false)
  }

  const handleEditUpload = () => {
    setIsEditing(true)
  }

  const handleUpdateSuccess = () => {
    setUploadComplete(true)
    setIsEditing(false)
  }

  // Add a handler for sign out
  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut()
    }
    // Close sidebar on mobile
    if (isMobile) {
      setSidebarOpen(false)
    }
    Cookies.remove('token'); // Replace 'user' with the name of your cookie
    try {
      localStorage.removeItem("teleplay:dashboard-active-tab")
    } catch {
      // ignore
    }
  }

  // Custom upload icon component to match the design
  const UploadIcon = () => (
    <svg
      width="36"
      height="36"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mb-1 sm:mb-2"
    >
      <path
        fill="white"
        d="M32 48V16M32 16L20 28M32 16L44 28"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M56 48V56H8V48" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return (
    <div className="w-full h-screen flex overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Mobile overlay - only visible when sidebar is open on mobile */}
      {sidebarOpen && isMobile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20" onClick={toggleSidebar} aria-hidden="true"></div>
      )}

      {/* Sidebar - absolute on mobile, fixed width on desktop */}
      <div
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } fixed md:relative w-[80%] sm:w-64 bg-[#1a9bd7] text-white transition-all duration-300 ease-in-out h-screen z-30 flex flex-col`}
      >
        {/* Close button for mobile
        {isMobile && (
          <button onClick={toggleSidebar} className="absolute top-4 right-4 text-white p-1 rounded-full md:hidden">
            <X size={20} />
          </button>
        )} */}

        <div className="p-4 sm:p-6 flex flex-col flex-1 overflow-y-auto">
          {/* Channel Profile */}
          <div className="mb-8 sm:mb-10">
            <div
              // onClick={() => {
              //   setActiveTab("profile")
              //   if (isMobile) setSidebarOpen(false)
              // }}
              className="text-left w-full cursor-pointer"
            >
              <div className="relative">
                <div
                  onClick={() => {
                    setActiveTab("settings")
                    if (isMobile) setSidebarOpen(false)
                  }}
                  className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-lg"
                >
                  <img
                    src={profileImageDisplaySrc}
                    alt="Profile"
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg"
                  />
                </div>
                {/* <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold">
                  4
                </div> */}
              </div>
              {/* Dynamically show channel name and username */}

              <h2 className="text-xl sm:text-2xl font-bold mt-3 sm:mt-4">
                {channelProfile?.name || "channel name"}
              </h2>
              <p className="text-xs sm:text-sm opacity-80">
                @{channelProfile?.username || "user_id"}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-4 sm:space-y-6 flex-grow">
            <button
              onClick={() => {
                setActiveTab("dashboard")
                if (isMobile) setSidebarOpen(false)
              }}
              className={`flex items-center text-base sm:text-xl font-semibold w-full text-left ${activeTab === "dashboard" ? "" : "opacity-70 hover:opacity-100"}`}
            >
              <Home className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Dashboard
            </button>
            <button
              onClick={() => {
                setActiveTab("content")
                if (isMobile) setSidebarOpen(false)
              }}
              className={`flex items-center text-base sm:text-xl font-semibold w-full text-left ${activeTab === "content" ? "" : "opacity-70 hover:opacity-100"}`}
            >
              <BarChart className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Content
            </button>
            <button
              onClick={() => {
                setActiveTab("analytics")
                if (isMobile) setSidebarOpen(false)
              }}
              className={`flex items-center text-base sm:text-xl font-semibold w-full text-left ${activeTab === "analytics" ? "" : "opacity-70 hover:opacity-100"}`}
            >
              <PieChart className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Analytics
            </button>
            <button
              onClick={() => {
                setActiveTab("earn")
                if (isMobile) setSidebarOpen(false)
              }}
              className={`flex items-center text-base sm:text-xl font-semibold w-full text-left ${activeTab === "earn" ? "" : "opacity-70 hover:opacity-100"}`}
            >
              <DollarSign className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Earn
            </button>
            <button
              onClick={() => {
                setActiveTab("settings")
                if (isMobile) setSidebarOpen(false)
              }}
              className={`flex items-center text-base sm:text-xl font-semibold w-full text-left ${activeTab === "settings" ? "" : "opacity-70 hover:opacity-100"}`}
            >
              <Settings className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Settings
            </button>
            <button
              onClick={() => {
                setActiveTab("feedback")
                if (isMobile) setSidebarOpen(false)
              }}
              className={`flex items-center text-base sm:text-xl font-semibold w-full text-left ${activeTab === "feedback" ? "" : "opacity-70 hover:opacity-100"}`}
            >
              <MessageSquare className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Send feedback
            </button>
          </nav>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="flex items-center text-base sm:text-xl font-semibold w-full text-left mt-6 opacity-70 hover:opacity-100 text-white"
          >
            <LogOut className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative h-screen overflow-hidden">
        {/* Mobile menu button - only visible when sidebar is closed on mobile */}
        <button
          onClick={toggleSidebar}
          className="absolute top-4 right-4 z-10 bg-white text-[#1a9bd7] rounded-full p-2 shadow-md md:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        {activeTab === "analytics" ? (
          <ChannelAnalytics />
        ) : activeTab === "content" ? (
          <ContentPage onUploadClick={handleUploadClick} />
        ) : activeTab === "earn" ? (
          <ChannelEarn />
        ) : activeTab === "settings" ? (
          <ChannelSettings />
        ) : activeTab === "feedback" ? (
          <ChannelFeedback />
        ) : activeTab === "profile" ? (
          <ChannelProfile />
        ) : activeTab === "upload" ? (
          isEditing ? (
            <ChannelUploadEdit onUpdateSuccess={handleUpdateSuccess} />
          ) : uploadComplete ? (
            <ChannelUploadSuccess onEditClick={handleEditUpload} />
          ) : (
            <ChannelUpload onUploadSuccess={handleUploadSuccess} />
          )
        ) : (
          <div className="bg-white h-screen flex flex-col overflow-y-auto">
            <div className="flex-1 p-4 md:p-0 ml-5">
              <div className="">
                {/* Dashboard Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 w-full h-full">
                  {/* Left content (2/3 on large screens) */}
                  <div className="lg:col-span-2">
                    <header className="mb-4 md:mb-8 pt-8 md:pt-0">
                      <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Channel dashboard</h1>
                      {/* <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">01 - 25 March, 2020</p> */}
                    </header>

                    {/* Chart */}
                    {/* <div className="mb-6 md:mb-10 bg-white p-3 md:p-4 rounded-lg shadow-sm">
                      <div className="h-24 md:h-32 flex items-end space-x-1">
                        {[20, 30, 15, 25, 20, 25, 15, 20, 30, 20, 25, 15, 20, 25, 20, 15, 30, 25, 40, 30].map(
                          (height, i) => (
                            <div
                              key={i}
                              className={`w-full rounded-t-sm ${i === 18 ? "bg-blue-500" : "bg-blue-200"}`}
                              style={{ height: `${height * 2}px` }}
                            ></div>
                          ),
                        )}
                      </div>
                    </div> */}

                    {/* Recently Viewed */}
                    <div className="mb-6 md:mb-8 bg-white p-3 md:p-6 rounded-lg shadow-sm">
                      {/* <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg md:text-xl font-semibold flex items-center">
                          Recently viewed
                          <TrendingUp className="ml-2 h-4 w-4" />
                        </h2>
                        <button>
                          <MoreHorizontal className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />
                        </button>
                      </div> */}

                      {/* <div className="space-y-4">
                        {[
                          { title: "Jawan", lang: "Hindi, telugu", views: "326k" },
                          { title: "animal", lang: "Hindi, telugu", views: "326k" },
                          { title: "mirzapur", lang: "Hindi, telugu", views: "326k" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                              <div className="w-10 h-10 md:w-16 md:h-16 bg-gray-200 rounded-lg mr-2 md:mr-4 flex-shrink-0"></div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-sm md:text-lg truncate">{item.title}</h3>
                                <p className="text-gray-400 text-xs md:text-sm truncate">{item.lang}</p>
                              </div>
                            </div>
                            <div className="text-green-500 font-semibold flex items-center flex-shrink-0 ml-2 text-xs md:text-base">
                              {item.views}
                              <TrendingUp className="ml-1 h-3 w-3 md:h-4 md:w-4" />
                            </div>
                          </div>
                        ))}
                      </div> */}
                    </div>

                    {/* Listed Content */}
                    <div className="bg-white p-3 md:p-6 rounded-lg shadow-sm mb-8">
                      {/* Header */}
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg md:text-xl font-semibold">Listed Content</h2>
                      </div>

                      {/* Content List */}
                      <div className="space-y-4">
                        {paginatedUploads.map((upload, index) => (
                          <div key={index} className="flex items-center">
                            <div className="w-10 h-10 md:w-16 md:h-16 bg-gray-200 rounded-lg mr-2 md:mr-4 flex-shrink-0">
                              <img src={upload.thumbnail} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-sm md:text-lg truncate">{upload.title}</h3>
                              <p className="text-gray-400 text-xs md:text-sm truncate">{upload.language}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Show More Button */}
                      <div className="mt-6 flex justify-center">
                        <button
                          onClick={() => setActiveTab('content')}
                          className="text-sm md:text-base font-medium text-[#1a9bd7] hover:underline transition"
                        >
                          Show More
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right content (1/3 on large screens) */}
                  <div className="mt-6 lg:mt-0 bg-[#f9f9f9] w-full h-full ">
                    {/* Traffic Source */}
                    <div className="mt-6 lg:mt-0 bg-[#f9f9f9] w-full h-full">
                      {/* <h2 className="text-lg md:text-xl font-semibold mb-4">Traffic source</h2> */}

                      {/* <div className="space-y-4">
                        {[
                          { country: "India", percentage: 20 },
                          { country: "Pakistan", percentage: 28 },
                          { country: "USA", percentage: 22.6 },
                          { country: "UK", percentage: 13.4 },
                          { country: "Other", percentage: 16 },
                        ].map((item, i) => (
                          <div key={i}>
                            <div className="flex justify-between mb-1">
                              <span className="font-medium text-gray-800 text-xs md:text-base">{item.country}</span>
                              <span className="font-medium text-gray-800 text-xs md:text-base">{item.percentage}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#2ecc71] rounded-full"
                                style={{ width: `${item.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div> */}
                      {/* Upload Button */}
                      <div className="mt-4 sm:mt-6 md:mt-8 flex-shrink-0 pt-40 ml-8 mr-5">
                        <button
                          onClick={handleUploadClick}
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
