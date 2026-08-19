# MUDANÇAS DESDE O COMMIT DO FLUFFY (`8555191`)

> Última versão que funcionava: **`8555191 melhoria - incluindo nova vegetação`** (HEAD local = mesmo commit do GitHub).
> TUDO que está descrito aqui está **sem commit** no working tree.
>
> **Sintoma atual:** o jogo roda (loop vivo, inimigos atacam, números de dano e HUD aparecem) mas o canvas fica preto/travado na imagem do cubo — nada 3D é renderizado.
>
> **Causas confirmadas até agora:**
> 1. `public/scene.json` foi substituído pela exportação do editor de mapa (3.4MB vs 25.8MB do commit) — **não tem `spawnPoint` nem `npcs`/`portals`/`objects`**. Sem spawn, o player nascia em [0,50,0], a câmera travava em y≈53 e o mundo (fora do `far=35`) ficava invisível.
> 2. Canvas travado na imagem do cubo + jogo rodando atrás = **perda de contexto WebGL** (GPU do WebKit morre quando o conteúdo pesado monta: grama fluffy 82k instâncias + shaders de água + GLBs grandes montando de uma vez).

---

## ⚠️ LEIA ANTES DE REVERTER

**NÃO rode `git clean -fd`** — ele apagaria os arquivos untracked que são parte do fluffy/editor e dos diagnósticos:

```
?? src/components/fluffy/            ← nova vegetação (NÃO APAGAR)
?? src/components/DebugHud.jsx       ← HUD de diagnóstico (NÃO APAGAR)
?? src/components/DistanceShadows.jsx← sombras por proximidade (NÃO APAGAR)
?? src/components/SunMoon.jsx        ← sol/lua (NÃO APAGAR)
?? src/components/dayCycle.js        ← ciclo dia/noite (NÃO APAGAR)
?? public/models/fluffy_canopy.png   ← texturas fluffy (NÃO APAGAR)
?? public/models/fluffy_grass.png
?? public/models/fluffytree.glb
```

### Comandos de revert SEGUROS (escolha um)

**Opção A — volta TUDO (tracked) ao commit, guardando para desfazer depois (recomendado):**
```powershell
git stash push -- src public dist
```
- `src/`, `public/`, `dist/` voltam ao estado do commit `8555191` (a versão que funciona).
- Os untracked (fluffy, DebugHud, etc.) **ficam intactos** no working tree.
- Para voltar às mudanças atuais: `git stash pop`.

**Opção B — só os arquivos de código que eu mexi:**
```powershell
git checkout HEAD -- src/App.jsx src/components/ARScene.jsx src/components/AvatarPlayer.jsx src/components/SmoothTarget.jsx src/components/SmartFollowCamera.jsx src/components/MovementController.jsx src/components/World.jsx src/hooks/useSaveSystem.js src/hooks/useSceneManager.js
```
(ou `git checkout HEAD -- src` e depois refazer manualmente — ver tabela abaixo)

**Observação:** `public/scene.json` e `public/world.glb` também estão modificados (exportação do editor). No commit eles são os **originais com `spawnPoint`** (25.8MB / 13.3MB). Se quiser testar o jogo 100% funcional, deixe-os voltar ao commit. A exportação do editor pode ser reimportada depois — o jogo agora tem fallback de spawn e vai aceitar os dois formatos.

---

## INVENTÁRIO DAS MUDANÇAS (por arquivo)

### 1. CAMINHOS DE ASSETS — ABSOLUTO → RELATIVO (17 arquivos)
**Por quê:** os caminhos absolutos (`/models/...`) quebravam quando o jogo era hospedado em subpasta; viravam requisição pro domínio raiz → 404 → mundo não carregava.
**Arquivos:** `World.jsx`, `ZombieEnemy.jsx`, `ZombieHorde.jsx`, `ZombiePool.js`, `EquipmentAttachment.jsx`, `ItemTypes.js`, `Glider.jsx`, `Mount.jsx`, `Pet.jsx`, `WaterShader.jsx`, `WaterSurface_Light.js`, `WaterSurface_Light.jsx`, `WaterSurface_PRO.jsx`, `ARScene.jsx`, `AvatarPlayer.jsx`, `Player.jsx`, `useSceneManager.js`.
- Ex.: `/models/avatar/body.glb` → `models/avatar/body.glb`; `` `/scenes/${cena}/scene.json` `` → `` `scenes/${cena}/scene.json` `` (sem barra inicial).
- **Risco:** baixo. Em dev (`npm run dev`) funciona igual.

### 2. ASSINATURAS DO STORE — `useGameStore()` INTEIRO → SELETORES/`getState()`
**Por quê:** assinar o store inteiro re-renderizava o componente em TODA mudança de `playerPosition` (muda todo frame) → App/ARScene re-renderizando 60x/s (CPU matando FPS).
**Arquivos:** `useSaveSystem.js` (handlers com `getState()` — App parou de re-renderizar por frame), `ARScene.jsx` (6 seletores individuais), `KeyboardControls.jsx`, `JoystickOverlay.jsx`, `MovementController.jsx` (`getState()` no useFrame), `RepositionButton.jsx`, `SmartFollowCamera.jsx` (`getState()` no useFrame), `SmoothTarget.jsx` (lê posição via `getState()` sem assinar).
- **Risco:** baixo. Não muda comportamento de render.

### 3. `backdrop-filter` REMOVIDO DOS HUDS SEMPRE VISÍVEIS (7 pontos)
**Por quê:** o Safari re-aplica o blur em cima do canvas todo frame (é caro pra caramba em WebKit). Ficou só em menus modais (que abrem raramente).
**Arquivos:** `HealthBar.jsx`, `HudStatus.css`, `SkillBar.css`, `WarcraftWeatherHud.css` (2), `RPGUI.css` (também removidos os shimmer infinitos), `JoystickVisual.jsx`, badge de clima no `ARScene.jsx`.
- **Risco:** nenhum (só visual).

### 4. ALOCAÇÕES POR FRAME REMOVIDAS (hot path)
**Arquivos:** `MovementController.jsx` e `SmartFollowCamera.jsx` (vetores module-scope pré-alocados).
- **Risco:** nenhum.

### 5. `App.jsx` — MECANISMO DA CÂMERA
**Status ATUAL = MESMO DO COMMIT** (restaurado): `SmoothTarget` chama `onTargetUpdate` → `setSmoothTarget` → `<OrbitControls target={smoothTarget} />`.
- **Ficou do commit:** `powerPreference: 'low-power'`, `dpr` via `graphicsSettings`.
- **Diferenças que ficaram (não causam tela preta):** timeout de 8s no fetch do avatar (`AbortController`) com fallback de cor de pele; `dpr` do store.

### 6. `ARScene.jsx` — CARGA E SPAWN (mudanças de bug, FICAM)
- `loadScene` roda **na montagem** (`deps: [currentScene, setPlayerPosition]`) — antes dependia do `playerRigidBody` que só existia depois do fetch do avatar (onrender free dorme 30-60s) → mundo nunca carregava.
- **Teleporte pro spawn em efeito próprio** (roda sempre que `playerRigidBody` existe), com **fallback `[0,3,0]` quando `spawnPoint` não existe** no JSON (o caso do scene.json do editor).
- `setCameraInitialized(false)` disparado no teleporte → câmera re-inicializa no spawn.
- Banner de erro visível (`sceneError`) em vez de tela preta silenciosa.
- Nuvens volumétricas atrás do toggle `graphicsSettings.volumetricClouds`.

### 7. `AvatarPlayer.jsx` — SPAWNS NO CHÃO
- Placeholder (loadingAvatar): `[0,50,0]` → **`[0,3,0]`**.
- Corpo real: `[0,20,0]` → **`[0,3,0]`**.
- **Por quê:** nascer em y=50 com câmera travada lá = mundo inteiro fora do `far=35` → tela preta.
- **Risco:** nenhum (o teleporte ao spawn continua mandando pro spawnPoint do JSON quando existir).

### 8. `DebugHud.jsx` (arquivo NOVO)
- HUD de diagnóstico: FPS, frame/loop, draw calls, triângulos, GPU, **posição da câmera**, contagem de objetos/meshes da cena, detecção de contexto perdido (a ser completada).
- Ativa com `?debug=1` na URL ou tecla F8.
- **Não afeta o jogo quando desligado.** O monkey-patch do `gl.render` foi **removido**.

### 9. CUBOS DE DIAGNÓSTICO (TEMP — REMOVER DEPOIS)
- `App.jsx`: cubo vermelho `[0,0,0]` e verde `[12,0,0]` (filhos diretos do Canvas, `meshBasicMaterial`).
- `ARScene.jsx`: cubo azul `[0,20,0]` dentro do grupo do mundo.
- **Por quê:** provam se o renderer desenha (basic material não precisa de luz). Remover quando o jogo voltar a funcionar.

### 10. OTIMIZAÇÕES DE CENA (sessões anteriores, já aplicadas no working tree)
- Grama com LOD 10/16 opaca; sombras 512; nuvens deck 2D; fog por densidade; `graphicsSettings` real no store (`dpr`, `volumetricClouds`); `useGameStore.js` +14 linhas; `VolumetricClouds.jsx` 183 linhas alteradas; `WeatherController.jsx` 138; `ItemTypes.js` 96; `WaterExperience.jsx` +17; `LoadedScene.jsx` 18.
- **Risco:** médio (foram as mudanças da campanha de FPS, anteriores à tela preta — não são suspeitas da tela preta, mas mexem em render).

### 11. DADOS — `public/scene.json`, `scene2.json`, `world.glb`, `world2.glb` (EXPORTAÇÃO DO EDITOR)
- Substituídos pela exportação do editor de mapa (ex.: scene.json 3.4MB vs 25.8MB; world.glb 86KB vs 13.3MB).
- **O formato do editor NÃO tem `spawnPoint`/`npcs`/`portals`/`objects`** (tem `objects`, `terrainParams`, `grassInstances`, `fluffy`, `walls`, `water`).
- O jogo agora tolera isso (fallback de spawn). Se o mundo renderizado do editor estiver vazio de inimigos/prédios, é por causa dessas chaves ausentes — o editor precisa exportar elas.

---

## O QUE FAZER AGORA (roteiro de reaplicação segura)

1. `git stash push -- src public dist` (volta ao estado que funciona; nada é perdido).
2. Rodar `npm run dev` e confirmar que o jogo aparece normal (igual ao GitHub).
3. Colar este .md de volta e reaplicar **uma mudança por vez**, testando a cada passo:
   - a) Selectors/getState + blur + alocações (FPS) — sem risco de tela preta.
   - b) Timeout do avatar + loadScene na montagem + teleporte com fallback + spawns no chão (bugs reais).
   - c) Caminhos relativos (necessário só se for hospedar em subpasta).
   - d) Reimportar a exportação do editor se quiser (o jogo aceita os dois formatos).
4. Investigação da tela preta (contexto WebGL) continua DEPOIS, com o jogo funcionando de novo — o plano era: detectar `webglcontextlost` no DebugHud e, se confirmado, reduzir o pico de GPU na montagem (grama/água/GLBs carregando juntos).

## PRÓXIMO PASSO NA INVESTIGAÇÃO (contexto WebGL)
- Adicionar no `DebugHud`: listener `webglcontextlost` + `gl.getContext().isContextLost()` no tick de 500ms + linha `GL: OK | ⚠️ CONTEXTO PERDIDO`.
- Se confirmado: `e.preventDefault()` no evento (permite restauração) e, se não restaurar, `window.location.reload()` automático.
- Mitigar o pico de GPU: montar grama fluffy depois do mundo, reduzir instâncias, adiar shaders de água.