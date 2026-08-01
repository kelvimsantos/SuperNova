import { useEffect, useRef } from 'react';
import useGameStore from '../hooks/useGameStore';

export const KeyboardControls = () => {
  const { playerRigidBody } = useGameStore();
  const mount = useGameStore((s) => s.mount);
  const setMountMoveDir = useGameStore((s) => s.setMountMoveDir);
  const mountSummon = useGameStore((s) => s.mountSummon);
  const mountStore = useGameStore((s) => s.mountStore);
  const setMountType = useGameStore((s) => s.setMountType);
  
  const isMounted = !!mount?.isActive;
  const keysPressed = useRef({
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, s: false, a: false, d: false,
    space: false
  });
  
  const moveDir = useRef({ x: 0, z: 0 });
  
  // Atualiza direção (player ou montaria)
  const updateDirection = () => {
    let x = 0, z = 0;
    if (keysPressed.current.ArrowUp || keysPressed.current.w) z += 1;
    if (keysPressed.current.ArrowDown || keysPressed.current.s) z -= 1;
    if (keysPressed.current.ArrowLeft || keysPressed.current.a) x -= 1;
    if (keysPressed.current.ArrowRight || keysPressed.current.d) x += 1;
    
    if (x !== 0 && z !== 0) {
      const len = Math.sqrt(x*x + z*z);
      x /= len;
      z /= len;
    }
    
    moveDir.current = { x, z };
    
    if (isMounted) {
      setMountMoveDir(moveDir.current);
    }
    
    if (playerRigidBody?.currentMoveDir) {
      playerRigidBody.currentMoveDir.current = moveDir.current;
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      
      // Movimento
      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        keysPressed.current.ArrowUp = true;
        keysPressed.current.w = true;
        updateDirection();
        e.preventDefault();
      }
      if (key === 'ArrowDown' || key === 's' || key === 'S') {
        keysPressed.current.ArrowDown = true;
        keysPressed.current.s = true;
        updateDirection();
        e.preventDefault();
      }
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        keysPressed.current.ArrowLeft = true;
        keysPressed.current.a = true;
        updateDirection();
        e.preventDefault();
      }
      if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        keysPressed.current.ArrowRight = true;
        keysPressed.current.d = true;
        updateDirection();
        e.preventDefault();
      }
      
      // Pulo (espaço)
      if (key === ' ' || key === 'Space') {
        keysPressed.current.space = true;
        e.preventDefault();
        
        // Pulo para montaria ou player
        if (isMounted) {
          window.dispatchEvent(new CustomEvent('mountJump'));
        } else if (playerRigidBody) {
          const vel = playerRigidBody.linvel();
          if (Math.abs(vel.y) < 1.0) {
            playerRigidBody.setLinvel({ x: vel.x, y: 8, z: vel.z }, true);
          }
        }
        keysPressed.current.space = false;
      }
      
      // Montar/Desmontar (M)
      if (key === 'm' || key === 'M') {
        e.preventDefault();
        if (isMounted) {
          mountStore();
        } else {
          mountSummon();
        }
      }
      
      // Atalhos para montarias (1, 2, 3)
      if (key === '1' || key === '2' || key === '3') {
        const mountTypes = ['horse', 'wolf', 'tiger'];
        const index = parseInt(key) - 1;
        if (index < mountTypes.length) {
          setMountType(mountTypes[index]);
          if (!isMounted) {
            mountSummon();
          }
        }
      }
    };
    
    const handleKeyUp = (e) => {
      const key = e.key;
      
      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        keysPressed.current.ArrowUp = false;
        keysPressed.current.w = false;
        updateDirection();
        e.preventDefault();
      }
      if (key === 'ArrowDown' || key === 's' || key === 'S') {
        keysPressed.current.ArrowDown = false;
        keysPressed.current.s = false;
        updateDirection();
        e.preventDefault();
      }
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        keysPressed.current.ArrowLeft = false;
        keysPressed.current.a = false;
        updateDirection();
        e.preventDefault();
      }
      if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        keysPressed.current.ArrowRight = false;
        keysPressed.current.d = false;
        updateDirection();
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isMounted, setMountMoveDir, mountSummon, mountStore, setMountType, playerRigidBody]);
  
  return null;
};