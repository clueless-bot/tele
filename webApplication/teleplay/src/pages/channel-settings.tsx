import React, { useState, useEffect, ChangeEvent } from "react";
import { Save, Camera, Bell, Lock, CreditCard, User } from "lucide-react";

// Define the type for profile data
interface ChannelProfile {
  id: number;
  name: string;
  user_id?: string;
  profile_image?: string;
  email: string;
  phoneNumber: string;
  createdAt?: string;
  username: string;
  // Add other fields if needed
}

export default function ChannelSettings() {
  const [activeTab, setActiveTab] = useState<"profile" | "account">("profile");
  const [profileData, setProfileData] = useState<ChannelProfile | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [profileImageDisplaySrc, setProfileImageDisplaySrc] = useState<string>("/default-avatar.png");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
      const raw = profileData?.profile_image;
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
  }, [profileData?.profile_image, baseURL]);
  // Prefetch channel profile data on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = getCookie("token");
        if (!token) {
          alert("Please login first");
          return;
        }
        const response = await fetch(`${import.meta.env.VITE_BASE_URL}/channel/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            // Avoid ngrok's browser warning HTML response (breaks JSON parsing)
            "ngrok-skip-browser-warning": "true",
          },
        });
        if (response.ok) {
          const data = await response.json();
          setProfileData(data.user);
          setProfileImageUrl(data.user?.profile_image || "");
          console.log("Profile Data1:", data.user);
        } else {
          console.error("Failed to fetch profile");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    }
    fetchProfile();
  }, []);

  // Password update handler
  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please fill out all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }
    try {
      const token = getCookie("token");
      if (!token) {
        alert('Please login first');
        return;
      }
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/channel/update-password`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        alert(data.error || "Failed to update password");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong.");
    }
  };

  // Cookie helper function
  function getCookie(name: string): string | undefined {
    const matches = document.cookie.match(
      new RegExp(
        "(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\/+^])/g, "\\$1") + "=([^;]*)"
      )
    );
    return matches ? decodeURIComponent(matches[1]) : undefined;
  }

  console.log("Profile Datadfsd: ", profileData);

  // Handle profile input changes
  const handleProfileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!profileData) return;
    const { id, value } = e.target;
    setProfileData({ ...profileData, [id]: value });
  };




  // Handle image file selection and preview
  const handleProfileImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);

      // Use blob URL only for preview, never send this to backend
      const previewUrl = URL.createObjectURL(file);
      setProfileData(prev => prev ? { ...prev, profile_image: previewUrl } : null);
    }
  };

	  // Save profile changes
  const handleSaveChanges = async () => {
    if (!profileData) return;
    const token = getCookie("token");
    let profile_image_url = profileImageUrl || profileData.profile_image;

    // Upload image if new one is selected
    if (profileImageFile) { 
      const formData = new FormData();
      formData.append("file", profileImageFile);

      const uploadRes = await fetch(`${import.meta.env.VITE_BASE_URL}/upload/profile-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true', },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        alert(errorData.message || "Image upload failed");
        return;
      }

      const uploadData = await uploadRes.json();
      profile_image_url = uploadData.url;
      setProfileImageUrl(profile_image_url);

      // Update local preview with real URL
      // setProfileData(data => data ? { ...data, profile_image: profile_image_url } : null);
      setProfileData(prev => {
        const updated = prev ? { ...prev, profile_image: profile_image_url } : null;
        console.log("Updated ProfileData:", updated);
        return updated;
      });
      
      console.log("Upload Response:", uploadData);
      console.log("Profile Data after upload:", profileData);
      console.log("Profile Image URL:", profile_image_url);
    }

    // Send PATCH request to update profile
    const response = await fetch(`${import.meta.env.VITE_BASE_URL}/channel/profile`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // Avoid ngrok's browser warning HTML response (breaks JSON parsing)
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        name: profileData.name,
        user_id: profileData.user_id,
        username: profileData.username,
        profile_image: profile_image_url, // ✅ Use the uploaded URL, not the blob
        phoneNumber: profileData.phoneNumber,
      }),
    });

    if (response.ok) {
      alert("Profile updated!");
      setProfileImageFile(null);
      window.dispatchEvent(
        new CustomEvent("teleplay:profile-updated", {
          detail: {
            name: profileData.name,
            username: profileData.username,
            user_id: profileData.user_id,
            profile_image: profile_image_url,
          },
        })
      );
      // setProfileImageFile(null); // Clear image input
    } else {
      const data = await response.json();
      alert(data.message || "Failed to update profile");
    }
  };

  
  return (
    <div className="flex-1 bg-white h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 md:p-8 pt-16 md:pt-8">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Channel Settings</h1>
        </header>

        {/* Settings Navigation Tabs */}
        <div className="mb-8 border-b">
          <div className="flex flex-wrap -mb-px">
            <button
              onClick={() => setActiveTab("profile")}
              className={`mr-4 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "profile"
                ? "border-[#1a9bd7] text-[#1a9bd7]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              <User className="inline-block mr-2 h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab("account")}
              className={`mr-4 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "account"
                ? "border-[#1a9bd7] text-[#1a9bd7]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              <Lock className="inline-block mr-2 h-4 w-4" />
              Account Security
            </button>
            {/* <button
              onClick={() => setActiveTab("notifications")}
              className={`mr-4 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "notifications"
                  ? "border-[#1a9bd7] text-[#1a9bd7]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Bell className="inline-block mr-2 h-4 w-4" />
              Notifications
            </button> */}
            {/* <button
              onClick={() => setActiveTab("payment")}
              className={`mr-4 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "payment"
                  ? "border-[#1a9bd7] text-[#1a9bd7]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <CreditCard className="inline-block mr-2 h-4 w-4" />
              Payment Methods
            </button> */}
          </div>
        </div>

        {/* Profile Settings */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg border">
                <div className="relative mb-4">

                  {/* <img
                    src={
                      profileData?.profile_image?.startsWith("blob:")
                        ? profileData.profile_image // Preview (blob)
                        : profileData?.profile_image || "/default-avatar.png" // Real URL or fallback
                    }
                    alt="Profile"
                    className="w-32 h-32 bg-gray-200 rounded-lg object-cover"
                  /> */}
<img
  src={profileImageDisplaySrc}
  alt="Profile"
  className="w-32 h-32 bg-gray-200 rounded-lg object-cover"
/>




                  <input
                    type="file"
                    accept="image/*"
                    id="profileImage"
                    style={{ display: "none" }}
                    onChange={handleProfileImageChange}
                  />
                  <button
                    className="absolute bottom-0 right-0 bg-[#1a9bd7] text-white p-2 rounded-full"
                    onClick={() => document.getElementById("profileImage")?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="text-lg font-medium">{profileData?.name || "channel name"}</h3>
                <p className="text-gray-500 text-sm">@{profileData?.username || "user_id"}</p>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Channel Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      placeholder="channel name"
                      value={profileData?.name || ""}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a9bd7] focus:border-[#1a9bd7]"
                    />
                  </div>
                  <div>
                    <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 mb-1">
                      User ID
                    </label>
                    <input
                      type="text"
                      id="user_id"
                      placeholder="user_id"
                      value={profileData?.username || ""}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a9bd7] focus:border-[#1a9bd7]"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="flex">
                      <div className="flex-grow">
                        <input
                          type="email"
                          id="email"
                          placeholder="example@gmail.com"
                          value={profileData?.email || ""}
                          onChange={handleProfileChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a9bd7] focus:border-[#1a9bd7]"
                        />
                      </div>
                      {/* <div className="ml-2">
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                          Verify
                        </button>
                      </div> */}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <div className="flex">
                      <div className="">
                        {/* <input
                          type="text"
                          id="countryCode"
                          placeholder="+91"
                          readOnly
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a9bd7] focus:border-[#1a9bd7]"
                        /> */}
                      </div>
                      <div className="flex-grow">
                        <input
                          type="tel"
                          id="phoneNumber"
                          placeholder="9876543210"
                          value={profileData?.phoneNumber || ""}
                          onChange={e => setProfileData(profileData ? {
                            ...profileData,
                            phoneNumber: e.target.value
                          } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a9bd7] focus:border-[#1a9bd7]"
                        />
                      </div>
                    </div>
                  </div>
                  {/* <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                      Channel Description
                    </label>
                    <textarea
                      id="bio"
                      rows={4}
                      placeholder="Write something about your channel..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a9bd7] focus:border-[#1a9bd7]"
                    />
                  </div> */}
                  <div className="pt-4">
                    <button
                      className="px-6 py-2 bg-[#1a9bd7] text-white rounded-md hover:bg-[#158bc3] flex items-center"
                      onClick={handleSaveChanges}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Security Settings */}
        {activeTab === "account" && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-6">Account Security</h2>
            <div className="space-y-6">
              <div className="pb-6 border-b">
                <h3 className="text-lg font-medium mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a9bd7] focus:border-[#1a9bd7]"
                    />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a9bd7] focus:border-[#1a9bd7]"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a9bd7] focus:border-[#1a9bd7]"
                    />
                  </div>
                  <div>
                    <button
                      onClick={handlePasswordUpdate}
                      className="px-6 py-2 bg-[#1a9bd7] text-white rounded-md hover:bg-[#158bc3]"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
              {/* <div className="pb-6 border-b">
                <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
                <p className="text-gray-600 mb-4">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>
                <button className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Enable 2FA</button>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-4">Delete Account</h3>
                <p className="text-gray-600 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete Account</button>
              </div> */}
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {/* {activeTab === "notifications" && ( ... )} */}

        {/* Payment Methods Settings */}
        {/* {activeTab === "payment" && ( ... )} */}
      </div>
    </div>
  );
}
