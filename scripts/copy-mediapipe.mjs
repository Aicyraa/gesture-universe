// Copies the MediaPipe Hands runtime into public/mediapipe so the app is
// self-hosted (faster start, works offline) instead of loading from a CDN.
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', '@mediapipe', 'hands')
const dest = join(root, 'public', 'mediapipe')

const files = [
  'hands.binarypb',
  'hand_landmark_lite.tflite',
  'hands_solution_packed_assets.data',
  'hands_solution_packed_assets_loader.js',
  'hands_solution_simd_wasm_bin.js',
  'hands_solution_simd_wasm_bin.wasm',
  'hands_solution_simd_wasm_bin.data',
  'hands_solution_wasm_bin.js',
  'hands_solution_wasm_bin.wasm',
]

mkdirSync(dest, { recursive: true })
for (const f of files) {
  if (existsSync(join(src, f))) cpSync(join(src, f), join(dest, f))
}
console.log(`MediaPipe assets copied to ${dest}`)
