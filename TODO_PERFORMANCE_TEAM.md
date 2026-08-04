# 🧠 EQUIPE DE AGENTES — Diagnóstico de Performance (Game Money)

> **Missão:** Analisar os motivos do jogo **travar / ficar lento / cair frames** e listar as ações para melhorar.
> **Método:** 5 agentes especializados inspecionaram o código e cruzaram diagnósticos.
> **Status:** Atualizado — inclui correções recentes (worldGroupRef + grama).

---

## 👥 AGENTES E SEUS ACHADOS

### 🤖 Agente 1 — "Render Loop" (useFrame / React Reconciliation)
**Foco:** Quantos `useFrame` existem e quanto estado React é setado por frame.

| Componente | useFrame | setState por frame? |
|---|---|---|
| WeatherController | ✅ (a cada 2 frames) | ⚠️ setLight throttled p/ 4x/s (melhorou) |
| SmartFollowCamera | ✅ | ❌ não |
| Player | ✅ (2×) | ⚠️ `setPlayerPosition` no store TODO frame |
| GameGrass | ✅ | ❌ não (agora usa getState) |
| VolumetricClouds | ✅ | ❌ não |
| VolumetricFog | ✅ | ❌ não |
| ParticleSystem | ✅ | ❌ não |
| RadialFarFade | ✅ | ⚠️ recria geometria se redimensionar |
| SlimeEnemy (cada) | ✅ | ⚠️ `setIsInRange` (agora throttled p/ transição) |
| Enemy (cada) | ✅ | ⚠️ `setHitEffect` por frame quando hit |
| ItemPickup (cada) | ✅ | ⚠️ `setIsNear` (agora throttled) |
| ZombieHorde | ✅ (1 p/ todos) | ❌ refs puras (ótimo) |

**Diagnóstico:**
- 🔴 **`setPlayerPosition` no zustand TODO frame** é o **gatilho nº1 de re-render em cascata**: qualquer componente que assine `playerPosition` (OptimizedRenderer, SmartFollowCamera, GameGrass antes do fix) re-renderiza a 60fps.
- 🔴 **Muitos `useFrame`** = 10+ callbacks por frame. Cada um acessa store/closures → pressão de CPU.
- 🟢 ZombieHorde (Object Pooling) é o **padrão-modelo** a ser replicado.

---

### 🤖 Agente 2 — "GPU / Shaders" (overdraw, raymarching, materiais)
**Foco:** O que a GPU está desenhando e quanto custa.

1. 🔴 **VolumetricClouds** — raymarching de até **96 passos** no fragment shader, textura 3D 32³, `depthTest:false` + `renderOrder:999` + `frustumCulled:false` → desenha **por cima de tudo, sempre, mesmo fora da tela**. É o **maior custo de GPU individual** quando ativo.
2. 🔴 **GameGrass** — instâncias + ShaderMaterial com wind/interação/iluminação no shader, `frustumCulled:false`. (Side: agora com `stride=1` = densidade máxima, mas continua 1 draw call por instancing.)
3. 🟡 **VolumetricFog** — plano 50×50 com 32×32 segmentos (1024 vértices) shaded por frame.
4. 🟡 **ParticleSystem** — até 5000 partículas com AdditiveBlending (overdraw).
5. 🟡 **WaterSurfacePRO** (modo full) — reflexão/refração/fresnel caros.
6. 🟡 **RadialFarFade** — quad screen-space transparente sobre a tela inteira (overdraw adicional, mas leve).

**Diagnóstico:** O jogo paga **múltiplas vezes pelo mesmo pixel** (nuvens + fog + fade + partículas + grama transparente). Em GPU fraca/mobile isso derruba o FPS.

---

### 🤖 Agente 3 — "Física Rapier" (RigidBody / colliders)
**Foco:** Quantos corpos rígidos existem e se são necessários.

| Componente | RigidBody | Necessário? |
|---|---|---|
| World | `trimesh` do GLB inteiro | ⚠️ caro, mas funcional |
| Player | capsule (massa 1) | ✅ sim |
| Mount | 2× (cavalo + player) | ✅ sim |
| GameGrass | **`fixed` para a grama** | ❌ **NÃO — grama é visual-only** |
| ItemPickup | vários corpos | ❌ muitos desnecessários |

**Diagnóstico:**
- 🔴 **`RigidBody type="fixed"` no GameGrass** cria um corpo físico para a grama → custo de física inútil.
- 🔴 **`colliders="trimesh"`** no World = centenas de triângulos na física Rapier.
- 🟡 Cada corpo = CPU no step de física + sincronização de transform.

---

### 🤖 Agente 4 — "Culling / Streaming / Câmera"
**Foco:** Quanto do mundo é renderizado sem necessidade.

1. 🔴 **Canvas `far:35`** — desenha até 35m; somado ao `RadialFarFade`, o jogo desenha objetos que são **totalmente encobertos pelo fade** (trabalho desperdiçado).
2. 🔴 **OptimizedRenderer** — cada instância tem `useFrame` + assinava `playerPosition` (re-render por frame) → **agora é o principal gargalo de re-render** que sobrou.
3. 🟡 **WorldStreamingManager** — `activeRadius=10` / `deactivateRadius=95` → **nunca desativa chunks** (histerese invertida). E está **comentado** no ARScene.
4. 🟡 **StarField** — 500 pontos `frustumCulled` padrão, ok, mas sempre montado quando noturno.
5. 🟢 **InstancedDroppedItems** — existe e está **ótimo** (4 draw calls + 1 useFrame p/ todos os drops). Deve substituir os `ItemPickup` individuais.

**Diagnóstico:** O mundo renderiza **muito mais do que o necessário** porque o culling por distância é caro (1 useFrame por wrapper) e os parâmetros de streaming estão errados/desativados.

---

### 🤖 Agente 5 — "Memória / GC / Carregamento"
**Foco:** Stutter (micro-travadas) e tempo de carregamento.

1. 🔴 **`Enemy.jsx` e `SlimeEnemy.jsx`** — `setTimeout` em loop para emissive, geometrias recriadas por render (não usam shared geometries), `window.addEventListener('click')` global por inimigo.
2. 🟡 **WeatherController** — timers de clima/relâmpagos com `setTimeout` aninhados.
3. 🟡 **Carregamento** — `App.jsx` importa **13+ componentes de UI** no bundle inicial (SkillTree, EquipmentPanel, MountMenu, QuestMenu, SaveMenu etc.) → bundle de ~3.1MB.
4. 🟡 **useGLTF** — `Player.jsx` faz `useGLTF.preload`, mas `AvatarPlayer`/`Mount`/`World` carregam sob demanda → stutter na troca de cena.
5. 🟢 **ZombiePool** — clone via `SkeletonUtils.clone` + mixers próprios, zero GC pressure (modelo a seguir).

**Diagnóstico:** As **micro-travadas (stutter)** vêm da pressão de GC (setTimeout/arrays/objetos novos por frame) e da **compilação de shader** quando o `uQuality` das nuvens muda.

---

## 🎯 CAUSAS-RAIZ CONSOLIDADAS (por que trava/lento)

### 🔴 P0 — Impacto MÁXIMO
1. **Re-render em cascata por frame**: `Player` → `setPlayerPosition` no zustand → todos os que assinam re-renderizam a 60fps (`OptimizedRenderer`, `SmartFollowCamera`, antes `GameGrass`).
2. **VolumetricClouds raymarching pesado** sempre ligado/visível (96 passos, depthTest off, frustumCulled off).
3. **Física desnecessária**: `RigidBody fixed` na grama + `trimesh` no World.
4. **10+ useFrame por frame** com lógica JS em cada um.

### 🟡 P1 — Impacto ALTO
5. **Nuvens volumétricas com qualidade dinâmica** → recompilação de shader (stutter).
6. **ParticleSystem 5000 partículas** com AdditiveBlending.
7. **WaterSurfacePRO** (reflexão/refração) no modo full por padrão.
8. **OptimizedRenderer** com 1 useFrame por wrapper + assinatura do store.
9. **Enemy/SlimeEnemy** com geometrias recriadas, setTimeout por hit, listeners globais.

### 🟢 P2 — Impacto MÉDIO
10. **Bundle 3.1MB** sem code-splitting dos painéis de UI.
11. **WorldStreamingManager** parâmetros errados + desativado.
12. **VolumetricFog** 1024 vértices desnecessários.
13. **far:35** + RadialFarFade = overdraw escondido.

---

## ✅ O QUE JÁ FOI FEITO

| Ação | Arquivo | Status |
|---|---|---|
| Fix "Maximum update depth exceeded" (WeatherController) | WeatherController.jsx | ✅ |
| Throttle `setLight` no store (~4x/s em vez de 60x/s) | WeatherController.jsx | ✅ |
| GameGrass: decimação de blades (STRIDE=2) | GameGrass.jsx | ✅ |
| GameGrass: lê `playerPosition`/luz via `getState()` (sem re-render) | GameGrass.jsx | ✅ |
| **GameGrass: densidade configurável via `stride` (padrão 1 = todas as blades)** | GameGrass.jsx | ✅ |
| **GameGrass: REMOVIDO `<RigidBody type="fixed">` — grama é visual-only, zero física** | GameGrass.jsx | ✅ |
| ARScene: removeu import morto `DistanceFogOverlay` | ARScene.jsx | ✅ |
| SlimeEnemy: `setIsInRange` só na transição | SlimeEnemy.jsx | ✅ |
| ItemPickup: `setIsNear` só na transição | ItemPickup.jsx | ✅ |
| ZombieHorde + ZombiePool: Object Pooling (1 useFrame p/ todos) | enemies/ | ✅ |
| InstancedDroppedItems: 4 draw calls p/ todos os drops | items/ | ✅ |
| App.jsx: `dpr` limitado a 1.5, `antialias:false`, `low-power`, `stencil:false` | App.jsx | ✅ |
| ErrorBoundary no Canvas | App.jsx | ✅ |
| ZombiePool: cache do terreno com rebuild automático (GLB assíncrono) | ZombiePool.js | ✅ |
| ZombiePool: lerp suave no follow do relevo (evita saltos) | ZombiePool.js | ✅ |
| **ARScene: `worldGroupRef` setado via ref callback (bug de zumbis flutuando)** | ARScene.jsx | ✅ |

---

## 🛠️ PLANO DE AÇÃO (próximos passos — por prioridade)

### Fase 1 — Quick Wins (baixo esforço, alto ganho)
- [ ] **Reduzir `MAX_STEPS` das nuvens** de 96 → 40 (VolumetricClouds.jsx) e `frustumCulled` ligado
- [ ] **Reduzir partículas**: heavyRain 5000→2500, rain 3500→1800, snow 2200→1200 (ParticleSystem.jsx)
- [ ] **Remover `RigidBody`** do GameGrass (grama é visual-only)
- [ ] **WorldStreaming**: ajustar `activeRadius=15` / `deactivateRadius=25`
- [ ] **VolumetricFog**: reduzir segmentos 32×32 → 16×16
- [ ] **Desligar nuvens em mobile** (detectar `pointer:coarse`)

### Fase 2 — Re-render e Culling
- [ ] **OptimizedRenderer**: trocar `useFrame` + assinatura do store por um **culling centralizado** (1 timer/useFrame p/ todos) e leitura via `getState()`
- [ ] **Player**: parar de chamar `setPlayerPosition` TODO frame — usar `getState().setPlayerPosition` throttled (ex: 10x/s) ou ref + publish por evento
- [ ] **SlimeEnemy/Enemy**: usar `OptimizedRenderer` + geometrias compartilhadas + remover `window.addEventListener('click')` (usar `onClick` do R3F)

### Fase 3 — Física e Água
- [ ] **World**: `colliders="trimesh"` → `colliders="hull"` ou dividir em chunks
- [ ] **WaterExperience**: padrão `waterMode='light'` em mobile, PRO só desktop
- [ ] **Mount**: revisar 2 RigidBody (1 é suficiente se player "monta")

### Fase 4 — Carregamento / Bundle
- [ ] `React.lazy()` para SkillTree, EquipmentPanel, MountMenu, QuestMenu, SaveMenu
- [ ] `useGLTF.preload` para modelos usados em cenas trocadas com frequência
- [ ] Eliminar `console.log`/`console.warn` do código de produção

---

## 📊 METAS

| Métrica | Atual | Alvo |
|---|---|---|
| FPS (PC médio) | 25-40 | 55-60 |
| FPS (mobile) | 10-18 | 30 |
| Bundle | ~3.1 MB | < 2.0 MB |
| useFrames ativos | 10+ | 4-6 |
| RigidBodies | 10+ | 4-5 |
| Draw calls (drops) | 180+ | ~4 (já feito via InstancedDroppedItems) |

---

> **Resumo do porquê trava:** o jogo re-renderiza a UI por causa do store atualizado a cada frame, paga raymarching pesado de nuvens sempre visíveis, cria corpos físicos para coisas que não precisam de física (grama), e roda 10+ loops por frame. O stutter (micro-travada) vem de GC pressure e recompilação de shaders. As correções já aplicadas atacam os itens mais críticos; o restante está no plano acima.
