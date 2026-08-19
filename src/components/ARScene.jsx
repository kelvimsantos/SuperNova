import { useRef, useEffect, useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AvatarPlayer } from './AvatarPlayer';
// 🔥 IMPORTA O PLAYER ORIGINAL
import { Player } from './Player';
import { RepositionButton } from './RepositionButton';
import useGameStore from '../hooks/useGameStore';
import { World } from './World';
import { GameGrass } from './GameGrass';
import { FluffyGrass } from './fluffy/FluffyGrass';
import { FluffyTree } from './fluffy/FluffyTree';
import { FluffyEnvironment } from './fluffy/FluffyEnvironment';
import { Html } from '@react-three/drei';
import { WeatherController } from './WeatherController';
import { VolumetricClouds } from './VolumetricClouds';
import { StarField } from './StarField';
// 🔥 ÁGUA DESATIVADA TEMPORARIAMENTE (reduzir tamanho do build). Arquivos mantidos em src/components/water/.
import { WaterExperience } from './water/WaterExperience';
import { Portal } from './Portal';
import { ItemPickup } from './items/ItemPickup';
import { EnemySpawner } from './enemies/EnemySpawner';
import { OptimizedRenderer } from './OptimizedRenderer';
//import { WorldStreamingManager } from './streaming/WorldStreamingManager';
// DistanceFogOverlay removido temporariamente (só para validar o fog nativo do Canvas).

import { sceneItems } from '../config/sceneEnemies';
import { DROPPED_ITEMS } from '../config/droppedItems';
import { QuestNPC } from './quests/QuestNPC';
import { Pet } from './pets/Pet';
//import { PetMenu } from './pets/PetMenu';
import { Mount } from './mounts/Mount';
import { Glider } from './mounts/Glider';
import { BloodEffect } from './BloodEffect';
import { BowEffect } from './BowEffect';
import { ArrowProjectile } from './ArrowProjectile';
import { CombatController } from './CombatController';
import { DistanceShadows } from './DistanceShadows';

const weatherNames = {
  clear: '☀️ Claro',
  cloudy: '☁️ Nublado',
  foggy: '🌫️ Neblina',
  windy: '💨 Ventania',
  rainy: '🌧️ Chuva',
  snowy: '❄️ Neve',
};

const cloudConfig = {
  clear:   { enabled: false, density: 0,    tiling: 4.6, speed: 2.08, scale: 90, position: [0, 0.5, 0.2] },
  cloudy:  { enabled: true,  density: 2.0,  tiling: 4.6, speed: 1.08, scale: 90, position: [0, 20.5, 3.2] },
  foggy:   { enabled: false, density: 2,    tiling: 4.6, speed: 2.08, scale: 90, position: [0, 20.5, 3.2] },
  windy:   { enabled: true,  density: 3.0,  tiling: 4.6, speed: 1.5,  scale: 90, position: [0, 20.5, 3.2] },
  rainy:   { enabled: true,  density: 3.0,  tiling: 4.6, speed: 2.5,  scale: 90, position: [0, 20.5, 3.2] },
  snowy:   { enabled: true,  density: 2.0,  tiling: 4.6, speed: 1.8,  scale: 90, position: [0, 20.5, 3.2] },
};

const ARScene = ({ userId, avatarConfig, loadingAvatar }) => {
  const { camera } = useThree();
  const worldGroupRef = useRef(null);
  const { setWorldGroupRef, playerRigidBody, setIsNight, currentScene, setPlayerPosition } = useGameStore();
  const [sceneData, setSceneData] = useState(null);
  const [grassData, setGrassData] = useState(null);
  const [fluffyData, setFluffyData] = useState(null);
  const [currentWeather, setCurrentWeather] = useState('clear');
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [isNightUI, setIsNightUI] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const enableShadows = useGameStore((s) => s.graphicsSettings)?.shadows !== false;

  // 🔥 CORREÇÃO CRÍTICA: worldGroupRef agora é setado via REF CALLBACK.
  //    Antes era um useEffect que rodava NA MONTAGEM (isLoading=true), quando
  //    o <group> ainda não existia → worldGroupRef ficava null PARA SEMPRE.
  //    Consequência: o ZombiePool/ZombieEnemy nunca achavam o terreno e os
  //    zumbis andavam flutuando a uma altura fixa (fallback do player).
  //    O callback ref roda SEMPRE que o group monta/desmonta, então o valor
  //    é atualizado corretamente quando isLoading=false e a cena aparece.
  const setWorldGroupRefCallback = useCallback((node) => {
    worldGroupRef.current = node;
    setWorldGroupRef(node);
  }, [setWorldGroupRef]);

  const renderItemsByScene = () => {
    const items = sceneItems[currentScene] || [];
    return items.map((item, index) => (
      <ItemPickup key={`scene-item-${index}`} itemId={item.id} position={item.position} autoEquip={false} />
    ));
  };

  const renderDroppedItems = () => {
    const items = DROPPED_ITEMS[currentScene] || [];
    return items.map((item, index) => (
      <ItemPickup 
        key={`dropped-${item.id}-${index}`} 
        itemId={item.id} 
        position={item.position} 
        autoEquip={item.autoEquip || false} 
      />
    ));
  };

  useEffect(() => {
    const loadScene = async () => {
      setIsLoading(true);
      try {
        let jsonPath;
        if (currentScene === 'default') {
          jsonPath = '/scene.json';
        } else {
          jsonPath = `/scenes/${currentScene}/scene.json`;
        }
        
     //   console.log(`📂 Carregando JSON: ${jsonPath}`);
        const response = await fetch(jsonPath);
        const data = await response.json();
        
     //   console.log(`✅ JSON carregado:`, data);
        setSceneData(data);
        setGrassData(data.grassInstances);
        setFluffyData(data.fluffy || null);
        
        if (playerRigidBody && data.spawnPoint) {
          const spawnPos = Array.isArray(data.spawnPoint) 
            ? { x: data.spawnPoint[0], y: data.spawnPoint[1], z: data.spawnPoint[2] }
            : data.spawnPoint;
          console.log(`🎮 Teleportando player para:`, spawnPos);
          playerRigidBody.setTranslation(spawnPos, true);
          setPlayerPosition(spawnPos);
          setCameraInitialized(false);
        } else {
          console.warn(`⚠️ Sem spawnPoint no JSON da cena: ${currentScene}`);
        }
      } catch (error) {
        console.error('Erro ao carregar cena:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadScene();
  }, [currentScene, playerRigidBody, setPlayerPosition]);

  useEffect(() => {
    if (!cameraInitialized && playerRigidBody && !isLoading) {
      const pos = playerRigidBody.translation();
      if (pos) {
        camera.position.set(pos.x + 5, pos.y + 3, pos.z + 8);
        camera.lookAt(pos.x, pos.y + 0.8, pos.z);
        setCameraInitialized(true);
      }
    }
  }, [playerRigidBody, camera, cameraInitialized, isLoading]);

  const renderNPCsFromJSON = () => {
    const npcs = sceneData?.npcs || [];
    return npcs.map((npc) => (
      <QuestNPC
        key={npc.id}
        questId={npc.questId}
        position={npc.position}
        sceneName={currentScene}
      />
    ));
  };

  // 🔥 FUNÇÃO DE TELEPORTE CORRIGIDA
 const teleportUp = useCallback(() => {
  if (!playerRigidBody) return;
  const pos = playerRigidBody.translation();
  
  // Teleporta para cima
  playerRigidBody.setTranslation({ x: pos.x, y: pos.y + 1.5, z: pos.z }, true);
  playerRigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  
  // 🔥 AGUARDA A QUEDA E USA A FUNÇÃO GLOBAL
  setTimeout(() => {
    console.log('🔧 Teleporte: ajustando ao chão...');
    
    if (window.forceSnapToGround) {
      window.forceSnapToGround();
    } else {
      // Fallback manual com ORIGEM EM Y=100
      try {
        const currentPos = playerRigidBody.translation();
        const raycaster = new THREE.Raycaster();
        const origin = new THREE.Vector3(currentPos.x, 100, currentPos.z); // ← Y=100
        const direction = new THREE.Vector3(0, -1, 0);
        raycaster.set(origin, direction);
        raycaster.far = 200;

        const allObjects = [];
        const collectObjects = (obj) => {
          if (obj.isMesh && obj.visible) allObjects.push(obj);
          if (obj.children) obj.children.forEach(child => collectObjects(child));
        };

        if (worldGroupRef.current) collectObjects(worldGroupRef.current);

        let closestHit = null;
        let closestDist = Infinity;

        for (const obj of allObjects) {
          const intersects = raycaster.intersectObject(obj, true);
          if (intersects.length > 0 && intersects[0].distance < closestDist) {
            closestDist = intersects[0].distance;
            closestHit = intersects[0];
          }
        }

        if (closestHit) {
          const groundY = closestHit.point.y;
          const targetY = groundY + 0.01;
          playerRigidBody.setTranslation(
            { x: currentPos.x, y: targetY, z: currentPos.z },
            true
          );
          playerRigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
          setPlayerPosition({ x: currentPos.x, y: targetY, z: currentPos.z });
          console.log(`🔧 Fallback teleporte: Y=${targetY.toFixed(3)}`);
        }
      } catch (e) {
        console.warn('Erro no fallback do teleporte:', e);
      }
    }
  }, 1500);
}, [playerRigidBody, setPlayerPosition]);

  const heightmap = sceneData?.terrainParams?.heightmap;
  const terrainSize = sceneData?.terrainParams?.size || 20;
  const terrainResolution = sceneData?.terrainParams?.resolution || 64;
  const cloud = cloudConfig[currentWeather] || cloudConfig.clear;

  const handleNightChange = (isNight) => {
    setIsNightUI(isNight);
    setIsNight(isNight);
  };

  useEffect(() => {
    const onTeleportUp = () => teleportUp();
    window.addEventListener('teleport-up', onTeleportUp);
    return () => window.removeEventListener('teleport-up', onTeleportUp);
  }, [playerRigidBody]);

  if (isLoading) {
    return (
      <Html center>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '20px 40px',
          borderRadius: '10px',
          color: 'white',
          fontSize: '18px'
        }}>
          Carregando {currentScene}...
        </div>
      </Html>
    );
  }

  return (
    <WeatherController
      fluffyConfig={fluffyData}
      onWeatherChange={setCurrentWeather}
      onStarsChange={setShowStars}
      onNightChange={handleNightChange}
    >
      {showStars && <StarField enabled={true} />}
        <group ref={setWorldGroupRefCallback} position={[0, 0, 0]} userData={{ isWorldGroup: true }}>
        <World />

        {/* DistanceFogOverlay removido temporariamente (só para validar o fog nativo do Canvas). */}
{/* streaming por chunk — removido, não há chunks no mundo */}
        
        {sceneData?.portals?.map(portal => (
          <Portal key={portal.id} data={portal} />
        ))}
        {grassData && heightmap && (
          <GameGrass
            instances={grassData}
            heightmap={heightmap}
            terrainSize={terrainSize}
            terrainResolution={terrainResolution}
          />
        )}
        {fluffyData && (
          <>
            <FluffyEnvironment config={fluffyData} />
            {fluffyData.showFluffyGrass && heightmap && (
              <FluffyGrass
                config={fluffyData}
                instances={fluffyData.fluffyGrassInstances}
                heightmap={heightmap}
                terrainSize={terrainSize}
                terrainResolution={terrainResolution}
              />
            )}
            {fluffyData.showFluffyTrees && (
              <FluffyTree config={fluffyData} trees={fluffyData.fluffyTrees} />
            )}
          </>
        )}
        {sceneData?.water?.map(water => (
          <WaterExperience key={water.id} obj={water} />
        ))}

        <OptimizedRenderer radius={30}>
          <EnemySpawner currentScene={currentScene} />
        </OptimizedRenderer>

<OptimizedRenderer radius={15}>
          {renderItemsByScene()}
        </OptimizedRenderer>

        <OptimizedRenderer radius={20}>
          {renderDroppedItems()}
        </OptimizedRenderer>

        <OptimizedRenderer radius={20}>
          {renderNPCsFromJSON()}
        </OptimizedRenderer>

        {/* 🔥 AVATAR PLAYER SE TIVER userId, SENÃO USA O PLAYER ORIGINAL */}
{userId ? (
          <AvatarPlayer 
            userId={userId} 
            avatarConfig={avatarConfig}
            loadingAvatar={loadingAvatar}
          />
        ) : (
          <Player />
        )}
<Mount />
        <Glider />
      </group>

      {/* 🔥 EFEITOS DE COMBATE */}
      <BloodEffect />
      <BowEffect />
      <ArrowProjectile />
      <CombatController />

{cloud.enabled && (
        <VolumetricClouds
          density={cloud.density*0.5}
          tiling={cloud.tiling}
          speed={cloud.speed}
scale={cloud.scale * 0.25}
          position={[0, 8, 0]}
          enabled={true}
          renderOrder={999}
          followPlayer={true}
          followOffset={[0, 10, 0]}
        />
      )}

<RepositionButton />
        <Pet />

        {/* 🔥 Sombras só no que está perto do jogador (distância gerenciada
            automaticamente; liga/desliga no menu Configurações) */}
        {enableShadows && <DistanceShadows />}
      
      <Html transform={false}>
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10002,
          background: 'rgba(0,0,0,0.7)',
          padding: '8px 20px',
          borderRadius: '40px',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: 20 }}>
            {isNightUI ? '🌙' : (
              currentWeather === 'clear' ? '☀️' :
              currentWeather === 'cloudy' ? '☁️' :
              currentWeather === 'rainy' ? '🌧️' :
              currentWeather === 'snowy' ? '❄️' : '🌫️'
            )}
          </span>
          <span>{weatherNames[currentWeather] || '☀️ Claro'} - {currentScene}</span>
          {cloud.enabled && <span style={{ color: '#88ff88', marginLeft: 8 }}>☁️</span>}
        </div>
      </Html>
    </WeatherController>
  );
};

export default ARScene;