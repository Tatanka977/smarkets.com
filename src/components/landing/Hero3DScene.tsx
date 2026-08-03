import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { buildHeroCurve, HERO_HOTSPOTS, HERO_FINALE_T } from "./heroCurve";

// Reads a --sm-* custom property's live resolved color so the WebGL scene
// (which can't consume CSS variables directly) stays in sync with the
// project's actual palette instead of a hardcoded duplicate — including
// re-reading it when the theme toggle flips [data-theme] on <html>.
function useCssColor(varName: string, fallback: string): string {
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    const read = () => {
      const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (resolved) setColor(resolved);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [varName]);
  return color;
}

const ORBIT_TURNS = 0.6;
const ORBIT_RADIUS = 7;
const CAMERA_HEIGHT_OFFSET = 2.2;
const LOOK_AHEAD = 0.045;
const LERP_FACTOR = 0.07;

// Drives the camera along (and gently orbiting around) the curve based on
// scrollTRef.current, which a plain window scroll listener updates from
// outside the R3F render loop (see Hero3DScene below) — useFrame then
// lerps toward that target every frame for smooth motion instead of
// snapping straight to the raw scroll position.
function CameraRig({ curve, scrollTRef }: { curve: THREE.CatmullRomCurve3; scrollTRef: RefObject<number> }) {
  const { camera } = useThree();
  const smoothed = useRef(0);

  useFrame(() => {
    smoothed.current = THREE.MathUtils.lerp(smoothed.current, scrollTRef.current, LERP_FACTOR);
    const t = THREE.MathUtils.clamp(smoothed.current, 0, 1);
    const point = curve.getPointAt(t);
    const lookAt = curve.getPointAt(THREE.MathUtils.clamp(t + LOOK_AHEAD, 0, 1));

    // Orbit angle rotates slowly as t advances, so the camera sweeps
    // around the curve rather than dollying straight along a flat rail.
    const orbitAngle = t * Math.PI * 2 * ORBIT_TURNS;
    camera.position.set(
      point.x + Math.cos(orbitAngle) * ORBIT_RADIUS,
      point.y + CAMERA_HEIGHT_OFFSET,
      point.z + Math.sin(orbitAngle) * ORBIT_RADIUS - 4,
    );
    camera.lookAt(lookAt);
  });

  return null;
}

function StockTube({ curve, color }: { curve: THREE.CatmullRomCurve3; color: string }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 300, 0.32, 8, false), [curve]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      {/* Unlit on purpose: no scene lights to tune (and no risk of the
          tube reading as "invisible" if lighting were ever off), and
          toneMapped=false keeps the brand color true rather than dulled
          by the renderer's default tone mapping curve. */}
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Hotspot({ curve, t, label, scrollTRef }: {
  curve: THREE.CatmullRomCurve3; t: number; label: string; scrollTRef: RefObject<number>;
}) {
  const position = useMemo(() => curve.getPointAt(t), [curve, t]);
  const [visible, setVisible] = useState(false);

  useFrame(() => {
    const shouldShow = scrollTRef.current >= t - 0.05;
    if (shouldShow !== visible) setVisible(shouldShow);
  });

  return (
    <Html position={[position.x, position.y, position.z]} center>
      {/* Real <a>, not a div+onClick — crawlable and keyboard-navigable.
          All 5 features live behind login inside /terminal, so every
          hotspot points there (same "not reachable pre-login" situation
          the brief anticipated). */}
      <a href="/terminal" className="hero3d-hotspot" data-visible={visible}>
        <span className="hero3d-hotspot-dot" />
        {label}
      </a>
    </Html>
  );
}

function HeroFinale({ curve, scrollTRef }: { curve: THREE.CatmullRomCurve3; scrollTRef: RefObject<number> }) {
  const position = useMemo(() => curve.getPointAt(HERO_FINALE_T), [curve]);
  const [visible, setVisible] = useState(false);

  useFrame(() => {
    const shouldShow = scrollTRef.current >= HERO_FINALE_T - 0.05;
    if (shouldShow !== visible) setVisible(shouldShow);
  });

  return (
    <Html position={[position.x, position.y, position.z]} center>
      <div className="hero3d-finale" data-visible={visible}>
        <a href="/terminal" className="btn btn-primary">
          Open Terminal <span className="btn-arrow">→</span>
        </a>
        <a href="/blog" className="btn btn-secondary">
          Blog
        </a>
      </div>
    </Html>
  );
}

export default function Hero3DScene({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const curve = useMemo(() => buildHeroCurve(), []);
  const scrollTRef = useRef(0);
  const accentColor = useCssColor("--sm-green", "#22C55E");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const raw = total > 0 ? -rect.top / total : 0;
      scrollTRef.current = THREE.MathUtils.clamp(raw, 0, 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [containerRef]);

  return (
    <Canvas
      camera={{ fov: 50, near: 0.1, far: 200, position: [0, 2, -10] }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <CameraRig curve={curve} scrollTRef={scrollTRef} />
      <StockTube curve={curve} color={accentColor} />
      {HERO_HOTSPOTS.map((h) => (
        <Hotspot key={h.label} curve={curve} t={h.t} label={h.label} scrollTRef={scrollTRef} />
      ))}
      <HeroFinale curve={curve} scrollTRef={scrollTRef} />
    </Canvas>
  );
}
