import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import useGameStore from '../../hooks/useGameStore';
import {
  DEFAULT_WORLD_STREAMING_CONFIG,
} from './worldStreamingConfig';
import {
  getChunkCandidatesFromScene,
  buildChunkIndexFromCandidates,
  getChunkCenterWorld,
  distXZ,
  setChunkActive,
} from './chunkUtils';
import { Vector3 } from 'three';

// worldScene: THREE.Scene ou Group onde os chunks estão.
// A implementação busca Chunk_* por name.
export function WorldStreamingManager({
  worldScene,
  config = {},
  // 'renderOff' prepara para desligar render + hooks de simulação.
  mode = 'renderOff',
  debug = false,
  playerRigidBody,
}) {
  const mergedConfig = { ...DEFAULT_WORLD_STREAMING_CONFIG, ...config };

  const playerPosition = useGameStore((s) => s.playerPosition);

  const { invalidate } = useThree();

  const [isReady, setIsReady] = useState(false);
  const chunksRef = useRef([]);
  const activeKeysRef = useRef(new Set());

  const chunkCentersRef = useRef(new Map());

const playerVec = useMemo(() => new Vector3(), []);
  const playerXZVec = useMemo(() => new Vector3(), []);
  const centerXZVec = useMemo(() => new Vector3(), []);
  const hasChunks = useRef(false);

  useEffect(() => {
    // build index when worldScene available
    if (!worldScene) return;

    const candidates = getChunkCandidatesFromScene(worldScene, {
      chunkNameRegex: mergedConfig.chunkNameRegex,
    });

    // Fallback: se o regex não bater, também aceita chunks por prefixo simples (debug).
    if (candidates.length === 0) {
      const prefixCandidates = [];
      worldScene.traverse((child) => {
        if (child?.name && String(child.name).startsWith('Chunk_')) prefixCandidates.push(child);
      });
      if (prefixCandidates.length > 0) {
        console.warn('[WorldStreamingManager] regex não encontrou chunks; usando prefix Chunk_. found:', prefixCandidates.length);
      }
    }

    const index = buildChunkIndexFromCandidates(candidates);

    // Se não tem chunks, desliga o streaming completamente
    if (index.length === 0) {
      console.log('[WorldStreamingManager] Nenhum chunk encontrado. Streaming desligado.');
      hasChunks.current = false;
      setIsReady(false);
      return;
    }

    hasChunks.current = true;
    chunksRef.current = index;

    // Cache center
    const centers = new Map();
    for (const chunk of index) {
      const c = getChunkCenterWorld(chunk);
      if (c) centers.set(chunk.key, c);
    }
    chunkCentersRef.current = centers;

    setIsReady(true);
    console.log('[WorldStreamingManager] chunks found:', index.length);
  }, [worldScene, mergedConfig.chunkNameRegex, debug]);

useEffect(() => {
    if (!isReady || !hasChunks.current) return;

    const updateEveryMs = 1000 / mergedConfig.updateHz;

    const tick = () => {
      // Preferir posição real do rigidbody (atualiza enquanto o player anda)
      let p = null;
      if (playerRigidBody && typeof playerRigidBody.translation === 'function') {
        p = playerRigidBody.translation();
      } else {
        p = playerPosition;
      }
      if (!p) return;

      const player = playerVec;
      player.set(p.x || 0, p.y || 0, p.z || 0);

      // Reusa Vector3 cacheados em vez de criar novos
      const playerXZ = playerXZVec;
      playerXZ.set(player.x, 0, player.z);

      const activeRadius = mergedConfig.activeRadiusMeters;
      const deactivateRadius = mergedConfig.deactivateRadiusMeters;

      const desiredActive = new Set();
      const chunks = chunksRef.current;
      const centers = chunkCentersRef.current;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const center = centers.get(chunk.key);
        if (!center) continue;

        const centerXZ = centerXZVec;
        centerXZ.set(center.x, 0, center.z);
        const d = distXZ(centerXZ, playerXZ);

        const currentlyActive = activeKeysRef.current.has(chunk.key);

        if (currentlyActive) {
          if (d <= deactivateRadius) desiredActive.add(chunk.key);
        } else {
          if (d <= activeRadius) desiredActive.add(chunk.key);
        }
      }

      // Apply diffs
      const previously = activeKeysRef.current;

      for (const key of previously) {
        if (!desiredActive.has(key)) {
          const chunk = chunks.find((c) => c.key === key);
          if (chunk) setChunkActive(chunk, { active: false, mode });
          previously.delete(key);
        }
      }

      for (const key of desiredActive) {
        if (!previously.has(key)) {
          const chunk = chunks.find((c) => c.key === key);
          if (chunk) setChunkActive(chunk, { active: true, mode });
          previously.add(key);
        }
      }

      invalidate();
    };

    const t = setInterval(tick, updateEveryMs);
    tick();

    return () => clearInterval(t);
  }, [isReady, playerPosition, mergedConfig.activeRadiusMeters, mergedConfig.deactivateRadiusMeters, mergedConfig.updateHz, invalidate, mode, playerVec, playerXZVec, centerXZVec]);

  return null;
}

