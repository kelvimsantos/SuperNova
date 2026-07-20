// src/components/rendering/SnowGlobeRadius.jsx
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useUvRadius } from '../../context/RadiusContext';

export const SnowGlobeRadius = ({ 
  enabled = true, 
  softness = 0.08,
  bgColor = new THREE.Color('#0a0a1a')
}) => {
  const { uvRadius } = useUvRadius();
  const { camera, scene, gl } = useThree();
  const meshRef = useRef(null);
  const textureRef = useRef(null);

  // Cria uma textura para capturar a cena
  useEffect(() => {
    if (!enabled) return;

    // Cria a textura que vai capturar a cena
    const texture = new THREE.WebGLRenderTarget(
      window.innerWidth * 0.5,
      window.innerHeight * 0.5
    );
    textureRef.current = texture;

    // Cria o material com shader
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uRadius: { value: uvRadius || 0.5 },
        uSoftness: { value: softness },
        uBgColor: { value: bgColor },
        uTexture: { value: texture.texture },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uRadius;
        uniform float uSoftness;
        uniform vec3 uBgColor;
        uniform sampler2D uTexture;
        varying vec2 vUv;

        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          float mask = 1.0 - smoothstep(uRadius - uSoftness, uRadius + uSoftness, dist);
          
          // Pega a cor da textura capturada
          vec4 color = texture2D(uTexture, vUv);
          vec4 bg = vec4(uBgColor, 1.0);
          
          gl_FragColor = mix(bg, color, mask);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 99999;
    mesh.frustumCulled = false;
    meshRef.current = mesh;
    scene.add(mesh);

    return () => {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, [enabled, scene, softness, bgColor]);

  useFrame(() => {
    if (!meshRef.current || !enabled || !textureRef.current) return;

    // Posiciona o quad na frente da câmera
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const pos = camera.position.clone().add(dir.multiplyScalar(0.5));
    meshRef.current.position.copy(pos);
    meshRef.current.quaternion.copy(camera.quaternion);

    // Atualiza o raio
    if (meshRef.current.material.uniforms.uRadius) {
      meshRef.current.material.uniforms.uRadius.value = uvRadius || 0.5;
    }
  });

  return null;
};