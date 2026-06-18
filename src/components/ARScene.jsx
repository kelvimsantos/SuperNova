// src/components/ARScene.jsx
import { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AvatarPlayer } from './AvatarPlayer';
// 🔥 IMPORTA O PLAYER ORIGINAL
import { Player } from './Player';
import { RepositionButton } from './RepositionButton';
import useGameStore from '../hooks/useGameStore';
import { World } from './World';
import { GameGrass } from './GameGrass';
import { Html } from '@react-three/drei';
import { WeatherController } from './WeatherController';
import { VolumetricClouds } from './VolumetricClouds';
import { StarField } from './StarField';
import { WaterExperience } from './water/WaterExperience';
import { Portal } from './Portal';
import { ItemPickup } from './items/ItemPickup';
import { EnemySpawner } from './enemies/EnemySpawner';
import { sceneItems } from '../config/sceneEnemies';
import { DROPPED_ITEMS } from '../config/droppedItems';
import { QuestNPC } from './quests/QuestNPC';

const weatherNames = {
  clear: '☀️ Claro',
  cloudy: '☁️ Nublado',
  foggy: '🌫️ Neblina',
  windy: '💨 Ventania',
  rainy: '🌧️ Chuva',
  snowy: '❄️ Neve',
};

const cloudConfig = {
  clear:   { enabled: false, density: 0,    tiling: 5.6, speed: 2.08, scale: 70, position: [0, 0.5, 0.2] },
  cloudy:  { enabled: true,  density: 1.7 ,  tiling: 5.6, speed: 1.08, scale: 70, position: [0, 20.5, 3.2] },
  foggy:   { enabled: false, density: 0,    tiling: 5.6, speed: 2.08, scale: 70, position: [0, 20.5, 3.2] },
  windy:   { enabled: true,  density: 2.0,  tiling: 5.6, speed: 1.5,  scale: 70, position: [0, 20.5, 3.2] },
  rainy:   { enabled: true,  density: 2.5,  tiling: 5.6, speed: 2.5,  scale: 70, position: [0, 20.5, 3.2] },
  snowy:   { enabled: true,  density: 2.3,  tiling: 5.6, speed: 1.8,  scale: 70, position: [0, 20.5, 3.2] },
};

const ARScene = ({ userId, avatarConfig, loadingAvatar }) => {
  const { camera } = useThree();
  const worldGroupRef = useRef(null);
  const { setWorldGroupRef, playerRigidBody, setIsNight, currentScene, setPlayerPosition } = useGameStore();
  const [sceneData, setSceneData] = useState(null);
  const [grassData, setGrassData] = useState(null);
  const [currentWeather, setCurrentWeather] = useState('clear');
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [isNightUI, setIsNightUI] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setWorldGroupRef(worldGroupRef.current);  
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
        
        console.log(`📂 Carregando JSON: ${jsonPath}`);
        const response = await fetch(jsonPath);
        const data = await response.json();
        
        console.log(`✅ JSON carregado:`, data);
        setSceneData(data);
        setGrassData(data.grassInstances);
        
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
        console.log(`📷 Posição do player para câmera:`, pos);
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

  const teleportUp = () => {
    if (!playerRigidBody) return;
    const pos = playerRigidBody.translation();
    playerRigidBody.setTranslation({ x: pos.x, y: pos.y + 10, z: pos.z }, true);
  };

  const heightmap = sceneData?.terrainParams?.heightmap;
  const terrainSize = sceneData?.terrainParams?.size || 20;
  const terrainResolution = sceneData?.terrainParams?.resolution || 64;
  const cloud = cloudConfig[currentWeather] || cloudConfig.clear;

  const handleNightChange = (isNight) => {
    setIsNightUI(isNight);
    setIsNight(isNight);
  };

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
      onWeatherChange={setCurrentWeather}
      onStarsChange={setShowStars}
      onNightChange={handleNightChange}
    >
      {showStars && <StarField enabled={true} />}
      <group ref={worldGroupRef} position={[0, 0, 0]} userData={{ isWorldGroup: true }}>
        <World />
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
        {sceneData?.water?.map(water => (
          <WaterExperience key={water.id} obj={water} />
        ))}

        <EnemySpawner currentScene={currentScene} />
        {renderItemsByScene()}
        {renderDroppedItems()}
        {renderNPCsFromJSON()}

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
      </group>

      {cloud.enabled && (
        <VolumetricClouds
          density={cloud.density}
          tiling={cloud.tiling}
          speed={cloud.speed}
          scale={cloud.scale * 2}
          position={[0, 5.8, -8.2]}
          enabled={true}
          renderOrder={999}
        />
      )}
      
      <RepositionButton />
      
      <Html transform={false}>
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 10002,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <button 
            onClick={teleportUp}
            style={{
              padding: '12px 24px',
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '40px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(0,100,200,0.8)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.75)'}
          >
            ⬆️ Teleportar
          </button>
        </div>
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