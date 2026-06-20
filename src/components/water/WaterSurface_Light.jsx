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
  enableReflection = true,
  useSkyCubemap = false,
  rotation = [-Math.PI / 2, 0, 0]
}) {
  const meshRef = useRef()

  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size, 1, 1), [size])

  const cubemap = useMemo(() => {
    if (!useSkyCubemap) return null
    try {
      const loader = new THREE.CubeTextureLoader()
      const tex = loader.load([
        '/textures/xneg.jpg',
        '/textures/xpos.jpg',
        '/textures/ypos.jpg',
        '/textures/ypos.jpg',
        '/textures/zneg.jpg',
        '/textures/zpos.jpg'
      ])

      return tex
    } catch (e) {
      return null
    }
  }, [useSkyCubemap])

  const material = useMemo(() => {
    const finalEnv = enableReflection ? (envMap || cubemap) : null

    const mat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
      roughness: 0.28,
      metalness: 0.2,
      side: THREE.DoubleSide,
      envMap: finalEnv,
      envMapIntensity: enableReflection ? reflectionStrength : 0,
      normalScale: new THREE.Vector2(normalScale, normalScale)
    })

  // normal map (opcional) - sem animação (reduz artefatos e “movimento” do normal)
    try {
      const normalTexture = new THREE.TextureLoader().load('/textures/waternormals.jpg')
      normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping
      mat.normalMap = normalTexture
      // trava a escala (evita deslocamentos inesperados)
      normalTexture.needsUpdate = false
    } catch (e) {
      // ignore
    }


    return mat
  }, [color, opacity, normalScale, reflectionStrength, envMap, cubemap, enableReflection])

  // sem animação (reduz “flicker”/z-fighting na superfície leve)
  // useFrame(({ clock }) => {
  //   if (!meshRef.current) return
  //   const t = clock.getElapsedTime()
  //   meshRef.current.rotation.z = Math.sin(t * 0.05) * 0.002
  // })


  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[0, waterLevel, 0]}
      rotation={rotation}
    />
  )
}

