import './style.css'
import { World } from './src/World.js'
import { HandInput } from './src/HandInput.js'

// Initialize World
const world = new World(document.body);
world.animate();

// Initialize Hand Input
const videoElement = document.getElementById('input-video');
const handInput = new HandInput(videoElement);

handInput.setResultCallback((output) => {
    const statusEl = document.getElementById('status');
    let statusText = '';

    // RIGHT HAND: Mode Switching
    if (output.right) {
        const gesture = output.right.gesture;
        const handedness = "Right";
        statusText += `[${handedness}: ${gesture}] `;

        if (gesture === 'palm') {
            if (world.currentMode !== 'universe') world.switchMode('universe');
        } else if (gesture === 'fist') {
            if (world.currentMode !== 'galaxy') world.switchMode('galaxy');
        } else if (gesture === 'victory') {
            if (world.currentMode !== 'space') world.switchMode('space');
        }
    }

    // LEFT HAND: Interaction
    if (output.left) {
         const gesture = output.left.gesture;
         const handedness = "Left";
         statusText += `[${handedness}: ${gesture}] `;
         
         // Zoom (Pinch)
         // Prioritize Pinch if distance is small? Or just always pass pinch distance if available?
         // output.left always has pinchDistance
         
         const pinch = output.left.pinchDistance;
         // Heuristic: If pinch is significant, Zoom.
         // If gesture is Open Palm, Rotate.
         // If gesture is Fist, Collapse.
         
         if (gesture === 'fist') {
             world.collapse();
             statusText += "(Collapsing) ";
         } else if (gesture === 'palm') {
             // Rotate
             const pos = output.left.position;
             world.setRotation(pos.x, pos.y);
             statusText += "(Rotating) ";
         } else {
             // Check Pinch for Zoom
             // Typically pinch < 0.1 is close. 
             // We'll pass it continuously if not Fist.
             world.setZoom(pinch);
             statusText += "(Zooming) ";
         }
    }

    if (!output.left && !output.right) {
        statusText = 'Looking for hands...';
    }

    statusEl.innerText = statusText;
});

handInput.start();

console.log('App initialized');

// UI Controls
document.getElementById('btn-space').addEventListener('click', () => {
    world.switchMode('space');
});
document.getElementById('btn-galaxy').addEventListener('click', () => {
    world.switchMode('galaxy');
});
document.getElementById('btn-universe').addEventListener('click', () => {
    world.switchMode('universe');
});

// Expose world for debugging
window.world = world;
