import { useRef, useEffect, useState, useCallback } from 'react';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Vector3, Raycaster } from 'three';
import useGameStore from '../hooks/useGameStore';
import { EquipmentAttachment } from './equipment/EquipmentAttachment';

const AVATAR_MODEL_PATH = '/models/avatar/body.glb';
const HAIR_BASE_PATH = '/models/avatar/hair/hair-';

const AVATAR_SCALE = 0.006;

const HAIR_POSITIONS = {
  0: { y: -175.1 },
  1: { y: -195.1 },
  2: { y: -195.1 },
  3: { y: -195.1 },
  4: { y: -180.1 },
  5: { y: -195.1 },
  6: { y: -175.1 }
};

const HAIR_Y_OFFSET = -10;
const HAIR_SCALE_FACTOR = 0.8;

const GROUND_OFFSET = 0.01;
const VISUAL_OFFSET_Y = -1.6;
const VISUAL_OFFSET_Z = -0.1;

export const AvatarPlayer = ({ userId, avatarConfig, loadingAvatar }) => {
  const rigidBodyRef = useRef();
  const visualRef = useRef();
  const bodyModelRef = useRef(null);
  const hairModelRef = useRef(null);
  const moveDir = useRef({ x: 0, z: 0 });
  const [isGrounded, setIsGrounded] = useState(true);
  
  const setPlayerRigidBody = useGameStore((state) => state.setPlayerRigidBody);
  const currentAnim = useRef('idle2');
  const isNight = useGameStore((state) => state.isNight);
  const currentScene = useGameStore((state) => state.currentScene);
  const worldGroupRef = useGameStore((state) => state.worldGroupRef);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const playerHealth = useGameStore((state) => state.playerHealth);
  const regenHealth = useGameStore((state) => state.regenHealth);
  const isDead = playerHealth <= 0;
  
  const mount = useGameStore((s) => s.mount);
  const mountRotation = useGameStore((s) => s.mountRotation);
  const isMounted = !!mount?.isActive;

const equippedItems = useGameStore(state => state.equippedItems);

  const stuckAttempts = useRef(0);
  const lastStuckTime = useRef(0);
  const frameCounter = useRef(0);
  const isFallingRef = useRef(false);
  const wasMountedRef = useRef(false);

// 🔥 ESTADO DE ATAQUE
  const attackingRef = useRef(false);
  const attackAnimTimeRef = useRef(0);
  const attackAnimDurationRef = useRef(0);
  const pendingTargetRef = useRef(null);
  const isAimingRef = useRef(false);
  const isBowAttackRef = useRef(false);
  const attackDamageAppliedRef = useRef(false);

  // 🔥 REFS DOS BRAÇOS (para rotacionar para cima enquanto plana)
  const leftArmRef = useRef(null);
  const rightArmRef = useRef(null);
  const leftForeArmRef = useRef(null);
  const rightForeArmRef = useRef(null);
  const armRestRot = useRef(null); // guarda rotação original dos braços

  const gliderOpen = useGameStore((s) => s.gliderOpen);
  const avatarFacingRef = useGameStore((s) => s.avatarFacingRef);

  const { scene: bodyScene, animations } = useGLTF(AVATAR_MODEL_PATH);
  
  const hairIndex = avatarConfig?.hairIndex ?? -1;
  const hairPath = hairIndex >= 0 ? `${HAIR_BASE_PATH}${String(hairIndex + 1).padStart(2, '0')}.glb` : null;
  const { scene: hairScene } = useGLTF(hairPath || '');
  
  const { actions } = useAnimations(animations, bodyModelRef);

  const playAnimation = (name) => {
    if (!actions || !actions[name] || currentAnim.current === name) return;
    Object.values(actions).forEach(action => action.stop());
    actions[name].reset().play();
    currentAnim.current = name;
  };

  // 🔥 TOCA ANIMAÇÃO DE SOCO (intercalada entre Punching1 e Punching2)
  const playPunch = useCallback(() => {
    const idx = useGameStore.getState().attackAnimIndex;
    const name = idx % 2 === 0 ? 'Punching1' : 'Punching2';
    if (!actions || !actions[name]) return;
    Object.values(actions).forEach(action => action.stop());
    const action = actions[name];
    action.reset().play();
    currentAnim.current = name;
    attackingRef.current = true;
    attackAnimTimeRef.current = 0;
    // 🔥 Duração aproximada do clip (fallback 0.6s)
    attackAnimDurationRef.current = action.getClip().duration || 0.6;
    useGameStore.getState().setPlayerAttacking(true);
    useGameStore.getState().setAttackReady(false);
    useGameStore.getState().setAttackAnimIndex(idx + 1);
  }, [actions]);

  // 🔥 TOCA ANIMAÇÃO DE ARCO (Mira-arco)
  const playShoot = useCallback((target) => {
    if (!actions) return;
    // Tenta animações de arco/mira
    const shootNames = ['Mira-arco', 'Aim', 'Bow', 'Shoot', 'aim', 'shoot', 'Bow2', 'AimShot'];
    const name = shootNames.find(n => actions[n]) || 'Punching1';
    if (!actions[name]) return;
    console.log('[BOW-DEBUG] >>> playShoot CHAMADO target:', target, 'animação:', name);

    Object.values(actions).forEach(action => action.stop());
    const action = actions[name];
    action.reset().play();
    currentAnim.current = name;
    attackingRef.current = true;
    attackAnimTimeRef.current = 0;
    // 🔥 Duração do ataque de arco (0.5s — mais suave)
    attackAnimDurationRef.current = 0.5;
    // Acelera a animação para terminar em 0.5s
    const clipDuration = action.getClip().duration || 1.0;
    action.timeScale = clipDuration / 0.5;

    // Guarda o alvo para aplicar dano quando a animação terminar
    pendingTargetRef.current = target;
    isBowAttackRef.current = true;
    useGameStore.getState().setPlayerAttacking(true);
    useGameStore.getState().setAttackReady(false);
  }, [actions]);

  // 🔥 APLICA O DANO PENDENTE (chamado quando a animação termina)
  const applyPendingDamage = useCallback(() => {
    const target = pendingTargetRef.current;
    const wasBowAttack = isBowAttackRef.current;
    console.log('[BOW-DEBUG] >>> applyPendingDamage INICIO wasBow:', wasBowAttack, 'target:', target);
    if (target) {
      console.log('[BOW-DEBUG]    target props:', { id: target.id, pos: target.pos, position: target.position, applyDamage: !!target.applyDamage });
    }

    // 🔥 SEMPRE libera o estado de ataque (evita travar o personagem)
    pendingTargetRef.current = null;
    attackingRef.current = false;
    useGameStore.getState().setPlayerAttacking(false);
    useGameStore.getState().setAttackReady(true);
    useGameStore.getState().setPendingTarget(null);
    isBowAttackRef.current = false;

    if (!target) {
      console.log('[BOW-DEBUG] >>> SEM TARGET - retornando');
      return;
    }
    const dmg = useGameStore.getState().getPlayerDamage();
    console.log('[BOW-DEBUG]    dmg calculado:', dmg);

    // 🔥 NÃO checa distância aqui - já foi checado ao iniciar o ataque
    // O alvo pode ter se movido ligeiramente durante a animação

    // 🔥 ATAQUE DE ARCO: dispara flecha visível (FX) em direção ao inimigo + aplica dano direto
    if (wasBowAttack) {
      console.log('[BOW-DEBUG] >>> PROCESSANDO ATAQUE DE ARCO');
      const targetPos = target.position || target.pos;
      const playerPos = rigidBodyRef.current ? rigidBodyRef.current.translation() : null;
      if (targetPos && playerPos) {
        const dir = new Vector3(
          targetPos.x - playerPos.x,
          (targetPos.y + 1.1) - playerPos.y,
          targetPos.z - playerPos.z
        ).normalize();
        
        // Dispara flecha visual (ArrowProjectile fará hit detection + partículas + dano)
        window.dispatchEvent(new CustomEvent('playerFireArrow', {
          detail: { origin: playerPos.clone(), direction: dir, noDamage: false },
        }));
        console.log('[BOW-DEBUG]    playerFireArrow disparado');
      }
      
      // Aplica dano IMEDIATAMENTE no alvo travado (para garantir dano mesmo se flecha visual errar)
      if (target.applyDamage) {
        console.log('[BOW-DEBUG]    aplicando via target.applyDamage');
        target.applyDamage(dmg);
      } else if (window.zombieHorde && window.zombieHorde.damage && target.id !== undefined) {
        console.log('[BOW-DEBUG]    aplicando via zombieHorde.damage id=', target.id, 'dmg=', dmg);
        window.zombieHorde.damage(target.id, dmg);
      } else {
        console.log('[BOW-DEBUG]    ERRO: nenhum caminho de dano! target:', target);
      }
      
      // Partículas de sangue no alvo
      if (targetPos) {
        window.dispatchEvent(new CustomEvent('combatBlood', {
          detail: { position: { x: targetPos.x, y: targetPos.y, z: targetPos.z } },
        }));
        console.log('[BOW-DEBUG]    combatBlood disparado');
      }
      
      // Texto de dano
      window.dispatchEvent(new CustomEvent('combatDamage', {
        detail: { damage: dmg, position: { x: window.innerWidth / 2, y: window.innerHeight / 3 }, isPlayer: false },
      }));

      // Mana regen on hit
      useGameStore.getState().regenManaOnHit();
      console.log('[BOW-DEBUG]    mana regen aplicado');
      
      return; // Arco já aplicou tudo, sai da função
    }

    // Aplica dano via callback do alvo (se existir - ZombieEnemy)
    if (target.applyDamage) {
      console.log('[BOW-DEBUG] aplicando via target.applyDamage');
      target.applyDamage(dmg);
    }
    // Senão, usa o pool global (ZombiePool)
    else if (window.zombieHorde && window.zombieHorde.damage && target.id !== undefined) {
      console.log('[BOW-DEBUG] aplicando via zombieHorde.damage id=', target.id, 'dmg=', dmg);
      window.zombieHorde.damage(target.id, dmg);
    } else {
      console.log('[BOW-DEBUG] NENHUM caminho de dano! id=', target.id, 'applyDamage=', !!target.applyDamage, 'horde=', !!window.zombieHorde);
    }

    // Sangue - suporta target.position (ZombieEnemy) ou target.pos (ZombiePool)
    const targetPos = target.position || target.pos;
    if (targetPos) {
      window.dispatchEvent(new CustomEvent('combatBlood', {
        detail: { position: { x: targetPos.x, y: targetPos.y, z: targetPos.z } },
      }));
    }

    // Texto de dano
    window.dispatchEvent(new CustomEvent('combatDamage', {
      detail: {
        damage: dmg,
        position: { x: window.innerWidth / 2, y: window.innerHeight / 3 },
        isPlayer: false,
      },
    }));

    // 🔥 REGENERAÇÃO DE MANA AO ACERTAR INIMIGO
    useGameStore.getState().regenManaOnHit();
  }, []);

  // 🔥 DANO DO ARCO (com delay baseado na distância)
  const applyBowDamage = useCallback((target, targetPos, playerPos) => {
    if (!target) return;
    const dmg = useGameStore.getState().getPlayerDamage();
    console.log('[BOW-DEBUG] >>> APLICANDO DANO DO ARCO (delayed) dmg:', dmg, 'target:', target);

    // Dispara flecha visual
    if (targetPos && playerPos) {
      const dir = new Vector3(
        targetPos.x - playerPos.x,
        (targetPos.y + 1.1) - playerPos.y,
        targetPos.z - playerPos.z
      ).normalize();
      window.dispatchEvent(new CustomEvent('playerFireArrow', {
        detail: { origin: playerPos.clone(), direction: dir, noDamage: false },
      }));
    }

    // Aplica dano direto no alvo - suporta tanto ZombieEnemy (applyDamage) quanto ZombiePool (id + window.zombieHorde)
    if (target.applyDamage) {
      console.log('[BOW-DEBUG]    aplicando via target.applyDamage');
      target.applyDamage(dmg);
    } else if (window.zombieHorde && window.zombieHorde.damage && target.id !== undefined) {
      console.log('[BOW-DEBUG]    aplicando via zombieHorde.damage id=', target.id, 'dmg=', dmg);
      window.zombieHorde.damage(target.id, dmg);
    } else {
      console.log('[BOW-DEBUG]    ERRO: nenhum caminho de dano! target:', { id: target.id, pos: target.pos, applyDamage: !!target.applyDamage, horde: !!window.zombieHorde });
    }

    // Partículas de sangue
    if (targetPos) {
      window.dispatchEvent(new CustomEvent('combatBlood', {
        detail: { position: { x: targetPos.x, y: targetPos.y, z: targetPos.z } },
      }));
    }

    // Texto de dano
    window.dispatchEvent(new CustomEvent('combatDamage', {
      detail: { damage: dmg, position: { x: window.innerWidth / 2, y: window.innerHeight / 3 }, isPlayer: false },
    }));

    // Mana regen
    useGameStore.getState().regenManaOnHit();
  }, []);

  // 🔥 VIRA O AVATAR PARA ENFRENTAR O ALVO
  const faceTarget = useCallback((target) => {
    if (!visualRef.current || !rigidBodyRef.current) return;
    const targetPos = target.position || target.pos;
    if (!targetPos) return;
    const playerPos = rigidBodyRef.current.translation();
    const dx = targetPos.x - playerPos.x;
    const dz = targetPos.z - playerPos.z;
    const angle = Math.atan2(dx, dz);
    visualRef.current.rotation.y = angle;
    avatarFacingRef.current = angle;
  }, [avatarFacingRef]);

  // 🔥 ESCUTA O EVENTO DE ATAQUE (clique no inimigo)
  //    Com arco equipado e alvo > 2m → animação de arco (Mira-arco) + dano após delay.
  //    Sem arco → dano IMEDIATO (corpo-a-corpo) + animação visual.
  useEffect(() => {
    const handler = (e) => {
      const target = e.detail?.target;
      if (!target) return;
      if (isMounted) return;

      const targetPos = target.position || target.pos;
      const isBow = useGameStore.getState().isBowEquipped();
      const playerPos = rigidBodyRef.current ? rigidBodyRef.current.translation() : null;

      let dist = Infinity;
      if (targetPos && playerPos) {
        const dx = targetPos.x - playerPos.x;
        const dz = targetPos.z - playerPos.z;
        dist = Math.sqrt(dx * dx + dz * dz);
      }

      pendingTargetRef.current = target;
      faceTarget(target);

      if (isBow && dist > 2) {
        // 🔥 ARCO: animação + dano com delay baseado na distância
        const dmg = useGameStore.getState().getPlayerDamage();
        
        // Define delay baseado na distância
        // Distância > 5m: 1.5s de delay | Distância 2-5m: 0.5s de delay
        const delay = dist > 5 ? 1.5 : 0.5;
        
        // Agenda o dano com delay baseado na distância
        const delayId = setTimeout(() => {
          // Aplica dano direto (mesma lógica do melee)
          if (target.applyDamage) {
            target.applyDamage(dmg);
          } else if (window.zombieHorde && window.zombieHorde.damage && target.id !== undefined) {
            window.zombieHorde.damage(target.id, dmg);
          }
          
          // Partículas direcionadas ao inimigo (do player ao alvo)
          const targetPos = target.position || target.pos;
          const playerPos = rigidBodyRef.current ? rigidBodyRef.current.translation() : null;
          if (playerPos && targetPos) {
            window.dispatchEvent(new CustomEvent('bowParticles', {
              detail: { 
                origin: playerPos.clone(), 
                direction: new Vector3(
                  targetPos.x - playerPos.x,
                  (targetPos.y + 1.1) - playerPos.y,
                  targetPos.z - playerPos.z
                ).normalize()
              },
            }));
          }
          
          // Partículas de sangue no alvo
          if (targetPos) {
            window.dispatchEvent(new CustomEvent('combatBlood', {
              detail: { position: { x: targetPos.x, y: targetPos.y, z: targetPos.z } },
            }));
          }
          window.dispatchEvent(new CustomEvent('combatDamage', {
            detail: { damage: dmg, position: { x: window.innerWidth / 2, y: window.innerHeight / 3 }, isPlayer: false },
          }));
          useGameStore.getState().regenManaOnHit();
        }, delay * 1000);
        
        // Toca animação de arco imediatamente (para feedback visual)
        // O dano será aplicado após o delay acima
        playShoot(target);
      } else if (!isBow && dist <= 2.5) {
        // 🔥 CORPO-A-CORPO: ataque com delay de 1 segundo
        // (O dano será aplicado após 1s, enquanto a animação roda)
        if (!attackDamageAppliedRef.current) {
          attackDamageAppliedRef.current = true;
          setTimeout(() => {
            const dmg = useGameStore.getState().getPlayerDamage();
            
            // Aplica dano direto
            if (target.applyDamage) {
              target.applyDamage(dmg);
            } else if (window.zombieHorde && window.zombieHorde.damage && target.id !== undefined) {
              window.zombieHorde.damage(target.id, dmg);
            }
            
            // Partículas + texto + mana
            const targetPos = target.position || target.pos;
            if (targetPos) {
              window.dispatchEvent(new CustomEvent('combatBlood', {
                detail: { position: { x: targetPos.x, y: targetPos.y, z: targetPos.z } },
              }));
            }
            window.dispatchEvent(new CustomEvent('combatDamage', {
              detail: { damage: dmg, position: { x: window.innerWidth / 2, y: window.innerHeight / 3 }, isPlayer: false },
            }));
            useGameStore.getState().regenManaOnHit();
            
            // Permite novo ataque após o delay
            attackDamageAppliedRef.current = false;
          }, 1000);
        }
        
        // Toca animação de soco para feedback visual
        playPunch();
      } else if (!isBow) {
        console.log('📏 Alvo muito longe para soco:', dist.toFixed(1));
      }
    };
    window.addEventListener('playerAttackRequested', handler);
    return () => window.removeEventListener('playerAttackRequested', handler);
  }, [playPunch, playShoot, isMounted, faceTarget]);

  // 🔥 ESCUTA EVENTO DE ATAQUE COM ARCO (botão direito no inimigo)
  useEffect(() => {
    const handler = (e) => {
      const target = e.detail?.target;
      if (!target) return;
      if (isMounted) return;

      // 🔥 Vira o avatar para enfrentar o alvo (suporta target.position e target.pos)
      faceTarget(target);
      
      // 🔥 Calcula delay baseado na distância
      const targetPos = target.position || target.pos;
      const playerPos = rigidBodyRef.current ? rigidBodyRef.current.translation() : null;
      let dist = 0;
      if (targetPos && playerPos) {
        const dx = targetPos.x - playerPos.x;
        const dz = targetPos.z - playerPos.z;
        dist = Math.sqrt(dx * dx + dz * dz);
      }
      
      // Define delay baseado na distância
      // Distância > 5m: 1.5s de delay | Distância 2-5m: 0.5s de delay
      const delay = dist > 5 ? 1.5 : 0.5;
      
      // Agenda o dano com delay baseado na distância
      const delayId = setTimeout(() => {
        const dmg = useGameStore.getState().getPlayerDamage();
        
        // Aplica dano direto (mesma lógica do melee)
        if (target.applyDamage) {
          target.applyDamage(dmg);
        } else if (window.zombieHorde && window.zombieHorde.damage && target.id !== undefined) {
          window.zombieHorde.damage(target.id, dmg);
        }
        
        // Partículas direcionadas ao inimigo (do player ao alvo)
        const targetPos = target.position || target.pos;
        const playerPos = rigidBodyRef.current ? rigidBodyRef.current.translation() : null;
        if (playerPos && targetPos) {
          window.dispatchEvent(new CustomEvent('bowParticles', {
            detail: { 
              origin: playerPos.clone(), 
              direction: new Vector3(
                targetPos.x - playerPos.x,
                (targetPos.y + 1.1) - playerPos.y,
                targetPos.z - playerPos.z
              ).normalize()
            },
          }));
        }
        
        // Partículas de sangue no alvo
        if (targetPos) {
          window.dispatchEvent(new CustomEvent('combatBlood', {
            detail: { position: { x: targetPos.x, y: targetPos.y, z: targetPos.z } },
          }));
        }
        window.dispatchEvent(new CustomEvent('combatDamage', {
          detail: { damage: dmg, position: { x: window.innerWidth / 2, y: window.innerHeight / 3 }, isPlayer: false },
        }));
        useGameStore.getState().regenManaOnHit();
      }, delay * 1000);
      
      // Toca animação de arco imediatamente (para feedback visual)
      // O dano será aplicado após o delay acima
      playShoot(target);
    };
    window.addEventListener('playerBowAttackRequested', handler);
    return () => window.removeEventListener('playerBowAttackRequested', handler);
  }, [playShoot, isMounted, faceTarget, rigidBodyRef]);

  // 🔥 ESCUTA MIRA (arco) — rotação horizontal
  useEffect(() => {
    const handler = (e) => {
      const dx = e.detail?.dx || 0;
      isAimingRef.current = true;
      if (visualRef.current) {
        visualRef.current.rotation.y += dx * 0.01;
      }
    };
    const stopAim = () => {
      isAimingRef.current = false;
    };
    window.addEventListener('playerAim', handler);
    window.addEventListener('playerStopAim', stopAim);
    return () => {
      window.removeEventListener('playerAim', handler);
      window.removeEventListener('playerStopAim', stopAim);
    };
  }, []);

  // 🔥 REMOVE O CUBO DO GLB
  useEffect(() => {
    if (!bodyScene) return;
    
    const toRemove = [];
    bodyScene.traverse((child) => {
      if (child.isMesh && child.geometry?.type === 'BoxGeometry') {
        const params = child.geometry.parameters || {};
        if (params.width < 0.5 && params.height < 0.5 && params.depth < 0.5) {
          console.log(`🗑️ Removendo cubo do GLB: "${child.name || 'sem nome'}"`);
          toRemove.push(child);
        }
      }
    });
    
    toRemove.forEach(child => {
      if (child.parent) {
        child.parent.remove(child);
      }
    });
    
    if (toRemove.length > 0) {
      console.log(`✅ Removidos ${toRemove.length} cubos do modelo GLB`);
    }
  }, [bodyScene]);

  useEffect(() => {
    if (animations && animations.length > 0) {
      console.log('🎬 Animações disponíveis no avatar:');
      animations.forEach((anim, i) => {
        console.log(`  ${i+1}. "${anim.name}"`);
      });
    }
  }, [animations]);

function findHeadBone(model) {
    let headBone = null;
    model.traverse((child) => {
      if (child.isBone) {
        const nameLower = child.name.toLowerCase();
        if (nameLower.includes('head') || 
            nameLower.includes('cabeça') || 
            nameLower === 'mixamorig:head' ||
            nameLower === 'mixamorighead') {
          headBone = child;
        }
      }
    });
    return headBone;
  }

  // 🔥 PROCURA OS OSSOS DOS BRAÇOS (para levantar cruzado enquanto plana)
  useEffect(() => {
    if (!bodyModelRef.current) return;
    const model = bodyModelRef.current;
    model.traverse((child) => {
      if (child.isBone) {
        const nameLower = child.name.toLowerCase();
        if (nameLower.includes('leftarm')) leftArmRef.current = child;
        else if (nameLower.includes('rightarm')) rightArmRef.current = child;
        else if (nameLower.includes('leftforearm')) leftForeArmRef.current = child;
        else if (nameLower.includes('rightforearm')) rightForeArmRef.current = child;
      }
    });
    // Guarda rotação original (idle) dos braços superiores
    armRestRot.current = {
      left: leftArmRef.current ? leftArmRef.current.rotation.clone() : null,
      right: rightArmRef.current ? rightArmRef.current.rotation.clone() : null,
    };
    console.log(`🦴 Braços do avatar: L=${!!leftArmRef.current} R=${!!rightArmRef.current}`);
  }, [bodyModelRef]);

  useEffect(() => {
    if (!bodyModelRef.current || !avatarConfig) return;
    const skinColor = avatarConfig.skinColor || '#f1c27d';
    bodyModelRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          if (mat.color) mat.color.set(skinColor);
          if (mat.roughness !== undefined) mat.roughness = 1;
          if (mat.metalness !== undefined) mat.metalness = 0;
          mat.needsUpdate = true;
        });
      }
    });
  }, [bodyModelRef, avatarConfig]);

  useEffect(() => {
    if (!hairModelRef.current || !avatarConfig) return;
    const hairColor = avatarConfig.hairColor || '#4a2c2c';
    hairModelRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          if (mat.color) mat.color.set(hairColor);
          mat.needsUpdate = true;
        });
      }
    });
  }, [hairModelRef, avatarConfig]);

  useEffect(() => {
    if (!bodyModelRef.current || !hairModelRef.current) return;
    
    const headBone = findHeadBone(bodyModelRef.current);
    const baseY = HAIR_POSITIONS[hairIndex]?.y || -175.1;
    const posY = baseY + HAIR_Y_OFFSET;
    
    if (headBone) {
      const parent = hairModelRef.current.parent;
      if (parent) parent.remove(hairModelRef.current);
      headBone.add(hairModelRef.current);
      
      hairModelRef.current.position.set(0, posY, 0);
      hairModelRef.current.rotation.set(0, 0, 0);
      
      const hairScale = HAIR_SCALE_FACTOR / AVATAR_SCALE;
      hairModelRef.current.scale.set(hairScale, hairScale, hairScale);
      
      console.log(`💇 Cabelo Y=${posY}`);
    }
  }, [bodyModelRef, hairModelRef, hairIndex]);

  useEffect(() => {
    if (rigidBodyRef.current) {
      rigidBodyRef.current.currentMoveDir = moveDir;
      setPlayerRigidBody(rigidBodyRef.current);
    }
    return () => setPlayerRigidBody(null);
  }, [setPlayerRigidBody]);

  useEffect(() => {
    if (!rigidBodyRef.current) return;
    rigidBodyRef.current.setEnabled(!isMounted);
    if (isMounted) {
      const mountPos = useGameStore.getState().playerPosition;
      if (mountPos) {
        rigidBodyRef.current.setTranslation(
          { x: mountPos.x, y: mountPos.y, z: mountPos.z },
          true
        );
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }, [isMounted]);

  const findGroundY = useCallback((x, z) => {
    if (!worldGroupRef?.current) return null;
    
    const raycaster = new Raycaster();
    const origin = new Vector3(x, 100, z);
    const direction = new Vector3(0, -1, 0);
    raycaster.set(origin, direction);
    raycaster.far = 200;

    const allObjects = [];
    const collectObjects = (obj) => {
      if (obj.isMesh && obj.visible) allObjects.push(obj);
      if (obj.children) obj.children.forEach(child => collectObjects(child));
    };

    if (worldGroupRef.current) collectObjects(worldGroupRef.current);

    let closestHit = null;
    let closestDist = Infinity;

    for (const obj of allObjects) {
      const intersects = raycaster.intersectObject(obj, true);
      if (intersects.length > 0 && intersects[0].distance < closestDist) {
        closestDist = intersects[0].distance;
        closestHit = intersects[0];
      }
    }

    if (closestHit) {
      return closestHit.point.y;
    }
    return null;
  }, [worldGroupRef]);

  const forceSnapToGround = useCallback(() => {
    if (!rigidBodyRef.current || isMounted) return;
    
    const currentPos = rigidBodyRef.current.translation();
    const groundY = findGroundY(currentPos.x, currentPos.z);
    
    if (groundY !== null) {
      const targetY = groundY + GROUND_OFFSET;
      
      rigidBodyRef.current.setTranslation(
        { x: currentPos.x, y: targetY, z: currentPos.z },
        true
      );
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      setPlayerPosition({ x: currentPos.x, y: targetY, z: currentPos.z });
      
      console.log(`🔧 Forçado ao chão: Y=${targetY.toFixed(4)}`);
      return true;
    }
    return false;
  }, [isMounted, findGroundY, setPlayerPosition]);

  useEffect(() => {
    window.forceSnapToGround = forceSnapToGround;
    return () => { delete window.forceSnapToGround; };
  }, [forceSnapToGround]);

  useEffect(() => {
    if (!isMounted && wasMountedRef.current) {
      console.log('🔧 Desmontou do cavalo - ajustando ao chão...');
      setTimeout(() => {
        forceSnapToGround();
      }, 50);
    }
    wasMountedRef.current = isMounted;
  }, [isMounted, forceSnapToGround]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (rigidBodyRef.current && !isAdjusting && !loadingAvatar && !isMounted) {
        const pos = rigidBodyRef.current.translation();
        if (pos.y > 1) {
          console.log('🔄 Verificação periódica (3s): ajustando player ao chão...');
          forceSnapToGround();
        }
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [loadingAvatar, isAdjusting, isMounted, forceSnapToGround]);

  useFrame(() => {
    if (!rigidBodyRef.current || loadingAvatar || isMounted) return;
    
    const vel = rigidBodyRef.current.linvel();
    const pos = rigidBodyRef.current.translation();
    
    if (vel.y < -2 && pos.y > 2) {
      isFallingRef.current = true;
    }
    
    if (isFallingRef.current && Math.abs(vel.y) < 0.05) {
      isFallingRef.current = false;
      forceSnapToGround();
    }
  });

useFrame(({ camera }, delta) => {
    if (!rigidBodyRef.current || loadingAvatar) return;
    frameCounter.current++;

    if (isMounted) {
      playAnimation('idle2');
      if (visualRef.current) {
        visualRef.current.rotation.y = mountRotation;
      }
      return;
    }

    // 🔥 REGENERAÇÃO DE VIDA (lenta, fora de combate)
    if (playerHealth < useGameStore.getState().playerMaxHealth && !attackingRef.current) {
      regenHealth(delta);
    }

    // 🔥 ATAQUE: se estiver atacando, mantém a animação e quando termina agenda dano
    if (attackingRef.current) {
      attackAnimTimeRef.current += delta;
      if (attackAnimTimeRef.current >= attackAnimDurationRef.current) {
        console.log('[BOW-DEBUG] Animação de ataque terminou! agendando dano...');
        
        const wasBowAttack = isBowAttackRef.current;
        const target = pendingTargetRef.current;
        
        // Libera estado de ataque IMEDIATAMENTE (não trava personagem)
        pendingTargetRef.current = null;
        attackingRef.current = false;
        useGameStore.getState().setPlayerAttacking(false);
        useGameStore.getState().setAttackReady(true);
        useGameStore.getState().setPendingTarget(null);
        isBowAttackRef.current = false;
        
        // Volta ao idle
        playAnimation('idle2');
        
        if (!target) return;
        
        if (wasBowAttack) {
          // 🔥 ARCO: dano já foi aplicado imediatamente nos handlers de evento
          // Não aplica novamente aqui para evitar dano duplicado
          console.log('[BOW-DEBUG] Dano do arco já aplicado imediatamente');
        } else {
          // 🔥 CORPO-A-CORPO: verifica se o dano de 1s ainda não foi aplicado
          if (!attackDamageAppliedRef.current) {
            // Dano ainda não foi aplicado pelo timer de 1s - aplicar agora via animação
            applyPendingDamage();
          } else {
            // Dano já foi aplicado pelo timer de 1s - apenas resetar estado
            console.log('[MELEE-DEBUG] Dano de 1s já foi aplicado, resetando estado');
          }
        }
      }
      return;
    }

    const position = rigidBodyRef.current.translation();
    setPlayerPosition({ x: position.x, y: position.y, z: position.z });

    const { x: dx, z: dz } = moveDir.current;
    const currentVel = rigidBodyRef.current.linvel();
    const grounded = Math.abs(currentVel.y) < 0.05;
    setIsGrounded(grounded);
    const isMoving = dx !== 0 || dz !== 0;

    // 🔥 PLANADOR: NÃO sobrescreve a velocidade (quem controla é o Glider),
    //    toca a mesma animação do cavalo (idle2), levanta os braços e
    //    vira na direção do movimento.
const gliding = useGameStore.getState().gliderOpenRef.current;
    if (gliding) {
      playAnimation('idle2');
      // 🔥 SEMPRE vira na direção da câmera enquanto plana (mesmo sem input),
      //    acompanhando o sentido do movimento (igual ao paraglider).
      if (visualRef.current) {
        const cameraDirection = new Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        if (cameraDirection.length() > 0.001) {
          cameraDirection.normalize();
          const angle = Math.atan2(cameraDirection.x, cameraDirection.z);
          visualRef.current.rotation.y = angle;
          avatarFacingRef.current = angle;
        }
      }
      // 🔥 Levanta os braços para cima (segurando as alças do planador)
      const L = leftArmRef.current, R = rightArmRef.current;
      if (L) L.rotation.x += (Math.PI - 0.8 - L.rotation.x) * 0.2;
      if (R) R.rotation.x += (Math.PI - 0.8 - R.rotation.x) * 0.2;
      return;
    }

    // 🔥 RESTAURA OS BRAÇOS PARA A POSIÇÃO ORIGINAL (quando não está planando)
    if (armRestRot.current) {
      const L = leftArmRef.current, R = rightArmRef.current;
      if (L && armRestRot.current.left) L.rotation.copy(armRestRot.current.left);
      if (R && armRestRot.current.right) R.rotation.copy(armRestRot.current.right);
    }

    if (!isMoving) {
      playAnimation(grounded ? 'idle2' : 'Fall');
    } else {
      playAnimation('Run');
    }

    const cameraDirection = new Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    const right = new Vector3(-cameraDirection.z, 0, cameraDirection.x);
    const moveVector = new Vector3();
    moveVector.x += cameraDirection.x * dz;
    moveVector.z += cameraDirection.z * dz;
    moveVector.x += right.x * dx;
    moveVector.z += right.z * dx;
    if (moveVector.length() > 0) moveVector.normalize();

    const speed = 2;
    rigidBodyRef.current.setLinvel(
      { x: moveVector.x * speed, y: currentVel.y, z: moveVector.z * speed },
      true
    );

    if (visualRef.current && (dx !== 0 || dz !== 0)) {
      if (moveVector.length() > 0.1) {
        const angle = Math.atan2(moveVector.x, moveVector.z);
        visualRef.current.rotation.y = angle;
        avatarFacingRef.current = angle;
      }
    }

    if (frameCounter.current % 10 === 0 && grounded && !isFallingRef.current) {
      forceSnapToGround();
    }

    if (frameCounter.current % 30 === 0) {
      const vel = rigidBodyRef.current.linvel();
      const horizontalSpeed = Math.sqrt((vel.x * vel.x) + (vel.z * vel.z));
      const isMovingCheck = moveDir.current.x !== 0 || moveDir.current.z !== 0;
      
      if (isMovingCheck && horizontalSpeed < 0.01 && grounded) {
        const now = Date.now();
        if (now - lastStuckTime.current > 100) {
          lastStuckTime.current = now;
          stuckAttempts.current += 1;
          if (stuckAttempts.current >= 3) {
            const snapResult = forceSnapToGround();
            if (!snapResult) {
              rigidBodyRef.current.setLinvel({ 
                x: vel.x * 0.5, 
                y: 0.5, 
                z: vel.z * 0.5 
              }, true);
            }
            stuckAttempts.current = 0;
          }
        }
      } else {
        stuckAttempts.current = 0;
      }
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (rigidBodyRef.current && worldGroupRef?.current && !isMounted) {
        forceSnapToGround();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentScene, worldGroupRef, isMounted, forceSnapToGround]);

  if (loadingAvatar) {
    return (
      <RigidBody ref={rigidBodyRef} mass={1} position={[0, 50, 0]}>
        <CapsuleCollider args={[0.3, 0.4]} />
      </RigidBody>
    );
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      mass={1}
      position={[0, 20, 0]}
      linearDamping={0.5}
      enabledRotations={[false, false, false]}
      colliders={false}  // 🔥 IMPEDE O RAPIER DE CRIAR COLLIDERS AUTOMATICAMENTE
    >
      {/* 🔥 APENAS UM CAPSULE COLLIDER - SEM CUBOS, SEM BOX */}
      <CapsuleCollider args={[0.3, 0.4]} position={[0, VISUAL_OFFSET_Y, VISUAL_OFFSET_Z]} />
      
      <group>
        {isNight && (
          <pointLight
            intensity={5.2}
            distance={3}
            decay={0.3}
            color={0xffaa66}
            position={[0, -0.6, 0]}
          />
        )}
        
        <group 
          ref={visualRef} 
          scale={AVATAR_SCALE} 
          position={[
            0, 
            isMounted ? 0 : VISUAL_OFFSET_Y, 
            isMounted ? 0 : VISUAL_OFFSET_Z
          ]}
        >
          <primitive object={bodyScene} ref={bodyModelRef} />
          
          {hairIndex >= 0 && hairScene && (
            <primitive object={hairScene} ref={hairModelRef} />
          )}

          {bodyModelRef.current && (
            <>
              {equippedItems.weapon && (
                <EquipmentAttachment 
                  key={`weapon-${equippedItems.weapon.id || Date.now()}`}
                  playerModel={bodyModelRef.current} 
                  equipmentSlot="weapon" 
                  itemData={equippedItems.weapon}
                  customPosition={equippedItems.weapon.customPosition}
                  customRotation={equippedItems.weapon.customRotation}
                  customScale={equippedItems.weapon.customScale}
                />
              )}
              {equippedItems.shield && (
                <EquipmentAttachment 
                  key={`shield-${equippedItems.shield.id || Date.now()}`}
                  playerModel={bodyModelRef.current} 
                  equipmentSlot="shield" 
                  itemData={equippedItems.shield}
                  customPosition={equippedItems.shield.customPosition}
                  customRotation={equippedItems.shield.customRotation}
                  customScale={equippedItems.shield.customScale}
                />
              )}
              {equippedItems.helmet && (
                <EquipmentAttachment 
                  key={`helmet-${equippedItems.helmet.id || Date.now()}`}
                  playerModel={bodyModelRef.current} 
                  equipmentSlot="helmet" 
                  itemData={equippedItems.helmet}
                  customPosition={equippedItems.helmet.customPosition}
                  customRotation={equippedItems.helmet.customRotation}
                  customScale={equippedItems.helmet.customScale}
                />
              )}
              {equippedItems.chest && (
                <EquipmentAttachment 
                  key={`chest-${equippedItems.chest.id || Date.now()}`}
                  playerModel={bodyModelRef.current} 
                  equipmentSlot="chest" 
                  itemData={equippedItems.chest}
                  customPosition={equippedItems.chest.customPosition}
                  customRotation={equippedItems.chest.customRotation}
                  customScale={equippedItems.chest.customScale}
                />
              )}
              {equippedItems.shoulders && (
                <EquipmentAttachment 
                  key={`shoulders-${equippedItems.shoulders.id || Date.now()}`}
                  playerModel={bodyModelRef.current} 
                  equipmentSlot="shoulders" 
                  itemData={equippedItems.shoulders}
                  customPosition={equippedItems.shoulders.customPosition}
                  customRotation={equippedItems.shoulders.customRotation}
                  customScale={equippedItems.shoulders.customScale}
                />
              )}
            </>
          )}
        </group>
      </group>
    </RigidBody>
  );
};

export default AvatarPlayer;

useGLTF.preload(AVATAR_MODEL_PATH);