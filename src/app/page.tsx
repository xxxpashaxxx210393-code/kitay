"use client";

import React from "react";

export default function HomePage() {
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    // Carry a Vercel shareable-link token into the dashboard iframe.
    // The dashboard uses it for same-origin API calls while preview protection stays enabled.
    setQuery(window.location.search);
  }, []);

  return (
    <iframe
      title="Карго-контроль Китай → Беларусь"
      src={"/cargo-dashboard.html" + query}
      style={{ display: "block", width: "100%", height: "100dvh", border: 0, background: "#eef2f6" }}
      allow="microphone; camera; clipboard-read; clipboard-write"
    />
  );
}
