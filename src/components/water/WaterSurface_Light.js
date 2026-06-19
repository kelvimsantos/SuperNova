import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * Água leve (surface simples):
 * - Não usa shader pesado nem FBO
 * - Mantém o “retângulo” no mesmo lugar e nível da água
 * - Reflexo/normal e transparência são aproximados via material standard
 */
export function WaterSurface_Light({
  size = 55,
  waterLevel = 0,
  color = '#2f9bbf',
  opacity = 0.55,
  normalScale = 0.35,
  reflectionStrength = 0.35,
  envMap = null,
  rotation = [-Math.PI / 2, 0, 0]
}) {
  const meshRef = useRef()

  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size, 1, 1), [size])

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
      roughness: 0.28,
      metalness: 0.2,
      side: THREE.DoubleSide,
      envMap,
      envMapIntensity: reflectionStrength,
      normalScale: new THREE.Vector2(normalScale, normalScale)
    })

    // normal map: se não existir no projeto, mantemos sem map
    // (evita quebrar build por path inexistente)
    try {
      // @ts-ignore
      // eslint-disable-next-line no-undef
      const normalTexture = new THREE.TextureLoader().load('/textures/waternormals.jpg')
      normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping
      mat.normalMap = normalTexture
    } catch (e) {
      // ignore
    }

    return mat
  }, [color, opacity, normalScale, reflectionStrength, envMap])

  useFrame(({ clock }) => {
    // micro-atualização estática para reduzir “cara de plano”
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    meshRef.current.rotation.z = Math.sin(t * 0.05) * 0.002
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} position={[0, waterLevel, 0]} rotation={rotation} />
  )
}

