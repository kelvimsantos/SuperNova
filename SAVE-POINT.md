# SAVE-POINT — Estado do projeto (19/08/2026)

## ✅ ESTADO QUE FUNCIONA (testado no dispositivo do usuário)

**Commit base:** `8555191` (melhoria - incluindo nova vegetação) — igual ao GitHub.
**Working tree:** commit limpo + as mudanças abaixo (ainda NÃO commitadas).

### Aplicado e CONFIRMADO funcionando
1. **Fix shader das nuvens** — `src/components/VolumetricFog.jsx:59` `vec3(0.08, 0.06, 0,9)` → `vec3(0.08, 0.06, 0.9)` (typo que impedia o fragment shader de compilar).
2. **Timeout de 8s no avatar** — `src/App.jsx` (AbortController): se o VRM do servidor demorar, o jogo segue com placeholder em vez de `loadingAvatar=true` eterno.
3. **Importação do FLUFFY** — `src/components/ARScene.jsx`: imports + estado `fluffyData` (`data.fluffy`) + render de `FluffyEnvironment`, `FluffyGrass`, `FluffyTree`. **O scene.json do commit JÁ tem `fluffy` — funcionou sem reimportar.**
   - Obs.: o scene.json do commit **NÃO tem `spawnPoint`** → o teleporte nunca dispara → avatar spawna no padrão do AvatarPlayer.

## 🎛️ NOVO: Ciclo Dia/Noite + Sombras por proximidade + Menu Configurações
1. **Store** (`useGameStore.js`): `graphicsSettings` + `updateGraphicsSetting` (persistido em localStorage).
2. **MenuScreen**: botão "⚙️ Configurações" → abre o GraphicsSettings (que estava morto — agora funcional).
3. **GraphicsSettings**: toggles **Ciclo Dia/Noite** (sol anda pelo céu, luz muda de cor; desligado = sol fixo no meio-dia) e **Sombras (só perto)** — default AMBOS ligados.
4. **WeatherController**: quando ciclo desligado → `angle = PI/2` (dia claro fixo, sem noite). Sombras liga/desliga o `castShadow` do sol.
5. **ARScene**: `<DistanceShadows />` (só quando Sombras ON) — desliga `castShadow` de objetos fluffy distantes (grama/árvores têm `userData.shadowRadius`). GameGrass já é instancedMesh sem sombra (perf).
6. O ciclo dia/noite JÁ EXISTIA no commit (WeatherController CYCLE_DURATION=1200s: sol gira, cor muda nascer/meio-dia/pôr, noite azulada fraca, estrelas).

## 📋 PRÓXIMOS PASSOS (pendentes)
1. **DebugHud** — reaplicar versão MÍNIMA segura (só FPS via DOM, sem useFrame/gl/document.title) — opcional, sob demanda.
2. **Spawns `[0,3,0]`** no AvatarPlayer (placeholder `[0,50,0]`→`[0,3,0]`, corpo `[0,20,0]`→`[0,3,0]`) — evita queda de 50u/afundamento.
3. **Fallback de spawn `[0,3,0]`** no loadScene (ARScene) quando não tem `spawnPoint` (o scene.json atual NÃO tem).
4. **Perf JS**: reavaliar coisas que comem processamento por frame (duplicações, iterações desnecessárias).
5. Selectors individuais (ARScene, KeyboardControls, JoystickOverlay, MovementController, RepositionButton).
6. `useSaveSystem` com `getState()` (sem assinar o store).
7. Remover `backdrop-filter`/`backdropFilter` (18 arquivos de UI) — pura perf, sem mudança visual.
8. Vetores reutilizados (MovementController, RepositionButton).
9. LoadedScene + objetos do scene.json no ARScene.

## 🗄️ HISTÓRICO / BACKUPS
- **stash@{0} e stash@{1}**: versão completa anterior (WIP on main: 8555191).
- **stash@{2}**: última rodada de mudanças (selectors, blur, alocações, spawns, fallback, DebugHud wiring).
- **Arquivos untracked que NÃO podem ser apagados**: `src/components/fluffy/`, `DebugHud.jsx`, `DistanceShadows.jsx`, `SunMoon.jsx`, `dayCycle.js`, `src/components/ui/GraphicsSettings.jsx`, `public/models/fluffy_canopy.png`, `fluffy_grass.png`, `fluffytree.glb`.
- **`MUDANCAS-DESDE-FLUFFY.md`** e **`CHECKLIST-OTIMIZACOES.md`**: histórico detalhado de mudanças.

## ⚠️ LIÇÕES DA SAGA (o que causou tela preta/crash)
1. **DebugHud com `document.title` a cada 500ms** → no Safari/WebKit do dispositivo isso travava o compositor → o mundo parava de renderizar (só o HUD ficava). **FIX: título removido do DebugHud; depois o DebugHud inteiro foi removido (ainda quebrava — o rAF interno + listeners no canvas também eram suspeitos).** Reaplicar só como versão mínima DOM pura.
2. **Leitura `translation()` todo frame durante `loadingAvatar` + `setTranslation` do teleporte no mesmo tick** → trap WASM do rapier (`RuntimeError: unreachable`) → mundo de física envenenado → cascata de "recursive use of an object" em TODOS os RigidBody → ErrorBoundary derrubava o app. **REVERTIDO** — nunca mais ler translation() de um corpo no mesmo tick do setTranslation.
3. Shader com typo `0,9` quebrava a compilação do fog (log, não crash). ✅ corrigido.
4. `backdrop-filter` cria camada de compositing por elemento no WebKit — removido para reduzir pressão no compositor.