import { useState, useEffect } from "react"
import HomeScreen from "./home-screen"
import React from "react"
import ChannelDashboard from "./channel-dashboard"
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

export default function ChannelLogin() {
  const [currentScreen, setCurrentScreen] = useState("home")
  const [activeTab, setActiveTab] = useState("dashboard")
  const [timeLeft, setTimeLeft] = useState(60)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Navigation functions
  const goToHome = () => setCurrentScreen("home")
  const goToLogin = () => setCurrentScreen("login")
  const goToCreateAccount = () => setCurrentScreen("create-account")
  const goToCreateChannel = () => {
    setTimeLeft(60) // Reset timer when re-entering "Create Channel"
    setCurrentScreen("create-channel")
  }
  const goToForgotPassword = () => setCurrentScreen("forgot-password")
  const goToForgotPasswordOTP = () => {
    setTimeLeft(60) // Reset timer when OTP page opens
    setCurrentScreen("forgot-password-otp")
  }
  const goToResetPassword = () => setCurrentScreen("reset-password")
  const goToDashboard = () => {
    setCurrentScreen("dashboard")
    setActiveTab("dashboard")
  }

  // OTP Timer
  useEffect(() => {
    if ((currentScreen !== "create-channel" && currentScreen !== "forgot-password-otp") || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [currentScreen, timeLeft])

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Content page component
  

  const toggleSidebar = () => setSidebarExpanded(!sidebarExpanded)
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)

  const cookies = document.cookie;
  const userCookieExists = cookies.includes('token'); // Replace 'user=' with your cookie name

  return (
<div>
      {!userCookieExists ? <HomeScreen /> : <ChannelDashboard />}
      
      </div>
  )
}

