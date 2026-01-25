import * as THREE from 'three';
import { createParticleTexture } from './Utils.js';

export class Universe {
  constructor(scene) {
    this.scene = scene;
    this.galaxies = new THREE.Group();
    this.init();
  }

  init() {
    const count = 500;
    
    // Create simple galaxy sprites or small particle clusters
    // For performance, we'll use a Points systems where each point is a distant galaxy
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    // Create a texture for the galaxy sprite (procedural for now, or just blurry dots)
    // In a real app we might load a texture, here we use simple points
    
    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        
        // Spread them out significantly
        const r = 50 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);
        
        // Varying colors
        const color = new THREE.Color();
        color.setHSL(Math.random(), 0.8, 0.5);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 8, // Larger distant galaxies
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        map: createParticleTexture(),
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    this.points = new THREE.Points(geometry, material);
    this.galaxies.add(this.points);
    this.galaxies.visible = false;
    this.scene.add(this.galaxies);
  }

  show() {
    this.galaxies.visible = true;
  }

  hide() {
    this.galaxies.visible = false;
  }

  update(time) {
    if (this.galaxies) {
        this.galaxies.rotation.y = time * 0.02;
    }
  }
}
