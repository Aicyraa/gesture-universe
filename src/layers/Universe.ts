import * as THREE from 'three'
import { Layer, SIZE_GLSL } from './Layer'

const VERTEX = /* glsl */ `
  ${SIZE_GLSL}
  uniform float uTime;
  attribute vec3 aColor;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vAlpha = 0.6 + 0.4 * sin(uTime * 1.2 + aSeed * 60.0);
    gl_PointSize = pointSize(3.0 + aSeed * 7.0, mv.z);
  }
`

export class Universe extends Layer {
  constructor(count = 700) {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const color = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const r = 50 + Math.random() * 200
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      // Cool-to-warm palette feels more cohesive than a full rainbow.
      color.setHSL(0.55 + Math.random() * 0.25 - (Math.random() < 0.2 ? 0.5 : 0), 0.75, 0.6)
      color.toArray(colors, i * 3)
      seed[i] = Math.random()
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    super(VERTEX, geometry, {})
  }

  override update(time: number, dt: number): void {
    super.update(time, dt)
    this.group.rotation.y += dt * 0.02
  }
}
