import { useEffect, useRef } from "react";
import { useThree } from '@react-three/fiber'; // Para acessar a câmera (opcional)
 import useGameStore from '../hooks/useGameStore';
export function JoystickOverlay() {
  const moveActive = useRef(false);
  const moveTouchId = useRef(null);
  // Precisamos de uma referência para o player. Vamos obtê-la de um contexto ou store.
  // Por enquanto, vamos assumir que o player se registra em um store. 
  // Mas para simplificar, podemos usar um ref global. Vou usar uma solução simples: 
  // o player será acessado via store, como antes.
  // Vamos importar o store e usar playerRigidBody.
 
  const playerRigidBody = useGameStore((s) => s.playerRigidBody);

  useEffect(() => {
    console.log('🎮 JoystickOverlay montado');

    const handleTouchStart = (e) => {
      if (!playerRigidBody) {
        console.log('⏳ Aguardando playerRigidBody...');
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      // Área segura (70% inferior da tela)
      if (touch.clientY < screenH * 0.7) return;

      // Área de movimento (esquerda)
      if (touch.clientX < screenW / 2) {
        moveActive.current = true;
        moveTouchId.current = touch.identifier;
        console.log('✅ Movimento ativado');
      } 
      // Área de pulo (direita)
      else {
        console.log('🦘 Pulo');
        const vel = playerRigidBody.linvel();
        // Remove a verificação de velocidade vertical para permitir pulo mesmo em queda?
        // Vou manter, mas adicionar um log para ver se entra.
        if (Math.abs(vel.y) < 0.1) {
          playerRigidBody.setLinvel(
            { x: vel.x, y: 5, z: vel.z },
            true
          );
          console.log('✅ Pulo aplicado');
        } else {
          console.log('❌ Não pode pular (vel.y =', vel.y, ')');
        }
      }
    };

    const handleTouchMove = (e) => {
      if (!moveActive.current || !playerRigidBody || !playerRigidBody.currentMoveDir) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      // Centro da área de movimento (canto inferior esquerdo)
      const centerX = screenW / 4;
      const centerY = screenH - 100;

      // Calcula direção
      let dx = (touch.clientX - centerX) / 80;
      let dy = (touch.clientY - centerY) / 80;

      // Limita ao círculo
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 1) {
        dx /= length;
        dy /= length;
      }

      // Inverte Y e aplica
      playerRigidBody.currentMoveDir.current = { 
        x: dx, 
        z: -dy 
      };
    };

    const handleTouchEnd = (e) => {
      if (moveActive.current) {
        moveActive.current = false;
        moveTouchId.current = null;
        console.log('⏹️ Movimento parado');

        if (playerRigidBody?.currentMoveDir) {
          playerRigidBody.currentMoveDir.current = { x: 0, z: 0 };
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [playerRigidBody]);

  return null;
}