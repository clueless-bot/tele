import React, { useState } from "react";
import emailjs from "@emailjs/browser";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ChannelFeedback() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
      
    const sendEmail = async (event) => {  
      event.preventDefault();
      const template_params = {
        name: name, // Email entered by the user
        email: email,
        feedback: feedback,
      };
    //Forgot Password OTP 
      try {
    const response = await emailjs.send(
      "service_lghivl5",
      "template_xwuk5eh",
      template_params,
      "WF1TZzYasAG1lmJjR"
    );
    console.log("Email sent successfully:", response);
    toast.success("Feedback sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
    toast.error("Failed to send feedback. Please try again.");
  }
    };

  return (
    <div className="bg-white h-screen overflow-y-auto">
          <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <header className="mb-12">
            <h1 className="text-4xl font-bold text-gray-800 text-center">Feedback</h1>
          </header>

          <div className="max-w-2xl mx-auto">
            <form className="space-y-6">
              {/* Message Textarea */}
              <div>
              <textarea
                id="name"
                placeholder="Write Your Name"
                rows={1}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-4 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700 text-lg resize-none"
              ></textarea>
              <textarea
                  id="email"
                  placeholder="Write Your Email Address"
                  rows={1}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700 text-lg resize-none"
                ></textarea>
                <textarea
                  id="message"
                  placeholder="Write Your Message"
                  rows={10}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a9bd7] text-gray-700 text-lg resize-none"
                ></textarea>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  onClick={sendEmail}
                  className="bg-[#1a9bd7] text-white px-12 py-4 rounded-lg text-xl font-semibold hover:bg-[#1689c0] transition-colors"
                 >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
  }
