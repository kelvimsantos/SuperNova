import React from 'react';
import useGameStore from '../../hooks/useGameStore';

// ARScene hoje mantém clima em estado local, então este componente usa apenas o
// estado global já existente (isNight) e tenta inferir o resto.
// Para deixar perfeito (neve/chuva/ventania/nevoeiro), precisamos expor currentWeather
// no useGameStore ou passar props do ARScene.

export const WeatherState = () => {
  const isNight = useGameStore((s) => s.isNight);
  // fallback: se só temos isNight global, mostramos dia/noite.
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        padding: '8px 16px',
        borderRadius: '40px',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.2)',
        fontSize: 16,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 20 }}>{isNight ? '🌙' : '☀️'}</span>
      <span style={{ fontSize: 14, opacity: 0.95 }}>{isNight ? 'Noite' : 'Dia'}</span>
    </div>
  );
};

