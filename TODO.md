# TODO — Pet + UI (clima/teleport)

## Etapa 1 — Pet core
- [ ] Criar store no `src/hooks/useGameStore.js` com estado do pet (tipo, nome, ativo, life, desbloqueado)
- [ ] Criar componente `src/components/pets/Pet.jsx` (esfera inicial) com lógica de seguir/teleportar quando distante
- [ ] Persistir/recuperar pet no save em `src/hooks/useSaveSystem.js`

## Etapa 2 — UI do pet
- [ ] Criar menu overlay `src/components/pets/PetMenu.jsx`:
  - [ ] escolher tipo (baseado no que o jogador desbloqueou)
  - [ ] nomear e gravar no “banco”
  - [ ] chamar / guardar pet
  - [ ] recarregar aplica animação (Idle parado / Run se tiver movimento)
- [ ] Integrar o menu no `src/components/ARScene.jsx` (montar junto da UI existente)

## Etapa 3 — HUD de clima + botões
- [ ] Melhorar HUD de clima existente no `src/components/ARScene.jsx` (animar ícones lua/sol e variações)
- [ ] Criar/ajustar botão de teleporte na direita superior (confirmar se precisa de lista de destinos ou só do teleportUp atual)

## Etapa 4 — Testes
- [ ] Rodar `npm run dev` e testar:
  - [ ] pet segue e não trava distante (teleporta quando necessário)
  - [ ] life do pet (diminui quando perder—por enquanto pode ser dummy)
  - [ ] save/load preserva pet
  - [ ] menu funciona sem cobrir outros painéis

