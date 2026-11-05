import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3B63F6 0%, #7C5CFF 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 36 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              color: "white",
              fontWeight: 700,
            }}
          >
            P
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, color: "white" }}>PrintReady</div>
        </div>
        <div style={{ fontSize: 52, fontWeight: 700, color: "white", textAlign: "center", padding: "0 80px", lineHeight: 1.2 }}>
          Your PDFs deserve a perfect first print.
        </div>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.85)", marginTop: 24 }}>
          Automated PDF preflight &amp; quality inspection
        </div>
      </div>
    ),
    { ...size }
  );
}
