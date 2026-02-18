import { Camera } from "lucide-react"
import React from "react"

export default function ChannelProfile() {
  return (
    <div className="bg-white h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <header className="mb-12">
            <h1 className="text-4xl font-bold text-gray-800">Channel Profile</h1>
          </header>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile Image */}
            <div className="w-full md:w-1/3 flex justify-center">
              <div className="relative">
                <div className="w-48 h-48 bg-gray-200 rounded-lg"></div>
                <button className="absolute bottom-2 right-2 bg-[#1a9bd7] text-white p-2 rounded-full">
                  <Camera className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Profile Information */}
            <div className="w-full md:w-2/3">
              <form className="space-y-6">
                {/* Channel Name */}
                <div className="space-y-2">
                  <label htmlFor="channelName" className="block text-lg font-medium text-gray-700">
                    Your Channel Name
                  </label>
                  <input
                    type="text"
                    id="channelName"
                    placeholder="Movies link"
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700"
                  />
                </div>

                {/* User ID */}
                <div className="space-y-2">
                  <label htmlFor="userId" className="block text-lg font-medium text-gray-700">
                    Your Used ID
                  </label>
                  <input
                    type="text"
                    id="userId"
                    placeholder="@Movies_link"
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700"
                  />
                </div>

                {/* Gmail */}
                <div className="space-y-2">
                  <label htmlFor="gmail" className="block text-lg font-medium text-gray-700">
                    Your Gmail
                  </label>
                  <input
                    type="email"
                    id="gmail"
                    placeholder="Movieslink234@gmail.com"
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label htmlFor="phoneNumber" className="block text-lg font-medium text-gray-700">
                    Your Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    placeholder="+91 0123456789"
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700"
                  />
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="bg-[#1a9bd7] text-white px-12 py-3 rounded-lg text-xl font-semibold hover:bg-[#1689c0] transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

