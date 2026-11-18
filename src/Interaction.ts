import type { HandFrame, HandState, Gesture } from './input/GestureEngine'
import type { Mode, World } from './World'

const GESTURE_MODE: Partial<Record<Gesture, Mode>> = {
  palm: 'universe',
  fist: 'galaxy',
  victory: 'space',
}

const ROTATE_GAIN = { x: Math.PI * 3, y: Math.PI * 2 }
const ZOOM_GAIN = 2.2

/**
 * Maps hand frames (and mouse/touch as a fallback) onto the World.
 *  Right hand: stable gesture switches mode.
 *  Left hand : open palm drags to rotate (with inertia), pinch + move up/down
 *              zooms, fist collapses the scene.
 * All motion is delta-based, so it does not depend on camera frame rate.
 */
export class Interaction {
  private prevPalm: { x: number; y: number } | null = null
  private prevKind: 'rotate' | 'zoom' | null = null

  constructor(private world: World) {
    this.bindPointer()
  }

  handleFrame(frame: HandFrame): string {
    const parts: string[] = []

    const r = frame.right
    if (r) {
      parts.push(`Right · ${r.gesture}`)
      const mode = GESTURE_MODE[r.gesture]
      if (mode && mode !== this.world.mode) this.world.setMode(mode)
    }

    const l = frame.left
    if (l) parts.push(`Left · ${this.describeLeft(l)}`)
    else this.endLeft()

    return parts.length ? parts.join('   ') : 'Looking for hands…'
  }

  private describeLeft(l: HandState): string {
    if (l.gesture === 'fist' && !l.pinching) {
      this.world.setCollapsed(true)
      this.prevPalm = null
      this.prevKind = null
      return 'collapsing'
    }
    this.world.setCollapsed(false)

    const kind = l.pinching ? 'zoom' : l.gesture === 'palm' ? 'rotate' : null
    if (!kind) {
      this.prevPalm = null
      this.prevKind = null
      return l.gesture
    }
    if (this.prevPalm && this.prevKind === kind) {
      const dx = l.palm.x - this.prevPalm.x
      const dy = l.palm.y - this.prevPalm.y
      if (kind === 'rotate') this.world.rotateBy(dx * ROTATE_GAIN.x, dy * ROTATE_GAIN.y)
      else this.world.zoomBy(dy * ZOOM_GAIN) // hand up = closer
    }
    this.prevPalm = { ...l.palm }
    this.prevKind = kind
    return kind === 'rotate' ? 'rotating' : 'zooming'
  }

  private endLeft(): void {
    this.world.setCollapsed(false)
    this.prevPalm = null
    this.prevKind = null
  }

  /** Mouse / touch fallback so the app works without a camera. */
  private bindPointer(): void {
    let last: { x: number; y: number } | null = null
    const el = window
    el.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('#controls')) return
      last = { x: e.clientX, y: e.clientY }
    })
    el.addEventListener('pointermove', (e) => {
      if (!last) return
      const dx = (e.clientX - last.x) / window.innerWidth
      const dy = (e.clientY - last.y) / window.innerHeight
      last = { x: e.clientX, y: e.clientY }
      this.world.rotateBy(dx * ROTATE_GAIN.x, dy * ROTATE_GAIN.y)
    })
    const end = () => (last = null)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    el.addEventListener(
      'wheel',
      (e) => this.world.zoomBy(Math.sign(e.deltaY) * 0.08),
      { passive: true },
    )
    window.addEventListener('keydown', (e) => {
      const m: Mode | undefined = ({ '1': 'universe', '2': 'galaxy', '3': 'space' } as const)[
        e.key as '1' | '2' | '3'
      ]
      if (m) this.world.setMode(m)
    })
  }
}
