import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../hooks/useGameStore';

// Sombras por proximidade: desliga o castShadow de objetos distantes do
// jogador/câmera — a sombra deles é invisível e o pass de sombra é caro
// (cada caster redesenha o mundo no shadow map).
//
// Componentes participantes marcam `userData.shadowRadius` (em unidades)
// nos MESHES. Objetos sem essa marca mantêm o comportamento original.
//
// Histerese: liga ao entrar no raio, só desliga ao sair de raio * 1.35x —
// evita o efeito pisca-pisca de sombra na borda.
const HYSTERESIS = 1.35;
const UPDATE_EVERY = 15; // frames (~4x/s)

const _v = new THREE.Vector3();

export const DistanceShadows = () => {
  const frame = useRef(0);
  const lightRef = useRef(null);

  useFrame(({ scene }) => {
    frame.current++;
    if (frame.current % UPDATE_EVERY !== 0) return;

    const player = useGameStore.getState().playerPosition || { x: 0, y: 0, z: 0 };
    let changed = false;

    scene.traverse((obj) => {
      const radius = obj.userData?.shadowRadius;
      if (!radius) return;
      if (obj.castShadow === undefined) return;

      // Centros de instância ficam no boundingSphere (chunks de grama);
      // para o resto, usa a posição mundial do próprio objeto.
      if (obj.geometry && obj.geometry.isInstancedBufferGeometry && obj.geometry.boundingSphere) {
        _v.copy(obj.geometry.boundingSphere.center);
      } else {
        obj.getWorldPosition(_v);
      }

      const dist2 = (_v.x - player.x) * (_v.x - player.x) + (_v.z - player.z) * (_v.z - player.z);

      if (dist2 < radius * radius) {
        if (!obj.castShadow) {
          obj.castShadow = true;
          changed = true;
        }
      } else if (obj.castShadow && dist2 > (radius * HYSTERESIS) * (radius * HYSTERESIS)) {
        obj.castShadow = false;
        changed = true;
      }
    });

    // Se algum caster entrou/saiu, o shadow map precisa de uma pass nova.
    if (changed) {
      if (!lightRef.current) {
        lightRef.current = scene.getObjectByProperty('isDirectionalLight', true);
      }
      if (lightRef.current) lightRef.current.shadow.needsUpdate = true;
    }
  });

  return null;
};
