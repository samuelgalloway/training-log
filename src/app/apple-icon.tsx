import { ImageResponse } from "next/og";

// The icon iOS actually shows on the Home Screen after "Add to Home Screen" —
// a weight plate on a bar, in the app's own palette (accent green / paper),
// so it reads as this app rather than a generic browser-bookmark glyph.
// Opaque background is required: iOS renders any transparency as black.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        {/* the bar, passing behind the plate */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: 44,
            background: "#f7f6f3",
          }}
        />
        {/* the plate */}
        <div
          style={{
            position: "relative",
            width: 132,
            height: 132,
            borderRadius: "50%",
            background: "#f7f6f3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* the hole */}
          <div
            style={{
              width: 50,
              height: 50,
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
