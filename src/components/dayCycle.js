// Ciclo de dia/noite compartilhado entre WeatherController, SunMoon e
// FluffyEnvironment — TODOS usam a mesma matemática para ficarem sincronizados.

export const DAY_CYCLE_DURATION = 1200; // 20 min por ciclo completo (dia + noite)
export const SUN_RADIUS = 25;
export const SUN_HEIGHT = 20;

export const getDayCycle = (elapsed) => {
  const cycleTime =
    (((elapsed % DAY_CYCLE_DURATION) + DAY_CYCLE_DURATION) % DAY_CYCLE_DURATION) /
    DAY_CYCLE_DURATION;
  const angle = cycleTime * Math.PI * 2;
  const sunHeight = Math.sin(angle);
  return { cycleTime, angle, sunHeight, isNight: sunHeight <= 0.2 };
};

// Arco do sol: nasce de um lado (leste), cruza o céu e se põe do outro (oeste).
// angle = 0 → horizonte (nascer), π/2 → zênite, π → horizonte (pôr).
export const getSunArcPosition = (angle) => ({
  x: Math.cos(angle) * SUN_RADIUS,
  y: Math.sin(angle) * SUN_HEIGHT,
  z: Math.sin(angle) * SUN_RADIUS * 0.35,
});

// Arco da lua: sobe no lado oposto do sol (nasce quando o sol se põe).
export const getMoonArcPosition = (angle) => {
  const a = angle - Math.PI;
  return {
    x: Math.cos(a) * SUN_RADIUS,
    y: Math.sin(a) * SUN_HEIGHT,
    z: -Math.sin(a) * SUN_RADIUS * 0.35,
  };
};

// Cor da luz do sol: laranja no nascer/pôr, branco-amarelado no zênite.
export const getSunColor = (sunHeight) => {
  const t = Math.min(1, Math.max(0, (sunHeight - 0.12) / 0.5));
  return {
    r: 1.0,
    g: 0.55 + t * 0.42,
    b: 0.28 + t * 0.57,
  };
};

// Intensidade da luz direcional: forte no dia, fraca (lua) à noite.
export const getSunIntensity = (sunHeight, isNight) => {
  if (isNight) return 0.12;
  const dayFactor = 0.65 + Math.max(0, sunHeight) * 0.35;
  return 5.5 * dayFactor;
};