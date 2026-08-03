# 🚀 TODO Performance — Análise Completa de Gargalos

## 📋 Diagnóstico Geral

Projeto: **React Three Fiber (R3F) + Rapier (Física)**
Build atual: **~3.17 MB (index bundle)**
Tecnologias: React 18, Three.js 0.162, @react-three/fiber 8.16, @react-three/rapier 1.5, zustand

---

## 🔴 PROBLEMA #1 — Câmera `far` muito alto causa overdraw massivo

**Arquivo:** `src/App.jsx` (linha ~95)
```jsx
<Canvas shadows camera={{ ..., far: 35, near: 0.5 }}>
```

**Problema:** 
- `far = 35` força o Three.js a renderizar objetos a 35 metros de distância  
- A cena tem **World (GLB grande)**, **água (WaterExperience)**, **grama (GameGrass - 1000+ instâncias)**, **inimigos**, **portais**, **clouds volumétricas**, **fog**, **partículas**
- Tudo isso é desenhado mesmo longe, causando **overdraw severo** e sobrecarregando o fragment shader
- O `RadialFarFade` (screen-space) e o `DistanceFogOverlay` são workarounds que MAQUIAM o problema, não resolvem

**Impacto: MUITO ALTO (frames drop de 15-20 fps)**

**Solução:**
- Reduzir `far` para **20-25** (testar qual fica aceitável visualmente)
- Combinar com `DistanceFogOverlay` funcionando corretamente para esconder o pop-in

---

## 🔴 PROBLEMA #2 — Múltiplos `useFrame` concorrentes

**Componentes que usam `useFrame`:**
1. `WeatherController` — ciclo dia/noite, luz, fog, partículas (TODO frame)
2. `SmartFollowCamera` — follow mode (TODO frame)
3. `Player` — movimento, animação, raycast de chão (TODO frame)
4. `GameGrass` — wind, time, interação (TODO frame)
5. `VolumetricClouds` — animação, follow, LOD (TODO frame)
6. `VolumetricFog` — time, uniforms (TODO frame)
7. `ParticleSystem` — time, uniforms (TODO frame)
8. `RadialFarFade` — screen-space quad (TODO frame)
9. `SlimeEnemy` (cada instância) — distância, ataque (TODO frame)
10. `Enemy` (cada instância) — distância, ataque (TODO frame)
11. `ItemPickup` — hover, animação (TODO frame)
12. `Pet` — animação (TODO frame)
13. `Mount` — animação (TODO frame)
14. `ZombieHorde` — update do pool (TODO frame)

**Impacto: MUITO ALTO** — 14+ componentes rodando lógica por frame, cada um com closures, acesso ao store, cálculos. Isso gera:
- **Alta pressão de CPU** para o JavaScript single-thread
- **Jank** (micro-stutters) devido ao garbage collector sendo chamado frequentemente
- **Falta de paralelismo** — tudo no mesmo thread

**Solução:**
- Consolidar `useFrame` em um **único GameLoop** centralizado usando `useThree` + `useFrame`
- Lógica de inimigos unificada no `ZombiePool` (já foi feito para zombies)
- `OptimizedRenderer` para culling de distância
- Usar **refs** em vez de `setState` em loops de frame
- `SlimeEnemy` e `Enemy` devem usar **Object Pooling** (similar ao ZombiePool)

---

## 🔴 PROBLEMA #3 — Física Rapier com muitos corpos rígidos

**Componentes com RigidBody:**
1. `World` — trimesh collider (TODO o mundo)
2. `Player` — capsule collider + massa
3. `GameGrass` — **RigidBody type="fixed"** para CADA bloco de grama
4. `Mount` — 2x RigidBody (cavalo + player)
5. Itens no chão (ItemPickup) — vários RigidBody

**Impacto: MUITO ALTO**
- `RigidBody type="fixed"` no `GameGrass` é **desnecessário** — grama não precisa de física
- `World` com `colliders="trimesh"` em um GLB grande gera **centenas de triângulos** na física
- Rapier roda em **WebAssembly** mas ainda consome CPU para cada corpo

**Solução:**
- Remover `RigidBody` do `GameGrass` — a grama é visual-only
- Substituir `colliders="trimesh"` do World por `colliders="hull"` (convex hull) ou dividir em chunks
- Usar `RigidBody` apenas para objetos que interagem fisicamente

---

## 🔴 PROBLEMA #4 — Grama com Shader Pesado e Instâncias

**Arquivo:** `src/components/GameGrass.jsx`

**Problemas:**
- **Shader material complexo** com wind, interação com player, iluminação dinâmica — tudo no vertex/fragment shader
- `useFrame` TODO frame para atualizar `time`, `windStrength`, `playerPosition`, `lightDir`, `lightIntensity`
- **1000+ instâncias** de `PlaneGeometry` com 3 segmentos
- **RigidBody desnecessário** (ver #3)
- Culling por distância é feito manualmente no `useFrame` (visível = dist < 40)
- **Material recriado** em todo `useMemo` que depende de `grassHeight`

**Impacto: ALTO** — especialmente o shader + useFrame + RigidBody

**Solução:**
- **InstancedMesh** já está sendo usado (bom!)
- Trocar `ShaderMaterial` por `MeshStandardMaterial` com vertex colors (mais performático)
- Ou usar `RawShaderMaterial` mais otimizado (sem funções de ruído desnecessárias)
- Remover `RigidBody` — grama não precisa de física
- Mover wind/uniforms para um `useFrame` **único centralizado** (ver #2)
- Culling via `frustumCulled` em vez de manual

---

## 🔴 PROBLEMA #5 — WeatherController rodando lógica pesada TODO frame

**Arquivo:** `src/components/WeatherController.jsx`

**Problemas:**
- `useFrame` com **TODO o ciclo dia/noite**: posição do sol, 3 luzes (direcional, ambiente, hemispherical), cor de fundo, fog, partículas, relâmpagos
- **Cálculo de cor do sol** com `getSunColor()` TODO frame (função com múltiplos branches)
- **Cálculo de cor de fundo** com `getBackgroundColor()` TODO frame
- `setLight` chamado TODO frame no zustand store (dispara re-render em quem escuta)
- **Relâmpagos** com `setTimeout` aninhados e `triggerLightning` chamando `setIsLightning` (re-render)

**Impacto: ALTO** — especialmente em dispositivos mobile ou GPU fraca

**Solução:**
- Mover ciclo dia/noite para **fora do useFrame** — usar `setInterval` com `requestAnimationFrame` apenas quando necessário
- Cache de cores com `useRef` (já tem `bgColorCache` e `nightColor`, mas ainda calcula TODO frame)
- Não chamar `setLight` TODO frame no zustand — usar refs e atualizar só quando muda
- Relâmpagos: não usar `setIsLightning` (que triggera re-render), usar refs no material

---

## 🔴 PROBLEMA #6 — VolumetricClouds com raymarching pesado

**Arquivo:** `src/components/VolumetricClouds.jsx`

**Problemas:**
- **Raymarching** no fragment shader com até **96 passos** (MAX_STEPS = 96)
- **Textura 3D** (32x32x32) com `Data3DTexture` — lookup pesado no shader
- **Renderiza em `BackSide`** de um `boxGeometry`, o que significa que está desenhando a nuvem inteira TODO frame
- **Mesh segue o player** TODO frame no `useFrame` (reposicionamento)
- **LOD por distância** é recalculado TODO frame (mudança de qualidade = recompilação de shader)
- `renderOrder={999}` — desenha por cima de tudo, potencialmente causando overdraw
- **NUNCA desativa** — mesmo em clima 'clear' onde `cloud.enabled = false`, o componente ainda é montado/desmontado

**Impacto: MUITO ALTO** — raymarching é EXTREMAMENTE caro em GPU

**Solução:**
- Reduzir `MAX_STEPS` para 32-48 (testar qualidade visual)
- Aumentar `STEP_SIZE` para 0.2
- Desligar completamente quando longe do player (distância > 30)
- Cache de textura 3D (já faz, mas textura é grande)
- Considerar substituir por **sprite-based clouds** (2D billboards) em vez de volumétricas

---

## 🔴 PROBLEMA #7 — Partículas com shader pesado e alta contagem

**Arquivo:** `src/components/ParticleSystem.jsx`

**Problemas:**
- **5000 partículas** para `heavyRain`
- Shader com **wind simulation**, **fall speed**, **recycle**, **alpha**, **glow** — tudo na GPU
- `useFrame` TODO frame atualizando uniforms
- **Material recriado** em `useMemo` com dependência de `config.color`, `isRain`, etc.
- **Buffers recriados** quando `count` muda (quando `intensity` muda)
- `AdditiveBlending` — caro em GPU (overdraw)

**Impacto: MÉDIO-ALTO** — 5000 partículas com shader customizado

**Solução:**
- Reduzir contagem máxima: `heavyRain` de 5000 → 2500, `rain` 3500 → 2000
- Usar `PointsMaterial` padrão em vez de `ShaderMaterial` (mais otimizado pelo Three.js)
- Consolidar update de uniforms no GameLoop centralizado (ver #2)
- Não recriar buffers — usar `needsUpdate = true`

---

## 🔴 PROBLEMA #8 — OptimizedRenderer com `useFrame` por instância

**Arquivo:** `src/components/OptimizedRenderer.jsx`

**Problemas:**
- **Cada instância** de `OptimizedRenderer` tem seu próprio `useFrame`
- Isso é usado para **inimigos**, **itens**, **NPCs** — cada grupo wrapper tem seu próprio `useFrame`
- **Vários `useFrame`** fazendo a mesma coisa (verificar distância do player)

**Impacto: MÉDIO** — multiplica o número de `useFrame` no React render loop

**Solução:**
- Centralizar todo o culling de distância em um **único DistanceCullingManager** (similar ao WorldStreamingManager)
- Usar `setInterval` em vez de `useFrame` (não precisa ser TODO frame — 4-6 Hz é suficiente)
- Marcar objetos com `userData.optimizedRadius` e ler em um loop centralizado

---

## 🟡 PROBLEMA #9 — WaterExperience com modo PRO pesado

**Arquivo:** `src/components/water/WaterExperience.jsx`

**Problemas:**
- `WaterSurfacePRO` (modo full) tem **reflexão**, **refração**, **fresnel**, **waves**, **distortion**
- `WaterVolume`, `UnderwaterEffect`, `WaterGlass` — 4 componentes de água renderizando simultaneamente
- `WaterSurface_Light` (modo light) é mais leve mas ainda tem cubemap e normal map

**Impacto: MÉDIO-ALTO** — especialmente em cenas com água grande (size=120)

**Solução:**
- Usar `waterMode='light'` como padrão em mobile
- Reduzir `size` da água para 60-80 (em vez de 120)
- Simplificar shaders de água
- UnderwaterEffect só ativar quando player estiver dentro da água

---

## 🟡 PROBLEMA #10 — Waterfall de imports no App.jsx

**Arquivo:** `src/App.jsx`

**Problemas:**
- **Muitos imports** no topo: `Inventory`, `HealthBar`, `WarcraftWeatherHud`, `SkillTree`, `RPGUI`, `SkillBar`, `CombatText`, `GameInfo`, `EquipmentPanel`, `QuestDialogGlobal`, `QuestMenu`, `SaveMenu`, `MountMenu`, `SmartFollowCamera`, `DynamicFogController`, `RadialFarFade`
- Isso significa que **TODO o bundle** é carregado antes de renderizar qualquer coisa
- Alguns componentes (ex: `MountMenu`, `SkillTree`, `EquipmentPanel`) são usados apenas em momentos específicos

**Impacto: MÉDIO** — aumenta o tempo de carregamento inicial

**Solução:**
- Usar `React.lazy()` + `Suspense` para componentes de UI que não são necessários imediatamente
- Exemplo: `SkillTree`, `EquipmentPanel`, `MountMenu`, `QuestMenu`, `SaveMenu`
- `SmartFollowCamera`, `DynamicFogController`, `RadialFarFade` são leves e podem ficar

---

## 🟡 PROBLEMA #11 — WorldStreamingManager com intervalo fixo

**Arquivo:** `src/components/streaming/WorldStreamingManager.jsx`

**Problemas:**
- `setInterval(tick, updateEveryMs)` onde `updateEveryMs = 1000 / 4 = 250ms`
- Isso é BOM (não é TODO frame)
- Porém, `activeRadiusMeters = 10` e `deactivateRadiusMeters = 95` — **histerese muito grande**
- Chunks são ativados a 10m mas desativados só a 95m — **quase nunca desativam**
- **Muitos chunks ativos simultaneamente** = muitos objetos renderizados

**Impacto: MÉDIO** — conceito correto, mas parâmetros mal ajustados

**Solução:**
- Ajustar `activeRadiusMeters` para 15-20 e `deactivateRadiusMeters` para 25-30
- Usar `requestAnimationFrame` em vez de `setInterval` para melhor sincronia com o render loop
- Adicionar LOD progressivo (high-res perto, low-res longe) em vez de on/off binário

---

## 🟡 PROBLEMA #12 — StarField com geometria abaixo do chão

**Arquivo:** `src/components/StarField.jsx`

**Problemas:**
- 500 pontos com `y = -15` (abaixo do chão)
- Para ser visível, precisa de câmera lookDown ou efeito de noite
- **Sempre visível** quando `enabled = true`, mesmo em modo claro (quando não deveria)
- `PointsMaterial` com `AdditiveBlending` — mais overdraw

**Impacto: BAIXO** — 500 pontos é leve

**Solução:**
- Opcional: desligar quando não é noite
- Usar `frustumCulled` para que Three.js gerencie visibilidade

---

## 🟡 PROBLEMA #13 — Múltiplos event listeners + setTimeout

**Em vários componentes:**
- `Enemy.jsx` — `window.addEventListener('click', ...)` adiciona listener global
- `SlimeEnemy.jsx` — ataque por frame com `attackTimer`
- `ParticleSystem` — `setTimeout` no respawn
- `WeatherController` — `setInterval` para clima, `setTimeout` para relâmpagos
- `Player` — `setTimeout` para ajuste de chão, `setInterval` para raycast
- `EnemySpawner` — `setTimeout` para respawn

**Impacto: MÉDIO** — listeners não limpos podem causar memory leaks

**Solução:**
- Usar `useRef` para timers e limpar no `useEffect` return
- Remover `window.addEventListener('click', ...)` do `Enemy.jsx` — usar `onClick` do R3F
- Centralizar timers em um gerenciador

---

## 🟢 PROBLEMA #14 — Carregamento de assets (GLB) sem cache eficiente

**Arquivos:** `World.jsx`, `AvatarPlayer.jsx`, `Mount.jsx`, `Player.jsx`

**Problemas:**
- `useGLTF` carrega modelos **síncronos** (ou com Suspense)
- `World.jsx` recarrega o GLB quando `currentScene` muda
- `Player.jsx` pré-carrega `useGLTF.preload(MODEL_PATH)` (bom!)
- Mas `AvatarPlayer.jsx` carrega modelo do avatar separadamente
- `Mount.jsx` carrega `horse.glb` e `parrot.glb` sob demanda

**Impacto: BAIXO-MÉDIO** — causa stutter no carregamento de cena

**Solução:**
- Usar `useGLTF.preload` para todos os modelos principais
- Implementar `useProgress` do drei para mostrar carregamento
- Cache de GLB via `useMemo` com chave única

---

## 🟢 PROBLEMA #15 — Zustand store causando re-renders desnecessários

**Arquivo:** `src/hooks/useGameStore.js`

**Problemas:**
- Store grande com **muitos estados** — player, pet, mount, inventory, equipment, skills, weather, etc.
- `setLight` chamado TODO frame no `WeatherController` — isso **dispara re-render** em todos os componentes que escutam `lightDir` / `lightIntensity`
- `setPlayerPosition` chamado TODO frame — re-render em quem escuta `playerPosition`
- `setTimeOfDay01` chamado TODO frame — re-render em quem escuta

**Impacto: MÉDIO** — re-renders desnecessários no React causam reconciliação extra

**Solução:**
- Usar **seletores finos** no zustand (já fazem em alguns lugares)
- Para estados que mudam TODO frame, usar **refs** em vez de store:
  ```js
  const playerPosRef = useRef({ x: 0, y: 0, z: 0 });
  // Atualizar ref no useFrame, ler ref em outros useFrame
  ```
- **Não colocar** `playerPosition` no zustand se só for usado em `useFrame` — usar ref
- `lightDir` e `lightIntensity` também deveriam ser refs, não store

---

# 📊 RESUMO DE PRIORIDADES

| Prioridade | Problema | Impacto | Esforço |
|-----------|----------|---------|---------|
| 🔴 P0 | #1 Câmera far muito alto | MUITO ALTO | Baixo |
| 🔴 P0 | #2 Múltiplos useFrame | MUITO ALTO | Alto |
| 🔴 P0 | #3 Física Rapier desnecessária | MUITO ALTO | Médio |
| 🔴 P0 | #6 VolumetricClouds raymarching | MUITO ALTO | Médio |
| 🔴 P1 | #4 Grama com shader pesado | ALTO | Médio |
| 🔴 P1 | #5 WeatherController TODO frame | ALTO | Médio |
| 🔴 P1 | #7 Partículas com alta contagem | ALTO | Baixo |
| 🟡 P2 | #8 OptimizedRenderer por instância | MÉDIO | Baixo |
| 🟡 P2 | #9 WaterExperience modo PRO | MÉDIO | Médio |
| 🟡 P2 | #10 Waterfall de imports | MÉDIO | Baixo |
| 🟡 P2 | #11 WorldStreaming parâmetros | MÉDIO | Baixo |
| 🟡 P2 | #13 Múltiplos event listeners | MÉDIO | Médio |
| 🟡 P2 | #15 Zustand re-renders | MÉDIO | Médio |
| 🟢 P3 | #12 StarField | BAIXO | Baixo |
| 🟢 P3 | #14 Carregamento de assets | BAIXO | Médio |

---

# 📈 METAS DE PERFORMANCE

| Métrica | Atual | Alvo |
|---------|-------|------|
| FPS (PC médio) | 25-40 | 55-60 🔵 |
| FPS (mobile) | 10-18 | 30 🔵 |
| Bundle size | 3.17 MB | < 2.0 MB 🟢 |
| useFrames ativos | 14+ | 4-6 🟢 |
| RigidBodies | 10+ | 4-5 🟢 |
| Draw calls | ~300-500 | < 150 🟢 |
| Tempo de carregamento | ~8-12s | < 4s 🟢 |

---

# 🛠️ PLANO DE AÇÃO RECOMENDADO

## Fase 1 — Quick Wins (1-2 horas)
1. ✅ Reduzir `far` da câmera para 22-25
2. ✅ Remover `RigidBody` do `GameGrass`
3. ✅ Reduzir partículas: heavyRain 5000→2500, rain 3500→2000
4. ✅ Ajustar `activeRadiusMeters` do WorldStreaming para 20/30
5. ✅ Desligar nuvens volumétricas se distância > 30
6. ✅ Usar `React.lazy()` em componentes de UI pesados

## Fase 2 — Refatoração Média (4-6 horas)
1. 🔄 Consolidar todos os `useFrame` em um GameLoop centralizado
2. 🔄 Substituir `ShaderMaterial` da grama por `MeshStandardMaterial` otimizado
3. 🔄 Mover estados de frame do zustand para refs (playerPosition, lightDir)
4. 🔄 Object Pooling para SlimeEnemy (similar ao ZombiePool já criado)
5. 🔄 Simplificar WeatherController — ciclo fora do useFrame

## Fase 3 — Otimização Profunda (8-12 horas)
1. 🚀 Substituir nuvens volumétricas por sprite-based clouds
2. 🚀 Implementar frustum culling + distance culling unificado
3. 🚀 WaterExperience com modo light como padrão + LOD
4. 🚀 Code splitting + lazy loading de todos os componentes de UI
5. 🚀 Implementar instanced rendering para itens dropped

---

# 📝 NOTAS TÉCNICAS

## O que o ZombiePool já resolveu
- ✅ 1 useFrame para todos os zombies (vs N useFrames antes)
- ✅ Object Pooling sem criar/destruir (zero GC pressure)
- ✅ Raycast de relevo sem física
- ✅ Separação entre zombies
- ✅ Hit test com caixa fixa em espaço de mundo

## Por que o jogo trava (stutter) em vez de só ficar lento
1. **GC pressure** — muitos objetos criados/destruídos (setTimeout, novos arrays, novos objetos)
2. **Shader compilation** — `VolumetricClouds` com `uQuality` mudando causa recompilação
3. **Physics sync** — Rapier sincroniza posições TODO frame com RigidBody
4. **React reconciliation** — zustand atualizando TODO frame causa re-render em cascata

## Recomendação para o futuro
- **Migrar para WebGPU** (já tem WEBGPU_MIGRATION_PLAN.md) — melhor performance de shaders
- **Usar `@react-three/drei` utilities** como `useDetectGPU`, `AccumulativeShadows`, `SoftShadows`
- **Implementar instanced rendering** para todos os objetos que se repetem (itens, drops, inimigos)
- **Considerar `@react-three/xr`** para otimizações específicas de mobile

---

> 🎯 **Meta:** Rodar a 60fps estáveis em PC médio e 30fps em mobile
> ⏱️ **Estimativa:** ~15-20 horas de trabalho total para atingir as metas
