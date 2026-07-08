import React from 'react';
import useGameStore from '../../hooks/useGameStore';
import './HudStatus.css';

import { WeatherState } from './WeatherState';

export const HudStatus = () => {
  const playerHealth = useGameStore((s) => s.playerHealth);
  const playerMaxHealth = useGameStore((s) => s.playerMaxHealth);
  const inventory = useGameStore((s) => s.inventory);


  const healthPercent = playerMaxHealth > 0 ? (playerHealth / playerMaxHealth) * 100 : 0;

  return (
    <div className="hud-status-root" aria-label="HUD status">
      <div className="hud-top-center">
        <WeatherState />
      </div>

      {/* health left-ish; not modifying existing HealthBar, only adding new panel */}
      <div className="hud-health-panel">
        <div className="hud-health-header">
          <span>❤️ {Math.floor(playerHealth)} / {playerMaxHealth}</span>
          <span className="hud-health-inv">🎒 {inventory.length} itens</span>
        </div>

        <div className="hud-health-bar">
          <div className="hud-health-bar-fill" style={{ width: `${healthPercent}%` }} />
        </div>
      </div>
    </div>
  );
};

