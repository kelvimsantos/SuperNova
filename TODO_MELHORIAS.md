# 🚀 TODO - Otimizações de Performance e Leveza

> Projeto: ar-game (React Three Fiber + Rapier + Three.js)
> Status: Implementando FASE 1 ✅

---

## 📋 CHECKLIST DE OTIMIZAÇÕES

## 📋 CHECKLIST DE OTIMIZAÇÕES (APLICADAS)

### ✅ FASE 1.1 - GameGrass (menos polígonos)
- [x] Joints das blades: 4→3 (menos 25% polígonos, imperceptível visualmente)
- [x] ~~`frustumCulled={true}`~~ → REVERTIDO: `InstancedBufferGeometry` com shader não tem bounding sphere correta, causava sumiço em certos ângulos

### ✅ FASE 1.2 - WeatherController (removido updateWind do frame loop)
- [x] `updateWindFromWeather` movido de `useFrame` para `setInterval` (1s)
- [x] Cache de `nightColor` (evita `new THREE.Color(0x000000)` a cada frame)

### ✅ FASE 1.3 - console.log removido do frame loop
- [x] QuestNPC.jsx: `console.log("NPC ... Status: ...")` removido do render

### ✅ FASE 1.4 - StarField (menos estrelas, sem useFrame)
- [x] 2000 → 500 estrelas (mesmo visual - estrelas estão abaixo do chão)
- [x] `useFrame` com rotação removido (desnecessário)

### ✅ FASE 1.5 - VolumetricFog (menos geometria)
- [x] Segmentos 80×80 (6400 vértices) → 32×32 (1024 vértices) - imperceptível em neblina

### ✅ FASE 1.6 - ItemPickup (pointLights removidos, emissivo no lugar)
- [x] `pointLight` por item removido (~30+ luzes dinâmicas!) → emissivo aumenta quando perto
- [x] Texto 3D de stats/dano removido (só nome permanece quando perto)
- [x] `emissiveIntensity` dinâmico: `isNear ? 0.6 : 0.3` (mesmo brilho sem luz real)

### ✅ FASE 1.7 - Enemy/Slime geometrias compartilhadas
- [x] Geometrias de Slime (`SphereGeometry`, olhos, pupilas) como constantes globais
- [x] Geometria de Enemy (olhos) como constante global

### ✅ FASE 1.8 - Pet (early return simplificado)
- [x] `useFrame` com `if (!isActive || !petGroupRef.current || !playerPosition) return` (3 checks em 1 linha)

### ✅ FASE 1.9 - VolumetricClouds (textura 3D menor)
- [x] Data3DTexture 50³ → 32³ (125KB → 32KB, ~75% menos memória)

### ✅ FASE 1.10 - StarField (useFrame removido)
- [x] Rotação em `useFrame` removida (estrelas abaixo do chão não precisam rodar)

### ✅ FASE 1.11 - WeatherController (updateWind em interval)
- [x] `updateWindFromWeather` agora roda a cada 1s (setInterval), não mais a 60fps

### ✅ FASE 1.12 - RadialFarFade reescrito (geometria dinâmica)
- [x] Agora calcula tamanho do quad baseado em FOV + aspect ratio + distância
- [x] Geometria só recriada quando tamanho muda significativamente
- [x] Cor do fog atualiza apenas quando clima/dia-noite muda
- [x] Render order: 999 → 0 (não precisa ficar por cima de tudo)

### ✅ FASE 1.13 - App.jsx restaurado (valores originais)
- [x] `smoothTarget` → `[0, 1, 0]
- [ ] Otimizar Raycaster do Player (limitar scan a 30)
- [ ] Ajustar worldStreamingConfig (histerese muito grande)
- [ ] Criar logger utilitário para console.log condicional
- [ ] Pool de instâncias no ParticleSystem (LOD por distância)
- [ ] FBO intercalado no WaterSurface_PRO (renderizar reflexão a cada 3 frames)

---

## 📝 NOTAS
- Todas as otimizações aplicadas SEM reduzir qualidade visual
- Apenas removemos desperdícios de processamento
- Próximo passo: FASE 2 (lazy loading, raycaster, etc)

