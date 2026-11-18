/**
 * Pure gesture logic (no DOM / MediaPipe imports) so it is easy to test.
 *
 * Accuracy measures:
 *  - 3D distances normalized by palm size (scale-invariant w.r.t. camera distance)
 *  - per-finger hysteresis (separate extend / curl thresholds)
 *  - landmark smoothing with a frame-rate independent exponential filter
 *  - gesture debouncing: a gesture must be held for HOLD_MS before it is "stable"
 *  - short dropout grace so a lost frame does not reset state
 */

export interface Point3 {
  x: number
  y: number
  z: number
}

export type Gesture = 'palm' | 'fist' | 'victory' | 'unknown'
export type Side = 'left' | 'right'

export interface HandState {
  /** Debounced gesture. */
  gesture: Gesture
  /** Gesture currently being detected but not yet stable. */
  candidate: Gesture
  /** 0..1 progress of candidate towards becoming the stable gesture. */
  holdProgress: number
  pinching: boolean
  /** Thumb-index distance / palm size. ~0.2 touching, ~1.2 fully open. */
  pinchRatio: number
  /** Smoothed, mirrored palm centre in 0..1 screen space (x right, y down). */
  palm: { x: number; y: number }
  /** Smoothed, mirrored landmarks for drawing. */
  landmarks: Point3[]
}

export interface HandFrame {
  left: HandState | null
  right: HandState | null
}

export const HOLD_MS = 350
const DROPOUT_MS = 250
const SMOOTH_RATE = 22 // 1/s, higher = snappier
const EXTEND_ON = 1.6
const EXTEND_OFF = 1.35
const PINCH_ON = 0.32
const PINCH_OFF = 0.5

const FINGERS = [
  { tip: 8, mcp: 5 },
  { tip: 12, mcp: 9 },
  { tip: 16, mcp: 13 },
  { tip: 20, mcp: 17 },
]

const dist3 = (a: Point3, b: Point3): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

class HandTracker {
  private smooth: Point3[] | null = null
  private extended = [false, false, false, false]
  private pinching = false
  private stable: Gesture = 'unknown'
  private candidate: Gesture = 'unknown'
  private candidateSince = 0
  lastSeen = 0

  update(raw: Point3[], now: number, dt: number): HandState {
    this.lastSeen = now

    // Mirror x so the result matches what a user sees on a selfie display.
    const mirrored = raw.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z }))
    const alpha = 1 - Math.exp(-SMOOTH_RATE * dt)
    if (!this.smooth) {
      this.smooth = mirrored
    } else {
      const s = this.smooth
      for (let i = 0; i < mirrored.length; i++) {
        s[i].x += (mirrored[i].x - s[i].x) * alpha
        s[i].y += (mirrored[i].y - s[i].y) * alpha
        s[i].z += (mirrored[i].z - s[i].z) * alpha
      }
    }
    const lm = this.smooth

    // Palm size: wrist -> middle MCP. Scales with hand-to-camera distance.
    const palmSize = Math.max(dist3(lm[0], lm[9]), 1e-4)

    FINGERS.forEach((f, i) => {
      const ratio = dist3(lm[f.tip], lm[0]) / Math.max(dist3(lm[f.mcp], lm[0]), 1e-4)
      if (ratio > EXTEND_ON) this.extended[i] = true
      else if (ratio < EXTEND_OFF) this.extended[i] = false
    })

    const pinchRatio = dist3(lm[4], lm[8]) / palmSize
    if (pinchRatio < PINCH_ON) this.pinching = true
    else if (pinchRatio > PINCH_OFF) this.pinching = false

    const [index, middle, ring, pinky] = this.extended
    const count = this.extended.filter(Boolean).length
    let raw_gesture: Gesture = 'unknown'
    if (count === 0) raw_gesture = 'fist'
    else if (count === 4) raw_gesture = 'palm'
    else if (index && middle && !ring && !pinky) raw_gesture = 'victory'

    // Debounce.
    if (raw_gesture !== this.candidate) {
      this.candidate = raw_gesture
      this.candidateSince = now
    }
    let holdProgress = 0
    if (this.candidate === this.stable) {
      holdProgress = 1
    } else {
      holdProgress = Math.min((now - this.candidateSince) / HOLD_MS, 1)
      if (holdProgress >= 1) this.stable = this.candidate
    }

    return {
      gesture: this.stable,
      candidate: this.candidate,
      holdProgress,
      pinching: this.pinching,
      pinchRatio,
      palm: { x: lm[9].x, y: lm[9].y },
      landmarks: lm,
    }
  }
}

export class GestureEngine {
  private trackers: Record<Side, HandTracker> = {
    left: new HandTracker(),
    right: new HandTracker(),
  }
  private last: HandFrame = { left: null, right: null }
  private lastTime = 0

  /**
   * @param hands detected hands with MediaPipe's handedness label.
   * @param now   timestamp in ms
   *
   * MediaPipe assumes a *mirrored* input image. We feed the raw (un-mirrored)
   * camera frame, so the labels are swapped: its "Left" is the user's right hand.
   */
  process(hands: { landmarks: Point3[]; label: string }[], now: number): HandFrame {
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.1) : 1 / 30
    this.lastTime = now
    const next: HandFrame = { left: null, right: null }
    const taken = new Set<Side>()

    // Highest-confidence ordering is preserved by MediaPipe; first hand wins per side.
    for (const h of hands) {
      const side: Side = h.label === 'Left' ? 'right' : 'left'
      if (taken.has(side)) continue
      taken.add(side)
      next[side] = this.trackers[side].update(h.landmarks, now, dt)
    }

    for (const side of ['left', 'right'] as Side[]) {
      if (!next[side]) {
        const prev = this.last[side]
        if (prev && now - this.trackers[side].lastSeen < DROPOUT_MS) {
          next[side] = prev // brief dropout: keep previous state
        } else {
          this.trackers[side] = new HandTracker()
        }
      }
    }
    this.last = next
    return next
  }
}
