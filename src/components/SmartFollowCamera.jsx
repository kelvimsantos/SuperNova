// src/components/SmartFollowCamera.jsx
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import useGameStore from '../hooks/useGameStore';

/**
 * SmartFollowCamera
 * 
 * followMode = true:
 *   - Câmera orbita suavemente para ficar atrás do jogador baseado na direção do movimento
 *   - SINCORNIZA com a posição atual da câmera ao ativar o modo
 *   - O movimento do jogador (Player.jsx) já usa camera.getWorldDirection()
 *   - Portanto a câmera influencia a direção do movimento
 * 
 * followMode = false (livre):
 *   - NÃO mexe em rotação (OrbitControls assume)
 *   - Só verifica distância: se ultrapassar maxDistanceLimite, puxa de volta
 *   - SEM lookAt para não conflitar com OrbitControls
 */
export const SmartFollowCamera = ({
  maxDistanceLimite = 20,
  minDistance = 3,
  defaultDistance = 10,
  minPolarAngle = 0.1,
  maxPolarAngle = Math.PI / 2.5,
  autoRotateSpeed = 1.5,
  distanceClampSpeed = 3.0,
}) => {
  const { camera } = useThree();
  const playerPosition = useGameStore((s) => s.playerPosition);
  const followMode = useGameStore((s) => s.followMode);
  const movementDirection = useGameStore((s) => s.movementDirection);

  const target = useRef(new Vector3(0, 0, 0));
  const targetHeight = 0.8;

  // Estado da câmera esférica para follow mode
  const theta = useRef(0);
  const phi = useRef(Math.PI / 4);
  const radius = useRef(defaultDistance);

  // Saber se o player está se movendo
  const isMoving = useRef(false);
  const lastMoveTime = useRef(0);

  // 🔥 Sincroniza coordenadas esféricas com a posição real da câmera quando entrar no follow mode
  const wasFollowMode = useRef(false);

  useFrame(() => {
    if (!playerPosition) return;

    target.current.set(playerPosition.x, playerPosition.y + targetHeight, playerPosition.z);

    const now = performance.now();
    if (movementDirection) {
      isMoving.current = true;
      lastMoveTime.current = now;
    } else if (now - lastMoveTime.current > 300) {
      isMoving.current = false;
    }

    if (followMode) {
      // 🔥 Sincroniza com a posição real da câmera ao ATIVAR follow mode
      if (!wasFollowMode.current) {
        const offset = new Vector3().copy(camera.position);
        offset.sub(new Vector3(playerPosition.x, playerPosition.y + targetHeight, playerPosition.z));
        radius.current = Math.max(minDistance, Math.min(maxDistanceLimite, offset.length()));
        if (offset.length() > 0.001) {
          theta.current = Math.atan2(offset.x, offset.z);
          phi.current = Math.acos(Math.max(-1, Math.min(1, offset.y / offset.length())));
          phi.current = Math.max(minPolarAngle, Math.min(maxPolarAngle, phi.current));
        }
        wasFollowMode.current = true;
      }

      // ===== FOLLOW MODE =====
      // Se o player está se movendo, calcula o ângulo desejado baseado na DIREÇÃO DO MOVIMENTO
      if (isMoving.current && movementDirection) {
        let moveAngle = 0;
        switch (movementDirection) {
          case 'forward': moveAngle = 0; break;
          case 'backward': moveAngle = Math.PI; break;
          case 'left': moveAngle = Math.PI / 2; break;
          case 'right': moveAngle = -Math.PI / 2; break;
        }

        // Ângulo desejado para a câmera (atrás do jogador)
        const desiredTheta = moveAngle + Math.PI;

        // Interpola suavemente para o ângulo desejado
        const diff = desiredTheta - theta.current;
        let shortest = ((diff % (Math.PI * 2)) + (Math.PI * 3)) % (Math.PI * 2) - Math.PI;
        theta.current += shortest * 0.04 * autoRotateSpeed;
      }

      // Aplica posição esférica à câmera
      const offset = new Vector3();
      offset.x = radius.current * Math.sin(phi.current) * Math.sin(theta.current);
      offset.y = radius.current * Math.cos(phi.current);
      offset.z = radius.current * Math.sin(phi.current) * Math.cos(theta.current);

      camera.position.copy(target.current).add(offset);
      camera.lookAt(target.current);

    } else {
      // ===== MODO LIVRE / OFF =====
      wasFollowMode.current = false;

      const cameraPos = camera.position;
      const distToPlayer = cameraPos.distanceTo(target.current);

      if (distToPlayer > maxDistanceLimite) {
        // Puxa a câmera de volta na MESMA direção
        const dir = new Vector3().copy(cameraPos).sub(target.current).normalize();
        const newPos = target.current.clone().add(dir.multiplyScalar(maxDistanceLimite * 0.9));
        camera.position.lerp(newPos, 0.03);
        // NÃO faz lookAt - OrbitControls cuida disso
      }
    }
  });

  return null;
};
