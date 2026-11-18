import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { Layer } from './layers/Layer'
import { Galaxy } from './layers/Galaxy'
import { Space } from './layers/Space'
import { Universe } from './layers/Universe'

export type Mode = 'universe' | 'galaxy' | 'space'

const CAMERA: Record<Mode, THREE.Vector3> = {
  universe: new THREE.Vector3(0, 0, 100),
  galaxy: new THREE.Vector3(0, 5, 10),
  space: new THREE.Vector3(0, 0, 10),
}

/** Frame-rate independent exponential smoothing factor. */
const damp = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt)

export class World {
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer
  private bloom: UnrealBloomPass
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private clock = new THREE.Clock()
  /** Everything that user input rotates/scales lives here. */
  private content = new THREE.Group()
  private layers: Record<Mode, Layer>
  private weights: Record<Mode, number> = { universe: 0, galaxy: 0, space: 0 }

  private camPos = CAMERA.universe.clone()
  private camTarget = CAMERA.universe.clone()
  private rotTarget = { x: 0, y: 0 }
  private zoomTarget = 0 // -1 (close) .. 1 (far)
  private zoom = 0
  private scaleTarget = 1
  private idle = 0
  private pixelRatio: number
  private running = false

  mode: Mode = 'universe'
  onModeChange: ((mode: Mode) => void) | null = null

  constructor(container: HTMLElement) {
    this.pixelRatio = Math.min(window.devicePixelRatio, 1.5)

    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // additive points + bloom: MSAA only adds overdraw cost
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000)
    this.camera.position.copy(this.camPos)

    this.scene.background = new THREE.Color(0x02030a)
    this.scene.add(this.content)

    this.layers = {
      universe: new Universe(),
      galaxy: new Galaxy(),
      space: new Space(),
    }
    for (const layer of Object.values(this.layers)) this.content.add(layer.group)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.9, // strength
      0.6, // radius
      0.1, // threshold
    )
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())

    this.applyView()
    window.addEventListener('resize', this.onResize)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.setMode('universe', false)
    this.weights.universe = 1
  }

  setMode(mode: Mode, notify = true): void {
    if (mode === this.mode && notify) return
    this.mode = mode
    this.camTarget.copy(CAMERA[mode])
    this.rotTarget.x = 0
    this.rotTarget.y = 0
    this.zoomTarget = 0
    if (notify) this.onModeChange?.(mode)
  }

  /** Rotate by a delta in radians (inertia comes from damping). */
  rotateBy(dx: number, dy: number): void {
    this.rotTarget.y += dx
    this.rotTarget.x = THREE.MathUtils.clamp(this.rotTarget.x + dy, -1.3, 1.3)
    this.idle = 0
  }

  /** Zoom by a delta in log space: positive = further away. */
  zoomBy(delta: number): void {
    this.zoomTarget = THREE.MathUtils.clamp(this.zoomTarget + delta, -1, 1)
    this.idle = 0
  }

  setCollapsed(collapsed: boolean): void {
    this.scaleTarget = collapsed ? 0.15 : 1
    this.idle = 0
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.clock.start()
    this.renderer.setAnimationLoop(this.tick)
  }

  private onVisibility = (): void => {
    if (document.hidden) this.renderer.setAnimationLoop(null)
    else if (this.running) {
      this.clock.getDelta() // discard the time spent hidden
      this.renderer.setAnimationLoop(this.tick)
    }
  }

  private applyView(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.composer.setPixelRatio(this.pixelRatio)
    this.composer.setSize(w, h)
    this.bloom.resolution.set(w, h)
    for (const layer of Object.values(this.layers)) {
      layer.setView({ pixelRatio: this.pixelRatio, viewHeight: h })
    }
  }

  private onResize = (): void => this.applyView()

  private tick = (): void => {
    const dt = Math.min(this.clock.getDelta(), 0.1)
    const time = this.clock.elapsedTime

    // Cross-fade layers; the incoming layer scales down into place and the
    // outgoing one scales up and away, which reads as flying through.
    for (const m of Object.keys(this.layers) as Mode[]) {
      const target = m === this.mode ? 1 : 0
      const w = this.weights[m]
      this.weights[m] = Math.abs(target - w) < 0.002 ? target : w + (target - w) * damp(3.2, dt)
      const layer = this.layers[m]
      const eased = this.weights[m] * this.weights[m] * (3 - 2 * this.weights[m])
      layer.setOpacity(eased)
      if (layer.active) {
        const outgoing = m !== this.mode
        layer.group.scale.setScalar(outgoing ? 1 + (1 - eased) * 0.6 : 1.35 - 0.35 * eased)
        layer.update(time, dt)
      }
    }

    // Gentle idle drift when nobody is interacting.
    this.idle += dt
    if (this.idle > 4) this.rotTarget.y += dt * 0.04

    this.zoom += (this.zoomTarget - this.zoom) * damp(5, dt)
    const dist = Math.exp(this.zoom * 0.9)
    const goal = this.camTarget
    const k = damp(2.4, dt)
    this.camPos.lerp(goal, k)
    this.camera.position.set(this.camPos.x, this.camPos.y, this.camPos.z)
    this.camera.position.multiplyScalar(dist)
    this.camera.lookAt(0, 0, 0)

    const r = damp(6, dt)
    this.content.rotation.x += (this.rotTarget.x - this.content.rotation.x) * r
    this.content.rotation.y += (this.rotTarget.y - this.content.rotation.y) * r
    const s = this.content.scale.x + (this.scaleTarget - this.content.scale.x) * damp(5, dt)
    this.content.scale.setScalar(s)

    this.composer.render(dt)
  }
}
