import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

export function UnderwaterEffect({
  fogDensity = 0.05,
  waterSurfaceY = 0,
  bounds = null
}) {

  const { camera } = useThree()

  const meshRef = useRef()

  const center = bounds
    ? [
        (bounds.min.x + bounds.max.x) / 2,
        (bounds.min.y + bounds.max.y) / 2,
        (bounds.min.z + bounds.max.z) / 2,
      ]
    : [0, waterSurfaceY, 0]

  const size = bounds
    ? [
        bounds.max.x - bounds.min.x,
        Math.max(0.01, bounds.max.y - bounds.min.y),
        bounds.max.z - bounds.min.z,
      ]
    : [2, 2, 2]


  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#001e2a'),
      transparent: true,
      opacity: 0.0
    })
  }, [])

  useFrame(() => {
    // depth em relação ao nível da água do corpo (não ao Y=0 global)
    const depth = Math.max(0, waterSurfaceY - camera.position.y)


    const fog = 1 - Math.exp(-depth * fogDensity)

    material.opacity = fog * 10.6
  })

  return (
    <mesh
      ref={meshRef}
      position={[center[0], waterSurfaceY, center[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[size[0], 1, size[2]]}
    >
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

