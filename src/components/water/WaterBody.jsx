import { useRef } from 'react';
import { WaterSurfacePRO } from './WaterSurface_PRO';
import { WaterVolume } from './WaterVolume';
import { UnderwaterEffect } from './UnderwaterEffect';
import { WaterGlass } from './WaterGlass';
import { SceneEffects } from './SceneEffects';

export const WaterBody = ({ data, onClick, onRef }) => {
  const groupRef = useRef();

  const {
    id,
    position = [0, 0, 0],
    rotation = [-Math.PI / 2, 0, 0],
    width = 50,
    depth = 5,
    waveStrength = 0.2,
    waveSpeed = 1,
    color = '#4aa3ff',
    depthHeight = 15,
  } = data;

  return (
    <group
      ref={(ref) => {
        groupRef.current = ref;
        if (ref && onRef) onRef(id, ref);
      }}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick(id);
      }}
    >
      {/* 🌊 SUPERFÍCIE (ondas) */}
      <WaterSurfacePRO
        size={[width, depth]}
        waveStrength={waveStrength}
        waveSpeed={waveSpeed}
        color={color}
      />

      {/* 🟦 VOLUME (profundidade) */}
      <WaterVolume
      depth={depth}
        size={[width, depth]}
        height={depthHeight}
        color={color}
      />

      {/* 💡 CAUSTICS / efeitos */}
      <SceneEffects />

      {/* 🌫️ underwater */}
      <UnderwaterEffect />

      {/* ✨ borda tipo vidro */}
      <WaterGlass size={[width, depth]} />
    </group>
  );
};