// components/quests/QuestNPC.jsx
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';
import useQuestStore, { QuestStatus } from '../../hooks/useQuestStore';
import { QUESTS, checkQuestProgress } from '../../config/quests';

export const QuestNPC = ({ questId, position, sceneName }) => {
  const ref = useRef();
  const [isNear, setIsNear] = useState(false);
  const [hovered, setHovered] = useState(false);
  
  const player = useGameStore(state => state.playerRigidBody);
  const inventory = useGameStore(state => state.inventory);
  const playerKills = useGameStore(state => state.playerKills);
  
  // Store de quests
  const openQuestDialog = useQuestStore(state => state.openQuestDialog);
  const startQuest = useQuestStore(state => state.startQuest);
  const completeQuest = useQuestStore(state => state.completeQuest);
  const getQuestStatus = useQuestStore(state => state.getQuestStatus);
  const playerQuests = useQuestStore(state => state.playerQuests);
  
  const quest = QUESTS[sceneName]?.find(q => q.id === questId);
  
  // 🔥 Pega o status real do store
  const currentStatus = getQuestStatus(questId);
  
  console.log(`📌 NPC ${questId} - Status: ${currentStatus}`);
  
  useFrame(({ clock }) => {
    if (ref.current) {
      const time = clock.getElapsedTime();
      ref.current.position.y = position[1] + Math.sin(time * 2) * 0.05;
      ref.current.rotation.y = time * 0.5;
    }
  });
  
  useFrame(() => {
    if (!player) return;
    const playerPos = player.translation();
    const npcPos = ref.current?.position;
    
    if (npcPos) {
      const dx = playerPos.x - npcPos.x;
      const dz = playerPos.z - npcPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      setIsNear(distance < 2.5);
    }
  });
  
  // Verifica progresso da quest em andamento
  useEffect(() => {
    if (currentStatus === QuestStatus.IN_PROGRESS && quest) {
      const isComplete = checkQuestProgress(quest, { kills: playerKills }, inventory);
      if (isComplete && playerQuests[questId]?.status !== QuestStatus.COMPLETED) {
        completeQuest(questId);
        console.log(`✅ Quest ${quest.name} concluída!`);
      }
    }
  }, [playerKills, inventory, quest, currentStatus, questId, completeQuest, playerQuests]);
  
  const handleInteract = () => {
    if (!quest) return;
    
    console.log(`🖱️ NPC clicado: ${questId} - Status atual: ${currentStatus}`);
    
    // 🔥 Abre o diálogo com o status correto
    openQuestDialog(quest, quest.npcName, currentStatus);
  };
  
  const getNPCColor = () => {
    switch(currentStatus) {
      case QuestStatus.NOT_STARTED: return '#88ff88';  // Verde - disponível
      case QuestStatus.IN_PROGRESS: return '#ffaa44'; // Amarelo - em andamento
      case QuestStatus.COMPLETED: return '#ff4444';   // Vermelho - completar
      case QuestStatus.REWARDED: return '#888888';    // Cinza - já recompensado
      default: return '#88ff88';
    }
  };
  
  const getNPCIcon = () => {
    switch(currentStatus) {
      case QuestStatus.NOT_STARTED: return '❓';
      case QuestStatus.IN_PROGRESS: return '📜';
      case QuestStatus.COMPLETED: return '❗';
      case QuestStatus.REWARDED: return '✓';
      default: return '❓';
    }
  };
  
  return (
    <group ref={ref} position={position}>
      <Box 
        args={[0.8, 0.8, 0.8]}
        onClick={handleInteract}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial 
          color={getNPCColor()} 
          emissive={getNPCColor()} 
          emissiveIntensity={hovered ? 0.5 : 0.2} 
        />
      </Box>
      
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#ffccaa" />
      </mesh>
      
      <mesh position={[0, 0.9, 0]}>
        <coneGeometry args={[0.5, 0.4, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      <Text position={[0, 1.1, 0]} fontSize={0.3} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="black">
        {getNPCIcon()}
      </Text>
      
      {isNear && (
        <Text position={[0, 1.5, 0]} fontSize={0.18} color={getNPCColor()} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="black">
          {quest?.npcName}
        </Text>
      )}
      
      {isNear && (
        <Text position={[0, 1.3, 0]} fontSize={0.12} color="#aaa" anchorX="center" anchorY="middle">
          🖱️ Clique para falar
        </Text>
      )}
      
      {isNear && currentStatus === QuestStatus.COMPLETED && (
        <Text position={[0, 0.7, 0]} fontSize={0.12} color="#ff8888" anchorX="center" anchorY="middle">
          ✅ Quest concluída - Receba sua recompensa!
        </Text>
      )}
    </group>
  );
};