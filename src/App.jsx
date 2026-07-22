// src/App.jsx
import { useState, useEffect, Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
import { MenuScreen } from './components/MenuScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { useSaveSystem } from './hooks/useSaveSystem';
import useGameStore from './hooks/useGameStore';

const ARScene = lazy(() => import('./components/ARScene'));

import { KeyboardControls } from './components/KeyboardControls';
import { JoystickVisual } from './components/JoystickVisual';
import { JoystickOverlay } from './components/JoystickOverlay';
import { SmoothTarget } from './components/SmoothTarget';
import { Inventory } from './components/inventory/Inventory';
import { HealthBar } from './components/HealthBar';
import { WarcraftWeatherHud } from './components/ui/WarcraftWeatherHud';
import { SkillTree } from './components/skills/SkillTree';
import { useSkillHotkeys } from './hooks/useSkillHotkeys';
import { RPGUI } from './components/ui/RPGUI';
import { SkillBar } from './components/ui/SkillBar';
import { CombatText } from './components/ui/CombatText';
import { GameInfo } from './components/ui/GameInfo';
import { EquipmentPanel } from './components/equipment/EquipmentPanel';
import { QuestDialogGlobal } from './components/quests/QuestDialogGlobal';
import { QuestMenu } from './components/quests/QuestMenu';
import { SaveMenu } from './components/ui/SaveMenu';
import DynamicFogController from './components/rendering/DynamicFogController';
import RadialFarFade from './components/rendering/RadialFarFade';
import './App.css';

const loadingTips = [
  '💡 Use [E] ou [I] para abrir o inventário',
  '💡 Clique nos inimigos para atacar',
  '💡 Pressione [K] para abrir habilidades',
  '💡 Pressione [J] para ver suas quests',
  '💡 Fale com NPCs para ganhar missões',
  '💡 Equipe armas melhores para mais dano',
  '💡 Colete itens brilhantes pelo chão',
  '💡 Use poções para recuperar vida',
  '💡 Salve o jogo com [F5]',
  '💡 Cada cidade tem seus próprios segredos'
];

function App() {
  const userId = new URLSearchParams(window.location.search).get('userId');

  const [avatarConfig, setAvatarConfig] = useState(null);
  const [loadingAvatar, setLoadingAvatar] = useState(true);

  const [gameState, setGameState] = useState('menu');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Preparando aventura');
  const [currentTip, setCurrentTip] = useState(loadingTips[0]);
  const [gameReady, setGameReady] = useState(false);
  
  const followMode = useGameStore((state) => state.followMode);
  const setCurrentScene = useGameStore((state) => state.setCurrentScene);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const { hasSave, loadGameData, applySaveToGame } = useSaveSystem();
  const [smoothTarget, setSmoothTarget] = useState([0, 1, 0]);

  useSkillHotkeys();

  useEffect(() => {
    if (!userId) {
      setLoadingAvatar(false);
      return;
    }

    const fetchAvatar = async () => {
      try {
        setLoadingAvatar(true);
        const response = await fetch(
          `https://nodejs-passport-login-master.onrender.com/api/avatar-config/${userId}`
        );
        
        if (!response.ok) {
          throw new Error('Erro ao buscar avatar');
        }
        
        const data = await response.json();
        console.log('✅ Avatar carregado:', data);
        setAvatarConfig(data.avatarConfig);
      } catch (error) {
        console.error('❌ Erro ao carregar avatar:', error);
        setAvatarConfig({
          skinColor: '#f1c27d',
          hairColor: '#4a2c2c',
          hairIndex: 0
        });
      } finally {
        setLoadingAvatar(false);
      }
    };

    fetchAvatar();
  }, [userId]);

  useEffect(() => {
    if (gameState === 'loading') {
      const tipInterval = setInterval(() => {
        const randomTip = loadingTips[Math.floor(Math.random() * loadingTips.length)];
        setCurrentTip(randomTip);
      }, 3000);
      return () => clearInterval(tipInterval);
    }
  }, [gameState]);

  const startGame = async (loadSave = false) => {
    setGameState('loading');
    setLoadingProgress(0);
    
    const steps = [
      { progress: 10, message: 'Inicializando sistemas' },
      { progress: 25, message: 'Carregando recursos gráficos' },
      { progress: 40, message: 'Preparando mundo 3D' },
      { progress: 55, message: 'Conjurando magias' },
      { progress: 70, message: 'Carregando personagens' },
      { progress: 85, message: 'Quase lá' },
      { progress: 95, message: 'Finalizando preparação' }
    ];

    for (const step of steps) {
      setLoadingProgress(step.progress);
      setLoadingMessage(step.message);
      await new Promise(r => setTimeout(r, 150));
    }
    
    if (loadSave && hasSave()) {
      const saveData = loadGameData();
      if (saveData) {
        applySaveToGame(saveData);
        console.log('✅ Save carregado:', saveData.player.currentScene);
      }
    }
    
    setLoadingProgress(100);
    setLoadingMessage('Pronto!');
    await new Promise(r => setTimeout(r, 500));
    
    setGameReady(true);
    setGameState('playing');
  };

  const handleNewGame = () => {
    setCurrentScene('default');
    setPlayerPosition({ x: 0, y: 15, z: 0 });
    startGame(false);
  };

  const handleLoadGame = () => {
    startGame(true);
  };

  if (gameState === 'menu') {
    return <MenuScreen onStartNewGame={handleNewGame} onLoadGame={handleLoadGame} />;
  }

  if (gameState === 'loading') {
    return (
      <LoadingScreen 
        progress={loadingProgress} 
        loadingMessage={loadingMessage}
        tip={currentTip}
      />
    );
  }

  return (
    <Suspense fallback={
      <LoadingScreen 
        progress={100} 
        loadingMessage="Iniciando o mundo..." 
        tip="Preparando a magia..." 
      />
    }>
      <SkillTree />
      <WarcraftWeatherHud />
      <HealthBar />

      <Inventory />
      <RPGUI />
      <SkillBar />
      <CombatText />
      <GameInfo />
      <EquipmentPanel />
      <QuestMenu />
      <QuestDialogGlobal />
      <SaveMenu />
      
      <KeyboardControls />
      <JoystickVisual side="left" />
      <JoystickVisual side="right" />
      <JoystickOverlay />

      <Canvas
        shadows
        camera={{ position: [8, 6, 12], fov: 60, far: 25, near: 0.5 }}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1,
        }}
      >
        <ambientLight intensity={0.2} />
        
        <Physics gravity={[0, -9.81, 0]}>
          <ARScene 
            userId={userId} 
            avatarConfig={avatarConfig} 
            loadingAvatar={loadingAvatar} 
          />
        </Physics>

        <SmoothTarget onTargetUpdate={setSmoothTarget} />

        <OrbitControls
          enabled={!followMode}
          target={smoothTarget}
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          zoomSpeed={0.6}
          rotateSpeed={0.5}
          enableDamping={true}
          dampingFactor={0.05}
        />
        <DynamicFogController />
        <RadialFarFade innerRadius={0.60} softness={0.35} maxOpacity={0.90} />
      </Canvas>
    </Suspense>
  );
}

export default App;
