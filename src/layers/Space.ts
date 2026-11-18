import * as THREE from 'three'
import { Layer, SIZE_GLSL } from './Layer'

const BOX = 100

const VERTEX = /* glsl */ `
  ${SIZE_GLSL}
  uniform float uTime;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Stars drift toward the camera and wrap around: an endless fly-through.
    vec3 p = position;
    p.z = mod(p.z + uTime * 1.2 + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)};
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    vColor = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.85, 0.7), aSeed);
    vAlpha = (0.55 + 0.45 * sin(uTime * 3.0 + aSeed * 90.0)) * 0.9;
    gl_PointSize = pointSize(0.12 + aSeed * 0.2, mv.z);
  }
`

export class Space extends Layer {
  constructor(count = 6000) {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * BOX
      positions[i * 3 + 1] = (Math.random() - 0.5) * BOX
      positions[i * 3 + 2] = (Math.random() - 0.5) * BOX
      seed[i] = Math.random()
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    super(VERTEX, geometry, {})
  }

  override update(time: number, dt: number): void {
    super.update(time, dt)
    this.group.rotation.z += dt * 0.01
  }
}
