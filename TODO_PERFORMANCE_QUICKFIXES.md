# Plano de Correções — Performance sem perder qualidade visual

## Fase 1: Zero impacto visual, ganho máximo (P0)

### 1.1 🔧 Parar re-render global (React)
- `Player.jsx` + `AvatarPlayer.jsx`: usar `useRef` para posição, só atualizar store quando mudar
- `WeatherController.jsx`: mover `setLight` para ref, não criar `Vector3.clone()` todo frame
- `useSaveSystem.js`: remover `useGameStore()` sem seletor
- `KeyboardControls.jsx`: usar seletor específico
- `WeatherController.jsx`: `setFogIntensity`/`setParticleIntensity` só na transição

### 1.2 🔧 Nuvens menos pesadas (qualidade visual preservada)
- Reduzir `uQuality` de 64 para 24 (passos invisíveis, performance 2.5x melhor)
- Reduzir `scale` das nuvens
- `frustumCulled={true}` 
- `depthTest={true}`

### 1.3 🔧 GameGrass — culling + simplificação
- Adicionar `frustumCulled={true}` na grama
- Remover `receiveShadow` da grama (sombra em 30K blades é matar GPU)
- Culling por distância já existe, mas está quebrado (assina `playerPosition` que re-render)

### 1.4 🔧 dpr limitado no Canvas
- `dpr={[1, 1.75]}` — sem perda visual perceptível, GPU 2x mais leve

### 1.5 🔧 OptimizedRenderer — usar ref, não state
- Ler `playerPosition` via `getState()` no `useFrame`, não assinar via selector

### 1.6 🔧 setIsNear / setIsInRange — só na transição
- `ItemPickup.jsx`: só setar `setIsNear` quando muda
- `SlimeEnemy.jsx`: só setar `setIsInRange` quando muda

### 1.7 🔧 Mount — desligar RigidBody quando inativo
- Usar `setEnabled(false)` quando `!isActive`

## Fase 2: Médio impacto visual mínimo

### 2.1 🔧 VolumetricFog — reduzir segmentos
- Plano 50×50 com 8×8 em vez de 32×32

### 2.2 🔧 RadialFarFade — reduzir opacity
- `maxOpacity` de 0.90 para 0.70

### 2.3 🔧 Shadows — mapa 256 e seletivo
- Só castShadow em player + inimigos

### 2.4 🔧 Itens de debug — remover
- 25 espadas + 10 escudos da cena default
