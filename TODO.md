# 📌 TODO GERAL DO PROJETO (ar-game)

> Hub central de tarefas. Cada iniciativa tem seu próprio arquivo de detalhes.

---

## 🐌 PERFORMANCE — TRAVAMENTOS / QUEDA DE FRAMES

**Equipe de agentes** analisou o código e documentou causas raiz em:
📄 `TODO_PERFORMANCE.md` (diagnóstico completo) e `TODO_PERFORMANCE_QUICKFIXES.md` (plano de correção).

### Causas raiz (resumo)
1. **💥 Re-render global por frame** — `setPlayerPosition`/`setLight` criam objeto novo todo frame; `useSaveSystem`/`KeyboardControls` assinam o store inteiro.
2. **🟣 Nuvens volumétricas** — raymarching até 96 passos/pixel com cubo gigante `frustumCulled={false}`.
3. **🟠 Trimesh do mundo inteiro na física** — colisor com todos os triângulos do `world.glb`.
4. **🟢 ~30K instâncias de grama** + shader com vento/interação + sombra.
5. **🔴 ~45+ `ItemPickup` com `setIsNear` todo frame** e sem culling por distância.
6. **🟠 JSON gigante** (`scene.json` ~928K linhas) parseado na main thread → freeze no load.

### Ações de correção (quick wins P0 — baixo esforço, alto ganho)
- [ ] Selectors finos no `useGameStore` (matar re-render global)
- [ ] Evitar `setPlayerPosition`/`setLight` por frame (comparar valor / usar refs)
- [ ] `WeatherController`: `setFogIntensity`/`setParticleIntensity` só na transição
- [ ] Reduzir `uQuality` das nuvens (64 → 24), `frustumCulled={true}`, `depthTest={true}`
- [ ] `ItemPickup`/`SlimeEnemy`: setState só na transição de estado
- [ ] `dpr={[1, 1.75]}` no Canvas
- [ ] `Mount`: desligar RigidBody quando inativo (`setEnabled(false)`)
- [ ] Grama: `frustumCulled={true}`, remover `receiveShadow`
- [ ] Substituir overlays de fog por `scene.fog` nativo
- [ ] Quebrar/otimizar `scene.json` (worker ou gerar grama procedural)

> ✅ **Implementado:** sistema de Zombies com **Object Pooling** + água `light` por padrão (ver `TODO_ZOMBIE_SYSTEM.md`).

---

## 🧟 SISTEMA DE ZOMBIE + ÁGUA SIMPLES
📄 `TODO_ZOMBIE_SYSTEM.md` — implementado e build validado ✅

### Object Pooling dos zombies (⚡ performance)
- `src/components/enemies/ZombiePool.js` — pool puro (sem React): modelo clonado N vezes com esqueleto independente (`SkeletonUtils.clone`), cada um com `AnimationMixer` próprio; spawn/despawn = visibilidade; máquina de estados (idle/walk/run/attack/hit/death/respawn distante); raycast de relevo com throttle; HP bar billboard; hit test por clique.
- `src/components/enemies/ZombieHorde.jsx` — componente React: carrega o modelo UMA vez (`useGLTF` + preload), **UM useFrame** atualiza TODOS os zombies, cliques via 1 hit test.
- `src/components/enemies/EnemySpawner.jsx` — zombies agora renderizados via `<ZombieHorde>` (slimes/dummies continuam individuais).
- Benefício: **zero criar/destruir por spawn/respawn = zero GC pressure = sem stutter**, e custo de update independente do número de zombies.

---

## 🌤️ HUD WARFRAFT (WarcraftWeatherHud)
- [x] Entender estrutura atual (HUDs, PetMenuFixed, WeatherController e ARScene)
- [x] Adicionar estado global no store para: currentWeather e timeOfDay01
- [x] Publicar isNight/timeOfDay01/currentWeather no WeatherController (mirror para a HUD)
- [x] Implementar evento global 'teleport-up' e remover botão Teleport do canto inferior direito do ARScene
- [ ] Reestruturar WarcraftWeatherHud para:
  - [ ] ficar no topo central, com layout tipo healthbar/overlay
  - [ ] exibir 2 status (Dia/Noite) lado a lado com ícone estilo Warcraft
  - [ ] exibir clima em categoria central com ícones para neve/chuva/ventania/tempestade
  - [ ] botão Teleport dentro da HUD
  - [ ] integrar PetMenuFixed no topo (lado direito da HUD)
  - [ ] exibir horário do PC abaixo do componente
- [ ] Ajustar WarcraftWeatherHud.css para o novo layout
- [ ] Garantir que a HUD não bloqueia controles da cena (pointer-events)
- [ ] Rodar npm run dev e testar no browser

