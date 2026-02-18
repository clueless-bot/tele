import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";

import * as htmlToImage from "html-to-image";
import { Copy, Check, Download } from "lucide-react";

export default function ChannelUploadSuccess({ onEditClick }: { onEditClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);

  const params = new URLSearchParams(location.search);
  const shortUrl = params.get("link") || "";

  const [copied, setCopied] = useState(false);

  // Copy link to clipboard
  const handleCopyLink = () => {
    if (!shortUrl) return;
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download QR code as PNG
  const handleDownloadQR = () => {
    if (!qrRef.current || !shortUrl) return;

    htmlToImage.toPng(qrRef.current)
      .then((dataUrl) => {
        const link = document.createElement("a");
        const fileName = `qr-${shortUrl.split("/").pop()}.png`;
        link.href = dataUrl;
        link.download = fileName;
        link.click();
      })
      .catch((err) => {
        console.error("Error generating QR code:", err);
      });
  };

  return (
    <div className="bg-white h-screen overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-center mb-12">
            <div className="mr-4">
              <img src="/UploadBlack.png" className="h-[65px]" alt="Upload icon" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">Upload Successful</h1>
          </div>

          {shortUrl && (
            <>
              {/* Short link display + Copy */}
              <div className="mb-12">
                <label className="block text-2xl font-medium text-gray-800 mb-4">
                  Shortened Link
                </label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-grow bg-gray-100 rounded-lg p-6 flex items-center break-all">
                    {shortUrl}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="bg-[#1a9bd7] text-white px-6 py-3 rounded-lg flex items-center justify-center min-w-[150px]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        <span className="font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-5 w-5 mr-2" />
                        <span className="font-semibold">Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* QR Code + Download */}
              <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                <div className="bg-white p-4 rounded-lg" ref={qrRef}>
                  <QRCode
                    value={shortUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="Q"
                  />


                </div>
                <div className="flex-grow flex justify-end">
                  <button
                    onClick={handleDownloadQR}
                    className="bg-[#1a9bd7] text-white px-6 py-3 rounded-lg flex items-center justify-center min-w-[150px]"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    <span className="font-semibold">Download QR</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Edit / Back buttons */}
          <div className="mt-12 flex justify-center space-x-4">
            {onEditClick && (
              <button
                onClick={onEditClick}
                className="bg-[#1a9bd7] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1689c0] transition-colors"
              >
                Edit Upload
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
