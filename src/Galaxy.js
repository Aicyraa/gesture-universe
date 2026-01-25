import * as THREE from 'three';
import { createParticleTexture } from './Utils.js';

export class Galaxy {
  constructor(scene) {
    this.scene = scene;
    this.points = null;
    this.parameters = {
      count: 20000,
      size: 0.05, // Adjusted size
      radius: 5,
      branches: 3,
      spin: 1,
      randomness: 0.2,
      randomnessPower: 3,
      insideColor: '#ff6030',
      outsideColor: '#1b3984'
    };
    this.init();
  }

  init() {
    if (this.points !== null) {
      this.geometry.dispose();
      this.material.dispose();
      this.scene.remove(this.points);
    }

    const { count, size, radius, branches, spin, randomness, randomnessPower, insideColor, outsideColor } = this.parameters;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const colorInside = new THREE.Color(insideColor);
    const colorOutside = new THREE.Color(outsideColor);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Position
        const r = Math.random() * radius;
        const spinAngle = r * spin;
        const branchAngle = (i % branches) / branches * Math.PI * 2;

        const randomX = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;
        const randomY = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;
        const randomZ = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;

        positions[i3    ] = Math.cos(branchAngle + spinAngle) * r + randomX;
        positions[i3 + 1] = randomY; 
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

        // Color
        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, r / radius);

        colors[i3    ] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.PointsMaterial({
      size: size,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      map: createParticleTexture(),
      transparent: true,
      opacity: 0.8
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.visible = false;
    this.scene.add(this.points);
  }

  show() {
    this.points.visible = true;
  }

  hide() {
    this.points.visible = false;
  }

  update(time) {
    if (this.points) {
      this.points.rotation.y = time * 0.1;
    }
  }
}
