import { useMemo } from 'react';
import { ProceduralTree } from './ProceduralTree';

// 🌿 Vegetação espalhada (EZ-Tree): árvores e arbustos procedurais
//    cobrindo o terreno, evitando água e a área de spawn.
const ALL_PRESETS = [
  'Pine Small',
  'Pine Medium',
  'Pine Large',
  'Aspen Small',
  'Aspen Medium',
  'Ash Small',
  'Ash Medium',
  'Oak Small',
  'Oak Medium',
  'Bush 1',
  'Bush 2',
  'Bush 3',
];

// PRNG determinístico (mesma vegetação sempre que recarregar)
const mulberry32 = (a) => {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const VegetationField = ({
  heightmap,
  terrainSize,
  terrainResolution,
  count = 140,
  waterLevel = 2.6,
  spawnClearRadius = 10,
  seedOffset = 0,
}) => {
  const spots = useMemo(() => {
    if (!heightmap) return [];
    const step = terrainSize / terrainResolution;
    const w = terrainResolution;
    const rnd = mulberry32(12345 + seedOffset);
    const out = [];
    let guard = 0;
    while (out.length < count && guard < count * 60) {
      guard++;
      const x = (rnd() * 2 - 1) * (terrainSize / 2 - 3);
      const z = (rnd() * 2 - 1) * (terrainSize / 2 - 3);
      const distCenter = Math.sqrt(x * x + z * z);
      if (distCenter < spawnClearRadius) continue;
      const xi = Math.floor((x + terrainSize / 2) / step);
      const zi = Math.floor((z + terrainSize / 2) / step);
      if (xi < 0 || zi < 0 || xi > w || zi > w) continue;
      const y = heightmap[zi * (w + 1) + xi];
      if (y === undefined || y < waterLevel) continue;

      const preset = ALL_PRESETS[Math.floor(rnd() * ALL_PRESETS.length)];
      const isBush = preset.startsWith('Bush');
      const h = isBush ? 0.5 + rnd() * 0.7 : 1.8 + rnd() * 2.2;
      out.push({
        x, y, z,
        preset,
        height: h,
        seed: Math.floor(rnd() * 100000),
      });
    }
    console.log(`🌿 [DEBUG] Vegetação gerada: ${out.length} itens`);
    return out;
  }, [heightmap, terrainSize, terrainResolution, count, waterLevel, spawnClearRadius, seedOffset]);

  return (
    <>
      {spots.map((s, i) => (
        <ProceduralTree
          key={i}
          position={[s.x, s.y, s.z]}
          presets={[s.preset]}
          height={s.height}
          seed={s.seed}
          cullDistance={55}
        />
      ))}
    </>
  );
};