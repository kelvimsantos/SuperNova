import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import useGameStore from '../../hooks/useGameStore';

/**
 * DynamicFrustumCulling (versão reescrita)
 * Objetivo: otimizar render com "globo" via frustum:
 * - FOV dinâmico (abre perto / fecha longe)
 * - Aspect ratio dinâmico (widescreen perto / quadrado longe)
 * - near/far dinâmico (reduz volume renderizado)
 *
 * Visual "Globo de Neve": deve ser feito com uma máscara (ex: RadialDarkMaskController / Effect).
 * Este componente foca apenas no frustum para reduzir render.
 */
export const DynamicFrustumCulling = ({
  enabled = true,

  // Interpolação por distância câmera->player
  distMin = 6,
  distMax = 30,
  smoothing = 0.08,

  // FOV
  fovNear = 75,
  fovFar = 25,

  // Aspect (largura/altura) para reduzir área efetiva no frustum
  aspectNear = 16 / 9,
  aspectFar = 1,

  // near/far
  nearNear = 0.1,
  nearFar = 0.3,
  farNear = 30,
  farFar = 90,

  // (opcional) evita update exagerado em cada frame
  minDistDeltaToUpdate = 0.01,
}) => {
  const { camera } = useThree();
  const playerRigidBody = useGameStore((s) => s.playerRigidBody);

  const params = useMemo(
    () => ({
      distMin,
      distMax,
      smoothing,
      fovNear,
      fovFar,
      aspectNear,
      aspectFar,
      nearNear,
      nearFar,
      farNear,
      farFar,
      minDistDeltaToUpdate,
    }),
    [
      distMin,
      distMax,
      smoothing,
      fovNear,
      fovFar,
      aspectNear,
      aspectFar,
      nearNear,
      nearFar,
      farNear,
      farFar,
      minDistDeltaToUpdate,
    ]
  );

  // refs manuais para evitar state e manter lerp estável
  let lastDist = null;
  let fovCurrent = null;
  let aspectCurrent = null;
  let nearCurrent = null;
  let farCurrent = null;

  useFrame(() => {
    if (!enabled) return;
    if (!camera || !playerRigidBody) return;

    const playerPos = playerRigidBody.translation?.();
    if (!playerPos) return;

    const camPos = camera.position;
    const dx = camPos.x - playerPos.x;
    const dy = camPos.y - playerPos.y;
    const dz = camPos.z - playerPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (lastDist != null && Math.abs(dist - lastDist) < params.minDistDeltaToUpdate) {
      return;
    }
    lastDist = dist;

    const tRaw = (dist - params.distMin) / (params.distMax - params.distMin);
    const t = Math.max(0, Math.min(1, tRaw));

    const fovTarget = params.fovNear + t * (params.fovFar - params.fovNear);
    const aspectTarget = params.aspectNear + t * (params.aspectFar - params.aspectNear);
    const nearTarget = params.nearNear + t * (params.nearFar - params.nearNear);
    const farTarget = params.farNear + t * (params.farFar - params.farNear);

    // inicializa na primeira execução
    if (fovCurrent == null) fovCurrent = camera.fov;
    if (aspectCurrent == null) aspectCurrent = camera.aspect;
    if (nearCurrent == null) nearCurrent = camera.near;
    if (farCurrent == null) farCurrent = camera.far;

    const k = params.smoothing;
    fovCurrent = fovCurrent + (fovTarget - fovCurrent) * k;
    aspectCurrent = aspectCurrent + (aspectTarget - aspectCurrent) * k;
    nearCurrent = nearCurrent + (nearTarget - nearCurrent) * k;
    farCurrent = farCurrent + (farTarget - farCurrent) * k;

    camera.fov = fovCurrent;
    camera.aspect = aspectCurrent;
    camera.near = nearCurrent;
    camera.far = farCurrent;

    camera.updateProjectionMatrix();
  });

  return null;
};

export default DynamicFrustumCulling;


