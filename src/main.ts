import '../style.css'
import { World, type Mode } from './World'
import { HandInput } from './input/HandInput'
import { Interaction } from './Interaction'
import { HandOverlay } from './HandOverlay'

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T

const world = new World(document.body)
const interaction = new Interaction(world)
const overlay = new HandOverlay($<HTMLCanvasElement>('hand-overlay'))
const statusEl = $('status')
const ring = $('hold-ring')
const ringArc = ring.querySelector<SVGCircleElement>('.arc')!
const ARC_LEN = 2 * Math.PI * 16

function setActiveButton(mode: Mode): void {
  document.querySelectorAll('.control-btn').forEach((b) => {
    b.classList.toggle('active', b.id === `btn-${mode}`)
  })
}
setActiveButton(world.mode)
world.onModeChange = setActiveButton

for (const mode of ['universe', 'galaxy', 'space'] as const) {
  $(`btn-${mode}`).addEventListener('click', () => world.setMode(mode))
}

world.start()

// Hand tracking is optional: mouse/touch/keyboard always work.
const input = new HandInput($<HTMLVideoElement>('input-video'))
input.onFrame((frame) => {
  statusEl.textContent = interaction.handleFrame(frame)
  statusEl.classList.toggle('live', !!(frame.left || frame.right))
  overlay.draw(frame)

  // Hold ring shows the right hand's gesture being confirmed.
  const r = frame.right
  const progress = r && r.candidate !== r.gesture ? r.holdProgress : 0
  ring.classList.toggle('visible', progress > 0)
  ringArc.style.strokeDashoffset = String(ARC_LEN * (1 - progress))
})

statusEl.textContent = 'Starting camera…'
input
  .start()
  .then(() => (statusEl.textContent = 'Looking for hands…'))
  .catch(() => {
    statusEl.textContent = 'Camera unavailable · drag to rotate, scroll to zoom, keys 1-3 to switch'
    $('hand-panel').classList.add('hidden')
  })
