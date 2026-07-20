// src/components/CameraGlobo.jsx
import { useFrame, useThree } from '@react-three/fiber';
import { useRadius, useUvRadius } from '../context/RadiusContext';
import useGameStore from '../hooks/useGameStore';

export const CameraGlobo = ({
  enabled = true,
  radiusMin = 25,
  radiusMax = 60,
  distMin = 5,
  distMax = 30,
}) => {
  const { camera } = useThree();
  const { setRadius } = useRadius();
  const { setUvRadius } = useUvRadius();
  const playerPosition = useGameStore((state) => state.playerPosition);

  useFrame(() => {
    if (!enabled || !playerPosition || !setRadius || !setUvRadius) return;

    const dist = camera.position.distanceTo(playerPosition);
    const t = Math.max(0, Math.min(1, (dist - distMin) / (distMax - distMin)));

    // 1. Raio do globo (distância de culling)
    const radius = radiusMin + t * (radiusMax - radiusMin);
    setRadius(radius);

    // 2. Raio UV para a máscara circular (usado pelo SnowGlobeRadius)
    const far = camera.far || 100;
    const uvRadius = Math.min(1, radius / (far * 0.8));
    setUvRadius(uvRadius);

    // 3. Far/Near plane (frustum mais “perto”)
    // Clamp para evitar far <= near e manter estabilidade numérica.
    const near = 0.1 + t * 0.1;
    const far = Math.max(near + 0.5, radius * 1.25);

    // 4. FOV dinâmico (mais fechado no centro)
    // Deixa a mudança bem perceptível: mais “zoom” no que está no centro.
    const fovMin = 8;
    const fovMax = 45;
    camera.fov = fovMin + t * (fovMax - fovMin);

    // 5. Forçar quadrado no frustum para concentrar no centro da tela.
    // (A largura/altura reais da viewport continuam controladas pelo canvas;
    // este aspect do frustum altera a projeção para favorecer o “zoom central”.)
    camera.aspect = 1;

    // 6. Aplicar clipping planes
    camera.near = near;
    camera.far = far;

    camera.updateProjectionMatrix();
  });

  return null;
};