// src/components/enemies/ZombiePool.js
// 🔥 Object Pooling para zombies — SEM FÍSICA (RigidBody)
// - Modelo carregado UMA vez e clonado com esqueleto independente (SkeletonUtils.clone)
// - Cada clone tem seu próprio AnimationMixer (animações independentes)
// - Spawn/despawn = toggle de visibilidade (zero criar/destruir = zero GC pressure)
// - Fica no chão via RAYCAST do relevo (sem Rapier) — igual ao exemplo EnemyHorde
// - Separação entre zombies para evitar sobreposição
// - Toda a lógica roda em refs (sem setState por frame)

import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import useGameStore from '../../hooks/useGameStore';
import { ItemDatabase } from '../inventory/ItemTypes';
import { generateDrops } from '../../config/droppedItems';

const GROUND_OFFSET = 0.05;

// Mapa de animações do modelo zombie.glb
const ANIM = {
  idle: 'zombie_02_Idle',
  walk: 'zombie_02_Walk',
  run: 'zombie_02_Run',
  attack: 'zombie_02_Attack',
  death: 'zombie_02_Death',
};

function getShortName(clipName) {
  for (const key in ANIM) {
    if (ANIM[key] === clipName) return key;
  }
  return clipName;
}

export class ZombiePool {
  constructor({
    scene,
    animations,
    count = 8,
    respawnDelay = 3000,
    aggroRadius = 18,
    runRadius = 9,
    attackRange = 2.2,
    hitRange = 2.6,
    respawnDistance = 30,
    separationRadius = 0.8,
  }) {
    this.respawnDelay = respawnDelay;
    this.aggroRadius = aggroRadius;
    this.runRadius = runRadius;
    this.attackRange = attackRange;
    this.hitRange = hitRange;
    this.respawnDistance = respawnDistance;
    this.separationRadius = separationRadius;

    // Raycaster reaproveitado (sem alocar por frame)
    this.raycaster = new THREE.Raycaster();
    this.rayOrigin = new THREE.Vector3();
    this.rayDir = new THREE.Vector3(0, -1, 0);
    this.raycastMeshes = [];
    this.frame = 0;

    // 🔥 Cache de meshes do terreno (evita traverse() caro a cada raycast)
    this._cachedWorld = null;
    this._terrainMeshes = [];
    this._emptyCacheFrames = 0;

    // 🔥 Quaternion de scratch para billboard da barra de HP
    this._tmpQuat = new THREE.Quaternion();

    this.entities = [];

    for (let i = 0; i < count; i++) {
      // 🔥 Clone com esqueleto independente (bone matrices próprias)
      const root = cloneSkeleton(scene);
      root.visible = false;
      root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.frustumCulled = true;
        }
      });

      // 🔥 Escala base do GLB (zombie.glb tem raiz em 0.001 — NÃO sobrescrever)
      const baseScale = root.scale.clone();

      // 🔥 Mixer + actions próprias de cada clone
      const mixer = new THREE.AnimationMixer(root);
      const actions = {};
      for (const clip of animations) {
        const short = getShortName(clip.name);
        actions[short] = mixer.clipAction(clip);
      }

      // 🔥 Barra de HP (billboard) anexada ao clone
      // ⚠️ Compensa a escala raiz (0.001) p/ a barra aparecer em tamanho normal no mundo
      const hpGroup = new THREE.Group();
      hpGroup.position.set(0, 1.95 / baseScale.y, 0);
      hpGroup.scale.set(1 / baseScale.x, 1 / baseScale.y, 1 / baseScale.z);
      const bgMat = new THREE.MeshBasicMaterial({
        color: 0x222222,
        depthTest: false,
        transparent: true,
        opacity: 0.8,
      });
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), bgMat);
      const fillMat = new THREE.MeshBasicMaterial({ color: 0xff2222, depthTest: false });
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), fillMat);
      fill.position.z = 0.001;
      hpGroup.add(bg, fill);
      hpGroup.visible = false;
      root.add(hpGroup);

      this.entities.push({
        id: i,
        root,
        mixer,
        actions,
        active: false,
        dead: false,
        state: 'idle',
        hp: 80,
        maxHp: 80,
        damage: 12,
        expReward: 120,
        pos: new THREE.Vector3(),
        baseScale,
        separationRadius: separationRadius + Math.random() * 0.3,
        attackTimer: 0,
        attackHitDone: false,
        hitCooldown: 0,
        hitScale: 0,
        lastGroundY: null,
        targetGroundY: null,
        respawnTimer: null,
        hpGroup,
        hpFill: fill,
        _currentAction: null,
      });
    }
  }

  // 🔥 Raycast único para baixo (relevo) — sem física
  // ⚠️ CRÍTICO (CORREÇÃO DO FLUTUAR): o worldGroupRef NÃO contém só o chão.
  //    Dentro dele vivem também o Player, SlimeEnemy, TestDummy, ItemPickup,
  //    Portal, NPCs, Pet, Mount etc. Se o raio bater nesses objetos antes do
  //    chão, retorna um Y alto e o zumbi flutua.
  // ✅ A correção definitiva: as meshes do terreno são marcadas com
  //    `userData.isTerrain = true` no World.jsx. Aqui filtramos ESCLUSIVAMENTE
  //    por essa flag — nada mais entra no cache.
  // ⚠️ Fallback: se nenhuma mesh marcada for encontrada (World ainda montando),
  //    o cache fica vazio e findGroundY retorna null; o loop de update reconstrói
  //    o cache a cada 12 frames até o World.jsx marcar as meshes.
  _rebuildTerrainCache() {
    const world = useGameStore.getState().worldGroupRef;
    if (!world) return 0;

    this._cachedWorld = world;
    this._terrainMeshes = [];

    world.traverse((o) => {
      if (!o.isMesh) return;
      // ✅ Aceita SOMENTE meshes marcadas como terreno pelo World.jsx
      if (!o.userData.isTerrain) return;

      // Segurança extra: exclui clones dos zombies (caso extremo)
      let p = o.parent;
      while (p) {
        if (this._zombieRootSet && this._zombieRootSet.has(p)) return;
        p = p.parent;
      }

      this._terrainMeshes.push(o);
    });

    // 🔥 Mantém um Set dos roots dos zombies para filtro rápido
    if (!this._zombieRootSet) {
      this._zombieRootSet = new Set(this.entities.map((e) => e.root));
    }

    if (this._terrainMeshes.length > 0 && this._loggedCache !== world) {
      this._loggedCache = world;
      console.log(`[ZombiePool] 🌍 Cache do terreno OK: ${this._terrainMeshes.length} meshes`);
    }

    return this._terrainMeshes.length;
  }

  _sampleGroundY(x, z) {
    if (this._terrainMeshes.length === 0) return null;

    const { raycaster, rayOrigin, rayDir } = this;
    rayOrigin.set(x, 500, z);
    raycaster.set(rayOrigin, rayDir);
    raycaster.far = 600;
    // 🔥 Permite raycast em meshes invisíveis (ex: chunks desativados pelo streaming)
    raycaster.checkVisibility = false;

    const hits = raycaster.intersectObjects(this._terrainMeshes, true);
    if (hits.length === 0) return null;

    // 🔥 CORREÇÃO: filtra hits que são partes do próprio zombie (em caso extremo
    //    de clone acidental dentro do worldGroup) e overlays transparentes
    //    (névoa, partículas, fade) que têm depthWrite=false.
    //    Prefere SEMPRE o material opaco (terreno de verdade).
    const zombieRootIds = new Set(this.entities.map((e) => e.root.uuid));
    let fallback = null;

    for (const hit of hits) {
      let obj = hit.object;
      let isZombie = false;
      while (obj) {
        if (zombieRootIds.has(obj.uuid)) {
          isZombie = true;
          break;
        }
        obj = obj.parent;
      }
      if (isZombie) continue;

      if (fallback === null) fallback = hit.point.y;

      const m = Array.isArray(hit.object.material)
        ? hit.object.material[0]
        : hit.object.material;
      const isOverlay = !!(m && m.transparent && !m.depthWrite);
      if (!isOverlay) return hit.point.y;
    }

    // Se só achou overlays transparentes, usa o primeiro mesmo assim
    return fallback;
  }

  findGroundY(x, z) {
    const world = useGameStore.getState().worldGroupRef;
    if (!world) return null;

    // 🔥 REBUILD FORÇADO do cache a CADA chamada se o mundo mudou
    if (this._cachedWorld !== world) {
      this._rebuildTerrainCache();
    }

    // 🔥 CORREÇÃO CRÍTICA: se o cache está vazio, o terreno GLB pode ainda
    //    estar carregando (useGLTF carrega ASSÍNCRONO). O World.jsx monta
    //    o grupo imediatamente, mas as meshes do GLB só aparecem depois.
    //    Em vez de esperar, REBUILD o cache AGORA mesmo.
    if (this._terrainMeshes.length === 0) {
      this._rebuildTerrainCache();
      if (this._terrainMeshes.length === 0) return null;
    }

    // Raycast no centro
    let gy = this._sampleGroundY(x, z);
    if (gy !== null) return gy;

    // 🔥 Fallback: amostra pontos levemente deslocados (buraco / borda de chunk)
    const offsets = [
      [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7],
      [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5],
    ];
    for (const [ox, oz] of offsets) {
      gy = this._sampleGroundY(x + ox, z + oz);
      if (gy !== null) return gy;
    }
    return null;
  }

  // 🔥 Verifica se a posição está livre (evita sobreposição entre zombies)
  isPositionFree(x, z, ignore = null) {
    for (const e of this.entities) {
      if (e === ignore || !e.active) continue;
      const dx = x - e.pos.x;
      const dz = z - e.pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < e.separationRadius + this.separationRadius) return false;
    }
    return true;
  }

  // 🔥 Encontra posição livre próxima de (x,z)
  findFreePosition(x, z, attempts = 20) {
    for (let i = 0; i < attempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.separationRadius * 2 + Math.random() * 2;
      const nx = x + Math.cos(angle) * radius;
      const nz = z + Math.sin(angle) * radius;
      if (this.isPositionFree(nx, nz)) {
        const gy = this.findGroundY(nx, nz);
        return { x: nx, z: nz, groundY: gy !== null ? gy : 15 };
      }
    }
    return null;
  }

// 🔥 Posição distante do player para respawn (livre de colisão)
  // ⚠️ Corrigido: fallback usa playerPos.y (chão real) em vez de 15 fixo
  getNextPosition() {
    const playerPos = useGameStore.getState().playerPosition || { x: 0, y: 0, z: 0 };
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this.respawnDistance + Math.random() * 12;
      const x = playerPos.x + Math.cos(angle) * dist;
      const z = playerPos.z + Math.sin(angle) * dist;
      if (this.isPositionFree(x, z)) {
        const gy = this.findGroundY(x, z);
        return new THREE.Vector3(
          x,
          gy !== null ? gy + GROUND_OFFSET : playerPos.y + GROUND_OFFSET,
          z
        );
      }
    }
    return null;
  }

// 🔥 SPAWN (pega do pool, não cria nada)
  // ⚠️ Corrigido: se findGroundY falhar, usa o Y do player (que está no chão via física)
  //    em vez de um número fixo. Se o player ainda não tiver posição, spawna em Y=0
  //    e o raycast contínuo vai ajustar nos frames seguintes.
  spawn(entity, position, cfg = {}) {
    if (entity.active) return;
    const safePos = position || this.getNextPosition();
    if (!safePos) return;

    entity.active = true;
    entity.dead = false;
    entity.state = 'idle';
    entity.maxHp = cfg.health || entity.maxHp || 80;
    entity.hp = entity.maxHp;
    entity.damage = cfg.damage || entity.damage || 12;
    entity.expReward = cfg.expReward || entity.expReward || 120;

    entity.pos.copy(safePos);

    // Tenta achar o chão 3x com delay (terreno pode estar carregando)
    const tryGround = (attempt = 0) => {
      const gy = this.findGroundY(safePos.x, safePos.z);
      if (gy !== null) {
        entity.pos.y = gy + GROUND_OFFSET;
        entity.lastGroundY = gy;
        this._finalizeSpawn(entity);
      } else if (attempt < 2) {
        setTimeout(() => tryGround(attempt + 1), 500);
      } else {
        // Fallback CRÍTICO: usa Y do player (que está no chão via física Rapier)
        const playerPos = useGameStore.getState().playerPosition;
        const fallbackY = playerPos ? playerPos.y + GROUND_OFFSET : 0;
        console.warn(`[ZombiePool] findGroundY falhou. Usando Y do player: ${fallbackY.toFixed(2)}`);
        entity.lastGroundY = fallbackY - GROUND_OFFSET;
        // ⚠️ IMPORTANTE: também seta targetGroundY, senão o moveAndGround
        //    NUNCA atualiza o Y (a condição de ajuste exige target != null)
        //    e o zumbi fica andando flutuando a uma altura fixa para sempre.
        entity.targetGroundY = fallbackY - GROUND_OFFSET;
        entity.pos.y = fallbackY;
        this._finalizeSpawn(entity);
      }
    };

    tryGround();
  }

  // 🔥 Finaliza o spawn (seta posição, visibilidade, animação)
  _finalizeSpawn(entity) {
    entity.attackTimer = 0;
    entity.attackHitDone = false;
    entity.hitCooldown = 0;
    entity.hitScale = 0;
    entity._currentAction = null;
    // 🔥 Sinaliza que o chão deve ser re-samped já no PRÓXIMO frame.
    //    Isso garante que, quando o terreno GLB finalmente carregar
    //    (ou quando o cache for preenchido), o zumbi grude na malha
    //    imediatamente — sem depender do alinhamento do throttling.
    entity.needsGroundSample = true;

    if (entity.targetGroundY === null && entity.lastGroundY !== null) {
      entity.targetGroundY = entity.lastGroundY;
    }

    entity.root.visible = true;
    entity.root.position.copy(entity.pos);
    entity.root.rotation.set(0, 0, 0);
    entity.root.scale.copy(entity.baseScale);
    entity.hpGroup.visible = false;
    this.playAnim(entity, 'idle');
  }

  // 🔥 DESPAWN (devolve ao pool)
  despawn(entity) {
    if (!entity.active) return;
    entity.active = false;
    entity.root.visible = false;
    if (entity.respawnTimer) clearTimeout(entity.respawnTimer);
    Object.values(entity.actions).forEach((a) => {
      if (a && a.isRunning()) a.stop();
    });
  }

  playAnim(entity, name) {
    const action = entity.actions[name];
    if (!action || entity._currentAction === action) return;
    entity._currentAction = action;
    Object.values(entity.actions).forEach((a) => {
      if (a) a.stop();
    });
    action.reset().play();
  }

  // 🔥 Separação entre zombies (evita sobreposição)
  applySeparation(e, delta) {
    let pushX = 0;
    let pushZ = 0;
    for (const other of this.entities) {
      if (other === e || !other.active) continue;
      const dx = e.pos.x - other.pos.x;
      const dz = e.pos.z - other.pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const minDist = e.separationRadius + other.separationRadius;
      if (d < minDist && d > 0.01) {
        const force = ((minDist - d) / minDist) * 0.5;
        pushX += (dx / d) * force;
        pushZ += (dz / d) * force;
      }
    }
    if (pushX !== 0 || pushZ !== 0) {
      e.pos.x += pushX * delta * 8;
      e.pos.z += pushZ * delta * 8;
    }
  }

  // 🔥 LOOP ÚNICO — atualiza TODOS os zombies ativos (1 useFrame para todos)
  update(delta, camera) {
    this.frame++;
    const store = useGameStore.getState();
    const playerPos = store.playerPosition;
    if (!playerPos) return;

    for (const e of this.entities) {
      if (!e.active) continue;
      e.mixer.update(delta);

      const dx = playerPos.x - e.pos.x;
      const dz = playerPos.z - e.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const state = e.state;

      // ===== MORTE =====
      if (state === 'death') {
        this.playAnim(e, 'death');
        continue;
      }

      // ===== HIT (idle curto após dano) =====
      if (state === 'hit') {
        e.hitCooldown -= delta;
        this.playAnim(e, 'idle');
        if (e.hitCooldown <= 0) {
          if (dist <= this.attackRange) {
            e.state = 'attack';
            e.attackTimer = 0;
            e.attackHitDone = false;
          } else if (dist <= this.runRadius) {
            e.state = 'run';
          } else if (dist <= this.aggroRadius) {
            e.state = 'walk';
          } else {
            e.state = 'idle';
          }
        }
        this.moveAndGround(e, delta, dist, dx, dz, camera);
        continue;
      }

      // ===== ATAQUE =====
      if (state === 'attack') {
        this.playAnim(e, 'attack');
        e.attackTimer += delta;

        if (!e.attackHitDone && e.attackTimer > 0.4) {
          e.attackHitDone = true;
          if (dist <= this.hitRange) {
            store.takeDamage(e.damage);
            window.dispatchEvent(
              new CustomEvent('combatDamage', {
                detail: {
                  damage: e.damage,
                  position: { x: window.innerWidth / 2, y: window.innerHeight / 3 },
                  isPlayer: true,
                },
              })
            );
          }
        }

        if (e.attackTimer > 1.0) {
          e.attackTimer = 0;
          e.attackHitDone = false;
          e.state = dist <= this.attackRange ? 'attack' : 'walk';
        }
        this.moveAndGround(e, delta, dist, dx, dz, camera);
        continue;
      }

      // ===== IDLE / WALK / RUN (transições) =====
      if (state === 'idle') {
        if (dist <= this.attackRange) {
          e.state = 'attack';
          e.attackTimer = 0;
          e.attackHitDone = false;
        } else if (dist <= this.runRadius) {
          e.state = 'run';
        } else if (dist <= this.aggroRadius) {
          e.state = 'walk';
        }
      } else if (state === 'walk') {
        if (dist <= this.attackRange) {
          e.state = 'attack';
          e.attackTimer = 0;
          e.attackHitDone = false;
        } else if (dist <= this.runRadius) {
          e.state = 'run';
        } else if (dist > this.aggroRadius) {
          e.state = 'idle';
        }
      } else if (state === 'run') {
        if (dist <= this.attackRange) {
          e.state = 'attack';
          e.attackTimer = 0;
          e.attackHitDone = false;
        } else if (dist > this.aggroRadius) {
          e.state = 'idle';
        }
      }

      this.moveAndGround(e, delta, dist, dx, dz, camera);
    }
  }

  // 🔥 Movimento + relevo (raycast throttle) + separação + HP + flash
  moveAndGround(e, delta, dist, dx, dz, camera) {
    const state = e.state;

    if (state === 'walk' || state === 'run') {
      const speed = state === 'run' ? 4 : 1.8;
      const inv = dist > 0.001 ? 1 / dist : 0;
      e.pos.x += dx * inv * speed * delta;
      e.pos.z += dz * inv * speed * delta;

      const targetAngle = Math.atan2(dx * inv, dz * inv);
      let diff = targetAngle - e.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      e.root.rotation.y += diff * 0.15;
      this.playAnim(e, state);
    }

    // 🔥 Separação entre zombies (evita sobreposição) — sem física
    this.applySeparation(e, delta);

// 🔥 Relevo com raycast — sem RigidBody.
    // Amostra IMEDIATAMENTE quando needsGroundSample (recém-spawned) e
    // depois com throttle a cada 12 frames. O zumbi gruda na malha do
    // terreno assim que o cache estiver pronto.
    if (e.needsGroundSample || this.frame % 12 === 0) {
      const gy = this.findGroundY(e.pos.x, e.pos.z);
      if (gy !== null) {
        e.lastGroundY = gy;
        e.targetGroundY = gy;
        e.needsGroundSample = false;
      } else if (e.needsGroundSample) {
        // Ainda sem chão (terreno carregando) — tenta de novo no próximo frame
        e.needsGroundSample = true;
      }
    }
    if (e.targetGroundY !== null) {
      const targetY = e.targetGroundY + GROUND_OFFSET;
      // Snap se estiver muito longe (spawn/teleporte) — evita "voo" lento
      if (e.lastGroundY === null || Math.abs(e.pos.y - targetY) > 3.0) {
        e.pos.y = targetY;
        e.needsGroundSample = false;
      } else {
        // Lerp suave ~10 m/s (delta-time) — rápido o suficiente para o zumbi
        // acompanhar subidas/descidas do relevo sem ficar "flutuando" atrás.
        e.pos.y += (targetY - e.pos.y) * Math.min(1, 10 * delta);
      }
    }
    e.root.position.copy(e.pos);

    // Flash de dano (escala multiplicada sobre a base do GLB)
    if (e.hitScale > 0) {
      e.hitScale = Math.max(0, e.hitScale - delta * 1.5);
      const s = 1 + e.hitScale;
      e.root.scale.set(
        e.baseScale.x * s,
        e.baseScale.y * s,
        e.baseScale.z * s
      );
    } else if (e.root.scale.x !== e.baseScale.x) {
      e.root.scale.copy(e.baseScale);
    }

    // Barra de HP (billboard + proporção)
    const showHp = e.hp < e.maxHp || state === 'walk' || state === 'run' || state === 'attack' || state === 'hit';
    e.hpGroup.visible = showHp;
    if (showHp && camera) {
      e.hpGroup.quaternion.copy(camera.quaternion);
      const pct = Math.max(0, e.hp / e.maxHp);
      e.hpFill.scale.x = Math.max(0.001, pct);
      e.hpFill.position.x = -(1 - pct) / 2;
    }
  }

  // 🔥 Dano + hit reaction
  applyDamage(entity, amount) {
    if (!entity || !entity.active || entity.dead) return;
    entity.hp = Math.max(0, entity.hp - amount);
    entity.state = 'hit';
    entity.hitCooldown = 0.6;
    entity.attackTimer = 0;
    entity.attackHitDone = false;
    entity.hitScale = 0.18;
    if (entity.hp <= 0) this.die(entity);
  }

  // 🔥 Morte: XP + kills + drops + respawn distante
  die(entity) {
    entity.dead = true;
    entity.state = 'death';
    this.playAnim(entity, 'death');

    const store = useGameStore.getState();
    store.addExp(entity.expReward);
    store.addKill('zombie');

    const drops = generateDrops('zombie');
    for (const drop of drops) {
      const info = ItemDatabase[drop.id];
      if (info) {
        for (let i = 0; i < (drop.quantity || 1); i++) {
          store.addToInventory({ ...info, quantity: 1 });
        }
      }
    }

    // Some visualmente após ~700ms da animação de morte
    setTimeout(() => {
      entity.root.visible = false;
    }, 700);

    // Renasce mais longe depois do delay
    // ⚠️ Corrigido: seta active=false ANTES do respawn, senão o spawn() retorna
    //    cedo (guarda `if (entity.active) return`) e o zombie nunca renasce.
    if (entity.respawnTimer) clearTimeout(entity.respawnTimer);
    entity.respawnTimer = setTimeout(() => {
      entity.active = false; // devolve ao pool
      entity.dead = false;
      entity.root.visible = false;
      const pos = this.getNextPosition();
      if (pos) {
        this.spawn(entity, pos, {
          health: entity.maxHp,
          damage: entity.damage,
          expReward: entity.expReward,
        });
      }
    }, this.respawnDelay);
  }

  // 🔥 Hit test para clique — usa Box3 EM ESPAÇO DE MUNDO vs ray de mundo
  // ⚠️ Corrigido: antes misturava ray local com box de mundo (dano não aplicava)
  // ⚠️ Corrigido: usa caixa FIXA em escala de mundo (0.7 x 2.2 x 0.7) centrada na
  //    posição do zombie — assim o clique funciona mesmo com o GLB em escala 0.001,
  //    onde Box3.setFromObject() daria uma caixa minúscula (impossível de clicar).
  hitTest(ndcX, ndcY, camera) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);

    let best = null;
    let bestDist = Infinity;
    const box = new THREE.Box3();
    const halfW = 0.7;
    const halfH = 1.1;
    const halfD = 0.7;

    for (const e of this.entities) {
      if (!e.active || e.dead || e.state === 'death') continue;

      // Corpo do zombie: pés em e.pos.y, centro ~1.1m acima
      const cx = e.pos.x;
      const cy = e.pos.y + halfH;
      const cz = e.pos.z;
      box.min.set(cx - halfW, cy - halfH, cz - halfD);
      box.max.set(cx + halfW, cy + halfH, cz + halfD);

      if (raycaster.ray.intersectsBox(box)) {
        const d = camera.position.distanceTo(e.pos);
        if (d < bestDist) {
          bestDist = d;
          best = e;
        }
      }
    }
    return best;
  }

  // 🔥 Limpeza total
  dispose() {
    for (const e of this.entities) {
      if (e.respawnTimer) clearTimeout(e.respawnTimer);
      e.mixer.stopAllAction();
      e.root.traverse((o) => {
        if (o.isMesh) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
            else o.material.dispose();
          }
        }
      });
    }
    this.entities.length = 0;
  }
}

