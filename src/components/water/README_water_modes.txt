Objetivo: alternar modos de água para performance em mobile.

- waterMode='light':
  - WaterExperience oculta WaterSurfacePRO (superfície pesada)
  - mantêm WaterVolume + UnderwaterEffect (tint azul ao submergir)
  - (opcional futuro) pode usar WaterSurface_Light para uma superfície bem simples

- waterMode='full':
  - renderiza WaterSurfacePRO + WaterVolume + UnderwaterEffect + WaterGlass

Arquivos principais:
- src/components/water/WaterExperience.jsx
- src/components/water/WaterSurface_Light.js
- src/components/ui/ConfigWaterMenu.jsx
- src/hooks/useGameStore.js

