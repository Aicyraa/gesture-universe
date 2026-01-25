import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export class HandInput {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.hands = null;
    this.camera = null;
    this.onResults = null;
    
    this.init();
  }

  init() {
    this.hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.handleResults.bind(this));

    if (this.videoElement) {
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({image: this.videoElement});
            },
            width: 640,
            height: 480
        });
        
        // We'll start the camera when requested
    }
  }

  start() {
    if (this.camera) {
        this.camera.start();
    }
  }

  handleResults(results) {
    const output = {
        left: null,
        right: null
    };

    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i];
            const label = handedness.label.toLowerCase(); // 'left' or 'right'
            
            // Generate hand data
            const gesture = this.detectGesture(landmarks);
            const pinchDistance = this.calculatePinch(landmarks);
            const position = landmarks[9]; // Middle finger MCP (center of palm approx)

            output[label] = {
                gesture,
                pinchDistance,
                position
            };
        }
    }

    if (this.onResults) {
        this.onResults(output);
    }
  }

  setResultCallback(callback) {
    this.onResults = callback;
  }

  calculatePinch(landmarks) {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      return this.dist(thumbTip, indexTip);
  }

  detectGesture(landmarks) {
    // Simple finger counting
    // Landmarks:
    // 0: Wrist
    // 4: Thumb tip
    // 8: Index tip
    // 12: Middle tip
    // 16: Ring tip
    // 20: Pinky tip
    
    // Check if fingers are extended
    // For non-thumb fingers, tip y should be less than lower joint y (in screen coords, y is down, so tip < joint means up)
    // But hands can be rotated. 
    // A robust way without rotation normalization is distance from wrist.
    // If distance(tip, wrist) > distance(lower_joint, wrist), it's likely extended.
    
    const wrist = landmarks[0];
    const tips = [8, 12, 16, 20];
    const bases = [5, 9, 13, 17]; // MCP joints
    
    let extendedFingers = 0;
    
    // Check non-thumb fingers
    for (let i = 0; i < 4; i++) {
        const tip = landmarks[tips[i]];
        const base = landmarks[bases[i]];
        
        // Simple distance check from wrist might fail if hand is bent
        // Let's use distance check: Tip to Wrist vs Base to Wrist
        const dTip = this.dist(tip, wrist);
        const dBase = this.dist(base, wrist);
        
        if (dTip > dBase * 1.2) { // 1.2 threshold
            extendedFingers++;
        }
    }
    
    // Thumb check (bit harder, check x distance from pinky base or just general off-axis)
    // For simplicity, let's just count 4 fingers for now or treat Thumb specifically
    // Let's just use 0, 1, 2, 3, 4, 5 logic roughly.
    
    const thumbTip = landmarks[4];
    const thumbBase = landmarks[2];
    const dThumbTip = this.dist(thumbTip, wrist);
    const dThumbBase = this.dist(thumbBase, wrist);
    if (dThumbTip > dThumbBase * 1.1) {
         extendedFingers++;
    }

    // Pinch heuristic for gesture
    // If pinch is very close, we might want to call it a 'pinch' gesture, 
    // but we are calculating continuous pinch distance separately.
    // So we'll keep the discrete gestures simple.

    if (extendedFingers <= 1) return 'fist'; 
    if (extendedFingers >= 4) return 'palm'; 
    if (extendedFingers === 2) return 'victory';
    
    return 'unknown';
  }

  dist(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }
}

