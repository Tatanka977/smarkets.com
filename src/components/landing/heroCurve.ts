import * as THREE from "three";

// mulberry32 — a small, well-known deterministic PRNG. Same seed always
// produces the exact same sequence, so the curve looks identical on every
// page load instead of reshuffling into a confusing new shape each visit.
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

// Sum of three uniform draws approximates a bell curve — cheap, and looks
// like natural price noise instead of the harsher, jumpier look flat
// uniform noise produces for a "random walk".
function bellish(rand: () => number): number {
  return (rand() + rand() + rand() - 1.5) / 1.5;
}

const CURVE_SEED = 20260803;
const POINT_COUNT = 48;
const DRIFT = 0.55; // average upward step per point — the long-term trend
const VOLATILITY = 1.1; // typical size of an up/down step
const DIP_CHANCE = 0.12; // odds any given step is a larger pullback
const DIP_SIZE = 2.2; // how big a pullback step is when one happens
const DEPTH_PER_POINT = 42 / (POINT_COUNT - 1); // how far the curve travels in Z per point

// Deterministic (seeded) points that trend upward overall but never move
// in a straight line or an evenly-spaced zigzag — most steps are small
// random ups (or occasionally downs) around a positive drift, with
// periodic larger pullbacks, the same shape a real "random walk with
// drift" price series has. Z increases steadily so the curve also travels
// "forward" as it climbs, giving the camera an actual 3D path to move
// along rather than a flat vertical line.
export function generateCurvePoints(): THREE.Vector3[] {
  const rand = mulberry32(CURVE_SEED);
  const points: THREE.Vector3[] = [];
  let y = 0;
  for (let i = 0; i < POINT_COUNT; i++) {
    const isDip = rand() < DIP_CHANCE;
    const step = isDip ? -DIP_SIZE * (0.5 + rand() * 0.5) : DRIFT + bellish(rand) * VOLATILITY;
    y += step;
    const x = bellish(rand) * 1.6;
    const z = i * DEPTH_PER_POINT;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

export function buildHeroCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(generateCurvePoints(), false, "catmullrom", 0.5);
}

export interface HeroHotspot {
  t: number;
  label: string;
}

// Real, shipped features only. Each sits at a fixed arc-length position
// (t, 0-1) along the curve; the final stop isn't a feature callout but
// the actual navigation destination (Open Terminal / Blog), handled
// separately in Hero3DScene since it renders two real buttons, not a
// single labeled hotspot.
export const HERO_HOTSPOTS: HeroHotspot[] = [
  { t: 0.16, label: "Live Market Data" },
  { t: 0.33, label: "Portfolio Simulation" },
  { t: 0.5, label: "Risk Analysis" },
  { t: 0.67, label: "AI Advisor" },
  { t: 0.84, label: "Community" },
];

export const HERO_FINALE_T = 0.97;
