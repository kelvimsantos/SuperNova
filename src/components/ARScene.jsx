import { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Player } from './Player';
import { LoadedScene } from './LoadedScene';
import { RepositionButton } from './RepositionButton';
import useGameStore from '../hooks/useGameStore';
import { World } from './World';
import { GameGrass } from './GameGrass';
import { Html } from '@react-three/drei';
import { WeatherController } from './WeatherController';
import { VolumetricClouds } from './VolumetricClouds';
import { StarField } from './StarField';

const weatherNames = {
  clear: '☀️ Claro',
  cloudy: '☁️ Nublado',
  foggy: '🌫️ Neblina',
  windy: '💨 Ventania',
  rainy: '🌧️ Chuva',
  snowy: '❄️ Neve',
};

const cloudConfig = {
  clear:   { enabled: false, density: 0,    tiling: 4.6, speed: 2.08, scale: 10, position: [0, 0.5, 0.2] },
  cloudy:  { enabled: true,  density: 2.2,  tiling: 4.6, speed: 2.08, scale: 10, position: [0, 4.5, 3.2] },
  foggy:   { enabled: false, density: 0,    tiling: 4.6, speed: 2.08, scale: 10, position: [0, 4.5, 3.2] },
  windy:   { enabled: true,  density: 2.0,  tiling: 4.6, speed: 3.5,  scale: 10, position: [0, 4.5, 3.2] },
  rainy:   { enabled: true,  density: 2.5,  tiling: 4.6, speed: 2.5,  scale: 10, position: [0, 4.5, 3.2] },
  snowy:   { enabled: true,  density: 2.3,  tiling: 4.6, speed: 1.8,  scale: 10, position: [0, 4.5, 3.2] },
};

const ARScene = () => {
  const { camera } = useThree();
  const worldGroupRef = useRef(null);
  const { setWorldGroupRef, playerRigidBody, setIsNight } = useGameStore();
  const [sceneData, setSceneData] = useState(null);
  const [grassData, setGrassData] = useState(null);
  const [currentWeather, setCurrentWeather] = useState('clear');
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [isNightUI, setIsNightUI] = useState(false);

  useEffect(() => {
    setWorldGroupRef(worldGroupRef.current);
  }, [setWorldGroupRef]);

  useEffect(() => {
    fetch('/scene.json')
      .then(res => res.json())
      .then(data => {
        setSceneData(data);
        setGrassData(data.grassInstances);
      })
      .catch(err => console.error('Erro ao carregar cena:', err));
  }, []);

  useEffect(() => {
    if (!cameraInitialized && playerRigidBody) {
      const pos = playerRigidBody.translation();
      if (pos && (pos.x !== 0 || pos.z !== 0)) {
        camera.position.set(pos.x + 5, 6, pos.z + 8);
        camera.lookAt(pos.x, pos.y + 0.8, pos.z);
        setCameraInitialized(true);
      }
    }
  }, [playerRigidBody, camera, cameraInitialized]);

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

  return (
    <WeatherController
      onWeatherChange={setCurrentWeather}
      onStarsChange={setShowStars}
      onNightChange={handleNightChange}
    >
      {showStars && <StarField enabled={true} />}
      {cloud.enabled && (
        <VolumetricClouds
          density={cloud.density}
          tiling={cloud.tiling}
          speed={cloud.speed}
          scale={cloud.scale * 2}
          position={[0, 5.8, -8.2]}
          enabled={true}
        />
      )}
      <group ref={worldGroupRef} position={[0, -1, -9]} userData={{ isWorldGroup: true }}>
        <World />
        {sceneData && <LoadedScene sceneData={sceneData} />}
        {grassData && heightmap && (
          <GameGrass
            instances={grassData}
            heightmap={heightmap}
            terrainSize={terrainSize}
            terrainResolution={terrainResolution}
          />
        )}
        <Player />
      </group>
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
          <span>{weatherNames[currentWeather] || '☀️ Claro'}</span>
          {cloud.enabled && <span style={{ color: '#88ff88', marginLeft: 8 }}>☁️</span>}
        </div>
      </Html>
    </WeatherController>
  );
};

export default ARScene;