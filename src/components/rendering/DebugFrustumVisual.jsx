import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';

/**
 * Debug opcional: cria um helper do frustum da câmera.
 * Use temporariamente para inspecionar o “quadrado”/recorte.
 */
export const DebugFrustumVisual = ({ enabled = false, color = 0xff00ff }) => {
  const { camera, scene } = useThree();

  useEffect(() => {
    if (!enabled) return;

    const helper = new THREE.CameraHelper(camera);
    helper.material.color.setHex(color);
    scene.add(helper);

    return () => {
      scene.remove(helper);
      helper.dispose?.();
    };
  }, [enabled, camera, scene, color]);

  return null;
};

