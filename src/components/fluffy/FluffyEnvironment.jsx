import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { getDayCycle, getSunArcPosition, getMoonArcPosition } from '../dayCycle';
import { setCanopyLightDirectionOverride } from './fluffyShaders';

// Aplica a config exportada do editor (scene.json) no jogo:
// - Luz ambiente com a intensidade exportada
// - environmentIntensity (HDRI) exportado
// O SOL em si NÃO é mais estático aqui: ele é substituído pelo sol dinâmico
// do WeatherController (que anda de um lado ao outro sincronizado com o ciclo
// de dia/noite, fica laranja no nascer/pôr e vira lua azul à noite).
// A direção da luz da copa fluffy é sincronizada com esse mesmo ciclo para o
// gradiente/highlight das folhas acompanhar o sol real.
export const FluffyEnvironment = ({ config = {} }) => {
  const { scene } = useThree();
  const sunDir = useRef(new THREE.Vector3());

  useEffect(() => {
    scene.environmentIntensity = config.fluffyHDRIIntensity ?? 0.5;
  }, [scene, config.fluffyHDRIIntensity]);

  useFrame(({ clock }) => {
    const { angle, isNight } = getDayCycle(clock.getElapsedTime());
    const arc = isNight ? getMoonArcPosition(angle) : getSunArcPosition(angle);
    sunDir.current.set(arc.x, arc.y, arc.z).normalize();
    setCanopyLightDirectionOverride(sunDir.current);
  });

  return (
    <ambientLight intensity={config.fluffyAmbientIntensity ?? 1.5} />
  );
};