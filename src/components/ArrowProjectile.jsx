// src/components/ArrowProjectile.jsx
// 🔥 Flecha que percorre o raycast do mouse até acertar um inimigo ou a distância máxima
// - Escuta o evento 'playerFireArrow' com { origin, direction }
// - A flecha viaja rápido; ao colidir com um inimigo (raycast contra o pool de zombies)
//   aplica dano + dispara 'combatBlood' e 'combatDamage'
import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../hooks/useGameStore';

const MAX_DISTANCE = 40;
const SOLID_HIT_DISTANCE = 0.5; // para parar num obstáculo sólido

export const ArrowProjectile = () => {
  const [arrows, setArrows] = useState([]);
  const idRef = useRef(0);

  // 🔥 Dispara uma flecha
  const fire = useCallback((origin, direction) => {
    const id = ++idRef.current;
    setArrows(prev => [...prev, {
      id,
      origin: origin.clone(),
      dir: direction.clone(),
      pos: origin.clone(),
      traveled: 0,
      hit: false,
    }]);
  }, []);

  // 🔥 Listener do evento de disparo
  useEffect(() => {
    const handler = (e) => {
      const { origin, direction } = e.detail;
      if (origin && direction) fire(origin, direction);
    };
    window.addEventListener('playerFireArrow', handler);
    return () => window.removeEventListener('playerFireArrow', handler);
  }, [fire]);

  // 🔥 Anima as flechas
  useFrame((_, delta) => {
    if (arrows.length === 0) return;

    const speed = 40;
    const raycaster = new THREE.Raycaster();
    const _tmp = new THREE.Vector3();

    const alive = [];
    for (const a of arrows) {
      if (a.hit) continue;

      // Move a flecha
      const step = speed * delta;
      a.traveled += step;
      a.pos.addScaledVector(a.dir, step);

      // Finaliza quando percorre a distância máxima
      if (a.traveled >= MAX_DISTANCE) {
        alive.push({ ...a, hit: true, done: true });
        continue;
      }

      // 🔥 Raycast contra zombies (pool) — usa o zombieHorde global
      let hitEnemy = false;
      const horde = window.zombieHorde;
      if (horde && horde.getActive) {
        const zombies = horde.getActive();
        for (const z of zombies) {
          const dx = a.pos.x - z.pos.x;
          const dy = a.pos.y - (z.pos.y + 1.1);
          const dz = a.pos.z - z.pos.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < 0.8) {
            hitEnemy = true;
            const dmg = useGameStore.getState().getPlayerDamage();
            horde.damage(z.id, dmg);
            window.dispatchEvent(new CustomEvent('combatBlood', {
              detail: { position: { x: a.pos.x, y: a.pos.y, z: a.pos.z } },
            }));
            window.dispatchEvent(new CustomEvent('combatDamage', {
              detail: {
                damage: dmg,
                position: { x: window.innerWidth / 2, y: window.innerHeight / 3 },
                isPlayer: false,
              },
            }));
            break;
          }
        }
      }

      // Raycast contra o terreno (para a flecha perfurar no chão)
      if (!hitEnemy) {
        const worldGroup = useGameStore.getState().worldGroupRef;
        if (worldGroup) {
          raycaster.set(a.pos, a.dir);
          _tmp.copy(a.pos).addScaledVector(a.dir, -SOLID_HIT_DISTANCE);
          raycaster.far = SOLID_HIT_DISTANCE;
          const allMeshes = [];
          worldGroup.traverse((o) => {
            if (o.isMesh && o.userData.isTerrain) allMeshes.push(o);
          });
          if (allMeshes.length > 0) {
            const hits = raycaster.intersectObjects(allMeshes, false);
            if (hits.length > 0) {
              hitEnemy = true;
            }
          }
        }
      }

      alive.push({ ...a, hit: hitEnemy, done: !hitEnemy ? false : true });
    }

    // Remove flechas que já colidiram
    setArrows(prev => prev.filter(a => !a.hit));
    if (alive.some(a => a.done)) {
      // Flechas que colidiram ficam um instante então somem
    }
  });

  // Renderiza flechas
  if (arrows.length === 0) return null;

  return (
    <group>
      {arrows.map(a => (
        <mesh key={a.id} position={a.pos.toArray()}>
          <boxGeometry args={[0.05, 0.05, 0.6]} />
          <meshStandardMaterial color="#8B5A2B" emissive="#ffaa00" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
};

export default ArrowProjectile;
