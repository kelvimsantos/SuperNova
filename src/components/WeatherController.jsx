import React, { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VolumetricFog } from './VolumetricFog';
import { ParticleSystem } from './ParticleSystem';
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
  flash: { r: 1.2, g: 1.1, b: 1.0, intensity: 3.5 },
  afterglow: { r: 0.8, g: 0.7, b: 1.0, intensity: 1.2 }
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

export const WeatherController = ({ children, onWeatherChange, onNightChange, onStarsChange }) => {
  const sunLightRef = useRef();
  const ambientRef = useRef();
  const hemisphereLightRef = useRef();
  const lightningLightRef = useRef();
  const [currentWeather, setCurrentWeather] = useState('clear');

const isLightningRef = useRef(false);
  const lightningTimerRef = useRef(null);
  const weatherResetTimeoutRef = useRef(null);

  const setLight = useGameStore((state) => state.setLight);
  const setIsNight = useGameStore((state) => state.setIsNight);

  const triggerLightning = () => {
    if (!isLightningRef.current && lightningLightRef.current) {
      isLightningRef.current = true;
      lightningLightRef.current.intensity = lightningColors.flash.intensity;
      lightningLightRef.current.color.setRGB(lightningColors.flash.r, lightningColors.flash.g, lightningColors.flash.b);
      setTimeout(() => {
        if (lightningLightRef.current) {
          lightningLightRef.current.intensity = lightningColors.afterglow.intensity;
          lightningLightRef.current.color.setRGB(lightningColors.afterglow.r, lightningColors.afterglow.g, lightningColors.afterglow.b);
        }
        setTimeout(() => {
          isLightningRef.current = false;
          if (lightningLightRef.current) lightningLightRef.current.intensity = 0;
        }, 150);
      }, 100);
    }
  };

  useEffect(() => {
    const weather = weatherList[currentWeather];
    if (weather.lightning) {
      if (lightningTimerRef.current) clearTimeout(lightningTimerRef.current);
      const scheduleLightning = () => {
        const delay = 3000 + Math.random() * 5000;
        lightningTimerRef.current = setTimeout(() => {
          triggerLightning();
          scheduleLightning();
        }, delay);
      };
      scheduleLightning();
    } else {
      if (lightningTimerRef.current) clearTimeout(lightningTimerRef.current);
      if (lightningLightRef.current) lightningLightRef.current.intensity = 0;
      isLightningRef.current = false;
    }
    return () => { if (lightningTimerRef.current) clearTimeout(lightningTimerRef.current); };
  }, [currentWeather]);

  const CYCLE_DURATION = 1200;
  const WEATHER_INTERVAL = 120000;
  const WEATHER_DURATION = 240000;
  const weatherQueue = useRef(['cloudy', 'windy', 'rainy', 'heavyRain', 'snowy', 'blizzard', 'foggy']);
  let weatherIndex = 0;

  const setGameCurrentWeather = useGameStore((s) => s.setCurrentWeather);

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
      if (weatherResetTimeoutRef.current) clearTimeout(weatherResetTimeoutRef.current);
      weatherResetTimeoutRef.current = setTimeout(() => {
        setCurrentWeather('clear');
        if (setGameCurrentWeather) setGameCurrentWeather('clear');
        if (onWeatherChange) onWeatherChange('clear');
        console.log(`🌤️ CLIMA: Voltou ao normal (Claro)`);
      }, WEATHER_DURATION);
    };
    const interval = setInterval(changeWeather, WEATHER_INTERVAL);
    return () => {
      clearInterval(interval);
      if (weatherResetTimeoutRef.current) clearTimeout(weatherResetTimeoutRef.current);
    };
  }, [onWeatherChange, setGameCurrentWeather]);

const nightColor = useRef(new THREE.Color(0x000000));
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
    const angle = cycleTime * Math.PI * 2;
    const sunX = Math.cos(angle) * 28;
    const sunZ = Math.sin(angle) * 28;
    const sunY = Math.sin(angle) * 18 + 6;
    const sunColor = getSunColor(angle);
    const sunHeight = Math.sin(angle);
    const isNight = sunHeight <= 0.2;

    // ===== LUZ DIRECIONAL (SOL) =====
    if (sunLightRef.current) {
      sunLightRef.current.position.set(sunX, sunY, sunZ);
      sunLightRef.current.color.setRGB(sunColor.r, sunColor.g, sunColor.b);
      let weatherIntensity = 1.0;
      if (currentWeather === 'heavyRain') weatherIntensity = 0.65;
      if (currentWeather === 'blizzard') weatherIntensity = 0.60;
      if (currentWeather === 'rainy') weatherIntensity = 0.72;
      if (currentWeather === 'snowy') weatherIntensity = 0.78;
      if (currentWeather === 'foggy') weatherIntensity = 0.58;
      if (currentWeather === 'cloudy') weatherIntensity = 0.82;
      let baseIntensity = sunColor.intensity * weatherIntensity;

      if (isNight) {
        baseIntensity = 0.08;
        sunLightRef.current.color.setRGB(0.3, 0.35, 0.8);
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
        setLight(sunDirCache.current, baseIntensity);
      }
    }

    // ===== LUZ AMBIENTE =====
    if (ambientRef.current) {
      let ambientIntensity = 0.52 + Math.max(0, Math.sin(angle)) * 0.28;
      if (isNight) ambientIntensity *= 0.08;
      ambientRef.current.intensity = ambientIntensity;
    }

    // ===== LUZ HEMISFÉRICA =====
    if (hemisphereLightRef.current) {
      hemisphereLightRef.current.intensity = isNight ? 0.05 : 0.42;
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
        shadow-mapSize-width={256}
        shadow-mapSize-height={256}
        shadow-camera-far={30}
      />
      <pointLight
        ref={lightningLightRef}
        position={[0, 8, 0]}
        intensity={0}
        color={0xaaccff}
        distance={50}
        decay={1.5}
      />
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
