# TODO - Sistema de Ataque (Punch + Arco) com Sangue

## Objetivo
- Clique no inimigo → avatar toca `Punching1`/`Punching2` intercaladas → só ao terminar a animação aplica dano + efeito de sangue.
- Com arco equipado (e NÃO montado): botão direito mira (rotação horizontal seguindo o mouse), botão esquerdo dispara flecha (partícula que percorre o raycast) → ao acertar aplica dano + sangue.
- Efeito de sangue também ao montar (podendo reutilizar padrão do MountSummonEffect).
- Só ataca se não estiver montado.

## Etapas

### 1. `src/hooks/useGameStore.js`
- Adicionar estado de combate: `playerAttacking`, `attackReady`, `attackAnimIndex`, `isAiming`, `pendingTarget`.
- Setters correspondentes.
- Helper `isBowEquipped`.

### 2. `src/components/AvatarPlayer.jsx`
- Escutar evento `playerAttackRequested`.
- Intercalar `Punching1`/`Punching2`; durante a animação não sobrescrever com idle/Run.
- Ao terminar a animação (duração do clip): aplicar dano pendente + disparar `combatBlood` e `combatDamage`.
- Modo arco: `Mira-arco` + rotação horizontal.
- Não atacar se montado.

### 3. Inimigos (`SlimeEnemy.jsx`, `ZombieHorde.jsx`/`ZombiePool.js`, `TestDummy.jsx`)
- Não aplicar dano no clique; armazenar alvo pendente e disparar `playerAttackRequested`.

### 4. `src/components/BloodEffect.jsx` (NOVO)
- Partículas de sangue via evento `combatBlood`.

### 5. `src/components/ArrowProjectile.jsx` (NOVO)
- Flecha que percorre o raycast; aplica dano + sangue ao colidir.

### 6. `src/components/CombatController.jsx` (NOVO)
- Input: mousedown esquerdo (punch), botão direito (mira), pointermove (rotação), fire (flecha).
- Respeita regra "não montado".

### 7. `src/components/ARScene.jsx`
- Montar `<BloodEffect />` e `<ArrowProjectile />` e `<CombatController />`.

## Status
- [x] Iniciado
- [x] 1. useGameStore.js — estado de combate + `requestAttack` + `isBowEquipped`
- [x] 2. AvatarPlayer.jsx — intercala `Punching1`/`Punching2`, aplica dano+sangue ao terminar a animação, modo arco
- [x] 3. Inimigos — `requestAttack` no clique, dano pendente (Slime, ZombiePool/Horde, TestDummy)
- [x] 4. BloodEffect.jsx — partículas de sangue via `combatBlood`
- [x] 5. ArrowProjectile.jsx — flecha que percorre o raycast
- [x] 6. CombatController.jsx — input (punch, mira, flecha)
- [x] 7. ARScene.jsx — monta `<BloodEffect />`, `<ArrowProjectile />`, `<CombatController />`
- [ ] Iniciado
