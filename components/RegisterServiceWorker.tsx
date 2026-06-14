"use client";

import { useEffect } from "react";

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("OPSCORE service worker registered."))
      .catch((error) =>
        console.log("OPSCORE service worker registration failed:", error)
      );
  }, []);

  return null;
}