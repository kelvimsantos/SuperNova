# TODO - Planador estilo Zelda

## Objetivo
Adicionar um planador estilo Breath of the Wild que:
- Fica no menu de montarias (junto com cavalo/tigre).
- Ao segurar espaço por mais de 1 segundo, abre o planador nas costas do player.
- Só ativa se o player estiver longe do chão (no ar).
- Com o planador aberto, o player plana (gravidade reduzida) e é controlado com WASD.

## Passos
- [x] 1. useGameStore.js — adicionar estado `gliderOpen` + setter
- [x] 2. Mount.jsx — adicionar tipo `glider` ao MOUNT_TYPES
- [x] 3. Glider.jsx (novo) — componente de física + visual do planador
- [x] 4. MountMenu.jsx — adicionar Planador 🪂 ao menu
- [x] 5. KeyboardControls.jsx — segurar espaço por 1s para abrir
- [x] 6. ARScene.jsx — montar o componente <Glider />
- [ ] 7. Build de verificação
