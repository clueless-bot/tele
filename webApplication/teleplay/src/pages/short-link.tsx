import React, { useEffect } from "react";
import { useParams } from "react-router-dom";

export default function ShortLinkRedirect() {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (!code) return;

    const deepLink = `teleplay://watch/${code}`;
    const fallback = `${import.meta.env.VITE_BASE_URL}/s/${code}`;
    const userAgent = (navigator.userAgent || "").toLowerCase();
    const isMobile = /iphone|ipad|ipod|android/.test(userAgent);

    if (isMobile) {
      window.location.href = deepLink;
      const timer = window.setTimeout(() => {
        window.location.href = fallback;
      }, 1500);
      return () => window.clearTimeout(timer);
    }

    window.location.href = fallback;
  }, [code]);

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "#111",
        color: "#fff",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 360,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: 20,
          background: "rgba(0,0,0,0.35)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>Opening Teleplay…</h1>
        <p style={{ marginTop: 12, opacity: 0.85 }}>
          If nothing happens, open this link again after installing the app.
        </p>
      </div>
    </div>
  );
}

