import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { OrbitControls } from "@react-three/drei"

export default function Experience() {
  const mesh = useRef()

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.material.uniforms.uTime.value =
        state.clock.elapsedTime
    }
  })

  return (
    <>
      <ambientLight intensity={1.3} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />

      <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]}>
        {/* 🔥 menos subdivisão */}
        <planeGeometry args={[20, 20, 64, 64]} />

        <meshStandardMaterial color="#4fa3d1" transparent opacity={0.6} />
      </mesh>

      <OrbitControls />
    </>
  )
}