import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Box, Text, Ring } from '@react-three/drei';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';
import { ItemDatabase } from '../inventory/ItemTypes';
import { generateDrops } from '../../config/droppedItems';

// Geometrias compartilhadas (não recriar a cada render)
const sharedSphereGeo = new THREE.SphereGeometry(0.6, 16, 16);
const sharedEyeGeo = new THREE.SphereGeometry(0.12, 12, 12);
const sharedPupilGeo = new THREE.SphereGeometry(0.06, 12, 12);
const sharedOrbGeo = new THREE.SphereGeometry(0.15, 12, 12);
// 🔥 Geometrias de HP bar (compartilhadas — não recriar a cada render)
const sharedHpBgGeo = new THREE.BoxGeometry(1.2, 0.12, 0.1);
const sharedHpFillGeo = new THREE.BoxGeometry(1.2, 0.12, 0.1);

export const SlimeEnemy = ({
  id,
  position, 
  health = 25, 
  damage = 8,
  attackRange = 2.5,
  expReward = 50,
  dropItems = ['small_health_potion', 'golden_coin'],
  onDeath
}) => {
  const ref = useRef();
  const [currentHealth, setCurrentHealth] = useState(health);
  const [isDead, setIsDead] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [isInRange, setIsInRange] = useState(false);
  
  const player = useGameStore(state => state.playerRigidBody);
  const takeDamage = useGameStore(state => state.takeDamage);
  const addToInventory = useGameStore(state => state.addToInventory);
  const addExp = useGameStore(state => state.addExp);
  const attackTimer = useRef(0);
  // 🔥 isInRange em ref (evita re-render por frame; só re-render na transição)
  const inRangeRef = useRef(false);
  
  // 🔥 Função para obter posição da câmera para o texto de dano
  const getScreenPosition = () => {
    return { x: window.innerWidth / 2, y: window.innerHeight / 3 };
  };
  
  // Animação de flutuação/rotação DESATIVADA
  // useFrame(({ clock }) => {
  //   if (ref.current && !isDead) {
  //     const time = clock.getElapsedTime();
  //     ref.current.position.y = position[1] + Math.sin(time * 3) * 0.1;
  //     ref.current.rotation.y = time;
  //   }
  // });

  
  // Verifica distância
  useFrame(() => {
    if (isDead || !player) return;
    
    const playerPos = player.translation();
    const enemyPos = ref.current?.position;
    
    if (enemyPos) {
      const dx = playerPos.x - enemyPos.x;
      const dz = playerPos.z - enemyPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // 🔥 Só seta estado React quando muda de fato (evita re-render por frame)
      const inRange = distance < attackRange;
      if (inRangeRef.current !== inRange) {
        inRangeRef.current = inRange;
        setIsInRange(inRange);
      }
      
      if (distance < attackRange) {
        attackTimer.current += 0.016;
        if (attackTimer.current > 1) {
          attackTimer.current = 0;
          takeDamage(damage);
          console.log(`💥 Slime atacou! Dano: ${damage}`);
          
          window.dispatchEvent(new CustomEvent('combatDamage', { 
            detail: { 
              damage: damage, 
              position: getScreenPosition(),
              isPlayer: true
            }
          }));
        }
      } else {
        attackTimer.current = 0;
      }
    }
  });
  
  const attack = () => {
    if (isDead) return;

    // 🔥 SÓ REGISTRA O ATAQUE — o dano + sangue só ocorrem quando a
    //    animação de soco do avatar terminar (AvatarPlayer → applyPendingDamage).
    const distanceCheck = () => {
      if (player) {
        const playerPos = player.translation();
        const enemyPos = ref.current?.position;
        if (enemyPos) {
          const dx = playerPos.x - enemyPos.x;
          const dz = playerPos.z - enemyPos.z;
          return Math.sqrt(dx * dx + dz * dz);
        }
      }
      return 0;
    };

    if (distanceCheck() > attackRange) {
      console.log(`⚠️ Muito longe para atacar!`);
      return;
    }

    // 🔥 Registra alvo pendente (a animação de soco começa, o dano vem depois)
    const store = useGameStore.getState();
    const dmg = store.getPlayerDamage();

    const targetObj = {
      applyDamage: (amount) => {
        const newHealth = Math.max(0, currentHealth - amount);
        setCurrentHealth(newHealth);
        setHitFlash(true);
        setTimeout(() => setHitFlash(false), 150);

        // Sangue no inimigo
        if (ref.current) {
          const p = ref.current.position;
          window.dispatchEvent(new CustomEvent('combatBlood', {
            detail: { position: { x: p.x, y: p.y + 0.4, z: p.z } },
          }));
        }

        if (ref.current) {
          ref.current.children.forEach(child => {
            if (child.isMesh && child.material) {
              child.material.emissiveIntensity = 1;
              setTimeout(() => {
                if (child.material) child.material.emissiveIntensity = 0;
              }, 150);
            }
          });
        }

        if (newHealth <= 0) {
          die();
        }
      },
      position: ref.current ? {
        x: ref.current.position.x,
        y: ref.current.position.y + 0.4,
        z: ref.current.position.z,
      } : null,
    };

    // 🔥 Seleciona o slime como alvo (para hotkeys aplicarem poderes)
    store.setSelectedTarget(targetObj);
    store.requestAttack(targetObj);

    // 🔥 O AvatarPlayer dispara 'combatDamage' quando a animação termina,
    //    então não duplicamos o texto de dano aqui.
  };
  
  const die = () => {
    setIsDead(true);
    console.log('💀 Slime derrotado!');
    
    // 🔥 DAR XP
    addExp(expReward);
    console.log(`✨ +${expReward} XP!`);
    
    window.dispatchEvent(new CustomEvent('combatExp', { 
      detail: { 
        amount: expReward, 
        position: getScreenPosition()
      }
    }));
    
    // 🔥 DROPS ALEATÓRIOS
    const drops = generateDrops('slime');
    drops.forEach(drop => {
      const itemInfo = ItemDatabase[drop.id];
      if (itemInfo) {
        for (let i = 0; i < (drop.quantity || 1); i++) {
          addToInventory({
            ...itemInfo,
            quantity: 1,
          });
          console.log(`🎁 Recebeu: ${itemInfo.name}`);
        }
      }
    });
    
    // 🔥 REGISTRA KILL PARA QUESTS
 //const kills = useGameStore.getState().playerKills || {};
 //const newKills = { ...kills, slime: (kills.slime || 0) + 1 };
 //useGameStore.getState().setPlayerKills(newKills);
  
  const addKill = useGameStore.getState().addKill;
  addKill('slime');
  console.log(`📊 Kills de slime: ${useGameStore.getState().getKills('slime')}`);
  
    // 🔥 NOTIFICAR MORTE PARA RESPAWN
    if (onDeath) {
      onDeath();
    }
  };
  
  if (isDead) return null;
  
  const bodyColor = hitFlash ? '#ff8888' : '#44ff44';
  
  return (
    <group ref={ref} position={position}>
      {isHovered && (
        <Ring 
          args={[attackRange - 0.2, attackRange, 32]} 
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.05, 0]}
        >
          <meshStandardMaterial color={isInRange ? '#44ff44' : '#ff4444'} emissiveIntensity={0.3} transparent opacity={0.5} />
        </Ring>
      )}
      
      <Sphere 
        args={[0.6, 32, 32]}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        onClick={attack}
        onContextMenu={(ev) => {
          ev.nativeEvent.preventDefault();
          ev.stopPropagation();
          attack();
        }}
      >
        <meshStandardMaterial 
          color={bodyColor}
          emissive="#226622"
          emissiveIntensity={0.3}
          metalness={0.1}
          roughness={0.3}
        />
      </Sphere>
      
      {/* Olhos */}
      <mesh position={[0.2, 0.2, 0.6]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.2, 0.2, 0.6]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      
      {/* Pupilas */}
      <mesh position={[0.22, 0.18, 0.65]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[-0.18, 0.18, 0.65]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      
      {/* Barra de HP */}
      <group position={[0, 0.9, 0]}>
        <Box args={[1.2, 0.12, 0.1]}>
          <meshStandardMaterial color="#333333" />
        </Box>
        <Box 
          args={[(currentHealth / health) * 1.2, 0.12, 0.1]} 
          position={[-(1.2 - (currentHealth / health) * 1.2) / 2, 0, 0]}
        >
          <meshStandardMaterial color="#ff3333" />
        </Box>
      </group>
      
      {isHovered && (
        <>
          <Text position={[0, 1.3, 0]} fontSize={0.16} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="black">
            🟢 Slime | ❤️ {Math.max(0, Math.floor(currentHealth))}
          </Text>
          <Text position={[0, 1.0, 0]} fontSize={0.12} color={isInRange ? "#88ff88" : "#ff8888"} anchorX="center" anchorY="middle">
            {isInRange ? "🖱️ Clique para atacar" : "🔴 Aproxime-se para atacar"}
          </Text>
        </>
      )}
    </group>
  );
};