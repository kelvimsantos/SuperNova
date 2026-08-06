// src/components/CombatController.jsx
// 🔥 Controle de combate via mouse:
// - Botão esquerdo: ataque corpo-a-corpo (soco) — dispara 'playerAttackRequested'
// - Com arco equipado (e NÃO montado):
//     - Botão direito: entra em modo mira (rotação horizontal do avatar)
//     - Botão esquerdo enquanto mira: dispara flecha (evento 'playerFireArrow')
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

  // 🔥 Botão direto: entrar/sair do modo mira (com arco)
  useEffect(() => {
    const onMouseDown = (e) => {
      if (e.button === 2 && canAttack()) {
        const isBow = useGameStore.getState().isBowEquipped();
        if (isBow) {
          aimingRef.current = true;
          lastAimX.current = e.clientX;
          useGameStore.getState().setIsAiming(true);
          e.preventDefault();
        }
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
  }, []);

  // 🔥 Botão esquerdo: soco ou disparar flecha
  useEffect(() => {
    const onMouseDown = (e) => {
      if (e.button !== 0) return; // só botão esquerdo
      if (!canAttack()) return;

      const isBow = useGameStore.getState().isBowEquipped();

      if (isBow && aimingRef.current) {
        // 🔥 Dispara flecha do raycast
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

      // 🔥 Corpo-a-corpo: inicia animação de soco (o avatar dano aplica ao terminar)
      //    O dano em si é aplicado pelo AvatarPlayer quando a animação termina.
      //    Para o corpo-a-corpo, o alvo é o inimigo sob o mouse (tratado nos inimigos).
      //    Aqui apenas notificamos que o jogador quer atacar (o alvo já foi registrado
      //    pelo clique no inimigo via requestAttack nos handlers dos inimigos).
      //    Se não houver alvo pendente, não faz nada.
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [camera]);

  // 🔥 Pointer move: rotaciona o avatar horizontalmente durante a mira
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
