"use client";
/**
 * Scroll hero with globe-original + animated starfield.
 * Keeps globe large/on-screen; pauses render when off-screen; streams GLB.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import BrandLogo from "@/components/BrandLogo";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const GLOBE_URL = "/models/globe-original.glb";

const SECTIONS = [
  {
    title: "DISCOVER",
    line1: "Search professors by field, university, and country —",
    line2: "across universities and research fields worldwide.",
  },
  {
    title: "PERSONALIZE",
    line1: "Every email is tailored to their recent papers,",
    line2: "with a subject line written for that professor alone.",
  },
  {
    title: "OUTREACH",
    line1: "Schedule your campaign and send from your Gmail —",
    line2: "then track every delivery and open.",
  },
];

type Refs = {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  stars: THREE.Points[];
  globe: THREE.Group | null;
  animId: number;
  progress: number;
  visible: boolean;
  radius: number;
  theta: number;
  phi: number;
};

export type HorizonHeroProps = { onGetStarted?: () => void };

function prepareMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      const mat = m as THREE.MeshStandardMaterial;
      if (mat.isMeshStandardMaterial || mat.type?.includes("Standard") || mat.type?.includes("Physical")) {
        mat.envMapIntensity = 1.25;
        if (mat.metalness > 0.8) mat.metalness = 0.4;
        if (mat.roughness < 0.25) mat.roughness = 0.4;
        mat.needsUpdate = true;
      }
    }
  });
}

function createStarLayer(count: number, depth: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let j = 0; j < count; j++) {
    const radius = 90 + Math.random() * 220;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[j * 3 + 2] = radius * Math.cos(phi);
    const color = new THREE.Color();
    const ch = Math.random();
    if (ch < 0.72) color.setHSL(0, 0, 0.78 + Math.random() * 0.22);
    else if (ch < 0.9) color.setHSL(0.52, 0.65, 0.75);
    else color.setHSL(0.58, 0.55, 0.8);
    colors[j * 3] = color.r;
    colors[j * 3 + 1] = color.g;
    colors[j * 3 + 2] = color.b;
    sizes[j] = Math.random() * 2.2 + 0.4;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, depth: { value: depth } },
    vertexShader: `
      attribute float size; attribute vec3 color; varying vec3 vColor;
      uniform float time; uniform float depth;
      void main() {
        vColor = color; vec3 pos = position;
        float angle = time * 0.045 * (1.0 - depth * 0.35);
        mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        pos.xy = rot * pos.xy;
        float twinkle = 0.85 + 0.15 * sin(time * 2.0 + pos.x * 0.05);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * twinkle * (220.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float o = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(vColor, o);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

export function HorizonHeroSection({ onGetStarted }: HorizonHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [progress, setProgress] = useState(0);
  const [section, setSection] = useState(0);
  const [ready, setReady] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const prevSection = useRef(0);

  const refs = useRef<Refs>({
    scene: null,
    camera: null,
    renderer: null,
    stars: [],
    globe: null,
    animId: 0,
    progress: 0,
    visible: true,
    radius: 52,
    theta: 0.2,
    phi: 0.4,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.innerWidth < 768;
    const r = refs.current;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a);
    scene.fog = new THREE.FogExp2(0x05070a, 0.008);
    r.scene = scene;

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 800);
    r.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    r.renderer = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(10, 16, 12);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x7dd3fc, 1.05);
    fill.position.set(-12, 4, 6);
    scene.add(fill);
    scene.add(new THREE.HemisphereLight(0xbfeaff, 0x0a1620, 0.75));

    // Animated star layers
    const starCount = mobile ? 900 : 1800;
    const layers = mobile ? 2 : 3;
    r.stars = [];
    for (let i = 0; i < layers; i++) {
      const stars = createStarLayer(Math.floor(starCount / layers), i);
      scene.add(stars);
      r.stars.push(stars);
    }

    const globeRoot = new THREE.Group();
    globeRoot.position.set(0, -4.2, 0);
    scene.add(globeRoot);
    r.globe = globeRoot;

    const placeholder = new THREE.Mesh(
      new THREE.SphereGeometry(14, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0369a1,
        emissiveIntensity: 0.45,
        metalness: 0.25,
        roughness: 0.45,
      })
    );
    globeRoot.add(placeholder);

    const atm = new THREE.Mesh(
      new THREE.SphereGeometry(15.4, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.14,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    globeRoot.add(atm);

    let cancelled = false;
    // Defer heavy GLB slightly so first paint + stars start immediately
    const loadId = window.setTimeout(() => {
      new GLTFLoader().load(
        GLOBE_URL,
        (gltf) => {
          if (cancelled) return;
          const obj = gltf.scene;
          prepareMaterials(obj);
          const box = new THREE.Box3().setFromObject(obj);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const target = mobile ? 27 : 31;
          const k = target / maxDim;
          obj.scale.setScalar(k);
          obj.position.set(-center.x * k, -center.y * k, -center.z * k);
          globeRoot.remove(placeholder);
          placeholder.geometry.dispose();
          (placeholder.material as THREE.Material).dispose();
          globeRoot.add(obj);
          atm.scale.setScalar(target / 28);
          setGlobeReady(true);
        },
        undefined,
        () => setGlobeReady(true)
      );
    }, 80);

    const applyCamera = () => {
      const { radius, theta, phi } = r;
      const gy = -4.2;
      camera.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        gy + radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(0, gy + 1.8, 0);
    };
    applyCamera();

    const tick = () => {
      r.animId = requestAnimationFrame(tick);
      if (!r.visible) return;
      const t = Date.now() * 0.001;
      const p = r.progress;

      r.radius = THREE.MathUtils.lerp(52, 36, p);
      r.theta = 0.25 + p * 1.2 + (reduce ? 0 : t * 0.035);
      r.phi = 0.4 + Math.sin(p * Math.PI) * 0.07;
      applyCamera();

      if (globeRoot) globeRoot.rotation.y = (reduce ? 0 : t * 0.09) + p * Math.PI * 0.9;

      r.stars.forEach((s) => {
        const mat = s.material as THREE.ShaderMaterial;
        if (mat.uniforms) mat.uniforms.time.value = t;
      });

      renderer.render(scene, camera);
    };
    tick();
    setReady(true);

    const io = new IntersectionObserver(([e]) => {
      r.visible = e.isIntersecting;
    }, { threshold: 0.04 });
    io.observe(root);

    const onResize = () => {
      const ww = window.innerWidth;
      const hh = window.innerHeight;
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
      renderer.setSize(ww, hh);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, ww < 768 ? 1.25 : 1.75));
    };
    window.addEventListener("resize", onResize);

    const st = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      onUpdate: (self) => {
        r.progress = self.progress;
        setProgress(self.progress);
        setSection(Math.min(2, Math.floor(self.progress * 3)));
      },
    });

    return () => {
      cancelled = true;
      clearTimeout(loadId);
      cancelAnimationFrame(r.animId);
      st.kill();
      io.disconnect();
      window.removeEventListener("resize", onResize);
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
      });
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const tl = gsap.timeline();
    if (titleRef.current) {
      tl.from(titleRef.current.querySelectorAll(".title-char"), {
        y: 80,
        opacity: 0,
        duration: 0.9,
        stagger: 0.03,
        ease: "power3.out",
      });
    }
    if (subRef.current) tl.from(subRef.current, { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.4");
    if (progressRef.current) tl.from(progressRef.current, { opacity: 0, duration: 0.5 }, "-=0.3");
    return () => {
      tl.kill();
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !titleRef.current || !subRef.current) return;
    if (prevSection.current === section) return;
    prevSection.current = section;
    gsap.fromTo(
      titleRef.current.querySelectorAll(".title-char"),
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, stagger: 0.02, ease: "power2.out" }
    );
    gsap.fromTo(subRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" });
  }, [section, ready]);

  const active = SECTIONS[section];
  const split = (text: string) =>
    text.split("").map((c, i) => (
      <span key={`${text}-${i}`} className="title-char">
        {c === " " ? "\u00A0" : c}
      </span>
    ));

  return (
    <div ref={rootRef} className="hh-root">
      <div className="hh-sticky">
        <canvas ref={canvasRef} className="hh-canvas" />
        <div className="hh-vignette" aria-hidden />
        {!globeReady && <div className="hh-loading">Loading globe…</div>}

        <div className="hh-content">
          <p className="hh-brand">
            <BrandLogo variant="app" size={28} />
            ScholarBridge <em>AI</em>
          </p>
          <h1 ref={titleRef} className="hh-title">
            {split(active.title)}
          </h1>
          <div ref={subRef} className="hh-sub">
            <p>{active.line1}</p>
            <p>{active.line2}</p>
          </div>
          <div className={`hh-cta ${section === 0 ? "on" : ""}`}>
            <button type="button" className="btn" onClick={() => onGetStarted?.()}>
              Get started — it&apos;s free
            </button>
            <a href="#features" className="btn sec hh-link">
              See features
            </a>
          </div>
        </div>

        <div ref={progressRef} className="hh-bar">
          <span>SCROLL</span>
          <div className="hh-track">
            <div className="hh-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <span>{String(section + 1).padStart(2, "0")} / 03</span>
        </div>
      </div>

      <div className="hh-space" aria-hidden />

      <style jsx global>{`
        .hh-root {
          position: relative;
          background: #05070a;
          color: #f2f3f5;
        }
        .hh-sticky {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
        }
        .hh-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        .hh-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(to bottom, rgba(5, 7, 10, 0.5) 0%, transparent 26%, transparent 64%, rgba(5, 7, 10, 0.72) 100%);
        }
        .hh-loading {
          position: absolute;
          bottom: 64px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 4;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(200, 220, 230, 0.5);
          pointer-events: none;
        }
        .hh-content {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10vh 24px 0;
          text-align: center;
          pointer-events: none;
        }
        .hh-brand {
          margin: 0 0 12px;
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(20px, 2.5vw, 28px);
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .hh-brand em {
          font-style: normal;
          color: #22d3ee;
        }
        .hh-title {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(42px, 10vw, 96px);
          font-weight: 700;
          line-height: 0.95;
          letter-spacing: -0.03em;
          margin: 0 0 14px;
          overflow: hidden;
          text-shadow: 0 6px 28px rgba(0, 0, 0, 0.55);
        }
        .title-char {
          display: inline-block;
        }
        .hh-sub {
          max-width: 480px;
          font-size: clamp(14px, 1.8vw, 17px);
          line-height: 1.5;
          color: rgba(230, 236, 242, 0.85);
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
        }
        .hh-sub p {
          margin: 0;
        }
        .hh-cta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 22px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .hh-cta.on {
          opacity: 1;
          pointer-events: auto;
        }
        .hh-cta .btn {
          pointer-events: auto;
        }
        .hh-link {
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }
        .hh-bar {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 12px;
          width: min(300px, 78vw);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: rgba(200, 210, 220, 0.55);
        }
        .hh-track {
          flex: 1;
          height: 2px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 2px;
          overflow: hidden;
        }
        .hh-fill {
          height: 100%;
          background: linear-gradient(90deg, #22d3ee, #38bdf8);
        }
        .hh-space {
          height: 120vh;
        }
        @media (max-width: 640px) {
          .hh-content {
            padding-top: 8vh;
          }
          .hh-space {
            height: 100vh;
          }
        }
      `}</style>
    </div>
  );
}

export const Component = HorizonHeroSection;
export default HorizonHeroSection;
