import { useEffect, useRef } from 'react';
import useGameStore from '../hooks/useGameStore';

export const KeyboardControls = () => {
  const { playerRigidBody } = useGameStore();
  const keysPressed = useRef({
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, s: false, a: false, d: false,
    space: false
  });
  
  const moveDir = useRef({ x: 0, z: 0 });
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      
      // Movimento
      if (key === 'ArrowUp' || key === 'w' || key === 'W') keysPressed.current.ArrowUp = true;
      if (key === 'ArrowDown' || key === 's' || key === 'S') keysPressed.current.ArrowDown = true;
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') keysPressed.current.ArrowLeft = true;
      if (key === 'ArrowRight' || key === 'd' || key === 'D') keysPressed.current.ArrowRight = true;
      
      // Pulo
      if (key === ' ' || key === 'Space') {
        keysPressed.current.space = true;
        e.preventDefault();
      }
    };
    
    const handleKeyUp = (e) => {
      const key = e.key;
      
      if (key === 'ArrowUp' || key === 'w' || key === 'W') keysPressed.current.ArrowUp = false;
      if (key === 'ArrowDown' || key === 's' || key === 'S') keysPressed.current.ArrowDown = false;
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') keysPressed.current.ArrowLeft = false;
      if (key === 'ArrowRight' || key === 'd' || key === 'D') keysPressed.current.ArrowRight = false;
      
      if (key === ' ' || key === 'Space') {
        keysPressed.current.space = false;
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Atualiza direção do movimento a cada frame
  useEffect(() => {
    let animationId;
    
    const updateMovement = () => {
      if (playerRigidBody) {
        let x = 0, z = 0;
        
        if (keysPressed.current.ArrowUp) z += 1;
        if (keysPressed.current.ArrowDown) z -= 1;
        if (keysPressed.current.ArrowLeft) x -= 1;
        if (keysPressed.current.ArrowRight) x += 1;
        
        // Normaliza diagonal
        if (x !== 0 && z !== 0) {
          const len = Math.sqrt(x*x + z*z);
          x /= len;
          z /= len;
        }
        
        moveDir.current = { x, z };
        
        // Atualiza o playerRigidBody com a direção
        if (playerRigidBody.currentMoveDir) {
          playerRigidBody.currentMoveDir.current = moveDir.current;
        }
        
        // Pulo
        if (keysPressed.current.space && playerRigidBody) {
          const vel = playerRigidBody.linvel();
          if (Math.abs(vel.y) < 0.2) {
            playerRigidBody.setLinvel({ x: vel.x, y: 5, z: vel.z }, true);
          }
          keysPressed.current.space = false; // Evita pulo contínuo
        }
      }
      
      animationId = requestAnimationFrame(updateMovement);
    };
    
    animationId = requestAnimationFrame(updateMovement);
    return () => cancelAnimationFrame(animationId);
  }, [playerRigidBody]);
  
  return null;
};