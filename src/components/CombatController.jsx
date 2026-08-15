// src/components/CombatController.jsx
// 🔥 Controle de combate via mouse:
// - Botão esquerdo: ataque corpo-a-corpo (soco) — dispara 'playerAttackRequested'
// - Com arco equipado (e NÃO montado):
//     - Botão direito no inimigo: seleciona alvo, vira avatar, toca animação "Mira-arco"
//       Ao terminar a animação, dispara raycast no alvo e aplica dano
//     - Botão direito no vazio: entra em modo mira livre (rotação horizontal do avatar)
//     - Botão esquerdo enquanto mira livre: dispara flecha (evento 'playerFireArrow')
// - Só ataca se NÃO estiver montado
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../hooks/useGameStore';

export const CombatController = () => {
  const { camera } = useThree();
  const aimingRef = useRef(false);
  const lastAimX = useRef(0);

  // 🔥 Verifica se pode atacar (não montado)
  const canAttack = () => {
    const mount = useGameStore.getState().mount;
    return !(mount?.isActive);
  };

  // 🔥 Botão direito: clique no inimigo = seleciona alvo (com arco dispara animação Mira-arco)
  // Clique no vazio com arco = modo mira livre
  useEffect(() => {
    const onMouseDown = (e) => {
      if (e.button !== 2) return;
      if (!canAttack()) return;

      const isBow = useGameStore.getState().isBowEquipped();

      // 🔥 Usa o hitTest do pool (confiável, baseado na posição real dos zombies)
      const horde = window.zombieHorde;
      if (horde && horde.hitTest) {
        const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
        const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
        const hit = horde.hitTest(ndcX, ndcY, camera);
        if (hit) {
          // 🔥 Seleciona o zombie como alvo (para animação + hotkeys)
          const store = useGameStore.getState();
          store.setSelectedTarget(hit);
          store.setPendingTarget(hit);
          if (isBow) {
            // Com arco: dispara evento para AvatarPlayer iniciar animação Mira-arco
            window.dispatchEvent(new CustomEvent('playerBowAttackRequested', { detail: { target: hit } }));
          } else {
            // Sem arco: ataque corpo-a-corpo (dano imediato via handler do AvatarPlayer)
            window.dispatchEvent(new CustomEvent('playerAttackRequested', { detail: { target: hit } }));
          }
          e.preventDefault();
          return;
        }
      }

      // 🔥 Clicou no vazio — entra em modo mira livre (só com arco)
      if (isBow) {
        aimingRef.current = true;
        lastAimX.current = e.clientX;
        useGameStore.getState().setIsAiming(true);
        e.preventDefault();
      }
    };

    const onMouseUp = (e) => {
      if (e.button === 2) {
        aimingRef.current = false;
        useGameStore.getState().setIsAiming(false);
      }
    };

    const onContextMenu = (e) => {
      e.preventDefault();
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, [camera]);

  // 🔥 Botão esquerdo: disparar flecha (modo mira livre)
  useEffect(() => {
    const onMouseDown = (e) => {
      if (e.button !== 0) return; // só botão esquerdo
      if (!canAttack()) return;

      const isBow = useGameStore.getState().isBowEquipped();

      if (isBow && aimingRef.current) {
        // 🔥 Dispara flecha do raycast (modo mira livre)
        const origin = camera.position.clone();
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        direction.normalize();

        window.dispatchEvent(new CustomEvent('playerFireArrow', {
          detail: { origin, direction },
        }));
        e.preventDefault();
        return;
      }
      // 🔥 Sem arco: corpo-a-corpo é tratado pelo onClick do inimigo (ZombieEnemy) 
      //    ou pelo botão direito (que faz hitTest e dispara playerAttackRequested)
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [camera]);

  // 🔥 Pointer move: rotaciona o avatar horizontalmente durante a mira livre
  useEffect(() => {
    const onPointerMove = (e) => {
      if (!aimingRef.current) return;
      const dx = e.clientX - lastAimX.current;
      lastAimX.current = e.clientX;

      // Notifica o AvatarPlayer para rotacionar (apenas Y / horizontal)
      window.dispatchEvent(new CustomEvent('playerAim', {
        detail: { dx },
      }));
    };

    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  return null;
};

export default CombatController;
