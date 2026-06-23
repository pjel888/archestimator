"use client";

import { useEffect, useRef } from "react";

type FrontdoorHeroFieldProps = {
  className?: string;
};

const PARTICLE_COUNT = 150;

function createSeededRandom(seed: number) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function FrontdoorHeroField({ className }: FrontdoorHeroFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const heroCanvas = canvas;
    let cancelled = false;
    let animationFrame = 0;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    async function mountScene() {
      const THREE = await import("three");

      if (cancelled) {
        return undefined;
      }

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: heroCanvas,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
      camera.position.z = 8;

      const textureCanvas = document.createElement("canvas");
      textureCanvas.width = 48;
      textureCanvas.height = 48;
      const textureContext = textureCanvas.getContext("2d");
      if (textureContext) {
        textureContext.clearRect(0, 0, 48, 48);
        textureContext.strokeStyle = "rgba(255,255,255,0.82)";
        textureContext.lineWidth = 4;
        textureContext.lineCap = "square";
        textureContext.beginPath();
        textureContext.moveTo(24, 8);
        textureContext.lineTo(24, 40);
        textureContext.moveTo(8, 24);
        textureContext.lineTo(40, 24);
        textureContext.stroke();
      }

      const symbolTexture = new THREE.CanvasTexture(textureCanvas);
      symbolTexture.colorSpace = THREE.SRGBColorSpace;

      const positions = new Float32Array(PARTICLE_COUNT * 3);
      const colors = new Float32Array(PARTICLE_COUNT * 3);
      const random = createSeededRandom(8726);

      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const offset = index * 3;
        positions[offset] = (random() - 0.5) * 12;
        positions[offset + 1] = (random() - 0.5) * 6.8;
        positions[offset + 2] = (random() - 0.5) * 2;

        const accent = random() > 0.88;
        colors[offset] = accent ? 1 : 0.56 + random() * 0.18;
        colors[offset + 1] = accent ? 0.28 : 0.56 + random() * 0.18;
        colors[offset + 2] = accent ? 0.04 : 0.56 + random() * 0.18;
      }

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const particleMaterial = new THREE.PointsMaterial({
        alphaTest: 0.04,
        depthWrite: false,
        map: symbolTexture,
        opacity: 0.38,
        size: 0.11,
        sizeAttenuation: true,
        transparent: true,
        vertexColors: true,
      });

      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      const slabGeometry = new THREE.PlaneGeometry(3.8, 2.35, 14, 8);
      const slabMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        opacity: 0.045,
        transparent: true,
        wireframe: true,
      });
      const slab = new THREE.Mesh(slabGeometry, slabMaterial);
      slab.position.set(2.7, -0.05, -0.8);
      slab.rotation.set(-0.08, -0.18, -0.1);
      scene.add(slab);

      const resize = () => {
        const rect = heroCanvas.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);
        const aspect = width / height;

        camera.left = -aspect * 3.4;
        camera.right = aspect * 3.4;
        camera.top = 3.4;
        camera.bottom = -3.4;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        renderer.render(scene, camera);
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(heroCanvas);
      resize();

      const render = (time: number) => {
        const seconds = time / 1000;
        particles.rotation.z = seconds * 0.016;
        particles.position.x = Math.sin(seconds * 0.18) * 0.12;
        slab.rotation.z = -0.1 + Math.sin(seconds * 0.28) * 0.035;
        slab.rotation.y = -0.18 + Math.sin(seconds * 0.22) * 0.04;
        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(render);
      };

      if (mediaQuery.matches) {
        renderer.render(scene, camera);
      } else {
        animationFrame = window.requestAnimationFrame(render);
      }

      heroCanvas.dataset.threeHero = "ready";

      return () => {
        resizeObserver.disconnect();
        window.cancelAnimationFrame(animationFrame);
        particleGeometry.dispose();
        particleMaterial.dispose();
        slabGeometry.dispose();
        slabMaterial.dispose();
        symbolTexture.dispose();
        renderer.dispose();
      };
    }

    let cleanup: (() => void) | undefined;
    mountScene().then((dispose) => {
      cleanup = dispose;
    });

    return () => {
      cancelled = true;
      cleanup?.();
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" data-three-hero="loading" />;
}
