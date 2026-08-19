import * as THREE from 'three';

// =============================================================================
// Shaders portados do projeto fluffytree-threejs (MIT)
// https://github.com/leoawen/fluffytree-threejs
// Versão idêntica à usada no editor de mapa (map-editor) — a config exportada
// no scene.json alimenta os mesmos uniforms aqui.
// =============================================================================

const NOISE_FUNCTIONS = `
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
  float cnoise(vec3 P){
      vec3 Pi0 = floor(P); vec3 Pi1 = Pi0 + vec3(1.0); Pi0 = mod(Pi0, 289.0); Pi1 = mod(Pi1, 289.0);
      vec3 Pf0 = fract(P); vec3 Pf1 = Pf0 - vec3(1.0);
      vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x); vec4 iy = vec4(Pi0.yy, Pi1.yy);
      vec4 iz0 = Pi0.zzzz; vec4 iz1 = Pi1.zzzz;
      vec4 ixy = permute(permute(ix) + iy); vec4 ixy0 = permute(ixy + iz0); vec4 ixy1 = permute(ixy + iz1);
      vec4 gx0 = ixy0 / 7.0; vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5; gx0 = fract(gx0);
      vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0); vec4 sz0 = step(gz0, vec4(0.0));
      gx0 -= sz0 * (step(0.0, gx0) - 0.5); gy0 -= sz0 * (step(0.0, gy0) - 0.5);
      vec4 gx1 = ixy1 / 7.0; vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5; gx1 = fract(gx1);
      vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1); vec4 sz1 = step(gz1, vec4(0.0));
      gx1 -= sz1 * (step(0.0, gx1) - 0.5); gy1 -= sz1 * (step(0.0, gy1) - 0.5);
      vec3 g000 = vec3(gx0.x,gy0.x,gz0.x); vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
      vec3 g010 = vec3(gx0.z,gy0.z,gz0.z); vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
      vec3 g001 = vec3(gx1.x,gy1.x,gz1.x); vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
      vec3 g011 = vec3(gx1.z,gy1.z,gz1.z); vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
      vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
      g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
      vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
      g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
      float n000 = dot(g000, Pf0); float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
      float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z)); float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
      float n001 = dot(g001, vec3(Pf0.xy, Pf1.z)); float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
      float n011 = dot(g011, vec3(Pf0.x, Pf1.yz)); float n111 = dot(g111, Pf1);
      vec3 fade_xyz = fade(Pf0); vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
      vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y); float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
      return 2.2 * n_xyz;
  }`;

// Uniforms compartilhados (copa das árvores) — atualizados no useFrame
export const canopySharedUniforms = {
  uLightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
  uGradientStart: { value: -1.0 },
  uGradientEnd: { value: 2.7 },
  uLitColor: { value: new THREE.Color(0x21ff08) },
  uShadowColor: { value: new THREE.Color(0x001d33) },
  uHighlightColor: { value: new THREE.Color(0x8cff00) },
  uHighlightStart: { value: 0.5 },
  uHighlightEnd: { value: 1.8 },
  uLeafShadowDarkness: { value: 0.2 },
  uTime: { value: 0.0 },
  uWindStrength: { value: 0.05 },
  uWindFrequency: { value: 5.0 },
  uWindSpeed: { value: 0.4 },
  // Vento LOD: árvores longe da câmera param de balançar (o balanço é
  // invisível e o cnoise por vértice é caro).
  uWindLodStart: { value: 14 },
  uWindLodEnd: { value: 24 },
};

// Uniforms compartilhados (grama) — atualizados no useFrame
export const grassSharedUniforms = {
  uTime: { value: 0.0 },
  uWindStrength: { value: 0.06 },
  uWindSpeed: { value: 1.2 },
  uWindDirection: { value: new THREE.Vector2(0.8, 0.6) },
  uBaseColor: { value: new THREE.Color(0x009b00) },
  uTipColor: { value: new THREE.Color(0x00ff4a) },
  uShadowDarkness: { value: 0.3 },
  // LOD por densidade/distância (câmera): tufts encolhem e somem em anéis
  // antes do far plane — densidade aparente cai sem perder qualidade visível.
  uLodStart: { value: 10 },
  uLodEnd: { value: 16 },
  uMinScale: { value: 0.08 },
};

// Uniform compartilhado (sombras globais: tronco, chão, etc.)
export const shadowSharedUniform = { value: 0.2 };

// -----------------------------------------------------------------------------
// Atualiza os uniforms compartilhados da copa a partir da configuração exportada
// -----------------------------------------------------------------------------
let lightDirectionOverride = null;

// Permite que o jogo sincronize a direção da luz da copa com o ciclo de
// dia/noite (sol dinâmico) em vez do azimute/elevação fixos do export.
export const setCanopyLightDirectionOverride = (vec) => {
  lightDirectionOverride = vec;
};

export const updateCanopyUniforms = (fluffy, time) => {
  const u = canopySharedUniforms;
  u.uTime.value = time;
  u.uGradientStart.value = fluffy.fluffyCanopyGradientStart ?? -1.0;
  u.uGradientEnd.value = fluffy.fluffyCanopyGradientEnd ?? 2.7;
  u.uLitColor.value.set(fluffy.fluffyCanopyLitColor || '#21ff08');
  u.uShadowColor.value.set(fluffy.fluffyCanopyShadowColor || '#001d33');
  u.uHighlightColor.value.set(fluffy.fluffyCanopyHighlightColor || '#8cff00');
  u.uHighlightStart.value = fluffy.fluffyCanopyHighlightStart ?? 0.5;
  u.uHighlightEnd.value = fluffy.fluffyCanopyHighlightEnd ?? 1.8;
  u.uLeafShadowDarkness.value = fluffy.fluffyCanopyLeafShadowDarkness ?? 0.2;
  u.uWindStrength.value = fluffy.fluffyCanopyWindStrength ?? 0.05;
  u.uWindFrequency.value = fluffy.fluffyCanopyWindFrequency ?? 5.0;
  u.uWindSpeed.value = fluffy.fluffyCanopyWindSpeed ?? 0.4;

  shadowSharedUniform.value = fluffy.fluffyShadowDarkness ?? 0.2;

  if (lightDirectionOverride) {
    u.uLightDirection.value.copy(lightDirectionOverride);
    return;
  }

  const elevation = (fluffy.fluffySunElevation ?? 55) * (Math.PI / 180);
  const azimuth = (fluffy.fluffySunAzimuth ?? 45) * (Math.PI / 180);
  // Mesma matemática do projeto original: posição do sol via setFromSphericalCoords
  u.uLightDirection.value.set(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation)
  );
};

// -----------------------------------------------------------------------------
// Atualiza os uniforms compartilhados da grama a partir da configuração exportada
// -----------------------------------------------------------------------------
export const updateGrassUniforms = (fluffy, time) => {
  const u = grassSharedUniforms;
  u.uTime.value = time;
  u.uWindStrength.value = fluffy.fluffyWindStrength ?? 0.06;
  u.uWindSpeed.value = fluffy.fluffyWindSpeed ?? 1.2;
  u.uWindDirection.value.set(...(fluffy.fluffyWindDirection || [0.8, 0.6]));
  u.uBaseColor.value.set(fluffy.fluffyGrassBaseColor || '#009b00');
  u.uTipColor.value.set(fluffy.fluffyGrassTipColor || '#00ff4a');
  u.uShadowDarkness.value = fluffy.fluffyGrassShadowDarkness ?? 0.3;
};

// -----------------------------------------------------------------------------
// Material da copa (folhas volumétricas + vento com perlin + sombra + getShadow)
// -----------------------------------------------------------------------------
export const createCanopyMaterial = ({ alphaMap, treeCenter }) => {
  const material = new THREE.MeshLambertMaterial({
    alphaMap,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
    depthWrite: true,
  });

  material.onBeforeCompile = (shader) => {
    material.userData.shader = shader;
    Object.assign(shader.uniforms, canopySharedUniforms, {
      uTreeCenter: { value: treeCenter.clone() },
    });

    shader.vertexShader = `
      varying vec3 vWorldPosition;
      uniform float uTime;
      uniform float uWindStrength;
      uniform float uWindFrequency;
      uniform float uWindSpeed;
      uniform float uWindLodStart;
      uniform float uWindLodEnd;
      ${NOISE_FUNCTIONS}
      ${shader.vertexShader}
    `.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float time = uTime * uWindSpeed;
      vec3 treeWorldPos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      float windLod = 1.0 - smoothstep(uWindLodStart, uWindLodEnd, distance(treeWorldPos.xz, cameraPosition.xz));
      float noise = 0.0;
      if (windLod > 0.01) {
        noise = cnoise(vec3(position.x * uWindFrequency, position.y * uWindFrequency, time)) * windLod;
      }
      vec3 windDirection = vec3(1.0, 0.0, 1.0);
      float displacement = noise * uWindStrength * (position.y / 8.0);
      transformed.xyz += normalize(windDirection) * displacement;
      vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
    `);

    shader.fragmentShader = `
      varying vec3 vWorldPosition;
      uniform vec3 uLightDirection; uniform vec3 uTreeCenter;
      uniform float uGradientStart; uniform float uGradientEnd;
      uniform vec3 uLitColor; uniform vec3 uShadowColor;
      uniform vec3 uHighlightColor; uniform float uHighlightStart; uniform float uHighlightEnd;
      uniform float uLeafShadowDarkness;
      ${shader.fragmentShader}
    `.replace('#include <color_fragment>', `
      #include <color_fragment>
      float shadow = 1.0;
      #if ( NUM_DIR_LIGHT_SHADOWS > 0 )
        shadow = getShadow(
          directionalShadowMap[ 0 ],
          directionalLightShadows[ 0 ].shadowMapSize,
          directionalLightShadows[ 0 ].shadowBias,
          directionalLightShadows[ 0 ].shadowRadius,
          vDirectionalShadowCoord[ 0 ]
        );
      #endif

      vec3 fromCenterToSurface = normalize(vWorldPosition - uTreeCenter);
      float lightAlignment = dot(fromCenterToSurface, uLightDirection);
      float baseGradientFactor = smoothstep(uGradientStart, uGradientEnd, lightAlignment);
      vec3 baseColor = mix(uShadowColor, uLitColor, baseGradientFactor);
      float highlightFactor = smoothstep(uHighlightStart, uHighlightEnd, lightAlignment);
      vec3 gradientColor = mix(baseColor, uHighlightColor, highlightFactor);
      vec3 finalShadowedColor = mix(gradientColor * uLeafShadowDarkness, gradientColor, shadow);
      diffuseColor.rgb = finalShadowedColor;
    `).replace('#include <normal_fragment_begin>', `
      #include <normal_fragment_begin>
      vec3 worldUp = vec3(0.0, 1.0, 0.0);
      vec3 viewUp = normalize(mat3(viewMatrix) * worldUp);
      normal = viewUp;
    `);
  };

  return material;
};

// -----------------------------------------------------------------------------
// Material da grama (gradiente de cor + vento + getShadow)
// Usa InstancedBufferGeometry com atributos: offset, rotation, scale
// -----------------------------------------------------------------------------
export const createFluffyGrassMaterial = (map) => {
  const material = new THREE.MeshLambertMaterial({
    map,
    side: THREE.DoubleSide,
    transparent: false,
    alphaTest: 0.5,
    depthWrite: true,
  });

  material.onBeforeCompile = (shader) => {
    material.userData.shader = shader;
    Object.assign(shader.uniforms, grassSharedUniforms);

    shader.vertexShader = `
      attribute vec3 offset;
      attribute float rotation;
      attribute float scale;
      uniform float uTime;
      uniform float uWindStrength;
      uniform float uWindSpeed;
      uniform vec2 uWindDirection;
      uniform float uLodStart;
      uniform float uLodEnd;
      uniform float uMinScale;
      varying vec2 vUv;
      varying float vLod;
      ${shader.vertexShader}
    `.replace('#include <begin_vertex>', `
      #include <begin_vertex>

      // ===== LOD por densidade/distância =====
      // Metade das instâncias some no anel externo (colapsadas para baixo do
      // terreno → descartadas pelo clip/occlusão). Tufts encolhem com a
      // distância até virarem subpixel. Tudo smoothstep — sem pop visível.
      float dist = distance(offset.xz, cameraPosition.xz);
      float lod = smoothstep(uLodStart, uLodEnd, dist);
      vLod = lod;

      vec3 pos = transformed;
      if (lod > 0.5 && mod(float(gl_InstanceID), 2.0) > 0.5) {
        pos.y = -500.0;
      }
      pos.y *= scale * mix(1.0, uMinScale, lod);
      float c = cos(rotation);
      float s = sin(rotation);
      vec3 rotatedPos;
      rotatedPos.x = pos.x * c - pos.z * s;
      rotatedPos.y = pos.y;
      rotatedPos.z = pos.x * s + pos.z * c;
      float swayFactor = 1.0 - uv.y;
      vec4 worldPos = modelMatrix * vec4(rotatedPos + offset, 1.0);
      float windStrengthAtPoint = sin(worldPos.x * 0.5 + uTime * uWindSpeed) + sin(worldPos.z * 0.3 + uTime * uWindSpeed * 0.7);
      float displacement = windStrengthAtPoint * uWindStrength * swayFactor;
      vec2 windDir = normalize(uWindDirection);
      rotatedPos.x += windDir.x * displacement;
      rotatedPos.z += windDir.y * displacement;
      transformed = rotatedPos + offset;
    `).replace('#include <uv_vertex>', `
      #include <uv_vertex>
      vUv = uv;
    `);

    shader.fragmentShader = `
      uniform vec3 uBaseColor;
      uniform vec3 uTipColor;
      uniform float uShadowDarkness;
      varying vec2 vUv;
      ${shader.fragmentShader}
    `.replace('#include <dithering_fragment>', `
      vec4 textureColor = texture2D(map, vUv);
      float finalAlpha = step(alphaTest, textureColor.a);
      if (finalAlpha < 0.5) discard;

      vec3 grassGradientColor = mix(uBaseColor, uTipColor, 1.0 - vUv.y);
      vec3 lighting = gl_FragColor.rgb / textureColor.rgb;
      vec3 litGrassColor = grassGradientColor * lighting;

      float shadow = 1.0;
      #if ( NUM_DIR_LIGHT_SHADOWS > 0 )
        shadow = getShadow(
          directionalShadowMap[ 0 ],
          directionalLightShadows[ 0 ].shadowMapSize,
          directionalLightShadows[ 0 ].shadowBias,
          directionalLightShadows[ 0 ].shadowRadius,
          vDirectionalShadowCoord[ 0 ]
        );
      #endif

      vec3 finalColor = mix(litGrassColor * uShadowDarkness, litGrassColor, shadow);
      // Pass opaco: o fade de distância é geométrico (uMinScale encolhe os
      // tufts até quase zero no anel externo) — alpha não é usado aqui.
      gl_FragColor = vec4(finalColor, finalAlpha);
      #include <dithering_fragment>
    `);
  };

  return material;
};

// -----------------------------------------------------------------------------
// Modifica materiais comuns (tronco, chão) para controle artístico de sombra
// -----------------------------------------------------------------------------
export const modifyMaterialForShadows = (material, uniformRef = shadowSharedUniform) => {
  if (material.userData.isModifiedForShadows) return material;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShadowDarkness = uniformRef;
    shader.fragmentShader = `
      uniform float uShadowDarkness;
      ${shader.fragmentShader}
    `.replace('#include <tonemapping_fragment>', `
      float shadow = 1.0;
      #if ( NUM_DIR_LIGHT_SHADOWS > 0 )
        shadow = getShadow(
          directionalShadowMap[ 0 ],
          directionalLightShadows[ 0 ].shadowMapSize,
          directionalLightShadows[ 0 ].shadowBias,
          directionalLightShadows[ 0 ].shadowRadius,
          vDirectionalShadowCoord[ 0 ]
        );
      #endif
      vec3 colorAfterHDRI = gl_FragColor.rgb;
      vec3 finalColor = mix(colorAfterHDRI * uShadowDarkness, colorAfterHDRI, shadow);
      gl_FragColor.rgb = finalColor;
      #include <tonemapping_fragment>
    `);
  };
  material.userData.isModifiedForShadows = true;
  return material;
};