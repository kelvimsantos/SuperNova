import { useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';

const GLIDER_MODEL_PATH = '/models/mount/paraglider.glb';

// 🔥 CONFIGURAÇÕES DO PLANADOR
const GLIDER_OPEN_HOLD = 0.5;
const GLIDE_SPEED = 8.0;
const GLIDE_FORWARD_BONUS = 6.0;
const GLIDE_TARGET_VY = -0.8;
const GLIDE_GRAVITY_SCALE = 0.0;

// 🔥 CONFIGURAÇÕES DO MODELO GLB
const MODEL_SCALE = 2.5;        // 🔥 ESCALA do modelo (ajuste para o modelo aparecer no tamanho certo)
const MODEL_POS_Y = -1.4;        // 🔥 ALTURA nas costas
const MODEL_POS_Z = 0.0;        // 🔥 PROFUNDIDADE (0 = junto do corpo)
const MODEL_ROT_X = 0.5;        // 🔥 INCLINAÇÃO frontal (rad)
const MODEL_ROT_Y = 0.0;        // 🔥 Rotação horizontal (rad)
const MODEL_ROT_Z = 0.0;        // 🔥 Rolagem lateral (rad)

export function Glider() {
  const setGliderOpen = useGameStore((s) => s.setGliderOpen);
  const mount = useGameStore((s) => s.mount);
  const playerRigidBody = useGameStore((s) => s.playerRigidBody);
  const worldGroupRef = useGameStore((s) => s.worldGroupRef);

  const isMounted = !!mount?.isActive;

  const gliderGroupRef = useRef(null);

  // REFS DE CONTROLE
  const spaceHeld = useRef(0);
  const spaceDown = useRef(false);
  const openAnim = useRef(0);
  const steerRef = useRef({ x: 0, z: 0 });
  const wasOpenRef = useRef(false);
  const gravitySetRef = useRef(false);

  // 🔥 CARREGA O MODELO GLB (dentro do componente = hook válido)
  const { scene } = useGLTF(GLIDER_MODEL_PATH);

  // 🔥 DETECTA TECLA ESPAÇO
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.code === 'Space' || e.key === ' ') && !e.repeat) {
        spaceDown.current = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        spaceDown.current = false;
        spaceHeld.current = 0;
        if (useGameStore.getState().gliderOpenRef.current) {
          setGliderOpen(false);
        }
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [setGliderOpen]);

  // 🔥 FECHA AO MONTAR
  useEffect(() => {
    if (isMounted) setGliderOpen(false);
  }, [isMounted, setGliderOpen]);

  // 🔥 VERIFICA SE ESTÁ NA ÁGUA
  const isPlayerInWater = useCallback(() => {
    if (!playerRigidBody) return false;
    try {
      const p = playerRigidBody.translation();
      return !!window.__waterSystem?.isPlayerInWater(p.x, p.y, p.z);
    } catch (e) {
      return false;
    }
  }, [playerRigidBody]);

  // 🔥 VERIFICA SE ESTÁ NO AR
  const isPlayerAirborne = useCallback(() => {
    if (!playerRigidBody) return false;
    try {
      const vel = playerRigidBody.linvel();
      return vel.y < -0.5;
    } catch (e) {
      return false;
    }
  }, [playerRigidBody]);

  // 🔥 ENCONTRA O CHÃO
  const getGroundHeight = useCallback((x, z) => {
    if (!worldGroupRef?.current) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
    raycaster.far = 200;

    const objects = [];
    const collect = (obj) => {
      if (obj.isMesh && obj.visible) objects.push(obj);
      if (obj.children) obj.children.forEach(collect);
    };
    collect(worldGroupRef.current);

    let best = null;
    let bestD = Infinity;
    for (const obj of objects) {
      const hits = raycaster.intersectObject(obj, true);
      if (hits.length > 0 && hits[0].distance < bestD) {
        bestD = hits[0].distance;
        best = hits[0];
      }
    }
    return best ? best.point.y : null;
  }, [worldGroupRef]);

  // 🔥 LOOP PRINCIPAL
  useFrame(({ camera }, delta) => {
    const d = Math.min(delta, 0.1);

    // ==== DECISÃO DE ABRIR ====
    // 🏊 Não abre o planador enquanto estiver nadando de verdade
    //    (na borda, com os pés no chão, o pulo+planador funciona)
    const swimming = window.__isPlayerSwimming ? window.__isPlayerSwimming() : isPlayerInWater();
    if (!isMounted && !swimming) {
      if (spaceDown.current) {
        spaceHeld.current += d;
        if (spaceHeld.current >= GLIDER_OPEN_HOLD && isPlayerAirborne()) {
          if (!useGameStore.getState().gliderOpenRef.current) {
            setGliderOpen(true);
          }
        }
      }
    }

    const open = useGameStore.getState().gliderOpenRef.current;

    // 🏊 FECHA AO ENTRAR NA ÁGUA
    if (open && isPlayerInWater()) {
      setGliderOpen(false);
    }

    // ==== FECHA AO TOCAR O CHÃO ====
    if (open && playerRigidBody) {
      try {
        const pp = playerRigidBody.translation();
        const gy = getGroundHeight(pp.x, pp.z);
        if (gy !== null && gy !== undefined) {
          if (pp.y - gy < 0.6) {
            setGliderOpen(false);
          }
        }
      } catch (e) {}
    }

    // ==== ANIMAÇÃO DE ABERTURA ====
    if (open && openAnim.current < 1) {
      openAnim.current = Math.min(1, openAnim.current + d * 2.5);
    } else if (!open && openAnim.current > 0) {
      openAnim.current = Math.max(0, openAnim.current - d * 3.0);
    }

    // ==== GRAVIDADE ====
    if (playerRigidBody && typeof playerRigidBody.setGravityScale === 'function') {
      if (open && !gravitySetRef.current) {
        playerRigidBody.setGravityScale(GLIDE_GRAVITY_SCALE, true);
        gravitySetRef.current = true;
      } else if (!open && gravitySetRef.current) {
        playerRigidBody.setGravityScale(1.0, true);
        gravitySetRef.current = false;
      }
    }

    // ==== FÍSICA DE PLANEIO ====
    if (open && playerRigidBody) {
      try {
        const vel = playerRigidBody.linvel();
        const dir = steerRef.current;
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();
        const right = new THREE.Vector3(-camDir.z, 0, camDir.x);

        const move = new THREE.Vector3();
        move.addScaledVector(camDir, dir.z);
        move.addScaledVector(right, dir.x);
        if (move.length() > 0) move.normalize();

        let vx = vel.x;
        let vz = vel.z;
        if (move.length() > 0.01) {
          const targetVx = move.x * GLIDE_SPEED;
          const targetVz = move.z * GLIDE_SPEED;
          const smooth = 4;
          vx += (targetVx - vx) * Math.min(1, smooth * d);
          vz += (targetVz - vz) * Math.min(1, smooth * d);
        } else {
          vx *= (1 - Math.min(1, 1.5 * d));
          vz *= (1 - Math.min(1, 1.5 * d));
        }

        vx += camDir.x * GLIDE_FORWARD_BONUS * d;
        vz += camDir.z * GLIDE_FORWARD_BONUS * d;

        const vyLerp = Math.min(1, 3.0 * d);
        const newVy = vel.y + (GLIDE_TARGET_VY - vel.y) * vyLerp;
        const clampedVy = Math.max(newVy, GLIDE_TARGET_VY - 0.5);

        playerRigidBody.setLinvel({ x: vx, y: clampedVy, z: vz }, true);
      } catch (e) {}
    }

    // ==== POSICIONA O PLANADOR ACOMPANHANDO O PLAYER ====
    if (gliderGroupRef.current && playerRigidBody) {
      try {
        const pp = playerRigidBody.translation();
        gliderGroupRef.current.position.copy(pp);

// Rotação na direção do player
        const avatarFacingRef = useGameStore.getState().avatarFacingRef;
        const yaw = avatarFacingRef?.current || 0;
        gliderGroupRef.current.rotation.y = yaw;

        // 🔥 ENQUANTO ESTÁ PLANANDO (no ar), o paraglider rotaciona para
        //    a MESMA direção que a câmera, acompanhando o sentido do movimento.
        if (open && playerRigidBody) {
          try {
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            camDir.y = 0;
            if (camDir.length() > 0.001) {
              camDir.normalize();
              const camYaw = Math.atan2(camDir.x, camDir.z);
              gliderGroupRef.current.rotation.y = camYaw;
            }
          } catch (e) {}
        }

        // 🔥 VISÍVEL SOMENTE ENQUANTO PLANADOR ESTIVER ABERTO (em uso)
        gliderGroupRef.current.visible = openAnim.current > 0.01;
      } catch (e) {}
    }

    // 🔥 LOG DE TRANSIÇÃO
    if (open !== wasOpenRef.current) {
      wasOpenRef.current = open;
      console.log(open ? '🪂 Planador ABERTO — planando!' : '🪂 Planador FECHADO');
    }
  });

  // 🔥 STEERING (CONTROLE WASD)
  useEffect(() => {
    const updateSteer = () => {
      const md = useGameStore.getState().movementDirection;
      let x = 0, z = 0;
      if (md === 'forward') z += 1;
      else if (md === 'backward') z -= 1;
      else if (md === 'left') x -= 1;
      else if (md === 'right') x += 1;
      steerRef.current = { x, z };
    };
    const iv = setInterval(updateSteer, 60);
    return () => clearInterval(iv);
  }, []);

  return (
    <group ref={gliderGroupRef} visible={false}>
      {/* 🔥 MODELO RENDERIZADO DIRETAMENTE (padrão drei) — sempre acompanha o player */}
      {scene && (
        <primitive
          object={scene}
          scale={MODEL_SCALE}
          position={[0, MODEL_POS_Y, MODEL_POS_Z]}
          rotation={[MODEL_ROT_X, MODEL_ROT_Y, MODEL_ROT_Z]}
        />
      )}
    </group>
  );
}

// 🔥 PRÉ-CARREGA O MODELO (fora do componente, uma única vez)
useGLTF.preload(GLIDER_MODEL_PATH);

export default Glider;
