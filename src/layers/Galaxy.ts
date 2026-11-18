import * as THREE from 'three'
import { Layer, SIZE_GLSL } from './Layer'

export interface GalaxyParams {
  count: number
  size: number
  radius: number
  branches: number
  spin: number
  randomness: number
  randomnessPower: number
  insideColor: string
  outsideColor: string
}

const VERTEX = /* glsl */ `
  ${SIZE_GLSL}
  uniform float uTime;
  uniform float uSize;
  uniform float uSpin;
  uniform float uRadius;
  uniform vec3 uInside;
  uniform vec3 uOutside;
  attribute float aRadius;
  attribute float aBranch;
  attribute float aSeed;
  attribute vec3 aRand;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Differential rotation: inner stars orbit faster, all on the GPU.
    float angle = aBranch + aRadius * uSpin + uTime * 0.6 / (0.8 + aRadius);
    vec3 p = vec3(cos(angle) * aRadius, 0.0, sin(angle) * aRadius) + aRand;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float t = aRadius / uRadius;
    vColor = mix(uInside, uOutside, t) * (1.0 + (1.0 - t) * 0.8);
    float twinkle = 0.7 + 0.3 * sin(uTime * 2.0 + aSeed * 40.0);
    vAlpha = twinkle * mix(1.0, 0.6, t);
    gl_PointSize = pointSize(uSize * (0.6 + aSeed * 1.2), mv.z);
  }
`

export class Galaxy extends Layer {
  readonly params: GalaxyParams

  constructor(params: Partial<GalaxyParams> = {}) {
    const p: GalaxyParams = {
      count: 40000,
      size: 0.05,
      radius: 5,
      branches: 3,
      spin: 1,
      randomness: 0.2,
      randomnessPower: 3,
      insideColor: '#ff6030',
      outsideColor: '#1b3984',
      ...params,
    }

    const geometry = new THREE.BufferGeometry()
    const radius = new Float32Array(p.count)
    const branch = new Float32Array(p.count)
    const seed = new Float32Array(p.count)
    const rand = new Float32Array(p.count * 3)
    // Dummy positions so three.js knows the draw count.
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p.count * 3), 3))

    const jitter = (r: number) =>
      Math.pow(Math.random(), p.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * p.randomness * r

    for (let i = 0; i < p.count; i++) {
      // Slight bias toward the core gives a bright bulge.
      const r = Math.pow(Math.random(), 1.4) * p.radius
      radius[i] = r
      branch[i] = ((i % p.branches) / p.branches) * Math.PI * 2
      seed[i] = Math.random()
      rand[i * 3] = jitter(r)
      rand[i * 3 + 1] = jitter(r) * 0.7
      rand[i * 3 + 2] = jitter(r)
    }
    geometry.setAttribute('aRadius', new THREE.BufferAttribute(radius, 1))
    geometry.setAttribute('aBranch', new THREE.BufferAttribute(branch, 1))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 3))

    super(VERTEX, geometry, {
      uSize: { value: p.size },
      uSpin: { value: p.spin },
      uRadius: { value: p.radius },
      uInside: { value: new THREE.Color(p.insideColor) },
      uOutside: { value: new THREE.Color(p.outsideColor) },
    })
    this.params = p
  }
}
