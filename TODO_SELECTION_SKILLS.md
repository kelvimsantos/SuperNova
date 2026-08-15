# TODO - Seleção de inimigo + Poderes funcionais + Timing de ataque dos zumbis

## Objetivo
1. Corrigir zumbis atacando rápido demais (dano no fim da animação).
2. Sistema de seleção de inimigo (botão direito seleciona, esquerdo ataca).
3. Poderes aplicarem dano real no inimigo selecionado.

## Passos
- [x] 1. useGameStore.js — adicionar `selectedTarget`, `setSelectedTarget`, `clearSelectedTarget`, `selectedTargetRef`
- [x] 2. ZombieEnemy.jsx — corrigir timing de ataque (dano no fim da animação via clip duration)
- [x] 3. ZombieEnemy.jsx — seleção com botão direito + indicador visual de seleção
- [x] 4. useSkillHotkeys.js — aplicar dano real no inimigo selecionado (cooldowns)
- [ ] 5. Build de verificação
- [ ] 6. Teste no jogo (seleção, ataque, poderes)
