import { useRef, useMemo } from 'react'
import { WaterSurfacePRO } from './WaterSurface_PRO'
import { UnderwaterEffect } from './UnderwaterEffect'
import { WaterVolume } from './WaterVolume'
import { WaterGlass } from './WaterGlass'
import useGameStore from '../../hooks/useGameStore'
import { SceneEffects } from './SceneEffects'




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

      {/* no modo leve, ocultar apenas a superfície já reduz muito o custo */}
      {useGameStore.getState().waterMode === 'light' ? null : (
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