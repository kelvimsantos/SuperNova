import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';

/**
 * Lê currentWeather + isNight da store e atualiza
 * scene.fog (FogExp2) e scene.background dinamicamente.
 *
 * Usa useFrame para garantir que sempre sobrescreva
 * o background setado pelo WeatherController.
 *
 * Colocar DENTRO do <Canvas> (junto dos outros componentes 3D).
 */
export default function DynamicFogController() {
  const { scene } = useThree();

  const currentWeather = useGameStore((s) => s.currentWeather);
  const isNight = useGameStore((s) => s.isNight);

  // Cria o fog uma única vez
  const fogRef = useRef(null);
  if (!fogRef.current) {
    fogRef.current = new THREE.FogExp2('#caa165', 0.030);
    scene.fog = fogRef.current;
  }

  // Guarda último estado para evitar recriar objetos a cada frame
  const lastStateRef = useRef({ weather: '', night: false });
  const colorCacheRef = useRef(new THREE.Color());
  const bgCacheRef = useRef(new THREE.Color());

  useFrame(() => {
    const fog = fogRef.current;
    if (!fog) return;

    // Só recalcula se mudou
    const prev = lastStateRef.current;
    if (prev.weather === currentWeather && prev.night === isNight) return;
    prev.weather = currentWeather;
    prev.night = isNight;

    let colorHex;
    let density;

    if (isNight) {
      // 🔥 Névoa noturna azul-ROXA escura e visível (igual o nublado muda o
      //    chão de dia, a madrugada lava o cenário com azul-roxo escuro).
      colorHex = '#251a55';
      density = 0.045;
    } else {
      switch (currentWeather) {
        case 'clear':
          colorHex = '#caa165';
          density = 0.090;
          break;
        case 'windy':
          colorHex = '#37a6bc';
          density = 0.080;
          break;
        case 'cloudy':
          colorHex = '#57a2bd';
          density = 0.082;
          break;
        case 'foggy':
          colorHex = '#9ca3af';
          density = 0.080;
          break;
        case 'rainy':
        case 'heavyRain':
          colorHex = '#6b7b8d';
          density = 0.075;
          break;
        case 'snowy':
        case 'blizzard':
          colorHex = '#c8d4e0';
          density = 0.060;
          break;
        default:
          colorHex = '#caa165';
          density = 0.090;
      }
    }

    const targetColor = colorCacheRef.current.set(colorHex);
    fog.color.copy(targetColor);
    fog.density = density;

    // Na noite, deixa background preto (WeatherController cuida das estrelas)
    if (!isNight) {
      // Dia: background = cor do fog
      scene.background = bgCacheRef.current.copy(targetColor);
    }
    // Se for noite, NÃO setamos scene.background – o WeatherController
    // já faz scene.background = black + acende estrelas.
  });

  return null;
}

