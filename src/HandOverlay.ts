import type { HandFrame } from './input/GestureEngine'

// MediaPipe hand skeleton connections.
const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

/** Small canvas that mirrors the tracked hands: instant feedback on tracking. */
export class HandOverlay {
  private ctx: CanvasRenderingContext2D

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
  }

  draw(frame: HandFrame): void {
    const { ctx, canvas } = this
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    for (const side of ['left', 'right'] as const) {
      const hand = frame[side]
      if (!hand) continue
      const color = side === 'right' ? '#7cc4ff' : '#ff9ad5'
      const lm = hand.landmarks
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      for (const [a, b] of BONES) {
        ctx.moveTo(lm[a].x * w, lm[a].y * h)
        ctx.lineTo(lm[b].x * w, lm[b].y * h)
      }
      ctx.stroke()
      ctx.fillStyle = hand.pinching ? '#ffffff' : color
      ctx.globalAlpha = 1
      for (const p of lm) {
        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}
