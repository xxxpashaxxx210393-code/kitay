"use client";

import React from "react";

export default function HomePage() {
  return (
    <iframe
      title="Карго-контроль Китай → Беларусь"
      src="/cargo-dashboard.html"
      style={{ display: "block", width: "100%", height: "100dvh", border: 0, background: "#eef2f6" }}
      allow="microphone; camera; clipboard-read; clipboard-write"
    />
  );
}
