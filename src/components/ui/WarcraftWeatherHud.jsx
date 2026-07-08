import React, { useEffect, useMemo, useState } from 'react';

import useGameStore from '../../hooks/useGameStore';
import { PetMenuFixed } from '../pets/PetMenuFixed';
import './WarcraftWeatherHud.css';

const wcIcons = {
  day: '☀️',
  night: '🌙',
  snow: '❄️',
  rain: '🌧️',
  windy: '💨',
  storm: '⛈️',
  blizzard: '🌨️',
};

const weatherToCategory = (w) => {
  // Normaliza o state do WeatherController (que pode ser heavyRain/blizzard)
  // para as categorias que o HUD sabe exibir.
  // Mantemos: clear/cloudy/foggy/windy/rainy/snowy + mapeamentos para stormy.
  switch (w) {
    case 'clear':
      return 'clear';
    case 'cloudy':
      return 'cloudy';
    case 'foggy':
      return 'foggy';
    case 'windy':
      return 'windy';
    case 'rainy':
      return 'rainy';
    case 'heavyRain':
      return 'stormy';
    case 'snowy':
      return 'snowy';
    case 'blizzard':
      return 'snowy';
    default:
      return 'clear';
  }
};

const categoryLabel = (cat) => {
  switch (cat) {
    case 'snowy':
      return 'Neve';
    case 'rainy':
      return 'Chuva';
    case 'windy':
      return 'Ventania';
    case 'stormy':
      return 'Tempestade';
    case 'cloudy':
      return 'Nublado';
    case 'foggy':
      return 'Neblina';
    default:
      return 'Claro';
  }
};

const categoryIcon = (cat) => {
  switch (cat) {
    case 'snowy':
      return wcIcons.snow;
    case 'rainy':
      return wcIcons.rain;
    case 'windy':
      return wcIcons.windy;
    case 'stormy':
      return wcIcons.storm;
    case 'cloudy':
      return '☁️';
    case 'foggy':
      return '🌫️';
    default:
      return wcIcons.day;
  }
};

//iiiiiiiiiiii


const formatWarcraftTime = (t01, isNightFlag) => {
  // Ajuste “vida real” para o relógio do jogo:
  // - ciclo de sol: 10 minutos -> 06:00..18:00 (12h)
  // - noite: 10 minutos -> 18:00..06:00 (12h)
  // Usamos o t01 (0..1) do ciclo do sol do WeatherController.
  // No WeatherController:
  //  - angle = t01*2pi
  //  - isNight = sin(angle) <= 0.2 (aprox.)
  // Visualmente queremos:
  //  - Sol nasce ~ 06:00
  //  - Sol no zênite ~ 12:00
  //  - Sol se põe ~ 18:00
  //  - Noite acaba ~ 06:00 (retorna para nascer)
  // Aproximação suave (sem depender de outra fonte):
  //   Dia: tDay = (t01 - sunriseOffset) / daySpan
  //   Noite: tNight = (t01 - sunsetOffset) / nightSpan

  // Queremos que t01=0 corresponda ao nascer (06:00) como padrão do ciclo visual.
  // Como o ciclo do sol é senoidal, vamos usar um deslocamento pequeno para alinhar:
  const sunriseOffset = 0.0; // ajuste fino caso queira
  const daySpan = 0.5; // metade do ciclo = 12h (06..18)
  const nightSpan = 0.5; // outra metade = 12h (18..06)

  const wrapped = ((t01 - sunriseOffset) % 1 + 1) % 1;

  // Se está durante “dia” (com base no isNightFlag), mapeamos para 06..18.
  if (!isNightFlag) {
    const tDay = Math.min(1, Math.max(0, wrapped / daySpan));
    const minutes = Math.floor((6 * 60) + tDay * (12 * 60));
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Noite: mapeamos para 18..24 e 00..06
  const tNight = Math.min(1, Math.max(0, (wrapped - daySpan) / nightSpan));
  const minutes = Math.floor((18 * 60) + tNight * (12 * 60)); // 18..30
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};


const formatPCClock = (d) => {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const WarcraftWeatherHud = () => {
  const isNight = useGameStore((s) => s.isNight);
  const currentWeather = useGameStore((s) => s.currentWeather);
  const timeOfDay01 = useGameStore((s) => s.timeOfDay01);

  const safeWeather = currentWeather || 'clear';

  // WarcraftWeatherHud precisa normalizar o state do WeatherController.
  // No ARScene/WeatherController o valor pode ser heavyRain/blizzard.
  const cat = weatherToCategory(safeWeather);

  const weatherLabel = categoryLabel(cat);
  const weatherIcon = categoryIcon(cat);



  const [pcTime, setPcTime] = useState(() => formatPCClock(new Date()));

  useEffect(() => {
    const id = setInterval(() => setPcTime(formatPCClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const teleport = () => {
    window.dispatchEvent(new Event('teleport-up'));
  };

  return (
    <div className="wc-weather-hud-root" aria-label="Warcraft Weather HUD">
      <div className="wc-weather-hud-top">
        <div className="wc-left-stack">
          <div className="wc-two-status">
            <div className={`wc-status ${!isNight ? 'active' : ''}`}>
              <span className="wc-status-ic">{wcIcons.day}</span>
              <span className="wc-status-txt">Dia</span>
            </div>
            <div className={`wc-status ${isNight ? 'active' : ''}`}>
              <span className="wc-status-ic">{wcIcons.night}</span>
              <span className="wc-status-txt">Noite</span>
            </div>
          </div>

          <div className="wc-weather-center">
            <div className="wc-weather-category">
              <span className="wc-weather-cat-ic">{weatherIcon}</span>
              <span className="wc-weather-cat-txt">{weatherLabel}</span>
            </div>
          </div>

          <div className="wc-time-stack">
            <div className="wc-pc-clock">PC: {pcTime}</div>
            <div className="wc-game-clock">Jogo: {formatWarcraftTime(timeOfDay01, isNight)}</div>
          </div>
        </div>


        {/* lado direito: Teleport + PetMenu em coluna */}
        <div className="wc-right-stack">
          <button className="wc-teleport-btn" onClick={teleport}>
            ⬆️ Teleport
          </button>
          <div className="wc-weather-pet-right">
            <PetMenuFixed minimal />
          </div>
        </div>
      </div>
    </div>
  );
};




