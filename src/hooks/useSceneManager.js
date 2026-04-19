import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

class SceneResourceManager {
  constructor() {
    this.loadedScenes = new Map();
    this.currentScene = null;
  }

  // Registra uma cena carregada
  registerScene(sceneName, resources) {
    this.loadedScenes.set(sceneName, {
      ...resources,
      timestamp: Date.now()
    });
  }

  // Limpa recursos de uma cena específica
  disposeScene(sceneName) {
    const scene = this.loadedScenes.get(sceneName);
    if (!scene) return;

    console.log(`🧹 [GC] Limpando recursos da cena: ${sceneName}`);

    // Limpa o GLB do cache
    const glbPath = sceneName === 'default' ? '/world.glb' : `/scenes/${sceneName}/world.glb`;
    try {
      useGLTF.clear(glbPath);
    } catch (e) {}

    // Limpa geometrias e materiais
    if (scene.scene) {
      scene.scene.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }

    this.loadedScenes.delete(sceneName);
  }

  // Limpa todas as cenas exceto a atual
  disposeAllExcept(currentScene) {
    for (const [sceneName] of this.loadedScenes) {
      if (sceneName !== currentScene) {
        this.disposeScene(sceneName);
      }
    }
  }

  // Força coleta de lixo (se disponível)
  forceGC() {
    if (window.gc) {
      window.gc();
      console.log('🧹 [GC] Coleta de lixo forçada');
    }
  }
}

const resourceManager = new SceneResourceManager();

export const useSceneManager = (currentScene, sceneRef) => {
  const previousScene = useRef(currentScene);

  useEffect(() => {
    if (previousScene.current !== currentScene) {
      // Limpa cena anterior
      resourceManager.disposeScene(previousScene.current);
      
      // Atualiza referência
      previousScene.current = currentScene;
      
      // Força GC após 1 segundo
      setTimeout(() => resourceManager.forceGC(), 1000);
    }
  }, [currentScene]);

  const registerCurrentScene = (sceneName, sceneObject) => {
    resourceManager.registerScene(sceneName, { scene: sceneObject });
  };

  return { registerCurrentScene, disposeAll: () => resourceManager.disposeAllExcept(currentScene) };
};