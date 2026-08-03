"use client";
/**
 * Scholar Bridge AI — hero 3D scene (React Three Fiber).
 *
 * Centrepiece globe (GLB) with orbiting professor cards, emails flying from the
 * laptop to the globe, floating research papers, a bobbing calendar, glowing
 * connection arcs + location markers, and a soft particle field. Blue rim /
 * purple accent lighting, HDR environment and bloom. The camera damps toward
 * the pointer for a subtle parallax.
 *
 * Everything is memoised, models are normalised via their bounding box, and the
 * object counts / DPR / bloom scale down on mobile for 60fps.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdaptiveDpr,
  Billboard,
  Environment,
  Line,
  Preload,
  RoundedBox,
  useGLTF,
} from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import React, { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

const GLOBE_RADIUS = 2.6;
const ORBIT_RADIUS = 3.8;

/** Clone a loaded GLB and normalise it to a target max-dimension, centred at origin. */
function useNormalizedModel(url: string, target: number) {
  const gltf = useGLTF(url, true); // draco enabled (uses default CDN decoder if compressed)
  return useMemo(() => {
    const obj = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = target / (Math.max(size.x, size.y, size.z) || 1);
    obj.scale.setScalar(k);
    obj.position.set(-center.x * k, -center.y * k, -center.z * k);
    obj.traverse((o) => {
      o.castShadow = false;
      o.receiveShadow = false;
    });
    return obj;
  }, [gltf.scene, target]);
}

/* ------------------------------- Globe -------------------------------- */
function Globe() {
  const base = useNormalizedModel("/models/globe.glb", GLOBE_RADIUS * 2);
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.08;
  });
  return (
    <group ref={ref}>
      <primitive object={base} />
      <GlobeExtras radius={GLOBE_RADIUS * 1.02} />
    </group>
  );
}

/** Glowing location markers + connection arcs that rotate with the globe. */
function GlobeExtras({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const rng = mulberry32(7);
    return Array.from({ length: 9 }, () => {
      const th = rng() * Math.PI * 2;
      const ph = Math.acos(rng() * 2 - 1);
      return new THREE.Vector3(
        radius * Math.sin(ph) * Math.cos(th),
        radius * Math.sin(ph) * Math.sin(th),
        radius * Math.cos(ph)
      );
    });
  }, [radius]);

  const arcs = useMemo(() => {
    const list: THREE.Vector3[][] = [];
    for (let i = 0; i < 5; i++) {
      const a = points[i];
      const b = points[(i + 4) % points.length];
      const mid = a.clone().add(b).multiplyScalar(0.5).setLength(radius * 1.4);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      list.push(curve.getPoints(48));
    }
    return list;
  }, [points, radius]);

  return (
    <>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      ))}
      {arcs.map((pts, i) => (
        <Line key={i} points={pts} color="#38bdf8" lineWidth={1} transparent opacity={0.5} toneMapped={false} />
      ))}
    </>
  );
}

/* -------------------------- Professor cards --------------------------- */
function ProfessorCards({ count }: { count: number }) {
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ a: (i / count) * Math.PI * 2, yr: i % 2 ? 0.7 : -0.5 })),
    [count]
  );
  return (
    <>
      {items.map((it, i) => (
        <ProfessorCard key={i} phase={it.a} yBase={it.yr} />
      ))}
    </>
  );
}

function ProfessorCard({ phase, yBase }: { phase: number; yBase: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.12 + phase;
    if (ref.current) {
      ref.current.position.set(Math.cos(t) * ORBIT_RADIUS, yBase + Math.sin(t * 1.3) * 0.28, Math.sin(t) * ORBIT_RADIUS);
    }
  });
  return (
    <Billboard ref={ref}>
      <RoundedBox args={[1.15, 0.72, 0.045]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#0d1420" emissive="#0a3843" emissiveIntensity={0.35} roughness={0.3} metalness={0.25} transparent opacity={0.94} />
      </RoundedBox>
      {/* avatar */}
      <mesh position={[-0.36, 0.15, 0.03]}>
        <circleGeometry args={[0.12, 28]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.7} toneMapped={false} />
      </mesh>
      {/* text bars */}
      <mesh position={[0.13, 0.19, 0.03]}><planeGeometry args={[0.5, 0.06]} /><meshBasicMaterial color="#cbd5e1" /></mesh>
      <mesh position={[0.06, 0.07, 0.03]}><planeGeometry args={[0.64, 0.045]} /><meshBasicMaterial color="#64748b" /></mesh>
      <mesh position={[0, -0.16, 0.03]}><planeGeometry args={[0.92, 0.03]} /><meshBasicMaterial color="#334155" /></mesh>
      <mesh position={[-0.2, -0.25, 0.03]}><planeGeometry args={[0.5, 0.03]} /><meshBasicMaterial color="#334155" /></mesh>
    </Billboard>
  );
}

/* ------------------------------ Emails -------------------------------- */
const LAPTOP_POS = new THREE.Vector3(-4.1, -2.2, 1.4);

function Emails({ count }: { count: number }) {
  const base = useNormalizedModel("/models/email.glb", 0.55);
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <EmailInstance key={i} base={base} idx={i} total={count} />
      ))}
    </>
  );
}

function EmailInstance({ base, idx, total }: { base: THREE.Object3D; idx: number; total: number }) {
  const obj = useMemo(() => base.clone(true), [base]);
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = (state.clock.elapsedTime * 0.22 + idx / total) % 1;
    const p = LAPTOP_POS.clone().lerp(new THREE.Vector3(0, 0, 0), t);
    p.y += Math.sin(t * Math.PI) * 1.4;
    if (ref.current) {
      ref.current.position.copy(p);
      ref.current.rotation.set(0.2, t * Math.PI * 2, Math.sin(t * 6) * 0.15);
      const s = 1 - t * 0.5;
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <group ref={ref}>
      <primitive object={obj} />
    </group>
  );
}

/* --------------------------- Research papers -------------------------- */
function Papers({ count }: { count: number }) {
  const p1 = useNormalizedModel("/models/paper.glb", 0.85);
  const p2 = useNormalizedModel("/models/paper2.glb", 0.85);
  const bases = [p1, p2];
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <PaperInstance key={i} base={bases[i % 2]} idx={i} total={count} />
      ))}
    </>
  );
}

function PaperInstance({ base, idx, total }: { base: THREE.Object3D; idx: number; total: number }) {
  const obj = useMemo(() => base.clone(true), [base]);
  const ref = useRef<THREE.Group>(null);
  const angle = (idx / total) * Math.PI * 2;
  const x = Math.cos(angle) * 4.6;
  const z = Math.sin(angle) * 2.4 - 1;
  useFrame((state) => {
    const t = (state.clock.elapsedTime * 0.12 + idx / total) % 1;
    if (ref.current) {
      ref.current.position.set(x, -2.4 + t * 5, z);
      ref.current.rotation.y = state.clock.elapsedTime * 0.4 + angle;
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.6 + idx) * 0.2;
      const op = Math.sin(t * Math.PI);
      ref.current.scale.setScalar(0.6 + op * 0.4);
    }
  });
  return (
    <group ref={ref}>
      <primitive object={obj} />
    </group>
  );
}

/* ------------------------- Calendar + laptop -------------------------- */
function CalendarModel() {
  const base = useNormalizedModel("/models/calendar.glb", 1.1);
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 2.5 + Math.sin(state.clock.elapsedTime * 1.1) * 0.18;
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.3;
    }
  });
  return (
    <group ref={ref} position={[3.6, 2.5, -0.5]}>
      <primitive object={base} />
    </group>
  );
}

function LaptopModel() {
  const base = useNormalizedModel("/models/laptop.glb", 1.9);
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.position.y = LAPTOP_POS.y + Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
  });
  return (
    <group ref={ref} position={[LAPTOP_POS.x, LAPTOP_POS.y, LAPTOP_POS.z]} rotation={[0, 0.5, 0]}>
      <primitive object={base} />
    </group>
  );
}

/* ------------------------------ Particles ----------------------------- */
function Particles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    const rng = mulberry32(42);
    for (let i = 0; i < count; i++) {
      const r = 4 + rng() * 7;
      const th = rng() * Math.PI * 2;
      const ph = Math.acos(rng() * 2 - 1);
      arr[i * 3] = r * Math.sin(ph) * Math.cos(th);
      arr[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      arr[i * 3 + 2] = r * Math.cos(ph);
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [count]);
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.02;
      ref.current.rotation.x += dt * 0.008;
    }
  });
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.035} color="#38bdf8" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

/* ------------------------ Lighting + camera rig ----------------------- */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[-6, 4, -3]} intensity={1.3} color="#38bdf8" />
      <pointLight position={[5, -2, 3]} intensity={45} distance={22} color="#8b5cf6" />
      <pointLight position={[0, 3, 5]} intensity={22} distance={20} color="#22d3ee" />
    </>
  );
}

function Rig() {
  const { camera, pointer } = useThree();
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 2.2);
    camera.position.x += (pointer.x * 1.1 - camera.position.x) * k;
    camera.position.y += (pointer.y * 0.7 + 0.3 - camera.position.y) * k;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ------------------------------- Scene -------------------------------- */
export default function HeroScene({ mobile = false }: { mobile?: boolean }) {
  return (
    <Canvas
      dpr={[1, mobile ? 1.5 : 2]}
      camera={{ position: [0, 0.3, 10], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop="always"
    >
      <Suspense fallback={null}>
        <Environment preset="city" />
        <Lights />
        <Globe />
        <ProfessorCards count={mobile ? 3 : 6} />
        <Emails count={mobile ? 2 : 5} />
        <Papers count={mobile ? 2 : 5} />
        <CalendarModel />
        <LaptopModel />
        <Particles count={mobile ? 260 : 900} />
        <Preload all />
      </Suspense>
      <Rig />
      {!mobile && (
        <EffectComposer>
          <Bloom intensity={0.85} luminanceThreshold={0.25} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      )}
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}

/* Deterministic RNG so marker/particle layout is stable across renders. */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Warm the smaller models (not the 33MB globe — let Suspense stream that).
useGLTF.preload("/models/email.glb");
useGLTF.preload("/models/paper.glb");
useGLTF.preload("/models/paper2.glb");
useGLTF.preload("/models/calendar.glb");
useGLTF.preload("/models/laptop.glb");
