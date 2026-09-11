import { ImageResponse } from "next/og";

// Browser tab favicon — same plate-and-bar mark as apple-icon.tsx, just
// smaller. See that file for the design rationale.
export const size = { width: 32, height: 32 };
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
          background: "#2f6f4f",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: 8,
            background: "#f7f6f3",
          }}
        />
        <div
          style={{
            position: "relative",
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#f7f6f3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#2f6f4f",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
