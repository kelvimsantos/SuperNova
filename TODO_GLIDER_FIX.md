# TODO - Correção do Planador (Glider)

## Objetivo
1. Planador deve cair mais devagar (gravidade reduzida) e ir mais pra frente.
2. Planador deve rotacionar na MESMA direção do avatar GLB.
3. Tocar a mesma animação usada no cavalo ('idle2') e rotacionar os braços do avatar para cima enquanto plana.

## Passos
- [x] Adicionar `avatarFacingRef` no useGameStore para sincronizar rotação avatar↔planador.
- [ ] AvatarPlayer: não sobrescrever velocidade linear ao planar; virar para direção do movimento; tocar 'idle2'; rotacionar braços para cima.
- [ ] Glider: usar avatarFacingRef para rotação; ajustar gravidade (-1.8) e impulso pra frente (4.0).
- [ ] Rodar `vite build` para validar.
