import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
export const Box: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: "#fff" }}>
    <ThreeCanvas width={1080} height={1920} camera={{ fov: 40, position: [0, 0, 5] }}>
      <ambientLight intensity={1} /><directionalLight position={[2, 3, 4]} />
      <mesh rotation={[f / 20, f / 30, 0]}><boxGeometry args={[1.5, 1.5, 1.5]} /><meshStandardMaterial color="red" /></mesh>
    </ThreeCanvas></AbsoluteFill>;
};
