// src/components/SmartFollowCamera.jsx
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import { Vector3, Spherical } from 'three';
import useGameStore from '../hooks/useGameStore';

/**
 * SmartFollowCamera
 * 
 * followMode = true:
 *   - Orbita ao redor do player com mouse
 *   - Quando player se move, a câmera rotaciona automaticamente para trás dele
 * 
 * followMode = false (livre):
 *   - Orbita livremente como OrbitControls
 *   - Porém, se a distância do player exceder `maxDistance`, a câmera é puxada de volta
 *   - Se o ângulo vertical ficar muito alto (acima do player), também corrige
 */
export const SmartFollowCamera = ({
  maxDistance = 18,
  minDistance = 3,
  defaultDistance = 10,
  minPolarAngle = 0.2,    // ângulo mínimo (radianos) - impede de ir acima demais
  maxPolarAngle = Math.PI / 2.2, // ângulo máximo
  autoRotateSpeed = 2.0,  // velocidade com que rotaciona atrás do player
  dampingFactor = 0.08,
  distanceClampSpeed = 3.0,
}) => {
  const { camera, gl } = useThree();
  const playerPosition = useGameStore((s) => s.playerPosition);
  const followMode = useGameStore((s) => s.followMode);
  const movementDirection = useGameStore((s) => s.movementDirection);

  // Estado interno da câmera esférica
  const spherical = useRef(new Spherical(defaultDistance, Math.PI / 3, 0));
  const target = useRef(new Vector3(0, 0, 0));
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });

  // Offset de altura do target (para olhar um pouco acima dos pés)
  const targetHeight = 0.8;

  // Saber se o player está se movendo
  const isMoving = useRef(false);
  const lastMoveTime = useRef(0);

  useEffect(() => {
    // Mouse events no canvas
    const canvas = gl.domElement;

    const onMouseDown = (e) => {
      isDragging.current = true;
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging.current) return;

      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      prevMouse.current = { x: e.clientX, y: e.clientY };

      // Rotação horizontal (azimuth)
      spherical.current.theta -= dx * 0.005;
      // Rotação vertical (polar)
      spherical.current.phi = Math.max(
        minPolarAngle,
        Math.min(maxPolarAngle, spherical.current.phi - dy * 0.005)
      );
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    // Zoom com scroll
    const onWheel = (e) => {
      const delta = e.deltaY * 0.01;
      spherical.current.radius = Math.max(
        minDistance,
        Math.min(maxDistance, spherical.current.radius + delta)
      );
    };

    // Touch events para mobile
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging.current = true;
        prevMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e) => {
      if (!isDragging.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - prevMouse.current.x;
      const dy = e.touches[0].clientY - prevMouse.current.y;
      prevMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      spherical.current.theta -= dx * 0.005;
      spherical.current.phi = Math.max(
        minPolarAngle,
        Math.min(maxPolarAngle, spherical.current.phi - dy * 0.005)
      );
    };

    const onTouchEnd = () => {
      isDragging.current = false;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [gl, minPolarAngle, maxPolarAngle, minDistance, maxDistance]);

  useFrame(() => {
    if (!playerPosition) return;

    // Atualiza target (posição do player)
    target.current.set(playerPosition.x, playerPosition.y + targetHeight, playerPosition.z);

    // Detecta se o player está se movendo
    const now = performance.now();
    if (movementDirection) {
      isMoving.current = true;
      lastMoveTime.current = now;
    } else if (now - lastMoveTime.current > 200) {
      isMoving.current = false;
    }

    if (followMode) {
      // --- FOLLOW MODE ---
      // Se o player está se movendo, auto-rotaciona câmera para trás dele
      if (isMoving.current && movementDirection) {
        // Calcula o ângulo da direção do movimento
        let moveAngle = 0;
        switch (movementDirection) {
          case 'forward': moveAngle = 0; break;
          case 'backward': moveAngle = Math.PI; break;
          case 'left': moveAngle = Math.PI / 2; break;
          case 'right': moveAngle = -Math.PI / 2; break;
        }

        // A câmera deve ficar atrás do jogador (oposto da direção)
        const desiredTheta = moveAngle;
        
        // Interpola suavemente para o ângulo desejado
        const diff = desiredTheta - spherical.current.theta;
        // Normaliza diff para o menor caminho
        let shortest = ((diff % (Math.PI * 2)) + (Math.PI * 3)) % (Math.PI * 2) - Math.PI;
        spherical.current.theta += shortest * autoRotateSpeed * 0.02;
      }
    } else {
      // --- MODO LIVRE (com limite de distância) ---
      // Se o jogador está muito longe, puxa a câmera de volta
      const cameraPos = camera.position;
      const distToPlayer = cameraPos.distanceTo(target.current);
      
      if (distToPlayer > maxDistance * 1.3) {
        // Puxa suavemente o raio para o limite
        spherical.current.radius = Math.max(
          minDistance,
          Math.min(maxDistance, spherical.current.radius - distanceClampSpeed * 0.02)
        );
      }
    }

    // Aplica posição esférica à câmera
    const offset = new Vector3();
    offset.setFromSpherical(spherical.current);
    camera.position.copy(target.current).add(offset);

    // Olha para o target
    camera.lookAt(target.current);

    // Aplica damping suave na posição (opcional - para movimento mais fluido)
    // Não fazemos damping aqui porque os controles de mouse já são suaves
  });

  return null;
};
