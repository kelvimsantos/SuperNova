// src/components/CameraController.jsx
import { useFrame, useThree } from '@react-three/fiber';
import { useRadius, useUvRadius } from '../context/RadiusContext';
import useGameStore from '../hooks/useGameStore';

export const CameraController = () => {
  const { camera } = useThree();
  const { setRadius } = useRadius();
  const { setUvRadius } = useUvRadius();
  const playerPosition = useGameStore((state) => state.playerPosition);

  useFrame(() => {
    if (!playerPosition || !setRadius || !setUvRadius) return;

    const dist = camera.position.distanceTo(playerPosition);
    const t = Math.max(0, Math.min(1, (dist - 5) / (30 - 5)));

    // Raio do globo (distância de culling)
    // Reduz agressivamente o alcance para melhorar performance.
    // (menos área renderizada + frustum menor)
    const radius = 18 + t * 22; // ~18m..40m
    setRadius(radius);

    // Raio UV (para máscara)
    const far = camera.far || 100;
    setUvRadius(Math.min(1, radius / (far * 0.8)));

    // Far/Near plane (frustum mais “perto”)
    const near = 0.1 + t * 0.08;
    const far = Math.max(near + 0.5, radius * 0.025);

    // FOV dinâmico: mais fechado no centro
    // Deixa a mudança bem perceptível: mais “zoom” no que está no centro.
    const fovMin = 8;
    const fovMax = 20;
    camera.fov = fovMin + t * (fovMax - fovMin);

    // Aspect: forçar quadrado no frustum para concentrar no centro da tela.
    camera.aspect = 0.5;

    // Near/Far planes
    camera.near = near;
    camera.far = far;

    camera.updateProjectionMatrix();
  });

  return null;
};  