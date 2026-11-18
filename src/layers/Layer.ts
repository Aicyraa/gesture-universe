import * as THREE from 'three'

/** Fragment shader shared by every layer: soft round glow, no texture lookup. */
const FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
  }
`

export interface ViewUniforms {
  pixelRatio: number
  viewHeight: number
}

/**
 * A renderable cosmic layer. Each layer owns one Points object driven entirely
 * by a vertex shader (animation, twinkle and size attenuation run on the GPU).
 * Layers fade through `opacity`, so mode transitions are cross-fades.
 */
export abstract class Layer {
  readonly group = new THREE.Group()
  protected material: THREE.ShaderMaterial
  protected geometry: THREE.BufferGeometry
  protected points: THREE.Points

  constructor(
    vertexShader: string,
    geometry: THREE.BufferGeometry,
    uniforms: Record<string, THREE.IUniform>,
  ) {
    this.geometry = geometry
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uPixelRatio: { value: 1 },
        uViewHeight: { value: 1 },
        ...uniforms,
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.points = new THREE.Points(geometry, this.material)
    this.points.frustumCulled = false
    this.group.add(this.points)
    this.group.visible = false
  }

  setView({ pixelRatio, viewHeight }: ViewUniforms): void {
    this.material.uniforms.uPixelRatio.value = pixelRatio
    this.material.uniforms.uViewHeight.value = viewHeight
  }

  /** Opacity 0..1. Hidden layers are skipped by both update and render. */
  setOpacity(opacity: number): void {
    this.material.uniforms.uOpacity.value = opacity
    this.group.visible = opacity > 0.005
  }

  get active(): boolean {
    return this.group.visible
  }

  update(time: number, _dt: number): void {
    this.material.uniforms.uTime.value = time
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}

/** Common GLSL for perspective-correct point sizing. */
export const SIZE_GLSL = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uViewHeight;
  float pointSize(float size, float viewZ) {
    return max(size * uPixelRatio * (uViewHeight * 0.5) / -viewZ, 1.0);
  }
`
