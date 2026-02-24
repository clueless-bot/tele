import { useState, useEffect } from "react";
import ChannelDashboard from "./channel-dashboard";
import React from "react";
import emailjs from "@emailjs/browser";
import Cookies from "js-cookie";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function HomeScreen() {
  const [formData, setFormData] = useState({
    channelName: "",
    username: "",
    gmail: "",
    phoneNumber: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loginData, setLoginData] = useState({
    userId: "",
    password: "",
  });

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordOtp, setforgotPasswordOtp] = useState("");
  const [pass1, setpass1] = useState("");
  const [pass2, setpass2] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [currentScreen, setCurrentScreen] = useState("home");
  const [timeLeft, setTimeLeft] = useState(60);

  // Generate OTP function
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Send OTP via email
  const sendEmail = async () => {
    if (!forgotPasswordEmail) {
      toast.error("Please enter a valid email.");
      return;
    }

    const otp = generateOTP(); // Generate a dynamic OTP

    const template_params = {
      to_email: forgotPasswordEmail, // Email entered by the user
      otp: otp,
    };
    //Forgot Password OTP 
    emailjs
      .send("service_lghivl5", "template_l2zrlw1", template_params, "E7SBsgZVS-99Rj3WP")
      .then((response) => {
        console.log("Email sent successfully:", response);
        setTimeLeft(60);
        setCurrentScreen("forgot-password-otp");
      })
      .catch((error) => {
        console.error("Error sending email:", error);
        toast.error("Failed to send OTP. Please try again.");
      });

    const response = await fetch(`${import.meta.env.VITE_BASE_URL}/channel/forgotpassword`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: forgotPasswordEmail,
        otp: otp
      }),
    });

  };

  // Handle form field changes
  const handleCreateChannelChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.id]: e.target.value });
  };

  // Handle account creation
  const handleCreateChannel = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (!formData.channelName || !formData.gmail || !formData.phoneNumber || !formData.newPassword) {
      toast.warning("Please fill in all fields.");
      return;
    }

    const otp = generateOTP();
    setGeneratedOtp(otp);

    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/channel/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.channelName,
          email: formData.gmail,
          phoneNumber: formData.phoneNumber,
          password: formData.newPassword,
          otp: otp,
          username: formData.username,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const template_params = {
          to_email: formData.gmail,
          otp: otp,
        };
        emailjs
          .send("service_lghivl5", "template_l2zrlw1", template_params, "E7SBsgZVS-99Rj3WP")
          .then(() => {
            setTimeLeft(60);
            setCurrentScreen("email-verification");
            toast.success("OTP sent to your email.");
          })
          .catch((error) => {
            console.error("Error sending email:", error);
            toast.warning("Failed to send OTP email.");
          });
      } else {
        toast.error(data.message || "Error creating account.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong.");
    }
  };

  // Resend OTP function
  const resendOTP = () => {
    const otp = generateOTP();
    setGeneratedOtp(otp);
    setTimeLeft(60);

    const template_params = {
      to_email: formData.gmail,
      otp: otp,
    };

    emailjs
      .send("service_lghivl5", "template_l2zrlw1", template_params, "E7SBsgZVS-99Rj3WP")
      .then(async () => {
        await fetch(`${import.meta.env.VITE_BASE_URL}/channel/forgotpassword`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.gmail,
            otp,
          }),
        });
        toast.success("OTP resent to your email.");
      })
      .catch(() => {
        toast.error("Failed to resend OTP.");
      });
  };

  // Handle user login
  const handleLogin = async () => {
    if (!loginData.userId || !loginData.password) {
      toast.error("Please enter both User ID and Password.");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/channel/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginData.userId,
          password: loginData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Cookies.set("token", data.token, { expires: 7 });
        console.log(data.token); // ✅ This should be a real token
        goToDashboard();
      }
      else {
        toast.warning(data.message || "Invalid credentials. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.warning("Something went wrong. Please try again later.");
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    console.log("Sign out handler called in HomeScreen");
    Cookies.remove("token"); // Remove the token cookie
    setCurrentScreen("login");
  };


  const Back = async () => {
    setCurrentScreen("home");
  }

  // Navigation functions
  const goToHome = async () => {
    if (pass1 == pass2) {
      console.log("password matched")

    } else {
      console.log("password mismatched")
      return;

    }
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/updatePassword`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: forgotPasswordEmail,
          password: pass1
        }),
      });
      if (response.status == 200) {
        setCurrentScreen("home");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong.");
    }
  }


  const goToLogin = () => setCurrentScreen("login");
  const goToCreateAccount = () => setCurrentScreen("create-account");

  const goToForgotPassword = () => {
    setCurrentScreen("forgot-password");
  }
  
  const goToForgotPasswordOTP = () => {
    setTimeLeft(60);
    setCurrentScreen("forgot-password-otp");
  };

  const goToResetPassword = async () => {

    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/otpVerification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: forgotPasswordEmail,
          otp: forgotPasswordOtp
        }),
      });
      if (response.status == 200) {
        setCurrentScreen("reset-password");
        toast.success("otp verification success")
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong.");
    }
  }

  const handleVerifyEmailOTP = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/otpVerification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.gmail,
          otp: emailOtp,
        }),
      });
      if (response.status == 200) {
        toast.success("otp verification success")
        setCurrentScreen("login");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong.");
    }
  };

  const goToDashboard = () => setCurrentScreen("dashboard");

  // OTP timer effect
  useEffect(() => {
    if (
      (currentScreen !== "create-channel" &&
        currentScreen !== "forgot-password-otp" &&
        currentScreen !== "email-verification") ||
      timeLeft <= 0
    )
      return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentScreen, timeLeft]);

  // Format countdown timer
  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };




  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a9bd7]">
      <ToastContainer position="top-right" autoClose={3000} />
      {currentScreen !== "dashboard" ? (
        <div className="w-full max-w-md rounded-lg bg-[#a7d8eb] p-6">
          <div className="flex flex-col items-center">
            {/* Back Button */}
            <div className="mb-2 self-start">
              <button onClick={Back} aria-label="Go back">
                <img src="/Backbutton.png" alt="Back" className="h-8 w-8" />
              </button>
            </div>

            {/* Header */}
            <div className="mb-10 mt-6 flex items-center justify-center">
              <img src="/Channelicon.png" alt="Channel Icon" className="h-8 w-8" />
              <span className="ml-2 text-xl font-medium">
                {
                  {
                    home: "Channel",
                    login: "Login Account",
                    "create-account": "Create Account",
                    "email-verification": "Verify Email",
                    "create-channel": "Create Channel",
                    "forgot-password": "Forgot Password!",
                    "forgot-password-otp": "Forget Password!",
                    "reset-password": "Forget Password!",
                  }[currentScreen]
                }
              </span>
            </div>

            {/* Home Screen */}
            {currentScreen === "home" && (
              <div className="w-full lg:h-[250px] space-y-4 flex flex-col justify-center items-center">
                <button
                  className="w-full rounded-full bg-[#1a9bd7] hover:bg-[#6aa0b9] py-3 text-center font-bold text-white"
                  onClick={goToLogin}
                >
                  LOGIN
                </button>

                <button
                  className="w-full rounded-full bg-[#1a9bd7] hover:bg-[#6aa0b9] py-3 text-center font-bold text-white"
                  onClick={goToCreateAccount}
                >
                  CREATE CHANNEL
                </button>
              </div>
            )}

            {/* Login Screen */}
            {currentScreen === "login" && (
              <div className="w-full space-y-4">
                {/* User ID Input */}
                <input
                  id="userId"
                  type="text"
                  placeholder="Enter User ID"
                  className="w-full rounded-md bg-[#e6f4f9] px-4 py-2 text-gray-900"
                  value={loginData.userId}
                  onChange={handleLoginChange}
                />

                {/* Password Input */}
                <input
                  id="password"
                  type="password"
                  placeholder="Enter Password"
                  className="w-full rounded-md bg-[#e6f4f9] px-4 py-2 text-gray-900"
                  value={loginData.password}
                  onChange={handleLoginChange}
                />

                {/* Forgot Password Link */}
                <div className="flex justify-end">
                  <button onClick={goToForgotPassword} className="text-sm hover:text-red-500">
                    Forgot Password?
                  </button>
                </div>

                {/* Login Button */}
                <button
                  onClick={handleLogin}
                  className="mt-4 w-full rounded-full bg-[#1a9bd7] hover:bg-[#6aa0b9] py-3 text-center font-bold text-white"
                >
                  LOGIN
                </button>
              </div>
            )}

            {/* Create Account Screen */}
            {currentScreen === "create-account" && (
              <div className="w-full space-y-2">
                <input
                  id="channelName"
                  type="text"
                  placeholder="Channel Name"
                  value={formData.channelName}
                  onChange={handleCreateChannelChange}
                  className="w-full rounded-md bg-[#e6f4f9] px-3 py-1 text-gray-900"
                />
                <input
                  id="username"
                  type="username"
                  placeholder="Enter Username"
                  className="w-full rounded-md bg-[#e6f4f9] px-3 py-1 text-gray-900"
                  value={formData.username}
                  onChange={handleCreateChannelChange}
                />
                <input
                  id="gmail"
                  type="email"
                  placeholder="Enter Gmail"
                  className="w-full rounded-md bg-[#e6f4f9] px-3 py-1 text-gray-900"
                  value={formData.gmail}
                  onChange={handleCreateChannelChange}
                />

                {/* <div className="flex space-x-2">
                  <input
                    id="countryCode"
                    type="text"
                    placeholder="+91"
                    className="w-1/3 rounded-md bg-[#e6f4f9] px-3 py-1 text-gray-900"
                  /> */}

                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter Phone Number"
                  className="w-full rounded-md bg-[#e6f4f9] px-3 py-1 text-gray-900"
                  value={formData.phoneNumber}
                  onChange={handleCreateChannelChange}
                />
                {/* </div> */}

                <input
                  id="newPassword"
                  type="password"
                  placeholder="Password"
                  className="w-full rounded-md bg-[#e6f4f9] px-3 py-1 text-gray-900"
                  value={formData.newPassword}
                  onChange={handleCreateChannelChange}
                />

                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  className="w-full rounded-md bg-[#e6f4f9] px-3 py-1 text-gray-900"
                  value={formData.confirmPassword}
                  onChange={handleCreateChannelChange}
                />

                <button
                  onClick={handleCreateChannel}
                  className="mt-4 w-full rounded-full bg-[#1a9bd7] hover:bg-[#6aa0b9] py-3 text-center font-bold text-white"
                >
                  Create
                </button>
              </div>
            )}

            {/* Email Verification Screen */}
            {currentScreen === "email-verification" && (
              <div className="w-full space-y-6">
                <p className="text-center">OTP Sent to your Email</p>
                <p className="text-center font-medium">{formData.gmail}</p>

                <input
                  id="emailOtp"
                  type="text"
                  placeholder="Enter OTP"
                  className="w-full rounded-md bg-[#e6f4f9] px-4 py-2 text-gray-900"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  maxLength={6}
                />

                <p className="text-center">Time {formatTime()}</p>

                <div className="text-center">
                  <button
                    onClick={resendOTP}
                    disabled={timeLeft > 0}
                    className="text-sm text-[#1a9bd7] hover:underline disabled:text-gray-400"
                  >
                    Resend OTP
                  </button>
                </div>

                <button
                  onClick={handleVerifyEmailOTP}
                  className="mt-4 w-full rounded-full bg-[#1a9bd7] hover:bg-[#6aa0b9] py-3 text-center font-bold text-white"
                >
                  Verify & Create Account
                </button>
              </div>
            )}

            {/* Forgot Password Screen - Only Gmail field */}
            {currentScreen === "forgot-password" && (
              <div className="w-full space-y-4">
                <input
                  id="forgotGmail"
                  type="email"
                  placeholder="Enter Gmail"
                  className="w-full rounded-md bg-[#e6f4f9] px-4 py-2 text-gray-900"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                />

                <button
                  // onClick={goToForgotPasswordOTP}
                  onClick={sendEmail}
                  className="mt-4 w-full rounded-full bg-[#1a9bd7] hover:bg-[#6aa0b9] py-3 text-center font-bold text-white"
                >
                  Next
                </button>
              </div>
            )}

            {/* Forgot Password OTP Verification */}
            {currentScreen === "forgot-password-otp" && (
              <div className="w-full space-y-6">
                <p className="text-center">OTP Sent to your Email</p>

                <input
                  id="forgotOtp"
                  type="text"
                  placeholder="Enter OTP"
                  className="w-full rounded-md bg-[#e6f4f9] px-4 py-2 text-gray-900"
                  value={forgotPasswordOtp}
                  onChange={(e) => setforgotPasswordOtp(e.target.value)}
                />

                <p className="text-center">Time {formatTime()}</p>

                <button
                  onClick={goToResetPassword}
                  className="mt-4 w-full rounded-full bg-[#1a9bd7] hover:bg-[#6aa0b9] py-3 text-center font-bold text-white"
                >
                  Verify
                </button>
              </div>
            )}

            {/* Reset Password Screen */}
            {currentScreen === "reset-password" && (
              <div className="w-full space-y-4">
                <div className="space-y-1">
                  <label htmlFor="newPassword" className="block text-sm font-medium">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="Enter Password"
                    className="w-full rounded-md bg-[#e6f4f9] px-4 py-2 text-gray-900"
                    value={pass1}
                    onChange={(e) => setpass1(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Enter Confirm Password"
                    className="w-full rounded-md bg-[#e6f4f9] px-4 py-2 text-gray-900"
                    value={pass2}
                    onChange={(e) => setpass2(e.target.value)}
                  />
                </div>

                <button
                  onClick={goToHome}
                  className="mt-4 w-full rounded-full bg-[#1a9bd7] hover:bg-[#6aa0b9] py-3 text-center font-bold text-white"
                >
                  Reset Password
                </button>
              </div>
            )}

            {/* Footer */}
            {(currentScreen === "login" ||
              currentScreen === "forgot-password" ||
              currentScreen === "forgot-password-otp" ||
              currentScreen === "reset-password") && (
                <div className="mt-16 border-t border-[#1a9bd7] pt-4 text-center">
                  <p className="text-sm">
                    Not a member?
                    <button onClick={goToCreateAccount} className="ml-1 font-bold">
                      Create account
                    </button>
                  </p>
                </div>
              )}
          </div>
        </div>
      ) : (
        <ChannelDashboard onSignOut={handleSignOut} />
      )}
    </div>
  )
}
