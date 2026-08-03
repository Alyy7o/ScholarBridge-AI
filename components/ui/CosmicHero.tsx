"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/**
 * WebGL hero: additive starfield + shader nebula + bloom, themed to
 * ScholarBridge's cyan/blue accent, with a GSAP character-reveal title.
 * Self-contained and SSR-safe (all WebGL runs in an effect on the client).
 * Adapted from the "horizon" cosmic hero to the app's plain-CSS stack.
 */
export default function CosmicHero({ onGetStarted }: { onGetStarted?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const w0 = canvas.clientWidth || window.innerWidth;
    const h0 = canvas.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070a, 0.00028);

    const camera = new THREE.PerspectiveCamera(70, w0 / h0, 0.1, 2000);
    camera.position.set(0, 12, 120);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.7;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w0, h0), 0.9, 0.5, 0.85);
    composer.addPass(bloom);

    const setSize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      composer.setSize(w, h);
    };

    // Starfield (two additive layers)
    const stars: THREE.Points[] = [];
    const starCount = window.innerWidth < 768 ? 2200 : 3600;
    for (let layer = 0; layer < 2; layer++) {
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array(starCount * 3);
      const col = new Float32Array(starCount * 3);
      const siz = new Float32Array(starCount);
      for (let j = 0; j < starCount; j++) {
        const r = 180 + Math.random() * 700;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(Math.random() * 2 - 1);
        pos[j * 3] = r * Math.sin(ph) * Math.cos(th);
        pos[j * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
        pos[j * 3 + 2] = r * Math.cos(ph);
        const c = new THREE.Color();
        const ch = Math.random();
        if (ch < 0.74) c.setHSL(0, 0, 0.75 + Math.random() * 0.25);
        else if (ch < 0.92) c.setHSL(0.52, 0.7, 0.72);
        else c.setHSL(0.58, 0.7, 0.72);
        col[j * 3] = c.r;
        col[j * 3 + 1] = c.g;
        col[j * 3 + 2] = c.b;
        siz[j] = Math.random() * 2 + 0.5;
      }
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.setAttribute("size", new THREE.BufferAttribute(siz, 1));
      const m = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, depth: { value: layer } },
        vertexShader: `
          attribute float size; attribute vec3 color; varying vec3 vColor;
          uniform float time; uniform float depth;
          void main() {
            vColor = color; vec3 p = position;
            float a = time * 0.04 * (1.0 - depth * 0.3);
            mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
            p.xy = rot * p.xy;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = size * (300.0 / -mv.z);
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
      const s = new THREE.Points(g, m);
      scene.add(s);
      stars.push(s);
    }

    // Nebula plane (cyan → blue)
    const ng = new THREE.PlaneGeometry(6000, 3000, 80, 80);
    const nm = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        c1: { value: new THREE.Color(0x22d3ee) },
        c2: { value: new THREE.Color(0x38bdf8) },
        opacity: { value: 0.26 },
      },
      vertexShader: `
        varying vec2 vUv; varying float vE; uniform float time;
        void main() {
          vUv = uv; vec3 p = position;
          float e = sin(p.x * 0.01 + time) * cos(p.y * 0.01 + time) * 20.0;
          p.z += e; vE = e;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 c1; uniform vec3 c2; uniform float opacity; uniform float time;
        varying vec2 vUv; varying float vE;
        void main() {
          float mx = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
          vec3 c = mix(c1, c2, mx * 0.5 + 0.5);
          float a = opacity * (1.0 - length(vUv - 0.5) * 2.0);
          a *= 1.0 + vE * 0.01;
          gl_FragColor = vec4(c, max(a, 0.0));
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const neb = new THREE.Mesh(ng, nm);
    neb.position.z = -700;
    scene.add(neb);

    setSize();
    setReady(true);

    let id = 0;
    const t0 = Date.now();
    const render = () => {
      const time = (Date.now() - t0) * 0.001;
      stars.forEach((s) => {
        (s.material as THREE.ShaderMaterial).uniforms.time.value = time;
      });
      nm.uniforms.time.value = time * 0.5;
      camera.position.x = Math.sin(time * 0.1) * 6;
      camera.position.y = 12 + Math.cos(time * 0.13) * 3;
      camera.lookAt(0, 6, -300);
      composer.render();
      if (!reduce) id = requestAnimationFrame(render);
    };
    render();

    const onResize = () => setSize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (id) cancelAnimationFrame(id);
      stars.forEach((s) => {
        s.geometry.dispose();
        (s.material as THREE.Material).dispose();
      });
      ng.dispose();
      nm.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const tl = gsap.timeline();
    if (titleRef.current) {
      const chars = titleRef.current.querySelectorAll(".ch-char");
      gsap.set(chars, { visibility: "visible" });
      tl.from(chars, { yPercent: 120, opacity: 0, duration: 1.1, stagger: 0.035, ease: "power4.out" });
    }
    if (subRef.current) tl.from(subRef.current, { y: 30, opacity: 0, duration: 0.9, ease: "power3.out" }, "-=0.5");
    if (ctaRef.current) tl.from(ctaRef.current, { y: 24, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.6");
    return () => {
      tl.kill();
    };
  }, [ready]);

  const split = (s: string) =>
    s.split("").map((c, i) => (
      <span key={i} className="ch-char" style={{ visibility: "hidden" }}>
        {c === " " ? " " : c}
      </span>
    ));

  return (
    <section className="ch">
      <canvas ref={canvasRef} className="ch-canvas" />
      <div className="ch-fade" aria-hidden="true" />
      <div className="ch-content">
        <span className="ch-badge">Cold outreach for grad-school applicants</span>
        <h1 ref={titleRef} className="ch-title">
          <span className="ch-line">{split("Reach the right")}</span>
          <span className="ch-line ch-grad">{split("professors, faster.")}</span>
        </h1>
        <div ref={subRef} className="ch-sub">
          Find professors by field and university, personalize every email with their recent research, and schedule your whole outreach campaign — in one place.
        </div>
        <div ref={ctaRef} className="ch-cta">
          <button className="btn" onClick={() => onGetStarted?.()} style={{ padding: "13px 26px", fontSize: 15 }}>
            Get started — it&apos;s free
          </button>
          <a href="#features" className="btn sec" style={{ padding: "13px 26px", fontSize: 15, textDecoration: "none" }}>
            See how it works
          </a>
        </div>
        <div className="ch-trust">
          <span>✦ Research-aware search</span>
          <span>✦ Sends from your Gmail</span>
          <span>✦ AI-personalized</span>
        </div>
      </div>

      <style jsx global>{`
        .ch { position: relative; min-height: 92vh; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #05070a; }
        .ch-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        .ch-fade { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 75% 60% at 50% 32%, transparent 40%, color-mix(in srgb, var(--bg) 65%, transparent) 100%), linear-gradient(to bottom, transparent 55%, var(--bg) 100%); }
        .ch-content { position: relative; z-index: 2; text-align: center; max-width: 860px; padding: 96px 24px 70px; }
        .ch-badge { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: 0.3px; color: var(--acc); border: 1px solid color-mix(in srgb, var(--acc) 45%, transparent); background: color-mix(in srgb, var(--acc) 14%, transparent); border-radius: 999px; padding: 6px 14px; margin-bottom: 22px; backdrop-filter: blur(6px); }
        .ch-title { font-size: clamp(40px, 7.5vw, 86px); line-height: 1.02; font-weight: 800; letter-spacing: -1.6px; margin: 0 0 20px; color: #fff; }
        .ch-line { display: block; overflow: hidden; padding-bottom: 0.08em; }
        .ch-char { display: inline-block; will-change: transform; }
        .ch-grad { background: linear-gradient(120deg, var(--acc), var(--acc2)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; }
        .ch-sub { font-size: clamp(15px, 2vw, 19px); color: rgba(235, 240, 245, 0.82); max-width: 600px; margin: 0 auto 28px; line-height: 1.6; }
        .ch-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .ch-trust { display: flex; gap: 18px; justify-content: center; flex-wrap: wrap; margin-top: 24px; color: rgba(210, 218, 226, 0.6); font-size: 12.5px; font-weight: 600; }
        @media (max-width: 640px) { .ch-content { padding-top: 80px; } }
      `}</style>
    </section>
  );
}
