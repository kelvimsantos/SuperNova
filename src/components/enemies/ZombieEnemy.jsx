// components/enemies/ZombieEnemy.jsx
import { useRef, useEffect, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Raycaster, Vector3 } from 'three';
import useGameStore from '../../hooks/useGameStore';
import { ItemDatabase } from '../inventory/ItemTypes';
import { generateDrops } from '../../config/droppedItems';

const MODEL_PATH = '/models/enemy/zombie.glb';

// Pequeno offset para apoiar os pés no chão (o modelo tem pés em y≈0)
const GROUND_OFFSET = 0.05;

// Mapa de animações do modelo (nomes vistos no binário do glb)
const ANIM = {
  idle: 'zombie_02_Idle',
  walk: 'zombie_02_Walk',
  run: 'zombie_02_Run',
  attack: 'zombie_02_Attack',
  death: 'zombie_02_Death',
};

/**
 * ZombieEnemy
 * Máquina de estados:
 *   idle  → fora do raio de aggro (parado)
 *   walk  → player entrou no aggro (anda atrás)
 *   run   → player ficou mais perto (corre)
 *   attack→ perto o suficiente (para, ataca; golpe aplica dano)
 *   hit   → levou dano antes de atacar (fica idle por um curto tempo)
 *   death → vida zerou (anima morte, espera, renasce mais longe)
 *
 * Otimizado: sem setState por frame (usa refs); raycast de relevo com throttle.
 */
export const ZombieEnemy = ({
  id,
  position = [0, 0, 0],
  health = 80,
  damage = 12,
  expReward = 120,
  dropItems = ['golden_coin', 'small_health_potion'],
  onDeath,
  aggroRadius = 18,
  runRadius = 9,
  attackRange = 2.2,
  hitRange = 2.6,
  respawnDistance = 30,
  respawnDelay = 3000,
}) => {
  const groupRef = useRef();
  const modelGroupRef = useRef();
  const modelRef = useRef();
  const hpBarRef = useRef();
  const hpFillRef = useRef();

  const [isHovered, setIsHovered] = useState(false);

  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, modelRef);

  // 🔥 REFS DE ESTADO (sem re-render por frame)
  const stateRef = useRef('idle');
  const healthRef = useRef(health);
  const maxHealthRef = useRef(health);
  const positionRef = useRef(new Vector3(...position));
  const isDeadRef = useRef(false);
  const hitCooldownRef = useRef(0);
  const attackTimerRef = useRef(0);
  const attackHitDoneRef = useRef(false);
  const respawnTimerRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastGroundYRef = useRef(null);
  const hitScaleRef = useRef(0);
  const currentAnim = useRef(null);

  const worldGroupRef = useGameStore((s) => s.worldGroupRef);

  // Raycaster reaproveitado (evita alocação por frame)
  const rayRef = useRef({
    raycaster: new Raycaster(),
    origin: new Vector3(),
    dir: new Vector3(0, -1, 0),
    objects: [],
  });

  const playAnim = useCallback((name) => {
    if (!actions) return;
    const key = ANIM[name];
    if (!key || currentAnim.current === key) return;
    const action = actions[key];
    if (!action) return;
    Object.values(actions).forEach((a) => a.stop());
    action.reset().play();
    currentAnim.current = key;
  }, [actions]);

  // 🔥 SEGUIR RELEVO: raycast único para baixo (throttle no useFrame)
  const findGroundY = useCallback((x, z) => {
    if (!worldGroupRef?.current) return null;
    const { raycaster, origin, dir, objects } = rayRef.current;
    origin.set(x, 100, z);
    raycaster.set(origin, dir);
    raycaster.far = 200;

    objects.length = 0;
    const collect = (obj) => {
      if (obj.isMesh && obj.visible) objects.push(obj);
      if (obj.children) obj.children.forEach(collect);
    };
    collect(worldGroupRef.current);

    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < objects.length; i++) {
      const hits = raycaster.intersectObject(objects[i], true);
      if (hits.length > 0 && hits[0].distance < bestD) {
        bestD = hits[0].distance;
        best = hits[0];
      }
    }
    return best ? best.point.y : null;
  }, [worldGroupRef]);

  // 🔥 RENASCER EM POSIÇÃO DISTANTE DO PLAYER
  const respawn = useCallback(() => {
    const playerPos = useGameStore.getState().playerPosition;
    const angle = Math.random() * Math.PI * 2;
    const dist = respawnDistance + Math.random() * 12;
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;
    const groundY = findGroundY(x, z);
    const y = groundY !== null ? groundY + GROUND_OFFSET : 15;

    positionRef.current.set(x, y, z);
    healthRef.current = maxHealthRef.current;
    isDeadRef.current = false;
    stateRef.current = 'idle';
    attackTimerRef.current = 0;
    attackHitDoneRef.current = false;
    hitCooldownRef.current = 0;

    if (groupRef.current) {
      groupRef.current.visible = true;
      groupRef.current.position.copy(positionRef.current);
      groupRef.current.rotation.y = 0;
    }
    if (modelGroupRef.current) modelGroupRef.current.scale.set(1, 1, 1);
    playAnim('idle');
  }, [findGroundY, playAnim, respawnDistance]);

  // 🔥 MORTE: XP + kills + drops + respawn distante
  const die = useCallback(() => {
    if (isDeadRef.current) return;
    isDeadRef.current = true;
    stateRef.current = 'death';
    playAnim('death');

    const store = useGameStore.getState();
    store.addExp(expReward);
    store.addKill('zombie');

    // Drops aleatórios (config em config/droppedItems.js → ENEMY_DROPS.zombie)
    const drops = generateDrops('zombie');
    drops.forEach((drop) => {
      const itemInfo = ItemDatabase[drop.id];
      if (itemInfo) {
        for (let i = 0; i < (drop.quantity || 1); i++) {
          store.addToInventory({ ...itemInfo, quantity: 1 });
        }
      }
    });

    // Some visualmente depois de um tempo
    setTimeout(() => {
      if (groupRef.current) groupRef.current.visible = false;
    }, 600);

    // Renasce mais longe depois de respawnDelay
    respawnTimerRef.current = setTimeout(() => {
      respawn();
    }, respawnDelay);

    if (onDeath) onDeath();
  }, [expReward, onDeath, playAnim, respawn, respawnDelay]);

  // 🔥 APLICAR DANO (com hit reaction: fica idle por um curto tempo)
  const applyDamage = useCallback((amount) => {
    if (isDeadRef.current) return;
    healthRef.current = Math.max(0, healthRef.current - amount);

    // Hit reaction: interrompe ataque e fica idle por 0.6s
    stateRef.current = 'hit';
    hitCooldownRef.current = 0.6;
    attackTimerRef.current = 0;
    attackHitDoneRef.current = false;
    playAnim('idle');
    hitScaleRef.current = 0.18;

    if (healthRef.current <= 0) {
      die();
    }
  }, [die, playAnim]);

  // 🔥 CLIQUE DO JOGADOR (dano baseado nos atributos do player)
  const handleClick = useCallback(() => {
    if (isDeadRef.current) return;
    const dmg = useGameStore.getState().getPlayerDamage();
    applyDamage(dmg);
    window.dispatchEvent(new CustomEvent('combatDamage', {
      detail: {
        damage: dmg,
        position: { x: window.innerWidth / 2, y: window.innerHeight / 3 },
        isPlayer: false,
      },
    }));
  }, [applyDamage]);

  // Inicializa apoiado no chão
  useEffect(() => {
    const groundY = findGroundY(position[0], position[2]);
    if (groundY !== null) {
      lastGroundYRef.current = groundY;
      positionRef.current.set(position[0], groundY + GROUND_OFFSET, position[2]);
    }
    if (groupRef.current) {
      groupRef.current.position.copy(positionRef.current);
    }
    playAnim('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpeza de timers
  useEffect(() => {
    return () => {
      if (respawnTimerRef.current) clearTimeout(respawnTimerRef.current);
    };
  }, []);

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return;
    frameCountRef.current++;

    const playerPos = useGameStore.getState().playerPosition;
    if (!playerPos) return;

    const dx = playerPos.x - positionRef.current.x;
    const dz = playerPos.z - positionRef.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const state = stateRef.current;

    // ===== MORTE =====
    if (state === 'death') {
      playAnim('death');
      return;
    }

    // ===== HIT (idle curto após levar dano) =====
    if (state === 'hit') {
      hitCooldownRef.current -= delta;
      playAnim('idle');
      if (hitCooldownRef.current <= 0) {
        if (dist <= attackRange) {
          stateRef.current = 'attack';
          attackTimerRef.current = 0;
          attackHitDoneRef.current = false;
        } else if (dist <= runRadius) {
          stateRef.current = 'run';
        } else if (dist <= aggroRadius) {
          stateRef.current = 'walk';
        } else {
          stateRef.current = 'idle';
        }
      }
      // ainda assim segue relevo
      updateMovementAndGround(delta, dist, dx, dz, camera);
      return;
    }

    // ===== ATAQUE =====
    if (state === 'attack') {
      playAnim('attack');
      attackTimerRef.current += delta;

      // Momento do golpe (no meio da animação)
      if (!attackHitDoneRef.current && attackTimerRef.current > 0.4) {
        attackHitDoneRef.current = true;
        if (dist <= hitRange) {
          useGameStore.getState().takeDamage(damage);
          window.dispatchEvent(new CustomEvent('combatDamage', {
            detail: {
              damage,
              position: { x: window.innerWidth / 2, y: window.innerHeight / 3 },
              isPlayer: true,
            },
          }));
        }
      }

      // Fim do ataque: se ainda perto, ataca de novo; senão persegue
      if (attackTimerRef.current > 1.0) {
        attackTimerRef.current = 0;
        attackHitDoneRef.current = false;
        if (dist <= attackRange) {
          stateRef.current = 'attack';
        } else {
          stateRef.current = 'walk';
        }
      }

      updateMovementAndGround(delta, dist, dx, dz, camera);
      return;
    }

    // ===== IDLE / WALK / RUN (decisão de estado) =====
    if (state === 'idle') {
      if (dist <= attackRange) {
        stateRef.current = 'attack';
        attackTimerRef.current = 0;
        attackHitDoneRef.current = false;
      } else if (dist <= runRadius) {
        stateRef.current = 'run';
      } else if (dist <= aggroRadius) {
        stateRef.current = 'walk';
      }
    } else if (state === 'walk') {
      if (dist <= attackRange) {
        stateRef.current = 'attack';
        attackTimerRef.current = 0;
        attackHitDoneRef.current = false;
      } else if (dist <= runRadius) {
        stateRef.current = 'run';
      } else if (dist > aggroRadius) {
        stateRef.current = 'idle';
      }
    } else if (state === 'run') {
      if (dist <= attackRange) {
        stateRef.current = 'attack';
        attackTimerRef.current = 0;
        attackHitDoneRef.current = false;
      } else if (dist > aggroRadius) {
        stateRef.current = 'idle';
      }
    }

    updateMovementAndGround(delta, dist, dx, dz, camera);
  });

  // 🔥 MOVIMENTO + RELEVO + HP + FLASH + BILLBOARD (chamado por frame)
  const updateMovementAndGround = (delta, dist, dx, dz, camera) => {
    const state = stateRef.current;

    // Movimento
    if (state === 'walk' || state === 'run') {
      const speed = state === 'run' ? 4 : 1.8;
      const inv = dist > 0.001 ? 1 / dist : 0;
      const dirX = dx * inv;
      const dirZ = dz * inv;

      positionRef.current.x += dirX * speed * delta;
      positionRef.current.z += dirZ * speed * delta;

      // Rotação suave na direção do jogador
      const targetAngle = Math.atan2(dirX, dirZ);
      let angleDiff = targetAngle - groupRef.current.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      groupRef.current.rotation.y += angleDiff * 0.15;

      playAnim(state);
    }

    // Seguir relevo (raycast throttle: a cada 12 frames)
    if (frameCountRef.current % 12 === 0) {
      const gy = findGroundY(positionRef.current.x, positionRef.current.z);
      if (gy !== null) lastGroundYRef.current = gy;
    }
    if (lastGroundYRef.current !== null) {
      positionRef.current.y = lastGroundYRef.current + GROUND_OFFSET;
    }

    groupRef.current.position.copy(positionRef.current);

    // Hit flash (escala de soco)
    if (modelGroupRef.current) {
      if (hitScaleRef.current > 0) {
        hitScaleRef.current = Math.max(0, hitScaleRef.current - delta * 1.5);
        const s = 1 + hitScaleRef.current;
        modelGroupRef.current.scale.set(s, s, s);
      } else {
        modelGroupRef.current.scale.set(1, 1, 1);
      }
    }

    // Barra de HP (billboard + largura proporcional)
    if (hpBarRef.current) {
      hpBarRef.current.visible = healthRef.current < maxHealthRef.current || isHovered;
      hpBarRef.current.quaternion.copy(camera.quaternion);
      if (hpFillRef.current) {
        const pct = Math.max(0, healthRef.current / maxHealthRef.current);
        hpFillRef.current.scale.x = Math.max(0.001, pct);
        hpFillRef.current.position.x = -(1 - pct) / 2;
      }
    }
  };

  return (
    <group ref={groupRef} position={positionRef.current.toArray()}>
      {/* Modelo (escala para flash de dano) */}
      <group
        ref={modelGroupRef}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        <primitive object={scene} ref={modelRef} />
      </group>

      {/* Barra de HP */}
      <group ref={hpBarRef} position={[0, 1.95, 0]}>
        <mesh renderOrder={999}>
          <planeGeometry args={[1, 0.12]} />
          <meshBasicMaterial color="#222222" depthTest={false} transparent opacity={0.8} />
        </mesh>
        <mesh ref={hpFillRef} position={[0, 0, 0.001]} renderOrder={1000}>
          <planeGeometry args={[1, 0.12]} />
          <meshBasicMaterial color="#ff2222" depthTest={false} />
        </mesh>
      </group>
    </group>
  );
};

useGLTF.preload(MODEL_PATH);

