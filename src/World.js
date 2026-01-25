import * as THREE from 'three';
import { Space } from './Space.js';
import { Galaxy } from './Galaxy.js';
import { Universe } from './Universe.js';

export class World {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.width / this.height,
      0.1,
      10000
    );
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Initialize Scenes
    this.space = new Space(this.scene);
    this.galaxy = new Galaxy(this.scene);
    this.universe = new Universe(this.scene);

    // Initial State
    this.currentMode = 'universe';
    this.targetCameraPositions = {
        space: new THREE.Vector3(0, 0, 10),
        galaxy: new THREE.Vector3(0, 5, 10),
        universe: new THREE.Vector3(0, 0, 100)
    };
    this.targetCameraLookAt = new THREE.Vector3(0, 0, 0);

    // Current transition targets
    this.targetCamPos = this.targetCameraPositions.universe.clone();
    this.targetSceneRot = new THREE.Euler(0, 0, 0);
    this.targetZoomOffset = 0;

    this.switchMode('universe');
  }

  switchMode(mode) {
    console.log(`Switching to ${mode}`);
    this.currentMode = mode;
    this.space.hide();
    this.galaxy.hide();
    this.universe.hide();
    
    // Set visibility
    if (mode === 'space') this.space.show();
    else if (mode === 'galaxy') this.galaxy.show();
    else if (mode === 'universe') this.universe.show();

    // Set Target
    this.targetCamPos.copy(this.targetCameraPositions[mode]);
    this.targetSceneRot.set(0, 0, 0);
    this.targetZoomOffset = 0;

    // Update UI buttons
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${mode}`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  setZoom(factor) {
      const ZoomSpeed = 50;
      const delta = (factor - 0.08) * ZoomSpeed;
      // Accumulate zoom offset target
      this.targetZoomOffset -= delta * 0.1;
      // Clamp
      this.targetZoomOffset = Math.max(-50, Math.min(this.targetZoomOffset, 50));
  }

  setRotation(x, y) {
      const targetRotationY = (x - 0.5) * Math.PI * 4; 
      const targetRotationX = (y - 0.5) * Math.PI * 2;
      this.targetSceneRot.y = targetRotationY;
      this.targetSceneRot.x = targetRotationX;
  }

  collapse() {
      // Direct effect for collapse is fine, or simple lerp scale
      this.scene.rotation.y += 0.5;
      this.scene.scale.setScalar(this.scene.scale.x * 0.95);
      if (this.scene.scale.x < 0.01) this.scene.scale.setScalar(1);
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  animate() {
    const elapsed = this.clock.getElapsedTime();
    const dt = this.clock.getDelta(); // Use delta for smooth frame-independent lerp

    this.space.update(elapsed);
    this.galaxy.update(elapsed);
    this.universe.update(elapsed);

    // Smooth Transitions (Lerp)
    // Camera Position
    const lerpSpeed = 0.05;
    
    // Calculate final target Z including zoom
    const finalTargetZ = this.targetCamPos.z + this.targetZoomOffset;
    
    this.camera.position.x += (this.targetCamPos.x - this.camera.position.x) * lerpSpeed;
    this.camera.position.y += (this.targetCamPos.y - this.camera.position.y) * lerpSpeed;
    this.camera.position.z += (finalTargetZ - this.camera.position.z) * lerpSpeed;
    
    this.camera.lookAt(0, 0, 0); // Always look at center for now

    // Scene Rotation
    this.scene.rotation.x += (this.targetSceneRot.x - this.scene.rotation.x) * lerpSpeed;
    this.scene.rotation.y += (this.targetSceneRot.y - this.scene.rotation.y) * lerpSpeed;

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate.bind(this));
  }
}
