"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const GRID_COLS = 120;
const GRID_ROWS = 70;
const VOXEL_SIZE = 0.22;
const VOXEL_GAP = 0.05;
const SPRING_STRENGTH = 0.04;
const SPRING_DAMPING = 0.88;
const MOUSE_RADIUS = 4.5;
const MOUSE_FORCE = 1.8;

export function VoxelPaperBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 22);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e8, 0.6);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xe8f0ff, 0.3);
    dirLight2.position.set(-8, -5, 8);
    scene.add(dirLight2);

    // Geometry & Material
    const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE * 0.15, VOXEL_SIZE);
    // Flattened cubes = paper-like voxels
    const material = new THREE.MeshStandardMaterial({
      color: 0xfafaf9,
      roughness: 0.75,
      metalness: 0.02,
    });

    const count = GRID_COLS * GRID_ROWS;
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);

    // State arrays
    const origins: THREE.Vector3[] = [];
    const positions: THREE.Vector3[] = [];
    const velocities: THREE.Vector3[] = [];
    const rotations: THREE.Euler[] = [];
    const rotVelocities: THREE.Vector3[] = [];
    const dummy = new THREE.Object3D();

    const totalW = GRID_COLS * (VOXEL_SIZE + VOXEL_GAP);
    const totalH = GRID_ROWS * (VOXEL_SIZE + VOXEL_GAP);
    const startX = -totalW / 2;
    const startY = -totalH / 2;

    for (let i = 0; i < count; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = startX + col * (VOXEL_SIZE + VOXEL_GAP);
      const y = startY + row * (VOXEL_SIZE + VOXEL_GAP);
      const z = 0;

      origins.push(new THREE.Vector3(x, y, z));
      positions.push(new THREE.Vector3(x, y, z));
      velocities.push(new THREE.Vector3(0, 0, 0));
      rotations.push(new THREE.Euler(0, 0, 0));
      rotVelocities.push(new THREE.Vector3(0, 0, 0));

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    // Mouse state
    const mouse = new THREE.Vector2(-999, -999);
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouse.set(x, y);
    };

    window.addEventListener("mousemove", onMouseMove);

    // Animation
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Raycast to find mouse world position on z=0 plane
      raycaster.setFromCamera(mouse, camera);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);

      for (let i = 0; i < count; i++) {
        const origin = origins[i];
        const pos = positions[i];
        const vel = velocities[i];
        const rot = rotations[i];
        const rvel = rotVelocities[i];

        // Idle wave
        const waveZ = Math.sin(origin.x * 0.4 + time * 0.6) * 0.15 + Math.cos(origin.y * 0.3 + time * 0.4) * 0.1;
        const waveRotX = Math.sin(origin.y * 0.25 + time * 0.5) * 0.03;
        const waveRotY = Math.cos(origin.x * 0.25 + time * 0.5) * 0.03;

        // Mouse interaction
        let dx = 0, dy = 0, dz = 0;
        let drx = 0, dry = 0, drz = 0;

        if (target) {
          const dist = Math.sqrt((origin.x - target.x) ** 2 + (origin.y - target.y) ** 2);
          if (dist < MOUSE_RADIUS) {
            const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
            // Push away from mouse + lift up (peel effect)
            const angle = Math.atan2(origin.y - target.y, origin.x - target.x);
            dx = Math.cos(angle) * force * 0.8;
            dy = Math.sin(angle) * force * 0.8;
            dz = force * 1.5; // lift up

            // Rotation: tilt away from mouse + flutter
            drx = (Math.random() - 0.5) * force * 0.4 + dy * 0.15;
            dry = (Math.random() - 0.5) * force * 0.4 - dx * 0.15;
            drz = (Math.random() - 0.5) * force * 0.2;
          }
        }

        // Spring physics toward origin (+ idle wave offset)
        const targetPos = new THREE.Vector3(origin.x, origin.y, origin.z + waveZ);
        vel.x += (targetPos.x - pos.x + dx) * SPRING_STRENGTH;
        vel.y += (targetPos.y - pos.y + dy) * SPRING_STRENGTH;
        vel.z += (targetPos.z - pos.z + dz) * SPRING_STRENGTH;
        vel.multiplyScalar(SPRING_DAMPING);

        pos.add(vel);

        // Rotation spring
        rvel.x += (waveRotX + drx - rot.x) * SPRING_STRENGTH * 0.6;
        rvel.y += (waveRotY + dry - rot.y) * SPRING_STRENGTH * 0.6;
        rvel.z += (drz - rot.z) * SPRING_STRENGTH * 0.6;
        rvel.multiplyScalar(SPRING_DAMPING);

        rot.x += rvel.x;
        rot.y += rvel.y;
        rot.z += rvel.z;

        dummy.position.copy(pos);
        dummy.rotation.set(rot.x, rot.y, rot.z);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
    />
  );
}
