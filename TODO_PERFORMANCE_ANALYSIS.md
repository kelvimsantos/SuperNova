# 🔥 Análise de Performance — Game Money (R3F + Rapier)

## 🚨 Problema Crítico Resolvido

### WeatherController — "Maximum update depth exceeded"
**ARQUIVO:** `src/components/WeatherController.jsx`

**CAUSA:** `setFogIntensity` e `setParticleIntensity` eram chamados dentro de `useFrame({...})`.  
`useState` → re-render → novo `useFrame` → `setState` novamente → **loop infinito**.

**FIX:** Substituídos por props diretas do `weatherList` (não há interpolação — o clima muda a cada 2+ minutos, o salto visual é irrelevante).

---

## ⚠️ Problemas de Performance Identificados

### 1. Sombras com resolução muito baixa (mas ainda com custo)
**ARQUIVO:** `src/components/WeatherController.jsx`  
`shadow-mapSize-width={256}` e `shadow-mapSize-height={256}`  
✅ Já está baixo (256), mas sombras **habilitadas** no `directionalLight` principal.  
💡 **Sugestão:** Se `isNight`, desligar `castShadow` completamente.

### 2. VolumetricClouds — Shader pesado (raymarching)
**ARQUIVO:** `src/components/VolumetricClouds.jsx`  
- Fragment shader com loop de até **96 passos**
- Textura 3D de 32³ (32KB)
- `depthTest: false` + `renderOrder: 999` (overdraw em toda tela)
- `frustumCulled={false}` — SEMPRE renderiza, mesmo fora da câmera
- Recria textura 3D do zero sem cache adequado (cache global, mas sem cleanup)

💡 **Sugestões:**
- Reduzir `MAX_STEPS` para 32 (qualidade ainda aceitável)
- Habilitar `frustumCulled` (Three.js calcula bounds)
- Desligar nuvens em mobile

### 3. VolumetricFog — PlaneGeometry fixo de 50x50 com 1024 vértices
**ARQUIVO:** `src/components/VolumetricFog.jsx`  
- 32x32 segmentos = 1024 vértices sendo shaded a cada frame
- `depthWrite: false` + `blending: NormalBlending` (overdraw adicional)
- Posição fixa no mundo (não segue câmera)

💡 **Sugestão:** Reduzir para 16x16 segmentos (256 vértices) ou usar um quad em screen-space.

### 4. GameGrass — InstancedMesh com ShaderMaterial personalizado
**ARQUIVO:** `src/components/GameGrass.jsx`  
- Shader complexo com wind, interação, iluminação
- `frustumCulled={false}` — SEMPRE processado
- Toda lógica de luz no fragment shader (uLightDir, uLightIntensity)
- Recalculo de instâncias a cada change de `heightmap`/`instances`

💡 **Sugestões:**
- Habilitar `frustumCulled`
- Reduzir precisão do shader (ex: `half` floats onde possível)
- `BufferGeometry` com `InstancedBufferGeometry` já está correto ✅

### 5. ParticleSystem — Até 5000 partículas com shader
**ARQUIVO:** `src/components/ParticleSystem.jsx`  
- `heavyRain` = 5000 partículas com `AdditiveBlending`
- Atributos: position, speed, direction, size, trailLength
- Recria `Float32Array` a cada change de `intensity`/`count` (useMemo com dependências voláteis)

💡 **Sugestões:**
- Reduzir `count` para 2500 (heavyRain) e 1500 (rain)
- Usar `ObjectPool` para reciclar buffers
- Desligar partículas em mobile

### 6. Enemy.jsx — Raio-X a cada frame
**ARQUIVO:** `src/components/enemies/Enemy.jsx`  
- `useFrame` verifica distância do player a CADA frame
- `EnemySpawner` renderiza todos os inimigos mesmo se longe

💡 **Sugestão:** Usar `OptimizedRenderer` (já existe!) para esconder inimigos distantes.

### 7. SlimeEnemy.jsx — Geometrias compartilhadas NÃO usadas
**ARQUIVO:** `src/components/enemies/SlimeEnemy.jsx`  
- Variáveis como `sharedSphereGeo`, `sharedEyeGeo` declaradas mas **não usadas** no JSX
- Componente cria novas geometrias a cada render: `<Sphere args={[0.6, 32, 32]}>`

💡 **Sugestão:** Usar `sharedSphereGeo` diretamente com `<mesh geometry={sharedSphereGeo}>` em vez de `<Sphere>`.

### 8. WorldStreamingManager — Histerese invertida
**ARQUIVO:** `src/components/streaming/worldStreamingConfig.js`  
```
activeRadiusMeters: 10
deactivateRadiusMeters: 95
```
- Ativa chunks a 10m, mas só desativa a 95m — **nunca desativa** chunks efetivamente
- `updateHz: 4` (4x/s) — bom, mas poderia ser 2x/s

💡 **Sugestão:** Ajustar para `activeRadius: 15`, `deactivateRadius: 25`.

### 9. WaterExperience — 4 componentes por corpo d'água
**ARQUIVO:** `src/components/water/WaterExperience.jsx`  
- `WaterSurfacePRO` + `WaterVolume` + `UnderwaterEffect` + `WaterGlass`
- `WaterSurfacePRO` é pesado (reflexão/refração)
- `WaterVolume` com `bounds` grandes

💡 **Sugestão:** Usar `WaterSurface_Light` como padrão, `WaterSurfacePRO` só em desktop.

### 10. App.jsx — Muitos componentes UI dentro do Canvas
**ARQUIVO:** `src/App.jsx`  
- `SkillTree`, `WarcraftWeatherHud`, `HealthBar`, `Inventory`, `RPGUI`, `SkillBar`, `CombatText`, `GameInfo`, `EquipmentPanel`, `QuestMenu`, `QuestDialogGlobal`, `SaveMenu`, `MountMenu` — todos montados SEMPRE

💡 **Sugestão:** `lazy(() => import(...))` + `<Suspense>` para os painéis que não são usados com frequência.

### 11. Camera com far=35 clipping muito próximo
**ARQUIVO:** `src/App.jsx`  
```jsx
camera={{ position: [8, 6, 12], fov: 60, far: 35, near: 0.5 }}
```
- `far: 35` metros — muito baixo para um mundo aberto
- Objetos além de 35m simplesmente somem

💡 **Sugestão:** Aumentar para `far: 100` e melhorar o culling por chunk.

---

## 📊 Resumo de Prioridades

| Prioridade | Problema | Impacto | Esforço |
|-----------|----------|---------|---------|
| 🔴 P0 | WeatherController loop infinito | **Crítico** (crash) | ✅ FIXADO |
| 🔴 P0 | Nuvens com frustumCulled=false | Alto | Baixo |
| 🔴 P0 | GameGrass com frustumCulled=false | Alto | Baixo |
| 🟡 P1 | Partículas com count alto | Médio | Baixo |
| 🟡 P1 | Streaming config invertido | Médio | Baixo |
| 🟡 P1 | SlimeEnemy geometrias não compartilhadas | Médio | Baixo |
| 🟢 P2 | WaterSurfacePRO pesado | Baixo | Médio |
| 🟢 P2 | lazy loading de UI panels | Baixo | Baixo |
| 🟢 P2 | Camera far=35 | Baixo | Muito Baixo |

---

## 🔧 Quick Fixes Imediatos (já aplicados)

1. ✅ **WeatherController:** `setFogIntensity`/`setParticleIntensity` removidos do `useFrame` (eram a causa do crash "Maximum update depth exceeded")
