# 🐴 Correção da Montaria - TODO

## ✅ Etapa 1: Mount.jsx - Física e Movimento
- [x] Reduzir linearDamping 2.0 → 0.5
- [x] Adicionar frictio no CapsuleCollider (0.8)
- [x] Aumentar mass 2 → 3
- [x] Adicionar ground snap via raycast a cada frame
- [x] Quando parado, travar no chão com velocidade Y negativa
- [x] Melhorar movimento em slopes

## ✅ Etapa 2: Player.jsx - Congelar velocidade quando montado
- [x] Zerar TODAS as velocidades (incluindo Y) quando montado

## ✅ Etapa 3: AvatarPlayer.jsx - Mesma correção
- [x] Mesmo tratamento do Player.jsx

## ✅ Etapa 4: KeyboardControls.jsx - Garantir fluxo mountMoveDir
- [x] Atualizar mountMoveDir independente de playerRigidBody

