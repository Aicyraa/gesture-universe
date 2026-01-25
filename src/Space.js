import * as THREE from 'three';
import { createParticleTexture } from './Utils.js';

export class Space {
  constructor(scene) {
    this.scene = scene;
    this.stars = null;
    this.init();
  }

  init() {
    const geometry = new THREE.BufferGeometry();
    const count = 5000;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 100;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2, // Slightly larger to see glow
      sizeAttenuation: true,
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      map: createParticleTexture(),
      depthWrite: false, // Important for nice blending
      blending: THREE.AdditiveBlending
    });

    this.stars = new THREE.Points(geometry, material);
    
    // Hidden by default, World will manage visibility
    this.stars.visible = false;
    this.scene.add(this.stars);
  }

  show() {
    this.stars.visible = true;
  }

  hide() {
    this.stars.visible = false;
  }

  update(time) {
    // Subtle rotation or movement
    if (this.stars) {
      this.stars.rotation.y = time * 0.05;
    }
  }
}
