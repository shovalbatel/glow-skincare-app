import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "22%",
          background: "linear-gradient(135deg, #e88b8b 0%, #c4545a 100%)",
        }}
      >
        <span
          style={{
            fontSize: 300,
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1,
            fontFamily: "serif",
          }}
        >
          G
        </span>
      </div>
    ),
    { ...size }
  );
}
