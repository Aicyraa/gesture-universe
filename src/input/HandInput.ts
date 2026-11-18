import { Hands, type Results } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import type { HandFrame } from './GestureEngine'
import { GestureEngine } from './GestureEngine'

export type HandCallback = (frame: HandFrame) => void

/** Wraps MediaPipe Hands + the webcam and emits processed HandFrames. */
export class HandInput {
  private hands: Hands
  private camera: Camera
  private engine = new GestureEngine()
  private callback: HandCallback | null = null

  constructor(video: HTMLVideoElement) {
    this.hands = new Hands({
      // Self-hosted (see scripts/copy-mediapipe.mjs): fast and works offline.
      locateFile: (file) => `${import.meta.env.BASE_URL}mediapipe/${file}`,
    })
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0, // lite model: plenty accurate for these gestures, much faster
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    })
    this.hands.onResults((r) => this.handleResults(r))

    this.camera = new Camera(video, {
      onFrame: async () => {
        await this.hands.send({ image: video })
      },
      width: 480,
      height: 360,
    })
  }

  onFrame(cb: HandCallback): void {
    this.callback = cb
  }

  /** Resolves once the camera is running; rejects if permission is denied. */
  async start(): Promise<void> {
    await this.camera.start()
  }

  private handleResults(results: Results): void {
    const hands = (results.multiHandLandmarks ?? []).map((landmarks, i) => ({
      landmarks,
      label: results.multiHandedness?.[i]?.label ?? 'Right',
    }))
    this.callback?.(this.engine.process(hands, performance.now()))
  }
}
