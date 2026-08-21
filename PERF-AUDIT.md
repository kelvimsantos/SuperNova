# AUDIT DE PERFORMANCE — game-money
Data: 2026-08-19 · Método: varredura de todos os JS/JSX em `src/` + leitura dos pontos críticos + contagem no `public/scene.json`.

## Contexto do runtime ATUAL (o que está de fato montado)
- `scene.json` (committed): **só terrain** (heightmap 4225 pontos) + **7 fluffy trees** + **1 chunk de fluffy grass**. `objects`, `walls`, `water`, `npcs`, `portals` e `grassInstances` estão **VAZIOS**.
- Inimigos montados: 3 (slimes). Itens: 3. NPCs: 0. Portais: 0. Água: 0.
- Total de `useFrame` registrados nos componentes montados: ~20 callbacks/frame.

---

## NÍVEL 1 — RE-RENDERS DE REACT (o maior custo de JS, 60x/s)

### 1.1 `SmoothTarget` → `setSmoothTarget` do App a cada frame [GRAVE] ✅ FIXADO
- `src/components/SmoothTarget.jsx:12-22` — no `useFrame` chama `onTargetUpdate([x,y,z])`.
- `src/App.jsx:244` — `onTargetUpdate={setSmoothTarget}` (um `useState` do App!) + `:250` consome `smoothTarget` no OrbitControls.
- **Efeito: o App INTEIRO re-renderiza 60x/s** (toda a UI DOM: RPGUI, SkillBar, GameInfo, EquipmentPanel, QuestMenu, SaveMenu, MountMenu, KeyboardControls…).
- Também aloca: `new Vector3` + array novo `[x,y,z]` a cada frame.
- ✅ FIXADO (2026-08-19, build OK): `SmoothTarget` agora recebe `controlsRef` e escreve direto em `controls.target.copy()` no `useFrame` (sem estado React); lê `playerPosition` via `getState()` (sem assinatura). Mesma interpolação, mesmo comportamento de câmera — só morreu o re-render do App. `OrbitControls` ganhou `ref` e perdeu a prop `target` (o SmoothTarget domina o target todo frame, como antes).

### 1.2 `useGameStore()` inteiro (sem selector) — re-renderiza a CADA frame [GRAVE] ✅ FIXADO
`playerPosition` é gravado no store **todo frame** (Player.jsx:181 / AvatarPlayer.jsx:879). Quem assina o store INTEIRO re-renderiza 60x/s:

| Arquivo | Linha | Custo |
|---|---|---|
| `src/components/ARScene.jsx` | 61 | **A árvore 3D INTEIRA re-renderiza por frame** (worst case) |
| `src/hooks/useSaveSystem.js` | 8 | O **App inteiro** re-renderiza por frame (via hook) |
| `src/components/JoystickOverlay.jsx` | 13 | overlay (leve) |
| `src/components/KeyboardControls.jsx` | 5 | leve |
| `src/components/MovementController.jsx` | 6 | leve |
| `src/components/RepositionButton.jsx` | 9 | leve |

- ✅ FIXADO (2026-08-19, build OK): todos viraram selectors individuais. `ARScene` assina só `setWorldGroupRef`/`playerRigidBody`/`setIsNight`/`currentScene`/`setPlayerPosition` (todos estáveis ou raros) → não re-renderiza por frame. `useSaveSystem` agora usa `useGameStore.getState()` DENTRO de `saveGame`/`applySaveToGame` (zero assinatura — o hook não re-renderiza mais). `RepositionButton` mantém a assinatura de `playerPosition` de propósito (o botão precisa seguir o jogador na tela — componente minúsculo, custo aceitável).

### 1.3 Soma 1.1 + 1.2 = App re-render por frame E árvore 3D re-render por frame
- Em dispositivo fraco (WebKit), é o que mais rouba FPS antes mesmo de GPU.

---

## NÍVEL 2 — ALOCAÇÕES POR FRAME (GC churn, pausas do motor JS)

| Arquivo | Onde | O que aloca |
|---|---|---|
| `SmartFollowCamera.jsx` | useFrame 50-117 | 4-5 `new Vector3`/frame (offset, newPos, dir, normalize…) |
| `SmoothTarget.jsx` | useFrame 12-22 | `new Vector3` + array `[x,y,z]`/frame |
| `MovementController.jsx` | useFrame | ~4 `new Vector3`/frame |
| `RepositionButton.jsx` | useFrame (RODA SEMPRE, mesmo com Q solto) | ~2 `new Vector3` + clone/lerp/frame |
| `Player.jsx` / `AvatarPlayer.jsx` | useFrame | vários `new Vector3`/frame |
| `Enemy.jsx` / `ZombieEnemy.jsx` | useFrame | `new Vector3` por inimigo/frame (só 3 — leve) |
| `Pet.jsx` / `Mount.jsx` / `Glider.jsx` | useFrame | `new Vector3`/frame |
| `findGroundY` (AvatarPlayer.jsx:685) | a cada chamada | `new Raycaster()` + 2 vetores novos (reusar um Raycaster global) |
| `WaterShader.jsx` (não montado hoje) | useFrame | — (registrar: se água voltar, ela re-renderiza a cena inteira por frame p/ reflexão) |

---

## NÍVEL 3 — GPU / SHADERS (custo por pixel, não por frame)

### 3.1 `VolumetricClouds` montado e MENU NÃO MANDA NELE [GRAVE]
- `ARScene.jsx:343` — só é gated por `currentWeather === 'cloudy'` (do clima). O toggle `volumetricClouds` do menu Configurações **não é consultado** → em dia nublado o ray-marching de 96 passos (VolumetricClouds.jsx:113) roda MESMO com o toggle desligado.
- FIX: `graphicsSettings.volumetricClouds !== false` no gate.

### 3.2 `VolumetricFog` idem — toggles `dynamicFog`/`radialFarFade` do menu NÃO mandam nele
- `VolumetricFog.jsx` não lê `graphicsSettings` (só prop `enabled`). Os dois toggles do menu não têm efeito real hoje.

### 3.3 Fluffy
- `FluffyTree` (7 árvores): noise de vento por vértice a cada frame — mitigado pelo `windLod` por distância (ok), `castShadow`+`receiveShadow` (um pass extra, barato com 7 árvores).
- `FluffyGrass`: instanced, 1 draw call, wind no shader — ok.
- `DistanceShadows` (ARScene): liga/desliga sombras por raio (15 frames, ~4x/s) — ok; usa `scene.traverse` (pode filtrar `isMesh`).

### 3.4 Luzes/sol
- `WeatherController`: updates a cada 2 frames + `setLight` com throttle 250ms — ok.
- Shadow map agora 1024 (subido de 256) — 1 pass/frame, ok com poucos casters.

---

## NÍVEL 4 — DIVERSOS

- `StarField`: gate correto via `onStarsChange` (WeatherController) ✓ — só monta à noite.
- `ParticleSystem`: só ativo com clima com partículas (hoje clear → inativo) ✓.
- `GameGrass`: culling por `grassDistance` ✓ (já lê o store).
- `OptimizedRenderer`: usa `getState()` ✓ — NÃO re-renderiza.
- Componentes NÃO montados (código morto, custo zero, não se assustar): `CameraTracker`, `CameraGlobo`, `CameraController`, `LightingController`, `TimeController`, `SunMoon`, `ProceduralTree`, `DynamicFrustumCulling`, `ZombieHorde`, `SnowGlobeRadius`, `RadialDarkMask*`, `InstancedDroppedItems`, `OptimizedModel`, `CloudFog`, `RealisticWater`, `WaterSystem`, `WaterWithCaustics`, `CausticsLight`, `AboveWaterFog`, `UnderwaterEffect`, `WaterSurface*`, `Experience.jsx`, `DebugHud` (NÃO RE-ADICIONAR — quebra render no WebKit).
- `findGroundY` chamado em snap/água (não todo frame) — leve no geral, mas o Raycaster novo por chamada é desperdício.

---

## RESUMO — PRIORIDADE DE CORREÇÃO (aplicar UMA por vez, testar cada)
1. **SmoothTarget → ref do OrbitControls** (mata o re-render do App 60x/s) — maior ganho de JS.
2. **Selectors individuais** nos 6 arquivos da tabela 1.2 (ARScene primeiro).
3. **Gate `volumetricClouds` no ARScene** (toggle do menu passa a funcionar).
4. **Gate `dynamicFog`/`radialFarFade` no VolumetricFog** (toggles passam a funcionar).
5. **Zerar alocações de vetores nos useFrames** (reusar refs: SmartFollowCamera, MovementController, RepositionButton — usar um único vetor temporário).
6. `RepositionButton`: só registrar useFrame quando `followMode` (evitar trabalho à toa).
7. `findGroundY`: reusar um Raycaster único.
8. Se água voltar na cena: revisar reflexão por frame do WaterShader.

## JÁ RESOLVIDO/OK
- Shadow camera do sol (far 120, ±50, map 1024) ✓
- `graphicsSettings` persistido + toggles shadows/dayNightCycle/grassDistance funcionais ✓
- FpsHud DOM puro (não quebra) ✓
- Fluffy animado ✓
- Day/night + menu ✓
## AUDIT DAS CONFIGURA��ES DO MENU (2026-08-20)

Verificado arquivo a arquivo quais op��es do menu (GraphicsSettings) t�m efeito real:

| Op��o | Status | Onde |
|---|---|---|
| shadows | ? Funciona | ARScene/DistanceShadows/WeatherController |
| dayNightCycle | ? Funciona | WeatherController |
| grassDistance | ? Funciona | GameGrass (culling por raio) |
| weatherEffects | ? Funciona | WeatherController (raios/rel�mpagos) |
| dpr | ? MORTA | App.jsx:216 fixo [1, min(dpr,1.5)] � n�o l� a op��o |
| antialias | ? MORTA | App.jsx:228 fixo false � n�o l� a op��o |
| volumetricClouds | ? MORTA | ARScene:343 s� olha cloud.enabled (clima), ignora o menu |
| dynamicFog | ? MORTA | Ningu�m l� � VolumetricFog sempre montado |
| radialFarFade | ? MORTA | Ningu�m l� � ARScene sempre renderiza o RadialFarFade |
| starField | ? MORTA | Gate � o showStars (noite), a op��o do menu n�o � consultada |
| grass (Grama Instanciada) | ? MORTA | Ningu�m l� � GameGrass/FluffyGrass sempre montados |
| combatEffects | ? MORTA | Ningu�m l� � BloodEffect/BowEffect/CombatText sempre ativos |
| particles | ? MORTA | Ningu�m l� ('weather.particles' � do clima, n�o a op��o) |
| waterMode | ?? Inerte | WaterExperience consome, mas scene.json atual tem 0 �gua |

Das 14 op��es, s� 4 funcionam. 10 est�o mortas (2 fixas no Canvas + 8 nunca consultadas).

