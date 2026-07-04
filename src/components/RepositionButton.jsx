import { Html } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Quaternion } from 'three';
import useGameStore from '../hooks/useGameStore';
import { useState, useRef, useEffect } from 'react';

export const RepositionButton = () => {
  const { camera } = useThree();
  const { playerPosition, followMode, toggleFollowMode } = useGameStore();
  const [visible, setVisible] = useState(false);

  // Offset e orientação capturados ao ativar o modo seguir
  const cameraOffset = useRef(new Vector3());
  const cameraQuat = useRef(new Quaternion());

  // Posição e orientação suavizadas (apenas para suavidade)
  const currentCameraPos = useRef(new Vector3());
  const currentCameraQuat = useRef(new Quaternion());

  const FOLLOW_SMOOTHNESS = 0.1; // ajuste conforme preferência

  // Tecla Q: mostra/oculta o botão flutuante
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'q' || e.key === 'Q') {
        setVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Botão "Aproximar" – reposiciona a câmera atrás do jogador
  const handleManualReposition = () => {
    if (!playerPosition) return;
    const playerPos = new Vector3(playerPosition.x, playerPosition.y-3, playerPosition.z);
    const defaultOffset = new Vector3(0, 3, 8); // atrás e acima
    const targetPos = playerPos.clone().add(defaultOffset);
    camera.position.copy(targetPos);
    camera.lookAt(playerPos); // orienta para o jogador
    currentCameraPos.current.copy(targetPos);
    currentCameraQuat.current.copy(camera.quaternion);

    // Se estivermos no modo seguir, atualiza o offset e a orientação capturados
    if (followMode) {
      playerPosition.y-= 5
      cameraOffset.current.copy(camera.position).sub(playerPos);
      cameraQuat.current.copy(camera.quaternion);
    }
    console.log('🔍 Câmera aproximada');
  };

  // Alterna o modo seguir
  const handleToggleFollow = () => {
    if (!followMode) {
      // Ativa o modo seguir: captura o offset e a orientação atuais
      const playerPos = new Vector3(playerPosition.x, playerPosition.y+1, playerPosition.z);
      cameraOffset.current.copy(camera.position).sub(playerPos);
      cameraQuat.current.copy(camera.quaternion);
      currentCameraPos.current.copy(camera.position);
      currentCameraQuat.current.copy(camera.quaternion);
      toggleFollowMode();
      console.log('🟢 Modo seguir ATIVADO – orientação mantida');
    } else {
      toggleFollowMode();
      
      console.log('🔴 Modo seguir DESATIVADO');
    }
    
  };

  // Modo seguir: mantém o offset e a orientação capturados
  useFrame((_, deltaTime) => {
    if (!followMode || !playerPosition) return;

    const playerPos = new Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
    const targetPos = playerPos.clone().add(cameraOffset.current);

    // Suaviza a posição
    currentCameraPos.current.lerp(targetPos, FOLLOW_SMOOTHNESS);
    // Suaviza a orientação (slerp)
    currentCameraQuat.current.slerp(cameraQuat.current, FOLLOW_SMOOTHNESS);

    camera.position.copy(currentCameraPos.current).sub;
    camera.quaternion.copy(currentCameraQuat.current);
  });

  if (!visible || !playerPosition) return null;

  // Posição do botão flutuante sobre a cabeça do jogador
  const buttonPosition = [playerPosition.x, playerPosition.y + 1.8, playerPosition.z];

  return (
    <Html
      position={buttonPosition}
      style={{ pointerEvents: 'auto' }}
      transform={false}
      occlude={false}
      zIndex={1000}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        padding: '8px 12px',
        borderRadius: '40px',
        border: '1px solid rgba(255,255,255,0.3)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        pointerEvents: 'auto',
      }}>
        <button
          onClick={handleManualReposition}
          style={{
            padding: '6px 12px',
            background: 'rgba(0,150,100,0.8)',
            border: 'none',
            borderRadius: '30px',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.target.style.background = 'rgba(0,180,120,0.9)')}
          onMouseLeave={(e) => (e.target.style.background = 'rgba(0,150,100,0.8)')}
        >
          🔍 Aproximar
        </button>
        <button
          onClick={handleToggleFollow}
          style={{
            padding: '6px 12px',
            background: followMode ? 'rgba(0,150,100,0.8)' : 'rgba(0,0,0,0.7)',
            border: 'none',
            borderRadius: '30px',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.target.style.background = followMode ? 'rgba(0,180,120,0.9)' : 'rgba(50,50,70,0.9)')}
          onMouseLeave={(e) => (e.target.style.background = followMode ? 'rgba(0,150,100,0.8)' : 'rgba(0,0,0,0.7)')}
        >
          {followMode ? '🎯 Seguir ON' : '📌 Seguir OFF'}
        </button>
      </div>
    </Html>
  );
};