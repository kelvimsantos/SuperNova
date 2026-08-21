import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VolumetricFog } from './VolumetricFog';
import { ParticleSystem } from './ParticleSystem';
import { LightningBolt } from './LightningBolt';
import { updateWindFromWeather } from '../config/windConfig';
import useGameStore from '../hooks/useGameStore';

const weatherList = {
  clear: { 
    name: '☀️ CLARO', wind: 0.3, 
    skyColor: [0.35, 0.70, 1.00],
    particles: null, particleIntensity: 0,
    fogDensity: 0.10, fogColor: [0.70, 0.74, 0.80], fogHeight: 0.45,
    lightning: false
  },
  cloudy: {   
    name: '☁️ NUBLADO', wind: 0.5, 
    skyColor: [0.55, 0.65, 0.85],
    particles: null, particleIntensity: 0,
    fogDensity: 0.38, fogColor: [0.68, 0.71, 0.78], fogHeight: 0.65,
    lightning: false
  },
  foggy: { 
    name: '🌫️ NEBLINA DENSA', wind: 0.2, 
    skyColor: [0.70, 0.72, 0.78],
    particles: null, particleIntensity: 0,
    fogDensity: 0.98, fogColor: [0.92, 0.94, 0.98], fogHeight: 0.98,
    lightning: false
  },
  windy: { 
    name: '💨 VENTANIA', wind: 1.2, 
    skyColor: [0.45, 0.70, 0.95],
    particles: null, particleIntensity: 0,
    fogDensity: 0.18, fogColor: [0.72, 0.75, 0.82], fogHeight: 0.55,
    lightning: false
  },
  rainy: { 
    name: '🌧️ CHUVA', wind: 0.9, 
    skyColor: [0.48, 0.58, 0.72],
    particles: 'rain', particleIntensity: 0.7,
    fogDensity: 0.62, fogColor: [0.62, 0.68, 0.80], fogHeight: 0.72,
    lightning: false
  },
  heavyRain: { 
    name: '⛈️ CHUVA FORTE', wind: 1.1, 
    skyColor: [0.42, 0.52, 0.68],
    particles: 'heavyRain', particleIntensity: 0.9,
    fogDensity: 0.78, fogColor: [0.58, 0.64, 0.78], fogHeight: 0.78,
    lightning: true
  },
  snowy: { 
    name: '❄️ NEVE', wind: 0.6, 
    skyColor: [0.75, 0.80, 0.90],
    particles: 'snow', particleIntensity: 0.6,
    fogDensity: 0.55, fogColor: [0.88, 0.92, 0.99], fogHeight: 0.68,
    lightning: false
  },
  blizzard: { 
    name: '🌨️ NEVASCA', wind: 1.3, 
    skyColor: [0.70, 0.75, 0.88],
    particles: 'blizzard', particleIntensity: 0.85,
    fogDensity: 0.72, fogColor: [0.90, 0.94, 1.00], fogHeight: 0.82,
    lightning: false
  },
};

const sunColors = {
  sunrise: { r: 4.00, g: 0.30, b: 0.20, intensity: 6.20 },
  noon:    { r: 3.00, g: 3.00, b: 0.95, intensity: 5.80 },
  sunset:  { r: 4.00, g: 0.65, b: 0.35, intensity: 6.20 },
  night:   { r: 0.0,  g: 5.80, b: 10.85, intensity: 10.01 },
};

const lightningColors = {
  flash: { r: 2.0, g: 1.9, b: 1.8, intensity: 18.0 },
  afterglow: { r: 1.0, g: 0.9, b: 1.3, intensity: 4.0 }
};

const getSunColor = (angle) => {
  const sunHeight = Math.sin(angle);
  if (sunHeight > 0.6) return sunColors.noon;
  if (sunHeight > 0.2) {
    const factor = (sunHeight - 0.2) / 0.4;
    if (angle < Math.PI) {
      return {
        r: sunColors.sunrise.r + (sunColors.noon.r - sunColors.sunrise.r) * factor,
        g: sunColors.sunrise.g + (sunColors.noon.g - sunColors.sunrise.g) * factor,
        b: sunColors.sunrise.b + (sunColors.noon.b - sunColors.sunrise.b) * factor,
        intensity: sunColors.sunrise.intensity + (sunColors.noon.intensity - sunColors.sunrise.intensity) * factor,
      };
    } else {
      return {
        r: sunColors.noon.r + (sunColors.sunset.r - sunColors.noon.r) * factor,
        g: sunColors.noon.g + (sunColors.sunset.g - sunColors.noon.g) * factor,
        b: sunColors.noon.b + (sunColors.sunset.b - sunColors.noon.b) * factor,
        intensity: sunColors.noon.intensity + (sunColors.sunset.intensity - sunColors.noon.intensity) * factor,
      };
    }
  }
  return sunColors.night;
};

const getBackgroundColor = (angle, weather) => {
  const sunHeight = Math.sin(angle);
  const isDay = sunHeight > 0.2;
  const isStormy = weather.name.includes('CHUVA FORTE') || weather.name.includes('Tempestade');
  const isFoggy = weather.name.includes('NEBLINA');
  const isSnowy = weather.name.includes('NEVE') || weather.name.includes('NEVASCA');
  const isCloudy = weather.name.includes('NUBLADO');

  if (isDay) {
    if (isStormy) return new THREE.Color(0x4a5568);
    if (isFoggy) return new THREE.Color(0x9ca3af);
    if (isSnowy) return new THREE.Color(0xe2e8f0);
    if (isCloudy) return new THREE.Color(0xa0aec0);
    return new THREE.Color(0x7cb5e8);
  } else {
    if (isStormy) return new THREE.Color(0x2d3748);
    if (isFoggy) return new THREE.Color(0x4a5568);
    if (isSnowy) return new THREE.Color(0x1e293b);
    return null;
  }
};

export const WeatherController = ({ children, onWeatherChange, onNightChange, onStarsChange, fluffyConfig }) => {
  const sunLightRef = useRef();
  const ambientRef = useRef();
  const hemisphereLightRef = useRef();
  const lightningLightRef = useRef();
  const [currentWeather, setCurrentWeather] = useState('clear');

const isLightningRef = useRef(false);
  const lightningTimerRef = useRef(null);
  const strikeTimerRef = useRef(null);
  const lightningBoostRef = useRef(0);
  const [strikes, setStrikes] = useState([]);

  const setLight = useGameStore((state) => state.setLight);
  const setIsNight = useGameStore((state) => state.setIsNight);
  // 🔥 Configurações gráficas: ciclo dia/noite e sombras por proximidade
  const graphicsSettings = useGameStore((state) => state.graphicsSettings);
  const enableDayNight = graphicsSettings?.dayNightCycle !== false;
  const enableShadows = graphicsSettings?.shadows !== false;
  const enableWeatherFx = graphicsSettings?.weatherEffects !== false;

  // 🔥 Pega a altura do chão num ponto (raycast no mundo) — para os raios
  //    atingirem o terreno em lugares aleatórios.
  const findGroundAt = (x, z) => {
    try {
      const world = useGameStore.getState().worldGroupRef;
      if (!world) return null;
      const origin = new THREE.Vector3(x, 100, z);
      const raycaster = new THREE.Raycaster();
      raycaster.set(origin, new THREE.Vector3(0, -1, 0));
      raycaster.far = 200;
      const meshes = [];
      const collect = (o) => {
        if (o.isMesh && o.visible) meshes.push(o);
        if (o.children) o.children.forEach(collect);
      };
      collect(world);
      let hit = null;
      let closest = Infinity;
      for (const m of meshes) {
        const ints = raycaster.intersectObject(m, true);
        if (ints.length > 0 && ints[0].distance < closest) {
          closest = ints[0].distance;
          hit = ints[0];
        }
      }
      return hit ? hit.point.y : null;
    } catch {
      return null;
    }
  };

  const removeStrike = useCallback((id) => {
    setStrikes(prev => prev.filter(s => s.id !== id));
  }, []);

  // ⚡ Relâmpago atingindo um lugar aleatório perto do jogador
  const spawnStrike = () => {
    try {
      const pos = useGameStore.getState().playerPosition;
      if (!pos) return;
      const angle = Math.random() * Math.PI * 2;
      const radius = 12 + Math.random() * 32;
      const x = pos.x + Math.cos(angle) * radius;
      const z = pos.z + Math.sin(angle) * radius;
      const groundY = findGroundAt(x, z);
      if (groundY == null) return;
      const id = Date.now() + Math.random();
      const from = new THREE.Vector3(x, groundY + 20 + Math.random() * 10, z);
      const to = new THREE.Vector3(x, groundY, z);
      setStrikes(prev => [...prev, { id, from, to }]);
      // 🔥 Garantia de limpeza (o bolt também se remove sozinho via onDone)
      setTimeout(() => removeStrike(id), 700);
    } catch (e) {
      console.warn('Erro ao criar raio:', e);
    }
  };

  // 🔥 INTENSIDADES DO EDITOR (exportadas no scene.json junto com o fluffy).
  //    Usadas como multiplicador relativo (default do editor = 1.5 → sem
  //    alteração quando não exportadas). O sol anda pelo ciclo dia/noite,
  //    mas a intensidade da luz ambiente + direcional é a do editor.
  const ambientScale = (fluffyConfig?.fluffyAmbientIntensity ?? 1.5) / 1.5;
  const sunScale = (fluffyConfig?.fluffyDirectionalIntensity ?? 1.5) / 1.5;
  const shadowBias = fluffyConfig?.fluffyShadowBias ?? -0.0002;

  const triggerLightning = () => {
    if (!isLightningRef.current && lightningLightRef.current) {
      isLightningRef.current = true;
      // 🔥 Clarão DUPLO (relâmpago real pisca 2-3 vezes): pulso principal forte
      //    + mini pulso logo atrás + brilho residual.
      lightningLightRef.current.intensity = lightningColors.flash.intensity;
      lightningLightRef.current.color.setRGB(lightningColors.flash.r, lightningColors.flash.g, lightningColors.flash.b);
      lightningBoostRef.current = 2.5;
      if (ambientRef.current) ambientRef.current.color.setRGB(0.95, 0.98, 1.0);
      setTimeout(() => {
        if (lightningLightRef.current) {
          lightningLightRef.current.intensity = 12.0;
        }
        lightningBoostRef.current = 1.6;
        setTimeout(() => {
          if (lightningLightRef.current) {
            lightningLightRef.current.intensity = lightningColors.afterglow.intensity;
            lightningLightRef.current.color.setRGB(lightningColors.afterglow.r, lightningColors.afterglow.g, lightningColors.afterglow.b);
          }
          lightningBoostRef.current = 0.6;
          setTimeout(() => {
            isLightningRef.current = false;
            lightningBoostRef.current = 0;
            if (lightningLightRef.current) lightningLightRef.current.intensity = 0;
            if (ambientRef.current) ambientRef.current.color.setRGB(1, 1, 1);
          }, 150);
        }, 80);
      }, 70);
    }
  };

  useEffect(() => {
    const weather = weatherList[currentWeather];
    if (weather.lightning && enableWeatherFx) {
      if (lightningTimerRef.current) clearTimeout(lightningTimerRef.current);
      const scheduleLightning = () => {
        const delay = 2000 + Math.random() * 4000;
        lightningTimerRef.current = setTimeout(() => {
          triggerLightning();
          scheduleLightning();
        }, delay);
      };
      scheduleLightning();

      // ⚡ Raios atingindo lugares aleatórios (independente do flash global)
      if (strikeTimerRef.current) clearTimeout(strikeTimerRef.current);
      const scheduleStrike = () => {
        const delay = 2000 + Math.random() * 4500;
        strikeTimerRef.current = setTimeout(() => {
          spawnStrike();
          scheduleStrike();
        }, delay);
      };
      scheduleStrike();
    } else {
      if (lightningTimerRef.current) clearTimeout(lightningTimerRef.current);
      if (strikeTimerRef.current) clearTimeout(strikeTimerRef.current);
      setStrikes([]);
      if (lightningLightRef.current) lightningLightRef.current.intensity = 0;
      lightningBoostRef.current = 0;
      isLightningRef.current = false;
    }
    return () => {
      if (lightningTimerRef.current) clearTimeout(lightningTimerRef.current);
      if (strikeTimerRef.current) clearTimeout(strikeTimerRef.current);
    };
  }, [currentWeather, enableWeatherFx]);

  const CYCLE_DURATION = 1200;
  const WEATHER_INTERVAL = 240000;
  const weatherQueue = useRef(['cloudy', 'windy', 'rainy', 'heavyRain', 'snowy', 'blizzard', 'foggy']);
  let weatherIndex = 0;

  const setGameCurrentWeather = useGameStore((s) => s.setCurrentWeather);

  // 🔥 Cada clima dura 4 MINUTOS contínuos (sem corte no meio do evento):
  //    chuva/neve caem o evento inteiro. Sem timer de "voltar ao claro"
  //    brigando com o próximo clima — a fila só avança no fim de cada evento.
  useEffect(() => {
    const getNextWeather = () => {
      const next = weatherQueue.current[weatherIndex % weatherQueue.current.length];
      weatherIndex++;
      return next;
    };
    const changeWeather = () => {
      const newWeather = getNextWeather();
      setCurrentWeather(newWeather);
      if (setGameCurrentWeather) setGameCurrentWeather(newWeather);
      if (onWeatherChange) onWeatherChange(newWeather);
      const weather = weatherList[newWeather];
      console.log(`🌤️ CLIMA: ${weather.name} | Relâmpagos: ${weather.lightning ? '⚡ ATIVADO' : '❌'}`);
    };
    const interval = setInterval(changeWeather, WEATHER_INTERVAL);
    return () => clearInterval(interval);
  }, [onWeatherChange, setGameCurrentWeather]);

const nightColor = useRef(new THREE.Color(0x1a2a6a));
  const frameCount = useRef(0);

  // 🔥 Refs de throttle (evitam notificar o store / re-render sem necessidade)
  const prevLightIntensity = useRef(-1);
  const lastLightStoreUpdate = useRef(0);
  const sunDirCache = useRef(new THREE.Vector3());
  const prevStars = useRef(false);
  const prevNight = useRef(false);

  // Ciclo de clima separado em interval (não no frame loop)
  useEffect(() => {
    const weather = weatherList[currentWeather];
    const interval = setInterval(() => {
      updateWindFromWeather(currentWeather, weather.wind);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentWeather]);

  useFrame(({ scene, clock }) => {
    // Só atualiza a cada 2 frames para aliviar GPU
    frameCount.current++;
    if (frameCount.current % 2 !== 0) return;

    const weather = weatherList[currentWeather];
    const time = clock.getElapsedTime();
    const cycleTime = (time % CYCLE_DURATION) / CYCLE_DURATION;
    let angle = cycleTime * Math.PI * 2;
    // 🔥 Com o ciclo DIA/NOITE desligado, o sol fica fixo no meio-dia
    //    (dia claro constante — não tem noite nem lua).
    if (!enableDayNight) angle = Math.PI / 2;
    const sunX = Math.cos(angle) * 28;
    const sunZ = Math.sin(angle) * 28;
    const sunY = Math.sin(angle) * 18 + 6;
    const sunColor = getSunColor(angle);
    const sunHeight = Math.sin(angle);
    const isNight = sunHeight <= 0.2;

    // ===== LUZ DIRECIONAL (SOL) =====
    if (sunLightRef.current) {
      // 🔥 Sombras liga/desliga pelo menu (poupa GPU em PCs fracos)
      const wantShadow = enableShadows && sunLightRef.current.castShadow !== enableShadows;
      if (wantShadow) sunLightRef.current.castShadow = enableShadows;

      sunLightRef.current.position.set(sunX, sunY, sunZ);
      sunLightRef.current.color.setRGB(sunColor.r, sunColor.g, sunColor.b);
      let weatherIntensity = 1.0;
      if (currentWeather === 'heavyRain') weatherIntensity = 0.65;
      if (currentWeather === 'blizzard') weatherIntensity = 0.60;
      if (currentWeather === 'rainy') weatherIntensity = 0.72;
      if (currentWeather === 'snowy') weatherIntensity = 0.78;
      if (currentWeather === 'foggy') weatherIntensity = 0.58;
      if (currentWeather === 'cloudy') weatherIntensity = 0.82;
      let baseIntensity = sunColor.intensity * weatherIntensity * sunScale;

      if (isNight) {
        // 🔥 Madrugada: bem mais ESCURA e fortemente azulada
        baseIntensity = 0.22;
        sunLightRef.current.color.setRGB(0.15, 0.25, 1.8);
      }
      sunLightRef.current.intensity = baseIntensity;

      // 🔥 Só notifica o store quando a intensidade muda de verdade (~4x/s em vez de 30x/s).
      // setLight dispara re-render em todos os subscribers do store (GameGrass etc).
      const now = performance.now();
      const intensityChanged = Math.abs(prevLightIntensity.current - baseIntensity) > 0.05;
      if (intensityChanged || now - lastLightStoreUpdate.current > 250) {
        prevLightIntensity.current = baseIntensity;
        lastLightStoreUpdate.current = now;
        sunDirCache.current.set(sunX, sunY, sunZ).normalize();
        setLight(sunDirCache.current, baseIntensity, isNight ? { r: 0.25, g: 0.35, b: 1.6 } : { r: 1, g: 1, b: 1 });
      }
    }

    // ===== LUZ AMBIENTE =====
    if (ambientRef.current) {
      let ambientIntensity = (0.52 + Math.max(0, Math.sin(angle)) * 0.28) * ambientScale;
      if (isNight) ambientIntensity *= 0.25;
      // 🔥 À noite a ambiente também fica azulada (senão o branco dela engole o azul)
      if (isNight) {
        ambientRef.current.color.setRGB(0.25, 0.35, 1.6);
      } else {
        ambientRef.current.color.setRGB(1, 1, 1);
      }
      // 🔥 + boost do clarão de relâmpago (zera sozinho depois do flash)
      ambientRef.current.intensity = ambientIntensity + lightningBoostRef.current;
    }

    // ===== LUZ HEMISFÉRICA =====
    if (hemisphereLightRef.current) {
      let hemiIntensity = isNight ? 0.18 : 0.42;
      hemisphereLightRef.current.intensity = hemiIntensity + lightningBoostRef.current * 0.6;
      // 🔥 À noite, tom de céu mais azulado
      if (isNight) {
        hemisphereLightRef.current.color.setHex(0x5588ff);
        hemisphereLightRef.current.groundColor.setHex(0x2a4a88);
      } else {
        hemisphereLightRef.current.color.setHex(0x88aaff);
        hemisphereLightRef.current.groundColor.setHex(0x553322);
      }
    }

    // ===== FUNDO (usando cache de cores) =====
    const bgColor = getBackgroundColor(angle, weather);
    if (bgColor) {
      scene.background = bgColor;
      if (prevStars.current !== false) {
        prevStars.current = false;
        if (onStarsChange) onStarsChange(false);
      }
    } else {
      scene.background = nightColor.current;
      if (prevStars.current !== true) {
        prevStars.current = true;
        if (onStarsChange) onStarsChange(true);
      }
    }

    // 🔥 Só chama onNightChange/setIsNight quando o estado REALMENTE muda
    if (prevNight.current !== isNight) {
      prevNight.current = isNight;
      console.log(isNight ? '🌙 NOITE — luz azulada ativa' : '☀️ DIA — luz normal', `(dayNightCycle: ${enableDayNight})`);
      if (onNightChange) onNightChange(isNight);
      if (setIsNight) setIsNight(isNight);
    }

});

  const weather = weatherList[currentWeather];

  return (
    <>
<directionalLight
        ref={sunLightRef}
        position={[10, 15, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={120}
        shadow-camera-near={1}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={shadowBias}
      />
      <pointLight
        ref={lightningLightRef}
        position={[0, 8, 0]}
        intensity={0}
        color={0xaaccff}
        distance={90}
        decay={1.2}
      />
      {/* ⚡ Raios atingindo lugares aleatórios (leve: line segments + luz pequena) */}
      {strikes.map((strike) => (
        <LightningBolt
          key={strike.id}
          from={strike.from}
          to={strike.to}
          onDone={() => removeStrike(strike.id)}
        />
      ))}
      <ambientLight ref={ambientRef} intensity={0.52} />
      <hemisphereLight ref={hemisphereLightRef} intensity={0.42} color={0x88aaff} groundColor={0x553322} />
<VolumetricFog
        density={weather.fogDensity}
        color={weather.fogColor}
        height={weather.fogHeight}
        noiseScale={2.5}
        enabled={true}
      />
      {weather.particles && (
        <ParticleSystem
          type={weather.particles}
          intensity={weather.particleIntensity}
          windStrength={weather.wind}
          enabled={true}
        />
      )}
      {children}
    </>
  );
};
