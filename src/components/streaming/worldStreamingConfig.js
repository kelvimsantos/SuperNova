export const DEFAULT_WORLD_STREAMING_CONFIG = {
  // Atualiza quantas vezes por segundo (não por frame)
  updateHz: 4,

  // Distância em metros para manter chunks ativos
  activeRadiusMeters: 10,

  // Histerese para evitar liga/desliga rápido (pop-in)
  // Quando está ativo, desativa apenas após passar de deactivateRadiusMeters.
  deactivateRadiusMeters: 95,

  // Se true, busca chunks por nome prefix (Chunk_*)
  chunkNameRegex: /^Chunk_\d+_\d+$/,

  // userData pode vir como { chunkX, chunkZ, center:[x,y,z], size }
  // Caso center não exista, tentamos inferir center via bounds.
  requireUserDataCenter: false,
};

