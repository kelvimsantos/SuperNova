import { create } from 'zustand';
import * as THREE from 'three'; // ← import necessário para THREE.Vector3

const useGameStore = create((set) => ({
  playerRigidBody: null,
  setPlayerRigidBody: (rb) => set({ playerRigidBody: rb }),

  playerPosition: { x: 0, y: 0, z: 0 },
  setPlayerPosition: (pos) => set({ playerPosition: pos }),

  movementDirection: null,
  setMovementDirection: (dir) => set({ movementDirection: dir }),

  worldPlaced: false,
  setWorldPlaced: (placed) => set({ worldPlaced: placed }),

  worldGroupRef: null,
  setWorldGroupRef: (ref) => set({ worldGroupRef: ref }),

  followMode: false,
  toggleFollowMode: () => set((state) => ({ followMode: !state.followMode })),

  isNight: false,
  setIsNight: (val) => set({ isNight: val }),

  // Luz
  lightDir: new THREE.Vector3(0.5, 0.8, 0.3),
  lightIntensity: 1.0,
  setLight: (dir, intensity) => set({ lightDir: dir.clone(), lightIntensity: intensity }),
}));

export default useGameStore;