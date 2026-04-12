import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

export function UnderwaterEffect({ fogDensity = 0.05 }) {

  const { camera } = useThree()
  const meshRef = useRef()

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#001e2a'),
      transparent: true,
      opacity: 0.0
    })
  }, [])

  useFrame(() => {
    const depth = Math.max(0, -camera.position.y)

    const fog = 1 - Math.exp(-depth * fogDensity)

    material.opacity = fog * 10.6
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}