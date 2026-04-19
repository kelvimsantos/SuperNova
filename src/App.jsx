import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
import ARScene from './components/ARScene';
import { JoystickVisual } from './components/JoystickVisual';
import { JoystickOverlay } from './components/JoystickOverlay';
import { KeyboardControls } from './components/KeyboardControls';
import { SmoothTarget } from './components/SmoothTarget';
import useGameStore from './hooks/useGameStore';
import { useState } from 'react';
import './App.css';
import { Inventory } from './components/inventory/Inventory';
import { HealthBar } from './components/HealthBar';
import { SkillTree } from './components/skills/SkillTree';
import { useSkillHotkeys } from './hooks/useSkillHotkeys';
import { RPGUI } from './components/ui/RPGUI';
import { SkillBar } from './components/ui/SkillBar';
import { CombatText } from './components/ui/CombatText';
import { GameInfo } from './components/ui/GameInfo';
function App() {
  const followMode = useGameStore((state) => state.followMode);
  const [smoothTarget, setSmoothTarget] = useState([0, 1, 0]);
  
  // Ativa o sistema de teclas de atalho
  useSkillHotkeys();
  
  return (
    <>

     
      {/* Controles de movimento */}
      <KeyboardControls />
      <JoystickVisual side="left" />
      <JoystickVisual side="right" />
      <JoystickOverlay />

      {/* 🔥 UI Elements - TODOS fora do Canvas */}
      <SkillTree />
      <HealthBar />
      <Inventory />
      <RPGUI />
      <SkillBar />
      <CombatText />
      
     
      {/* Canvas 3D - SÓ COMPONENTES 3D AQUI */}
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

      
      <GameInfo />
    </>
  );
}

export default App;