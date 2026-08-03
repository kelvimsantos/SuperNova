# TODO — Sistema de Monstros Zombie + Água simples por padrão

## Objetivo
Adicionar inimigos `zombie` com comportamento completo (Idle/Walk/Run/Attack/Hit/Death/Respawn distante)
e deixar a água em modo simples (`light`) por padrão para melhorar performance.

## Passos

- [x] Analisar o modelo `zombie.glb` (1 mesh skinned, 64 ossos, 6 animações: Idle, Run, Walk, Attack, Death, Idle2)
- [x] Confirmar plano com o usuário
- [x] Criar `src/components/enemies/ZombieEnemy.jsx`
  - [x] Carregar GLB com cache (useGLTF preload)
  - [x] Máquina de estados: spawn → idle → walk → run → attack → hit → death → respawn distante
  - [x] Seguir relevo com raycast throttle (a cada 12 frames)
  - [x] Dano por clique (onClick) + hit reaction
  - [x] Barra de HP / vida (billboard + largura proporcional)
  - [x] Sem setState por frame (usar refs — `stateRef`, `healthRef`, `positionRef`)
- [x] Editar `src/components/enemies/EnemySpawner.jsx`
  - [x] Adicionar suporte ao tipo `zombie`
  - [x] Configurar 3 zombies na cena `default`
- [x] Adicionar drops de zombie em `src/config/droppedItems.js` (common/uncommon/rare)
- [x] Editar `src/hooks/useGameStore.js`
  - [x] `waterMode` default = `'light'` (água simples para todos; `full` vira opt-in)
- [x] Corrigir ordem de declaração `die`/`respawn` (TDZ) no ZombieEnemy
- [x] **Object Pooling dos zombies** (`src/components/enemies/ZombiePool.js` + `ZombieHorde.jsx`)
  - [x] Modelo carregado UMA vez (`useGLTF` + preload) e clonado N vezes com esqueleto independente (`SkeletonUtils.clone`)
  - [x] Cada clone tem seu próprio `AnimationMixer` (animações independentes)
  - [x] **UM useFrame** atualiza TODOS os zombies (não 1 por zombie)
  - [x] Spawn/despawn = toggle de visibilidade (sem criar/destruir = sem GC pressure = sem stutter)
  - [x] Raycast de relevo com throttle (a cada 12 frames) reaproveitando raycaster único
  - [x] HP bar billboard por zombie (proporcional à vida)
  - [x] Hit test por clique contra todos os zombies (1 raycast, matriz inversa)
  - [x] `EnemySpawner.jsx` agora renderiza zombies via `<ZombieHorde>` (slimes/dummies continuam individuais)
- [x] Testar build (`npm run build`) — ✅ 698 módulos, sem erros
- [ ] Testar com `npm run dev` (validação visual final)

## Validação
- Zombies na cena default: parados → andam → correm → atacam → morrem → renascem mais longe
- Água em modo simples por padrão

