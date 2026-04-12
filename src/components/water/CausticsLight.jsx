import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function CausticsLight({ scene, waterLevel = 0 }) {

  useEffect(() => {

    scene.traverse((child) => {

      if (!child.isMesh) return

      // 🔥 evita aplicar na água ou objetos específicos
      if (child.userData?.noCaustics) return

      const mat = child.material

      // 🔥 só aplica em material padrão
      if (!mat || !mat.isMeshStandardMaterial) return

      // 🔥 evita reinjetar várias vezes
      if (mat.userData._causticsInjected) return
      mat.userData._causticsInjected = true

      mat.onBeforeCompile = (shader) => {

        // ✅ UNIFORMS
        shader.uniforms.uTime = { value: 0 }
        shader.uniforms.uWaterLevel = { value: waterLevel }

        /* ========================= */
        /* VERTEX FIX (SEGURO) */
        /* ========================= */

        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `
          #include <common>
          varying vec3 vWorldPos;
          `
        )

        shader.vertexShader = shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `
          #include <worldpos_vertex>

          // 🔥 FIX UNIVERSAL (substitui worldPosition bugado)
          vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
          vWorldPos = worldPos.xyz;
          `
        )

        /* ========================= */
        /* FRAGMENT */
        /* ========================= */

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `
          #include <common>

          varying vec3 vWorldPos;
          uniform float uTime;
          uniform float uWaterLevel;

          float hash(vec2 p){
            return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
          }

          float noise(vec2 p){
            vec2 i = floor(p);
            vec2 f = fract(p);

            float a = hash(i);
            float b = hash(i + vec2(1.0,0.0));
            float c = hash(i + vec2(0.0,1.0));
            float d = hash(i + vec2(1.0,1.0));

            vec2 u = f*f*(3.0-2.0*f);

            return mix(a,b,u.x) +
                   (c-a)*u.y*(1.0-u.x) +
                   (d-b)*u.x*u.y;
          }
          `
        )

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          // 🔥 CAUSTICS (SÓ EMBAIXO DA ÁGUA)
          if(vWorldPos.y < uWaterLevel){

            vec2 uv = vWorldPos.xz * 0.25;

            uv += vec2(0.3, 0.2) * uTime * 0.6;

            float n1 = noise(uv * 6.0);
            float n2 = noise(uv * 12.0 - uTime * 0.8);

            float pattern = abs(n1 - n2);

            float caustic = smoothstep(0.02, 0.12, pattern);

            caustic = pow(caustic, 2.0);

            // 🔥 inversão correta
            caustic = 1.0 - caustic;

            vec3 causticColor = vec3(1.0, 1.98, 1.85);

            gl_FragColor.rgb += causticColor * caustic * 0.5;
          }

          #include <dithering_fragment>
          `
        )

        mat.userData.shader = shader
      }

      // 🔥 força recompilar UMA vez
      mat.needsUpdate = true
    })

  }, [scene, waterLevel])

  /* ========================= */
  /* ANIMAÇÃO */
  /* ========================= */

  useFrame(() => {
    scene.traverse((child) => {
      if (!child.isMesh) return

      const mat = child.material
      if (!mat?.userData?.shader) return

      mat.userData.shader.uniforms.uTime.value += 0.03
    })
  })

  return null
}