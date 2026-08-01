# 🐴 TODO - Sistema de Montaria (Mount System)

## Objetivo
Implementar montaria funcional que funciona tanto com Player.jsx quanto AvatarPlayer.jsx, estilo MMO profissional.

---

## 📋 Plano de Implementação

### FASE 1 - Store (Estado Global)
- [x] ~~1.1 Adicionar `mount` ao useGameStore~~
- [x] ~~1.2 Adicionar `mountRigidBody` + setters~~
- [x] ~~1.3 Adicionar `mountSummon`, `mountStore`, `mountToggle`~~

### FASE 2 - Player.jsx (Montaria)
- [x] ~~2.1 Importar `mount` do store~~
- [x] ~~2.2 No useFrame: se `mount.isActive`, pular movimento do rigidbody~~
- [x] ~~2.3 `moveDir` continua sendo populado para montaria ler~~
- [x] ~~2.4 Animação fica `Idle` quando montado~~

### FASE 3 - AvatarPlayer.jsx (Montaria)
- [x] ~~3.1 Mesma lógica do Player.jsx~~
- [x] ~~3.2 `isMounted` check no useFrame~~

### FASE 4 - ARScene.jsx (Integração)
- [x] ~~4.1 Importar `Mount` de ./mounts/Mount~~
- [x] ~~4.2 Renderizar `<Mount />` dentro do grupo~~
- [x] ~~4.3 Quando montado: esconder Player/AvatarPlayer~~
- [x] ~~4.4 Quando desmontado: mostrar Player/AvatarPlayer~~

### FASE 5 - MountMenu.jsx (UI)
- [x] ~~5.1 Botão flutuante para invocar/desmontar~~
- [x] ~~5.2 Menu de seleção de tipo (horse/wolf/tiger)~~
- [x] ~~5.3 Tecla M para toggle~~

### FASE 6 - MountSummonEffect.jsx (VFX)
- [x] ~~6.1 Conectar efeito ao summon~~
- [x] ~~6.2 Partículas de fumaça ao invocar~~

---

## 🔄 Fluxo de Dados

```
Input (Keyboard/Joystick)
  → moveDir (Player.jsx ref)
    → Mount.jsx lê moveDir.current
      → Mount seta playerPosition (Y+0.8)
        → Câmera segue playerPosition
```

## 📁 Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `useGameStore.js` | + mount state |
| `Player.jsx` | + isMounted check |
| `AvatarPlayer.jsx` | + isMounted check |
| `ARScene.jsx` | + Mount import/render |
| `Mount.jsx` | (já pronto) |
| `MountMenu.jsx` | (já pronto) |
| `MountSummonEffect.jsx` | (já pronto) |
</｜create>
</create_file>
