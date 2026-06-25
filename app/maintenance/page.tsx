"use client";

export default function MaintenancePage() {
  const isMaintenance =
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>🚧 SYSTEM UNDER MAINTENANCE</h1>

      <p>OPSCORE is currently stabilizing core modules.</p>

      <div style={{ marginTop: 20 }}>
        <p>Cash Engine: 🟡</p>
        <p>Approval System: 🟡</p>
        <p>Watcher: 🔴</p>
        <p>Variance Engine: 🟡</p>
        <p>UI System: 🟢</p>
      </div>

      <p style={{ marginTop: 20, opacity: 0.6 }}>
        Status: {isMaintenance ? "ACTIVE MAINTENANCE" : "OFF"}
      </p>
    </div>
  );
}


