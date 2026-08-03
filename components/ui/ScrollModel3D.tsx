"use client";
/**
 * Scroll-driven 3D showcase using local GLBs (globe / laptop / email).
 * Raw three.js + GLTFLoader + GSAP ScrollTrigger.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const MODELS = [
  { url: "/models/globe.glb", label: "Discover", target: 2.4 },
  { url: "/models/laptop.glb", label: "Compose", target: 2.2 },
  { url: "/models/email.glb", label: "Send", target: 1.8 },
];

export default function ScrollModel3D() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [activeLabel, setActiveLabel] = useState(MODELS[0].label);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const w0 = canvas.clientWidth || window.innerWidth;
    const h0 = canvas.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w0 / h0, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w0, h0, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xbfeaff, 1.5);
    key.position.set(5, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rim.position.set(-6, -2, -5);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0x22d3ee, 0x05060a, 0.55));

    const group = new THREE.Group();
    scene.add(group);

    const models: THREE.Object3D[] = [];
    let loaded = 0;
    let targetRotY = 0;
    let targetRotX = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let st: any = null;
    let id = 0;

    const fit = (obj: THREE.Object3D, target: number) => {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const k = target / maxDim;
      obj.scale.setScalar(k);
      obj.position.set(-center.x * k, -center.y * k, -center.z * k);
    };

    const loader = new GLTFLoader();
    MODELS.forEach((m, i) => {
      loader.load(
        m.url,
        (g) => {
          const root = new THREE.Group();
          const obj = g.scene;
          fit(obj, m.target);
          root.add(obj);
          root.visible = i === 0;
          root.position.x = (i - 1) * 0.01;
          group.add(root);
          models[i] = root;
          loaded += 1;
          if (loaded === 1) {
            camera.position.set(0, 0.4, 5.5);
            camera.lookAt(0, 0, 0);
          }
        },
        undefined,
        () => {
          if (i === 0) setFailed(true);
        }
      );
    });

    if (!reduce) {
      st = ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
        onUpdate: (self) => {
          const p = self.progress;
          targetRotY = p * Math.PI * 2.2 - Math.PI;
          targetRotX = (p - 0.5) * 0.45;
          const idx = Math.min(MODELS.length - 1, Math.floor(p * MODELS.length));
          setActiveLabel(MODELS[idx].label);
          models.forEach((m, i) => {
            if (!m) return;
            m.visible = i === idx;
            m.rotation.y = targetRotY;
            m.rotation.x = targetRotX;
          });
        },
      });
    }

    const setSize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const render = () => {
      group.rotation.y += (targetRotY - group.rotation.y) * 0.08 + (reduce ? 0 : 0.002);
      group.rotation.x += (targetRotX - group.rotation.x) * 0.08;
      renderer.render(scene, camera);
      id = requestAnimationFrame(render);
    };
    render();

    window.addEventListener("resize", setSize);
    return () => {
      window.removeEventListener("resize", setSize);
      if (id) cancelAnimationFrame(id);
      if (st) st.kill();
      renderer.dispose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scene.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose?.();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mats.forEach((mat: any) => {
            mat.map?.dispose?.();
            mat.dispose?.();
          });
        }
      });
    };
  }, []);

  return (
    <section ref={sectionRef} className="sm3">
      <canvas ref={canvasRef} className="sm3-canvas" />
      {failed && <div className="sm3-fallback" aria-hidden="true" />}
      <div className="sm3-copy">
        <span className="sm3-kick">{activeLabel}</span>
        <h2 className="sm3-title">Outreach that goes the distance</h2>
        <p className="sm3-sub">From search to a sent, personalized email — scroll to explore the journey.</p>
      </div>

      <style jsx global>{`
        .sm3 {
          position: relative;
          min-height: 110vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow: hidden;
          background: radial-gradient(ellipse 70% 50% at 50% 60%, color-mix(in srgb, var(--acc) 10%, transparent), transparent 70%);
        }
        .sm3-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        .sm3-fallback {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 55%, color-mix(in srgb, var(--acc) 16%, transparent), transparent 60%);
          pointer-events: none;
        }
        .sm3-copy {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 640px;
          padding: 12vh 24px 0;
          pointer-events: none;
        }
        .sm3-kick {
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--acc);
          font-weight: 700;
        }
        .sm3-title {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(26px, 4vw, 42px);
          margin: 10px 0 8px;
          letter-spacing: -0.5px;
          color: var(--ink);
        }
        .sm3-sub {
          color: var(--mut);
          font-size: 15px;
          margin: 0;
        }
      `}</style>
    </section>
  );
}
