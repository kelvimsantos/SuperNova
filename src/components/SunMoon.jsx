import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../hooks/useGameStore';
import { getDayCycle, getSunArcPosition, getMoonArcPosition } from './dayCycle';

// Sol e lua VISÍVEIS no céu, sincronizados com o ciclo de dia/noite.
// O sol cruza o céu de um lado ao outro (laranja no nascer/pôr, branco no
// zênite); a lua sobe no lado oposto durante a noite, azulada, e ambos
// acompanham o jogador para estarem sempre ativos à vista.
export const SunMoon = () => {
  const sunRef = useRef();
  const moonRef = useRef();
  const colorCache = useRef(new THREE.Color());

  const sunMatRef = useRef(
    new THREE.MeshBasicMaterial({
      color: '#ffb35c',
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
      toneMapped: false,
    })
  );
  const moonMatRef = useRef(
    new THREE.MeshBasicMaterial({
      color: '#9db4ff',
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
      toneMapped: false,
    })
  );

  useFrame(({ clock }) => {
    if (!sunRef.current || !moonRef.current) return;

    const { angle, sunHeight, isNight } = getDayCycle(clock.getElapsedTime());
    const player = useGameStore.getState().playerPosition || { x: 0, y: 0, z: 0 };

    // ===== SOL (dia) =====
    const sp = getSunArcPosition(angle);
    sunRef.current.position.set(player.x + sp.x, player.y + sp.y, player.z + sp.z);

    // Laranja perto do horizonte → branco-amarelado no zênite
    const t = Math.min(1, Math.max(0, (sunHeight - 0.05) / 0.45));
    colorCache.current.setRGB(1.0, 0.48 + t * 0.5, 0.26 + t * 0.6);
    sunMatRef.current.color.copy(colorCache.current);
    sunMatRef.current.opacity = Math.min(1, Math.max(0, sunHeight / 0.45));

    // ===== LUA (noite) =====
    const mp = getMoonArcPosition(angle);
    moonRef.current.position.set(player.x + mp.x, player.y + mp.y, player.z + mp.z);

    const moonHeight = Math.sin(angle - Math.PI);
    moonMatRef.current.opacity = isNight
      ? Math.min(1, Math.max(0, moonHeight / 0.4))
      : 0;
  });

  return (
    <group>
      <mesh ref={sunRef} material={sunMatRef.current} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[3, 16, 16]} />
      </mesh>
      <mesh ref={moonRef} material={moonMatRef.current} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[2.2, 16, 16]} />
      </mesh>
    </group>
  );
};