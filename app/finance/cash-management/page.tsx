"use client";

export default function MaintenanceScreen() {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#0f172a",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        color: "white",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <div style={{ fontSize: "80px" }}>🚧</div>

      <h1 style={{ fontSize: "42px", fontWeight: "bold", marginTop: "10px" }}>
        UNDER MAINTENANCE
      </h1>

      <p style={{ fontSize: "18px", marginTop: "10px", opacity: 0.7 }}>
        OPSCORE Cash Management System is currently undergoing maintenance
      </p>

      <div
        style={{
          marginTop: "30px",
          fontSize: "14px",
          opacity: 0.5,
        }}
      >
        Please try again later or contact system administrator
      </div>
    </div>
  );
}