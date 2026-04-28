// App.jsx
import { useState, useEffect, Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
import { MenuScreen } from './components/MenuScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { useSaveSystem } from './hooks/useSaveSystem';
import useGameStore from './hooks/useGameStore';

// Carregamento assíncrono do jogo principal (SÓ CARREGA QUANDO PRECISAR)
const ARScene = lazy(() => import('./components/ARScene'));

// Componentes UI (são leves, carregam normalmente)
import { KeyboardControls } from './components/KeyboardControls';
import { JoystickVisual } from './components/JoystickVisual';
import { JoystickOverlay } from './components/JoystickOverlay';
import { SmoothTarget } from './components/SmoothTarget';
import { Inventory } from './components/inventory/Inventory';
import { HealthBar } from './components/HealthBar';
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
import './App.css';

// Dicas para a tela de loading
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
  const [gameState, setGameState] = useState('menu'); // 'menu', 'loading', 'playing'
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Preparando aventura');
  const [currentTip, setCurrentTip] = useState(loadingTips[0]);
  const [gameReady, setGameReady] = useState(false);
  
  const followMode = useGameStore((state) => state.followMode);
  const setCurrentScene = useGameStore((state) => state.setCurrentScene);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const { hasSave, loadGameData, applySaveToGame, getSaveInfo } = useSaveSystem();
  const [smoothTarget, setSmoothTarget] = useState([0, 1, 0]);

  useSkillHotkeys();

  // Sorteia uma dica diferente a cada 10% de progresso
  useEffect(() => {
    if (gameState === 'loading') {
      const tipInterval = setInterval(() => {
        const randomTip = loadingTips[Math.floor(Math.random() * loadingTips.length)];
        setCurrentTip(randomTip);
      }, 3000);
      return () => clearInterval(tipInterval);
    }
  }, [gameState]);

  // 🔥 CARREGAMENTO ASSÍNCRONO DO JOGO
  const startGame = async (loadSave = false) => {
    setGameState('loading');
    setLoadingProgress(0);
    
    // Simula etapas de carregamento (você pode conectar com carregamento real)
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
    
    // Carrega save se necessário
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
    // Reseta para a cena inicial
    setCurrentScene('default');
    setPlayerPosition({ x: 0, y: 15, z: 0 });
    startGame(false);
  };

  const handleLoadGame = () => {
    startGame(true);
  };

  // Tela de Menu
  if (gameState === 'menu') {
    return <MenuScreen onStartNewGame={handleNewGame} onLoadGame={handleLoadGame} />;
  }

  // Tela de Loading
  if (gameState === 'loading') {
    return (
      <LoadingScreen 
        progress={loadingProgress} 
        loadingMessage={loadingMessage}
        tip={currentTip}
      />
    );
  }

  // 🔥 JOGO PRINCIPAL (carregado assincronamente com Suspense)
  return (
    <Suspense fallback={
      <LoadingScreen 
        progress={100} 
        loadingMessage="Iniciando o mundo..." 
        tip="Preparando a magia..." 
      />
    }>
      {/* UI Elements */}
      <SkillTree />
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
      
      {/* Controles */}
      <KeyboardControls />
      <JoystickVisual side="left" />
      <JoystickVisual side="right" />
      <JoystickOverlay />

      {/* Canvas 3D */}
      <Canvas
        shadows
        camera={{ position: [8, 6, 12], fov: 60 }}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1,
        }}
      >
        <ambientLight intensity={0.5} />
        
        <Physics gravity={[0, -9.81, 0]}>
          <ARScene />
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
      </Canvas>
    </Suspense>
  );
}

export default App;