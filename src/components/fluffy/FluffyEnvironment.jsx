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
  const ambientRef = useRef();

  useEffect(() => {
    scene.environmentIntensity = config.fluffyHDRIIntensity ?? 0.5;
  }, [scene, config.fluffyHDRIIntensity]);

  useFrame(({ clock }) => {
    const { angle, isNight } = getDayCycle(clock.getElapsedTime());
    const arc = isNight ? getMoonArcPosition(angle) : getSunArcPosition(angle);
    sunDir.current.set(arc.x, arc.y, arc.z).normalize();
    setCanopyLightDirectionOverride(sunDir.current);
    // 🔥 A ambiente do fluffy também respeita dia/noite: azul à noite (senão o
    //    branco constante dela engole a cor do sol noturno), branco de dia.
    if (ambientRef.current) {
      const base = config.fluffyAmbientIntensity ?? 1.5;
      if (isNight) {
        ambientRef.current.color.setRGB(0.30, 0.40, 1.6);
        ambientRef.current.intensity = base * 0.15;
      } else {
        ambientRef.current.color.setRGB(1, 1, 1);
        ambientRef.current.intensity = base;
      }
    }
  });

  return (
    <ambientLight ref={ambientRef} intensity={config.fluffyAmbientIntensity ?? 1.5} />
  );
};