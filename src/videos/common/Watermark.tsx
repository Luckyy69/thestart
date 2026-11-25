// Bean Stories watermark (user, from the ouch short on: on EVERY video). Small logo + name, top-left, clear of the
// YouTube Shorts UI (top bar, right-hand buttons, bottom caption/title area). Scales with the composition width.
import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";

export const Watermark: React.FC<{ opacity?: number }> = ({ opacity = 0.82 }) => {
  const { width } = useVideoConfig();
  const k = width / 1080;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 36 * k, top: 150 * k, display: "flex", alignItems: "center", gap: 12 * k, opacity }}>
        <Img src={staticFile("bean_logo_256.png")} style={{ width: 64 * k, height: 64 * k, borderRadius: 14 * k, boxShadow: `0 ${3 * k}px ${10 * k}px rgba(0,0,0,0.35)` }} />
        <div style={{ fontFamily: "Inter, 'Inter Display', sans-serif", fontWeight: 900, fontSize: 30 * k, letterSpacing: -0.5 * k, color: "#ffffff",
          WebkitTextStroke: `${6 * k}px #1d1424`, paintOrder: "stroke fill", lineHeight: 1 }}>BEAN STORIES</div>
      </div>
    </AbsoluteFill>
  );
};
