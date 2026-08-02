"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { IUniform, Texture, Vector2 } from "three";
import type {
  GPUComputationRenderer as GPUComputationRendererInstance,
  Variable as GPUComputationVariable,
} from "three/addons/misc/GPUComputationRenderer.js";

import LandingPageHero from "../../../../public/landing-hero-day-2400.webp";
import LandingPageHeroNight from "../../../../public/landing-hero-night-2400.webp";
import styles from "../kimi-landing.module.css";

const MAX_DEVICE_PIXEL_RATIO = 1.5;
const RIPPLE_CELL_SIZE = 8;
const MAX_VOXEL_INSTANCES = 32_000;
const VOXEL_CAMERA_FOV = 38;
const MAX_POINTER_SEGMENTS = 8;
const WAVE_FIXED_STEP_SECONDS = 1 / 120;
const MAX_PHYSICS_STEPS_PER_FRAME = 6;
const WAVE_TIME_SCALE = 0.75;
const WAVE_SETTLE_TIME_MS = 6_933;
const POINTER_MOVING_STATE_MS = 1_000;
const WAVE_DAMPING = 0.995;
const WAVE_TENSION = 0.11;
const WAVE_BRUSH_CELLS = 3.1;
const MIN_POINTER_DISTANCE_PX = 0.35;
const MAX_POINTER_SPEED_PX_PER_MS = 2.8;
const MIN_POINTER_IMPULSE = 0.018;
const MAX_POINTER_IMPULSE = 0.095;

const SURFACE_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const WAVE_SIMULATION_FRAGMENT_SHADER = `
#define MAX_POINTER_SEGMENTS 8

uniform vec2 uSegmentStarts[MAX_POINTER_SEGMENTS];
uniform vec2 uSegmentEnds[MAX_POINTER_SEGMENTS];
uniform float uSegmentStrengths[MAX_POINTER_SEGMENTS];
uniform float uSegmentCount;
uniform float uAspect;
uniform float uBrushRadius;
uniform float uDamping;
uniform float uTension;

float distanceToSegment(vec2 point, vec2 start, vec2 end) {
  vec2 segment = end - start;
  float segmentLengthSquared = max(dot(segment, segment), 0.000001);
  float along = clamp(
    dot(point - start, segment) / segmentLengthSquared,
    0.0,
    1.0
  );
  return length(point - (start + segment * along));
}

void main() {
  vec2 texelSize = 1.0 / resolution.xy;
  vec2 uv = gl_FragCoord.xy * texelSize;
  vec4 state = texture2D(textureHeight, uv);
  float currentHeight = state.r;
  float previousHeight = state.g;

  float north = texture2D(
    textureHeight,
    uv + vec2(0.0, texelSize.y)
  ).r;
  float south = texture2D(
    textureHeight,
    uv - vec2(0.0, texelSize.y)
  ).r;
  float east = texture2D(
    textureHeight,
    uv + vec2(texelSize.x, 0.0)
  ).r;
  float west = texture2D(
    textureHeight,
    uv - vec2(texelSize.x, 0.0)
  ).r;

  float laplacian =
    north + south + east + west - 4.0 * currentHeight;
  float nextHeight =
    currentHeight +
    (currentHeight - previousHeight) * uDamping +
    laplacian * uTension;

  vec2 physicalPoint = vec2(uv.x * uAspect, uv.y);
  float impulse = 0.0;
  for (int index = 0; index < MAX_POINTER_SEGMENTS; index++) {
    float enabled = step(float(index) + 0.5, uSegmentCount);
    vec2 segmentStart = vec2(
      uSegmentStarts[index].x * uAspect,
      uSegmentStarts[index].y
    );
    vec2 segmentEnd = vec2(
      uSegmentEnds[index].x * uAspect,
      uSegmentEnds[index].y
    );
    float segmentDistance = distanceToSegment(
      physicalPoint,
      segmentStart,
      segmentEnd
    );
    float brushDistance = segmentDistance / max(uBrushRadius, 0.0001);
    float pressureCore = exp(
      -brushDistance * brushDistance * 4.5
    );
    float pressureShoulder = exp(
      -pow(brushDistance - 1.15, 2.0) * 10.0
    );
    impulse +=
      (pressureCore - pressureShoulder * 0.16) *
      uSegmentStrengths[index] *
      enabled;
  }
  nextHeight -= impulse;

  nextHeight = clamp(nextHeight, -0.32, 0.32);

  gl_FragColor = vec4(
    nextHeight,
    currentHeight,
    abs(nextHeight - currentHeight),
    1.0
  );
}
`;

const SURFACE_FRAGMENT_SHADER = `
uniform sampler2D uWaveState;
uniform sampler2D uNightTexture;
uniform sampler2D uDayTexture;
uniform vec2 uGrid;
uniform vec2 uTexelSize;
uniform vec2 uImageUvScale;
uniform vec2 uImageUvOffset;

varying vec2 vUv;

void main() {
  vec4 waveState = texture2D(uWaveState, vUv);
  float height = waveState.r;
  float leftHeight = texture2D(
    uWaveState,
    vUv - vec2(uTexelSize.x, 0.0)
  ).r;
  float rightHeight = texture2D(
    uWaveState,
    vUv + vec2(uTexelSize.x, 0.0)
  ).r;
  float downHeight = texture2D(
    uWaveState,
    vUv - vec2(0.0, uTexelSize.y)
  ).r;
  float upHeight = texture2D(
    uWaveState,
    vUv + vec2(0.0, uTexelSize.y)
  ).r;
  vec2 gradient = vec2(
    leftHeight - rightHeight,
    downHeight - upHeight
  ) * 0.5;
  float curvature =
    leftHeight +
    rightHeight +
    downHeight +
    upHeight -
    4.0 * height;
  float waveEnergy =
    abs(height) +
    length(gradient) * 1.7 +
    abs(curvature) * 0.35 +
    waveState.b * 0.8;
  float activity = smoothstep(0.0035, 0.05, waveEnergy);

  vec2 pixelUv =
    (floor(vUv * uGrid) + 0.5) / uGrid;
  vec2 surfaceUv = mix(
    vUv,
    pixelUv,
    activity * 0.12
  );
  vec2 imageUv =
    uImageUvOffset + surfaceUv * uImageUvScale;
  vec4 dayColor = texture2D(uDayTexture, imageUv);
  vec4 nightColor = texture2D(uNightTexture, imageUv);

  float trough = smoothstep(
    -0.012,
    0.08,
    -height + abs(curvature) * 0.18 + waveState.b * 0.5
  );
  float nightMix = activity * (0.18 + trough * 0.82);
  vec4 surfaceColor = mix(dayColor, nightColor, nightMix);

  vec3 rippleNormal = normalize(
    vec3(-gradient * 18.0, 1.0)
  );
  vec3 lightDirection = normalize(vec3(-0.58, 0.64, 1.0));
  vec3 halfDirection = normalize(
    lightDirection + vec3(0.0, 0.0, 1.0)
  );
  float diffuse = 0.96 + 0.15 * max(
    dot(rippleNormal, lightDirection),
    0.0
  );
  float specular = pow(
    max(dot(rippleNormal, halfDirection), 0.0),
    28.0
  );
  float ridgeLight = smoothstep(0.008, 0.09, max(height, 0.0));
  float troughShadow = smoothstep(
    0.008,
    0.09,
    max(-height, 0.0)
  );
  surfaceColor.rgb *= mix(1.0, diffuse, activity * 0.58);
  surfaceColor.rgb *= 1.0 - troughShadow * activity * 0.12;
  surfaceColor.rgb +=
    vec3(0.78, 0.88, 1.0) *
    specular *
    activity *
    0.18;
  surfaceColor.rgb +=
    vec3(0.92, 0.82, 0.68) *
    ridgeLight *
    activity *
    0.08;

  float overlayAlpha =
    activity * (0.12 + trough * 0.72);
  gl_FragColor = vec4(
    max(surfaceColor.rgb, vec3(0.0)),
    overlayAlpha
  );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const VOXEL_VERTEX_SHADER = `
uniform sampler2D uWaveState;
uniform vec2 uGrid;
uniform vec2 uTexelSize;

attribute vec2 aCellUv;

varying vec2 vTextureUv;
varying vec2 vCellUv;
varying vec3 vNormal;
varying float vFrontFace;
varying float vVisibility;
varying float vHeight;
varying float vNightMix;

void main() {
  vec4 waveState = texture2D(uWaveState, aCellUv);
  float height = waveState.r;
  float leftHeight = texture2D(
    uWaveState,
    aCellUv - vec2(uTexelSize.x, 0.0)
  ).r;
  float rightHeight = texture2D(
    uWaveState,
    aCellUv + vec2(uTexelSize.x, 0.0)
  ).r;
  float downHeight = texture2D(
    uWaveState,
    aCellUv - vec2(0.0, uTexelSize.y)
  ).r;
  float upHeight = texture2D(
    uWaveState,
    aCellUv + vec2(0.0, uTexelSize.y)
  ).r;
  vec2 gradient = vec2(
    leftHeight - rightHeight,
    downHeight - upHeight
  ) * 0.5;
  float curvature =
    leftHeight +
    rightHeight +
    downHeight +
    upHeight -
    4.0 * height;
  float waveEnergy =
    abs(height) +
    length(gradient) * 2.1 +
    abs(curvature) * 0.42 +
    waveState.b * 0.85;
  vVisibility = smoothstep(0.006, 0.06, waveEnergy);
  vHeight = smoothstep(0.01, 0.115, waveEnergy);
  float trough = smoothstep(
    -0.012,
    0.08,
    -height + abs(curvature) * 0.18 + waveState.b * 0.5
  );
  vNightMix = vVisibility * (0.18 + trough * 0.82);
  vTextureUv = aCellUv + (uv - 0.5) / uGrid;
  vCellUv = aCellUv;
  vFrontFace = max(normal.z, 0.0);

  vec2 slopeDirection = normalize(gradient + vec2(0.000001));
  float tiltAngle = clamp(
    length(gradient) * 11.0,
    0.0,
    0.58
  );
  vec3 rotationAxis = normalize(
    vec3(-slopeDirection.y, slopeDirection.x, 0.0)
  );
  float rotationCosine = cos(tiltAngle);
  float rotationSine = sin(tiltAngle);

  vec3 localPosition = position;
  localPosition.xy *= mix(0.995, 0.93, vHeight);
  localPosition.z *= mix(0.24, 2.3, vHeight);

  vec4 instanceCenter =
    instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec4 instancePosition =
    instanceMatrix * vec4(localPosition, 1.0);
  vec3 worldOffset = instancePosition.xyz - instanceCenter.xyz;
  worldOffset =
    worldOffset * rotationCosine +
    cross(rotationAxis, worldOffset) * rotationSine +
    rotationAxis * dot(rotationAxis, worldOffset) *
      (1.0 - rotationCosine);
  instancePosition.xyz = instanceCenter.xyz + worldOffset;
  instancePosition.z += height * 0.72 + abs(height) * 0.08;

  vec3 rotatedNormal =
    normal * rotationCosine +
    cross(rotationAxis, normal) * rotationSine +
    rotationAxis * dot(rotationAxis, normal) *
      (1.0 - rotationCosine);
  vNormal = normalize(normalMatrix * rotatedNormal);

  gl_Position =
    projectionMatrix * modelViewMatrix * instancePosition;
}
`;

const VOXEL_FRAGMENT_SHADER = `
uniform sampler2D uNightTexture;
uniform sampler2D uDayTexture;
uniform vec2 uImageUvScale;
uniform vec2 uImageUvOffset;

varying vec2 vTextureUv;
varying vec2 vCellUv;
varying vec3 vNormal;
varying float vFrontFace;
varying float vVisibility;
varying float vHeight;
varying float vNightMix;

void main() {
  if (vVisibility < 0.08) {
    discard;
  }

  vec2 frontUv =
    uImageUvOffset +
    clamp(vTextureUv, 0.0, 1.0) *
    uImageUvScale;
  vec2 centerUv =
    uImageUvOffset + vCellUv * uImageUvScale;
  vec4 dayFrontColor = texture2D(uDayTexture, frontUv);
  vec4 nightFrontColor = texture2D(uNightTexture, frontUv);
  vec4 frontColor = mix(
    dayFrontColor,
    nightFrontColor,
    vNightMix
  );
  vec3 dayCenterColor = texture2D(uDayTexture, centerUv).rgb;
  vec3 nightCenterColor =
    texture2D(uNightTexture, centerUv).rgb;
  vec3 centerColor = mix(
    dayCenterColor,
    nightCenterColor,
    vNightMix
  );

  float frontFace = smoothstep(0.5, 0.96, vFrontFace);
  vec3 sideColor =
    centerColor * 0.66 + vec3(0.008, 0.014, 0.025);
  vec3 color = mix(sideColor, frontColor.rgb, frontFace);

  vec3 normal = normalize(vNormal);
  vec3 lightDirection = normalize(vec3(-0.5, 0.72, 1.1));
  vec3 halfDirection = normalize(
    lightDirection + vec3(0.0, 0.0, 1.0)
  );
  float diffuse = 0.7 + 0.42 * max(
    dot(normal, lightDirection),
    0.0
  );
  float specular = pow(
    max(dot(normal, halfDirection), 0.0),
    22.0
  );
  float rim = pow(1.0 - max(normal.z, 0.0), 2.0);

  float lightingInfluence = smoothstep(0.03, 0.72, vHeight);
  color *= mix(1.0, diffuse, lightingInfluence);
  color +=
    vec3(1.0, 0.78, 0.52) *
    specular *
    lightingInfluence *
    0.28;
  color +=
    vec3(0.22, 0.36, 0.58) *
    rim *
    vHeight *
    0.14;

  float alpha = smoothstep(0.08, 0.72, vVisibility);
  gl_FragColor = vec4(color, frontColor.a * alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

type ThreeModule = typeof import("three");
type GPUComputationRendererConstructor =
  typeof import("three/addons/misc/GPUComputationRenderer.js").GPUComputationRenderer;

type PointerSnapshot = {
  inside: boolean;
  clientX: number;
  clientY: number;
  timeStamp: number;
};

type PointerPoint = {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  timeStamp: number;
};

type PointerSegment = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strength: number;
};

type PhysicsControls = {
  segmentCount: IUniform<number>;
  segmentStarts: Vector2[];
  segmentEnds: Vector2[];
  segmentStrengths: number[];
};

type CoalescedPointerEvent = PointerEvent & {
  getCoalescedEvents?: () => PointerEvent[];
};

export function HeroVoxelRippleEnhancement() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nightImageRef = useRef<HTMLImageElement | null>(null);
  const pointerSnapshotRef = useRef<PointerSnapshot>({
    inside: false,
    clientX: 0,
    clientY: 0,
    timeStamp: 0,
  });
  const [nightImageReady, setNightImageReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const rippleSceneSignature = [
    WAVE_SIMULATION_FRAGMENT_SHADER,
    SURFACE_FRAGMENT_SHADER,
    VOXEL_VERTEX_SHADER,
    VOXEL_FRAGMENT_SHADER,
  ].join("\n");
  const rippleSceneKey = nightImageReady
    ? rippleSceneSignature
    : "";

  useEffect(() => {
    const host = canvasRef.current?.parentElement;
    if (!host) {
      return;
    }

    const pointerSnapshot = pointerSnapshotRef.current;
    pointerSnapshot.inside = false;

    const recordPointer = (event: PointerEvent) => {
      pointerSnapshot.inside = true;
      pointerSnapshot.clientX = event.clientX;
      pointerSnapshot.clientY = event.clientY;
      pointerSnapshot.timeStamp = event.timeStamp;
    };
    const clearPointer = () => {
      pointerSnapshot.inside = false;
    };

    host.addEventListener("pointerenter", recordPointer);
    host.addEventListener("pointermove", recordPointer);
    host.addEventListener("pointerleave", clearPointer);
    host.addEventListener("pointercancel", clearPointer);

    return () => {
      host.removeEventListener("pointerenter", recordPointer);
      host.removeEventListener("pointermove", recordPointer);
      host.removeEventListener("pointerleave", clearPointer);
      host.removeEventListener("pointercancel", clearPointer);
      pointerSnapshot.inside = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const nightImage = nightImageRef.current;
    if (
      !rippleSceneKey ||
      !canvas ||
      !nightImage
    ) {
      return;
    }

    let cancelled = false;
    let disposeScene: (() => void) | null = null;
    setSceneReady(false);

    void Promise.all([
      import("three"),
      import("three/addons/misc/GPUComputationRenderer.js"),
    ])
      .then(async ([three, computationModule]) => {
        if (cancelled || !canvas.isConnected || !nightImage.isConnected) {
          return;
        }

        const textureLoader = new three.TextureLoader();
        const [dayTexture, nightTexture] = await Promise.all([
          textureLoader.loadAsync(LandingPageHero.src),
          textureLoader.loadAsync(
            nightImage.currentSrc || nightImage.src,
          ),
        ]);
        if (cancelled || !canvas.isConnected || !nightImage.isConnected) {
          dayTexture.dispose();
          nightTexture.dispose();
          return;
        }

        disposeScene = createVoxelRippleScene(
          three,
          computationModule.GPUComputationRenderer,
          canvas,
          nightImage,
          dayTexture,
          nightTexture,
          pointerSnapshotRef.current,
          () => {
            if (!cancelled) {
              setSceneReady(true);
            }
          },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setSceneReady(false);
        }
      });

    return () => {
      cancelled = true;
      disposeScene?.();
      disposeScene = null;
    };
  }, [rippleSceneKey]);

  return (
    <>
      <Image
        src={LandingPageHeroNight}
        alt=""
        fill
        sizes="(max-width: 1664px) calc(100vw - 40px), 1600px"
        loading="lazy"
        className={styles.heroRippleNightSource}
        aria-hidden="true"
        onLoad={(event) => {
          const image = event.currentTarget;
          void image
            .decode()
            .then(() => {
              if (!image.isConnected) {
                return;
              }
              nightImageRef.current = image;
              setNightImageReady(image.naturalWidth > 0);
            })
            .catch(() => {
              nightImageRef.current = null;
              setNightImageReady(false);
              setSceneReady(false);
            });
        }}
        onError={() => {
          nightImageRef.current = null;
          setNightImageReady(false);
          setSceneReady(false);
        }}
      />
      <canvas
        ref={canvasRef}
        className={styles.heroRippleCanvas}
        data-hero-ripple-canvas
        data-ripple-ready={sceneReady ? "" : undefined}
        aria-hidden="true"
        tabIndex={-1}
      />
    </>
  );
}

function createVoxelRippleScene(
  THREE: ThreeModule,
  GPUComputationRenderer: GPUComputationRendererConstructor,
  canvas: HTMLCanvasElement,
  nightImage: HTMLImageElement,
  dayTexture: Texture,
  nightTexture: Texture,
  pointerSnapshot: PointerSnapshot,
  onReady: () => void,
) {
  const host = canvas.parentElement;
  if (!host) {
    dayTexture.dispose();
    nightTexture.dispose();
    return () => {};
  }

  let disposed = false;
  let frameId = 0;
  let inViewport = true;
  let pageVisible = document.visibilityState !== "hidden";
  let lastFrameTime = 0;
  let lastMotionTime = Number.NEGATIVE_INFINITY;
  let physicsAccumulator = 0;
  let simulationWidth = 0;
  let simulationHeight = 0;
  let gpuCompute: GPUComputationRendererInstance | null = null;
  let heightVariable: GPUComputationVariable | null = null;
  let physicsControls: PhysicsControls | null = null;
  let previousPointer: PointerPoint | null = null;
  const pointerSegments: PointerSegment[] = [];

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
    premultipliedAlpha: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = false;

  const surfaceScene = new THREE.Scene();
  const surfaceCamera = new THREE.OrthographicCamera(
    -1,
    1,
    1,
    -1,
    0.1,
    2,
  );
  surfaceCamera.position.z = 1;
  const voxelScene = new THREE.Scene();
  const voxelCamera = new THREE.PerspectiveCamera(
    VOXEL_CAMERA_FOV,
    1,
    0.1,
    8,
  );
  voxelCamera.position.z =
    1 / Math.tan(THREE.MathUtils.degToRad(VOXEL_CAMERA_FOV / 2));
  voxelCamera.lookAt(0, 0, 0);

  for (const texture of [dayTexture, nightTexture]) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
  }

  const uniforms = {
    uWaveState: { value: dayTexture },
    uDayTexture: { value: dayTexture },
    uNightTexture: { value: nightTexture },
    uGrid: { value: new THREE.Vector2(1, 1) },
    uTexelSize: { value: new THREE.Vector2(1, 1) },
    uImageUvScale: { value: new THREE.Vector2(1, 1) },
    uImageUvOffset: { value: new THREE.Vector2(0, 0) },
  };

  const surfaceGeometry = new THREE.PlaneGeometry(2, 2);
  const surfaceMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SURFACE_VERTEX_SHADER,
    fragmentShader: SURFACE_FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const surfacePlane = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  surfacePlane.frustumCulled = false;
  surfaceScene.add(surfacePlane);

  const voxelGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cellUvAttribute = new THREE.InstancedBufferAttribute(
    new Float32Array(MAX_VOXEL_INSTANCES * 2),
    2,
  );
  voxelGeometry.setAttribute("aCellUv", cellUvAttribute);
  const voxelMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VOXEL_VERTEX_SHADER,
    fragmentShader: VOXEL_FRAGMENT_SHADER,
    transparent: true,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide,
  });
  const voxelMesh = new THREE.InstancedMesh(
    voxelGeometry,
    voxelMaterial,
    MAX_VOXEL_INSTANCES,
  );
  voxelMesh.count = 0;
  voxelMesh.frustumCulled = false;
  voxelMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  voxelScene.add(voxelMesh);
  const voxelTransform = new THREE.Object3D();

  const canRender = () => !disposed && inViewport && pageVisible;

  const clearOutput = () => {
    renderer.setRenderTarget(null);
    renderer.clear();
    canvas.dataset.rippleState = "rest";
    canvas.dataset.rippleSegments = "0";
  };

  const updateWaveTexture = () => {
    if (!gpuCompute || !heightVariable) {
      return;
    }
    uniforms.uWaveState.value =
      gpuCompute.getCurrentRenderTarget(heightVariable).texture;
  };

  const resetPhysics = () => {
    pointerSegments.length = 0;
    physicsAccumulator = 0;
    lastFrameTime = 0;
    if (gpuCompute && heightVariable) {
      for (const renderTarget of heightVariable.renderTargets) {
        gpuCompute.renderTexture(
          heightVariable.initialValueTexture,
          renderTarget,
        );
      }
      updateWaveTexture();
    }
    if (physicsControls) {
      physicsControls.segmentCount.value = 0;
      physicsControls.segmentStrengths.fill(0);
    }
    clearOutput();
  };

  const rebuildPhysics = (gridWidth: number, gridHeight: number) => {
    gpuCompute?.dispose();
    gpuCompute = null;
    heightVariable = null;
    physicsControls = null;

    const nextGpuCompute = new GPUComputationRenderer(
      gridWidth,
      gridHeight,
      renderer,
    );
    nextGpuCompute.setDataType(THREE.HalfFloatType);
    const initialState = nextGpuCompute.createTexture();
    const nextHeightVariable = nextGpuCompute.addVariable(
      "textureHeight",
      WAVE_SIMULATION_FRAGMENT_SHADER,
      initialState,
    );
    nextGpuCompute.setVariableDependencies(nextHeightVariable, [
      nextHeightVariable,
    ]);

    const segmentStarts = Array.from(
      { length: MAX_POINTER_SEGMENTS },
      () => new THREE.Vector2(2, 2),
    );
    const segmentEnds = Array.from(
      { length: MAX_POINTER_SEGMENTS },
      () => new THREE.Vector2(2, 2),
    );
    const segmentStrengths = Array.from(
      { length: MAX_POINTER_SEGMENTS },
      () => 0,
    );
    const segmentCount: IUniform<number> = { value: 0 };
    nextHeightVariable.material.uniforms.uSegmentStarts = {
      value: segmentStarts,
    };
    nextHeightVariable.material.uniforms.uSegmentEnds = {
      value: segmentEnds,
    };
    nextHeightVariable.material.uniforms.uSegmentStrengths = {
      value: segmentStrengths,
    };
    nextHeightVariable.material.uniforms.uSegmentCount = segmentCount;
    nextHeightVariable.material.uniforms.uAspect = {
      value: gridWidth / Math.max(gridHeight, 1),
    };
    nextHeightVariable.material.uniforms.uBrushRadius = {
      value: WAVE_BRUSH_CELLS / Math.max(gridHeight, 1),
    };
    nextHeightVariable.material.uniforms.uDamping = {
      value: WAVE_DAMPING,
    };
    nextHeightVariable.material.uniforms.uTension = {
      value: WAVE_TENSION,
    };

    const initializationError = nextGpuCompute.init();
    if (initializationError) {
      nextGpuCompute.dispose();
      return false;
    }

    gpuCompute = nextGpuCompute;
    heightVariable = nextHeightVariable;
    physicsControls = {
      segmentCount,
      segmentStarts,
      segmentEnds,
      segmentStrengths,
    };
    simulationWidth = gridWidth;
    simulationHeight = gridHeight;
    uniforms.uTexelSize.value.set(
      1 / Math.max(gridWidth, 1),
      1 / Math.max(gridHeight, 1),
    );
    updateWaveTexture();
    return true;
  };

  const flushPointerSegments = () => {
    if (!physicsControls || pointerSegments.length === 0) {
      if (physicsControls) {
        physicsControls.segmentCount.value = 0;
      }
      return 0;
    }

    const segmentCount = Math.min(
      pointerSegments.length,
      MAX_POINTER_SEGMENTS,
    );
    for (let index = 0; index < MAX_POINTER_SEGMENTS; index += 1) {
      const segment = pointerSegments[index];
      if (index < segmentCount && segment) {
        physicsControls.segmentStarts[index].set(
          segment.startX,
          segment.startY,
        );
        physicsControls.segmentEnds[index].set(
          segment.endX,
          segment.endY,
        );
        physicsControls.segmentStrengths[index] = segment.strength;
      } else {
        physicsControls.segmentStarts[index].set(2, 2);
        physicsControls.segmentEnds[index].set(2, 2);
        physicsControls.segmentStrengths[index] = 0;
      }
    }
    physicsControls.segmentCount.value = segmentCount;
    pointerSegments.splice(0, segmentCount);
    return segmentCount;
  };

  const disablePointerImpulse = () => {
    if (!physicsControls) {
      return;
    }
    physicsControls.segmentCount.value = 0;
    physicsControls.segmentStrengths.fill(0);
  };

  const renderSurface = (time: number) => {
    const isMoving = time - lastMotionTime < POINTER_MOVING_STATE_MS;
    canvas.dataset.rippleState = isMoving ? "moving" : "settling";
    canvas.dataset.rippleSegments = String(pointerSegments.length);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(surfaceScene, surfaceCamera);
    renderer.clearDepth();
    renderer.render(voxelScene, voxelCamera);
  };

  const stopAnimation = () => {
    if (frameId === 0) {
      return;
    }
    cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const requestFrame = () => {
    if (!canRender() || frameId !== 0) {
      return;
    }
    frameId = requestAnimationFrame(tick);
  };

  function tick(time: number) {
    frameId = 0;
    if (!canRender() || !gpuCompute || !heightVariable) {
      return;
    }

    if (lastFrameTime === 0) {
      lastFrameTime =
        time -
        (WAVE_FIXED_STEP_SECONDS * 1_000) / WAVE_TIME_SCALE;
    }
    const frameDeltaSeconds = Math.min(
      Math.max((time - lastFrameTime) / 1_000, 0),
      0.05,
    );
    lastFrameTime = time;
    physicsAccumulator = Math.min(
      physicsAccumulator + frameDeltaSeconds * WAVE_TIME_SCALE,
      WAVE_FIXED_STEP_SECONDS * MAX_PHYSICS_STEPS_PER_FRAME,
    );

    let stepCount = 0;
    let pointerImpulseApplied = false;
    while (
      physicsAccumulator >= WAVE_FIXED_STEP_SECONDS &&
      stepCount < MAX_PHYSICS_STEPS_PER_FRAME
    ) {
      if (!pointerImpulseApplied) {
        pointerImpulseApplied = flushPointerSegments() > 0;
      } else {
        disablePointerImpulse();
      }
      gpuCompute.compute();
      updateWaveTexture();
      physicsAccumulator -= WAVE_FIXED_STEP_SECONDS;
      stepCount += 1;
    }
    disablePointerImpulse();
    renderSurface(time);

    const idleTime = time - lastMotionTime;
    if (
      pointerSegments.length > 0 ||
      idleTime < WAVE_SETTLE_TIME_MS
    ) {
      requestFrame();
      return;
    }
    resetPhysics();
  }

  const enqueueSegment = (segment: PointerSegment) => {
    if (pointerSegments.length >= MAX_POINTER_SEGMENTS) {
      const first = pointerSegments[0];
      const second = pointerSegments[1];
      pointerSegments.splice(0, 2, {
        startX: first.startX,
        startY: first.startY,
        endX: second.endX,
        endY: second.endY,
        strength: Math.max(first.strength, second.strength),
      });
    }
    pointerSegments.push(segment);
  };

  const pointFromEvent = (
    event: Pick<
      PointerEvent,
      "clientX" | "clientY" | "timeStamp"
    >,
    bounds: DOMRect,
  ): PointerPoint | null => {
    if (bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = 1 - (event.clientY - bounds.top) / bounds.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return null;
    }
    return {
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      timeStamp: event.timeStamp,
    };
  };

  const recordPointerPoint = (point: PointerPoint) => {
    if (!previousPointer) {
      previousPointer = point;
      return false;
    }

    const distancePixels = Math.hypot(
      point.clientX - previousPointer.clientX,
      point.clientY - previousPointer.clientY,
    );
    if (distancePixels < MIN_POINTER_DISTANCE_PX) {
      return false;
    }
    const elapsedMilliseconds = THREE.MathUtils.clamp(
      point.timeStamp - previousPointer.timeStamp || 16,
      4,
      48,
    );
    const pointerSpeed = THREE.MathUtils.clamp(
      distancePixels / elapsedMilliseconds,
      0,
      MAX_POINTER_SPEED_PX_PER_MS,
    );
    const speedRatio = Math.sqrt(
      pointerSpeed / MAX_POINTER_SPEED_PX_PER_MS,
    );
    const strength = THREE.MathUtils.lerp(
      MIN_POINTER_IMPULSE,
      MAX_POINTER_IMPULSE,
      speedRatio,
    );
    enqueueSegment({
      startX: previousPointer.x,
      startY: previousPointer.y,
      endX: point.x,
      endY: point.y,
      strength,
    });
    previousPointer = point;
    return true;
  };

  const handlePointerEnter = (event: PointerEvent) => {
    if (!event.isPrimary) {
      return;
    }
    previousPointer = pointFromEvent(
      event,
      host.getBoundingClientRect(),
    );
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!event.isPrimary) {
      return;
    }
    const bounds = host.getBoundingClientRect();
    const coalescedEvent = event as CoalescedPointerEvent;
    const coalescedSamples = coalescedEvent.getCoalescedEvents?.();
    const samples =
      coalescedSamples && coalescedSamples.length > 0
        ? coalescedSamples
        : [event];
    let movementRecorded = false;
    for (const sample of samples) {
      const point = pointFromEvent(sample, bounds);
      if (point && recordPointerPoint(point)) {
        movementRecorded = true;
      }
    }
    if (!movementRecorded) {
      return;
    }
    lastMotionTime = performance.now();
    requestFrame();
  };

  const clearPointer = () => {
    previousPointer = null;
  };

  const resize = () => {
    const bounds = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const preferredCellSize = THREE.MathUtils.clamp(
      width / 200,
      RIPPLE_CELL_SIZE - 1,
      RIPPLE_CELL_SIZE + 1,
    );
    const cellSize = Math.max(
      preferredCellSize,
      Math.sqrt((width * height) / MAX_VOXEL_INSTANCES),
    );

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO),
    );
    renderer.setSize(width, height, false);
    const gridWidth = Math.max(1, Math.ceil(width / cellSize));
    const gridHeight = Math.max(1, Math.ceil(height / cellSize));
    uniforms.uGrid.value.set(gridWidth, gridHeight);

    if (
      gridWidth !== simulationWidth ||
      gridHeight !== simulationHeight
    ) {
      if (!rebuildPhysics(gridWidth, gridHeight)) {
        clearOutput();
        return false;
      }
      pointerSegments.length = 0;
      previousPointer = null;
      physicsAccumulator = 0;
      lastFrameTime = 0;
    }

    const frameAspect = width / height;
    const voxelWidth = (2 * frameAspect) / gridWidth;
    const voxelHeight = 2 / gridHeight;
    let voxelIndex = 0;
    for (let row = 0; row < gridHeight; row += 1) {
      for (let column = 0; column < gridWidth; column += 1) {
        if (voxelIndex >= MAX_VOXEL_INSTANCES) {
          break;
        }

        const cellX = (column + 0.5) / gridWidth;
        const cellY = (row + 0.5) / gridHeight;
        voxelTransform.position.set(
          (cellX - 0.5) * 2 * frameAspect,
          (cellY - 0.5) * 2,
          0,
        );
        voxelTransform.scale.set(
          voxelWidth * 0.98,
          voxelHeight * 0.98,
          0.045,
        );
        voxelTransform.updateMatrix();
        voxelMesh.setMatrixAt(voxelIndex, voxelTransform.matrix);
        cellUvAttribute.setXY(voxelIndex, cellX, cellY);
        voxelIndex += 1;
      }
    }
    voxelMesh.count = voxelIndex;
    voxelMesh.instanceMatrix.needsUpdate = true;
    cellUvAttribute.needsUpdate = true;
    voxelCamera.aspect = frameAspect;
    voxelCamera.updateProjectionMatrix();

    updateImageCrop(
      host,
      nightImage,
      width,
      height,
      uniforms.uImageUvScale.value,
      uniforms.uImageUvOffset.value,
    );
    resetPhysics();
    return true;
  };

  const handleVisibilityChange = () => {
    pageVisible = document.visibilityState !== "hidden";
    if (!pageVisible) {
      stopAnimation();
      return;
    }
    lastFrameTime = 0;
    if (performance.now() - lastMotionTime >= WAVE_SETTLE_TIME_MS) {
      resetPhysics();
      return;
    }
    requestFrame();
  };

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    inViewport = entries.some((entry) => entry.isIntersecting);
    if (!inViewport) {
      stopAnimation();
      return;
    }
    lastFrameTime = 0;
    if (performance.now() - lastMotionTime >= WAVE_SETTLE_TIME_MS) {
      resetPhysics();
      return;
    }
    requestFrame();
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    stopAnimation();
  };

  const handleContextRestored = () => {
    simulationWidth = 0;
    simulationHeight = 0;
    resize();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersectionObserver = new IntersectionObserver(handleIntersection, {
    threshold: 0.01,
  });
  intersectionObserver.observe(host);

  host.addEventListener("pointerenter", handlePointerEnter);
  host.addEventListener("pointermove", handlePointerMove, { passive: true });
  host.addEventListener("pointerleave", clearPointer);
  host.addEventListener("pointercancel", clearPointer);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  canvas.addEventListener("webglcontextlost", handleContextLost, {
    passive: false,
  });
  canvas.addEventListener("webglcontextrestored", handleContextRestored);

  const initialized = resize();
  if (pointerSnapshot.inside) {
    previousPointer = pointFromEvent(
      pointerSnapshot,
      host.getBoundingClientRect(),
    );
  }
  if (initialized) {
    onReady();
  }

  return () => {
    if (disposed) {
      return;
    }
    disposed = true;
    stopAnimation();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    host.removeEventListener("pointerenter", handlePointerEnter);
    host.removeEventListener("pointermove", handlePointerMove);
    host.removeEventListener("pointerleave", clearPointer);
    host.removeEventListener("pointercancel", clearPointer);
    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );
    canvas.removeEventListener("webglcontextlost", handleContextLost);
    canvas.removeEventListener(
      "webglcontextrestored",
      handleContextRestored,
    );
    gpuCompute?.dispose();
    surfaceGeometry.dispose();
    surfaceMaterial.dispose();
    voxelGeometry.dispose();
    voxelMaterial.dispose();
    dayTexture.dispose();
    nightTexture.dispose();
    renderer.renderLists.dispose();
    renderer.dispose();
  };
}

function updateImageCrop(
  host: HTMLElement,
  image: HTMLImageElement,
  width: number,
  height: number,
  uvScale: { set: (x: number, y: number) => void },
  uvOffset: { set: (x: number, y: number) => void },
) {
  const imageAspect = image.naturalWidth / Math.max(image.naturalHeight, 1);
  const frameAspect = width / Math.max(height, 1);
  const computedStyle = getComputedStyle(host);
  const positionX = readPercentage(
    computedStyle.getPropertyValue("--hero-image-position-x"),
    0.5,
  );
  const positionY = readPercentage(
    computedStyle.getPropertyValue("--hero-image-position-y"),
    0.4,
  );

  let visibleWidth = 1;
  let visibleHeight = 1;
  if (frameAspect > imageAspect) {
    visibleHeight = imageAspect / frameAspect;
  } else {
    visibleWidth = frameAspect / imageAspect;
  }

  uvScale.set(visibleWidth, visibleHeight);
  uvOffset.set(
    (1 - visibleWidth) * positionX,
    (1 - visibleHeight) * (1 - positionY),
  );
}

function readPercentage(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clampUnitInterval(parsed / 100);
}

function clampUnitInterval(value: number) {
  return Math.min(1, Math.max(0, value));
}
