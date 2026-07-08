// components/enemies/Enemy.jsx
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';
import { ItemDatabase } from '../inventory/ItemTypes';

export const Enemy = ({ 
  position, 
  health = 30, 
  damage = 10,
  color = '#ff4444',
  dropItems = ['small_health_potion', 'golden_coin'],
  name = 'Inimigo'
}) => {
  const ref = useRef();
  const [currentHealth, setCurrentHealth] = useState(health);
  const [isDead, setIsDead] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hitEffect, setHitEffect] = useState(0);
  const player = useGameStore(state => state.playerRigidBody);
  const playerHealth = useGameStore(state => state.playerHealth);
  const takeDamage = useGameStore(state => state.takeDamage);
  const addToInventory = useGameStore(state => state.addToInventory);
  
  // Referência para o raycaster de clique
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  
  // Animação flutuante DESATIVADA (remover bobbing/rotação)
  // useFrame(({ clock }) => {
  //   if (ref.current && !isDead) {
  //     const time = clock.getElapsedTime();
  //     ref.current.position.y = position[1] + Math.sin(time * 2) * 0.1;
  //   }
  // });

  
  // Efeito de dano visual
  useFrame(() => {
    if (hitEffect > 0) {
      setHitEffect(prev => Math.max(0, prev - 0.05));
    }
  });
  
  // Verifica clique do mouse no inimigo
  useEffect(() => {
    const handleClick = (event) => {
      if (isDead) return;
      
      // Coordenadas do mouse
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      raycaster.current.setFromCamera(mouse.current, window.currentCamera);
      
      if (ref.current) {
        const intersects = raycaster.current.intersectObject(ref.current, true);
        if (intersects.length > 0) {
          attack();
        }
      }
    };
    
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isDead]);
  
  const attack = () => {
    console.log(`⚔️ Atacando ${name}!`);
    const newHealth = currentHealth - 15; // Dano do player
    setCurrentHealth(newHealth);
    setHitEffect(0.8);
    
    // Efeito visual de dano
    if (ref.current) {
      ref.current.children.forEach(child => {
        if (child.isMesh && child.material) {
          child.material.emissiveIntensity = 0.8;
          setTimeout(() => {
            if (child.material) child.material.emissiveIntensity = 0;
          }, 200);
        }
      });
    }
    
    if (newHealth <= 0) {
      die();
    }
  };
  
  const die = () => {
    console.log(`💀 ${name} morreu! Dropando itens...`);
    setIsDead(true);
    
    // Dropar itens
    if (dropItems && dropItems.length > 0) {
      dropItems.forEach(itemId => {
        const itemInfo = ItemDatabase[itemId];
        if (itemInfo) {
          addToInventory({
            ...itemInfo,
            quantity: 1,
          });
          console.log(`🎁 Recebeu: ${itemInfo.name}`);
        }
      });
    }
    
    // Remove o inimigo após 0.5 segundos
    setTimeout(() => {
      if (ref.current) {
        ref.current.visible = false;
      }
    }, 500);
  };
  
  // Ataque do inimigo no player (quando estiver perto)
  useFrame(() => {
    if (isDead || !player) return;
    
    const playerPos = player.translation();
    const enemyPos = ref.current?.position;
    
    if (enemyPos) {
      const dx = playerPos.x - enemyPos.x;
      const dz = playerPos.z - enemyPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 2) {
        // Ataca o player
        takeDamage(damage * 0.05); // Dano reduzido por frame
      }
    }
  });
  
  // Cor do material baseada no hit effect
  const materialColor = hitEffect > 0 ? '#ffffff' : color;
  const materialEmissive = hitEffect > 0 ? '#ff0000' : '#330000';
  
  if (isDead) return null;
  
  return (
    <group ref={ref} position={position}>
      {/* Corpo do inimigo */}
      <Box 
        args={[0.8, 0.8, 0.8]}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
      >
        <meshStandardMaterial 
          color={materialColor}
          emissive={materialEmissive}
          emissiveIntensity={hitEffect > 0 ? 0.8 : 0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </Box>
      
      {/* Olhos */}
      <mesh position={[0.25, 0.25, 0.41]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.25, 0.25, 0.41]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Barra de HP */}
      <group position={[0, 0.7, 0]}>
        <Box args={[1, 0.1, 0.1]}>
          <meshStandardMaterial color="#333333" />
        </Box>
        <Box 
          args={[(currentHealth / health), 0.1, 0.1]} 
          position={[-(1 - (currentHealth / health)) / 2, 0, 0]}
        >
          <meshStandardMaterial color="#ff3333" />
        </Box>
      </group>
      
      {/* Texto flutuante ao passar o mouse */}
      {isHovered && (
        <Text
          position={[0, 1, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {name} ❤️ {Math.max(0, Math.floor(currentHealth))}
        </Text>
      )}
    </group>
  );
};