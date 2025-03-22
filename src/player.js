import * as THREE from '../node_modules/three/build/three.module.js';
import { FBXLoader } from '../node_modules/three/examples/jsm/loaders/FBXLoader.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
        this.speed = 0.15;
        this.turnSpeed = 0.05;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.lastRotationY = 0; // Track last rotation
        
        // Load the Stegosaurus model
        this.loadModel();
    }

    async loadModel() {
        const loader = new FBXLoader();
        try {
            const model = await loader.loadAsync('/memory-bank/Stegasaurus_20K.fbx');
            
            // Scale and position the model appropriately
            model.scale.setScalar(0.01); // Adjust scale as needed
            model.position.y = 0; // Set initial height
            
            // Add materials to make the model more visible
            const material = new THREE.MeshPhongMaterial({
                color: 0x7da87d,  // Greenish color
                specular: 0x333333,
                shininess: 30,
                flatShading: false
            });

            // Apply material to all mesh parts
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Create a container and add the model to it
            const container = new THREE.Object3D();
            
            // First rotate the model itself
            model.rotation.y = Math.PI;
            container.add(model);

            // Then rotate the container the opposite way
            container.rotation.y = Math.PI;

            this.mesh = container;
            
            // Add another axes helper to see model's local axes
            const modelAxesHelper = new THREE.AxesHelper(3);
            this.mesh.add(modelAxesHelper);
            
            this.scene.add(this.mesh);
            
            // Setup animations if they exist
            if (model.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(model);
                model.animations.forEach(clip => {
                    this.animations[clip.name] = this.mixer.clipAction(clip);
                });
                // Play default animation if available
                if (this.animations['idle']) {
                    this.playAnimation('idle');
                }
            }
            
            // Create a collision box
            const bbox = new THREE.Box3().setFromObject(model);
            const size = bbox.getSize(new THREE.Vector3());
            this.collider = new THREE.Box3();
            this.colliderSize = size;
            
        } catch (error) {
            console.error('Error loading Stegosaurus model:', error);
        }
    }

    playAnimation(name) {
        if (this.currentAction) {
            this.currentAction.fadeOut(0.2);
        }
        if (this.animations[name]) {
            this.animations[name].reset().fadeIn(0.2).play();
            this.currentAction = this.animations[name];
        }
    }

    update(delta, keysPressed) {
        if (!this.mesh) return;

        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(delta);
        }

        // Reset velocity
        this.velocity.x = 0;
        this.velocity.z = 0;

        // Store last rotation
        this.lastRotationY = this.mesh.rotation.y;

        // Calculate movement based on key presses
        if (keysPressed['w'] || keysPressed['ArrowUp']) {
            this.velocity.z = -this.speed;  // Negative Z is away from camera
        }
        if (keysPressed['s'] || keysPressed['ArrowDown']) {
            this.velocity.z = this.speed;  // Positive Z is toward camera
        }
        if (keysPressed['a'] || keysPressed['ArrowLeft']) {
            this.mesh.rotation.y += this.turnSpeed;
        }
        if (keysPressed['d'] || keysPressed['ArrowRight']) {
            this.mesh.rotation.y -= this.turnSpeed;
        }

        // Apply movement in the direction the model is facing
        this.direction.set(0, 0, 1).applyQuaternion(this.mesh.quaternion);
        this.mesh.position.addScaledVector(this.direction, this.velocity.z);

        // Update collider position
        if (this.collider) {
            this.collider.setFromCenterAndSize(
                this.mesh.position,
                this.colliderSize
            );
        }

        // Play appropriate animation
        if (this.velocity.length() > 0) {
            this.playAnimation('walk');
        } else {
            this.playAnimation('idle');
        }
    }

    getPosition() {
        return this.mesh ? this.mesh.position : new THREE.Vector3();
    }

    reset(startPosition) {
        if (this.mesh) {
            this.mesh.position.copy(startPosition);
            this.mesh.rotation.set(0, 0, 0);
        }
    }

    getTurnSpeed() {
        if (!this.mesh) return 0;
        const rotationDelta = Math.abs(this.mesh.rotation.y - this.lastRotationY);
        return rotationDelta;
    }
} 