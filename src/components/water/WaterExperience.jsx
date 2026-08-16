import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { WaterSurfacePRO } from './WaterSurface_PRO'
import { UnderwaterEffect } from './UnderwaterEffect'
import { WaterVolume } from './WaterVolume'
import { WaterGlass } from './WaterGlass'
import useGameStore from '../../hooks/useGameStore'
import { SceneEffects } from './SceneEffects'
import { WaterSurface_Light } from './WaterSurface_Light.jsx'

// 🌊 Registro global de corpos d'água (usado pela natação do player)
if (typeof window !== 'undefined') {
  window.__waterSystem = window.__waterSystem || {
    bodies: [],
    // 🏊 Os "pés" do personagem ficam ~2.3m abaixo da origem do rigid body do player
    bodyOffsetY: -2.3,
    isPlayerInWater(x, y, z) {
      const bodyY = y + (this.bodyOffsetY ?? -2.3);
      for (const w of this.bodies) {
        if (Math.abs(x - w.x) < w.halfSize && Math.abs(z - w.z) < w.halfSize && bodyY < w.y) return w;
      }
      return null;
    },
  };
}





export const WaterExperience = ({ obj, onRef }) => {

  const groupRef = useRef()
  const waterRef = useRef()

  const size = obj?.size || 120  
  const depth = obj?.depth || 5
  const position = obj?.position || [0, 0, 0]

  
  const config = useMemo(() => ({
    size: size,
    depth: depth,

    waveAmplitude: obj?.waveStrength || 0.2,
    waveFrequency: 5.5,
    waveSpeed: obj?.waveSpeed || 1,
    waveIntensity: 2.5,

    opacity: 0.6,
    refractionStrength: 0.02,
    reflectionStrength: 1.1,
    fresnelStrength: 1.0,

    distortion: 1.01,
    fog: 2.9,

    caustics: false,
  }), [obj])

  const bounds = {
    min: { x: -config.size / 2, y: -config.depth, z: -config.size / 2 },
    max: { x: config.size / 2, y: 0, z: config.size / 2 }
  }

  // 🌊 Registra este corpo d'água para a natação do player
  useEffect(() => {
    const node = groupRef.current;
    if (!node) return;
    const id = obj?.id ?? Math.random();
    const s = obj?.scale || [1, 1, 1];
    const body = {
      id,
      x: 0, y: 0, z: 0,
      halfSize: (size * s[0]) / 2,
      depth: depth * s[1],
    };
    const update = () => {
      const worldPos = new THREE.Vector3();
      node.getWorldPosition(worldPos);
      body.x = worldPos.x;
      body.y = worldPos.y;
      body.z = worldPos.z;
    };
    update();
    const t = setTimeout(update, 100);
    window.__waterSystem?.bodies.push(body);
    return () => {
      clearTimeout(t);
      if (window.__waterSystem) {
        window.__waterSystem.bodies = window.__waterSystem.bodies.filter(b => b.id !== id);
      }
    };
  }, [obj, size, depth]);

  return (
    <group
      ref={(node) => {
        groupRef.current = node
        if (node && onRef) onRef(obj.id, node)
      }}
      position={position}
      scale={obj?.scale || [1, 1, 1]}
    >

      {config.caustics && <SceneEffects waterLevel={position[1]} />}

      {/* no modo leve, ocultar apenas a superfície pesada */}
      {useGameStore.getState().waterMode === 'light' ? (
        // superfície leve com “reflexo” aproximado do céu (cubemap) e toggle do player (fake)
        // (por enquanto o toggle liga/desliga envMap; depois pode virar reflexo do player real/fake por textura)
        <WaterSurface_Light
          size={config.size}
          waterLevel={0}
          color={"#2f9bbf"}
          opacity={0.55}
          normalScale={0.35}
          reflectionStrength={0.45}
          useSkyCubemap={true}
          enableReflection={!!window.__waterPlayerReflectionEnabled}
        />
      ) : (
        <WaterSurfacePRO
          ref={waterRef}
          size={config.size}
          waterLevel={0}
          waveIntensity={config.waveIntensity}
          waveSpeed={config.waveSpeed}
          opacity={config.opacity}
          refractionStrength={config.refractionStrength}
          reflectionStrength={config.reflectionStrength}
          fresnelStrength={config.fresnelStrength}
          waveAmplitude={config.waveAmplitude}
          waveFrequency={config.waveFrequency}
        />
      )}

      <WaterVolume bounds={bounds} />

      <UnderwaterEffect
        bounds={bounds}
        distortionStrength={config.distortion}
        fogDensity={config.fog}
        colorShift={0.2}
      />

      <WaterGlass
        size={config.size}
        waterLevel={0}
        depth={config.depth}
        color ={'#4aa3ff'}
      />
    </group>
  )
}