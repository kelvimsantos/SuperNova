// src/components/enemies/ZombieHorde.jsx
// 🔥 Horda de zombies com Object Pooling
// - Modelo carregado UMA vez (useGLTF + preload) e clonado N vezes (esqueleto independente)
// - Cada zombie tem seu próprio AnimationMixer (animações independentes)
// - UM useFrame atualiza TODOS os zombies (não 1 useFrame por zombie)
// - Spawn/despawn = visibilidade (sem criar/destruir = sem GC pressure = sem stutter)

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';
import { ZombiePool } from './ZombiePool';

const MODEL_PATH = '/models/enemy/zombie.glb';

export function ZombieHorde({
  config = [],
  count = 8,
  respawnDelay = 3000,
  aggroRadius = 18,
  runRadius = 9,
  attackRange = 2.2,
  hitRange = 2.6,
  respawnDistance = 30,
}) {
  const groupRef = useRef(null);
  const poolRef = useRef(null);
  const initializedRef = useRef(false);
  const [poolReady, setPoolReady] = useState(false);
  const { camera } = useThree();

  // 🔥 Carrega o modelo UMA vez (cache do drei)
  const { scene, animations } = useGLTF(MODEL_PATH);

  // 🔥 Cria o pool UMA vez quando o modelo chega
  useEffect(() => {
    if (!scene || !animations || initializedRef.current) return;
    initializedRef.current = true;

    const pool = new ZombiePool({
      scene,
      animations,
      count: Math.max(count, config.length),
      respawnDelay,
      aggroRadius,
      runRadius,
      attackRange,
      hitRange,
      respawnDistance,
    });

    // Spawn inicial (todos os zombies da config da cena)
    // 🔥 Usa findFreePosition para evitar sobreposição entre zombies
    for (const c of config) {
      const entity = pool.entities.find((e) => !e.active);
      if (!entity) break;

      const baseX = Array.isArray(c.position) ? c.position[0] : (c.position.x || 0);
      const baseZ = Array.isArray(c.position) ? c.position[2] : (c.position.z || 0);
      const freePos = pool.findFreePosition(baseX, baseZ, 12);

      const pos = new THREE.Vector3(
        freePos ? freePos.x : baseX,
        freePos ? freePos.groundY + 0.05 : (Array.isArray(c.position) ? c.position[1] : (c.position.y || 0)),
        freePos ? freePos.z : baseZ
      );
      pool.spawn(entity, pos, {
        health: c.health,
        damage: c.damage,
        expReward: c.expReward,
      });
    }

    poolRef.current = pool;
    setPoolReady(true);

    // 🔥 EXPÕE FUNÇÕES GLOBAIS PARA DEBUG (como no exemplo EnemyHorde)
    window.zombieHorde = {
      spawn: (x, z) => {
        const entity = pool.entities.find((e) => !e.active);
        if (!entity) return null;
        const freePos = pool.findFreePosition(x, z, 20);
        if (!freePos) return null;
        const pos = new THREE.Vector3(freePos.x, freePos.groundY + 0.05, freePos.z);
        pool.spawn(entity, pos, { health: 80, damage: 12, expReward: 120 });
        return entity;
      },
      despawn: (id) => {
        const entity = pool.entities.find((e) => e.id === id);
        if (entity) pool.despawn(entity);
      },
      damage: (id, amount) => {
        const entity = pool.entities.find((e) => e.id === id);
        if (entity) pool.applyDamage(entity, amount);
      },
      getActive: () => pool.entities.filter((e) => e.active),
      getPool: () => pool.entities,
    };


    return () => {
      if (poolRef.current) {
        poolRef.current.dispose();
        poolRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, animations]);

  // 🔥 UM useFrame atualiza TODOS os zombies (em vez de 1 por zombie)
  useFrame((_, delta) => {
    if (!poolRef.current) return;
    const d = Math.min(delta, 0.1); // evita espiral da morte com delta alto
    poolRef.current.update(d, camera);
  });

  // 🔥 Clique: raycast contra zombies ativos (1 hit test para todos)
  useEffect(() => {
    const handleClick = (e) => {
      if (!poolRef.current) return;
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      const hit = poolRef.current.hitTest(ndcX, ndcY, camera);
      if (hit) {
        const dmg = useGameStore.getState().getPlayerDamage();
        poolRef.current.applyDamage(hit, dmg);
        window.dispatchEvent(
          new CustomEvent('combatDamage', {
            detail: {
              damage: dmg,
              position: { x: window.innerWidth / 2, y: window.innerHeight / 3 },
              isPlayer: false,
            },
          })
        );
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [camera]);

  // 🔥 Insere os clones no grupo (uma vez)
  const primitives = useMemo(() => {
    if (!poolReady || !poolRef.current) return null;
    return poolRef.current.entities.map((e) => (
      <primitive key={e.id} object={e.root} />
    ));
  }, [poolReady]);

  return <group ref={groupRef}>{primitives}</group>;
}

useGLTF.preload(MODEL_PATH);

