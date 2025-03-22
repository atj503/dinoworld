import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
        this.speed = 0.15;
        this.turnSpeed = 0.05;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.lastRotationY = 0;
        this.cameraOffset = new THREE.Vector3(0, 2, 0);
        this.boundingBox = new THREE.Box3();
        this.tempBox = new THREE.Box3();
        this.collisionPadding = 0.2;
        this.isLoaded = false;
        
        // Create a temporary cube as placeholder
        this.createTemporaryModel();
        
        // Load the actual model
        this.loadModel().catch(error => {
            console.error('Failed to load dinosaur model, using fallback:', error);
        });
    }

    createTemporaryModel() {
        // Create a simple cube as placeholder
        const geometry = new THREE.BoxGeometry(1, 2, 2);
        const material = new THREE.MeshPhongMaterial({ color: 0x7da87d });
        const cube = new THREE.Mesh(geometry, material);
        cube.castShadow = true;
        cube.receiveShadow = true;
        
        const container = new THREE.Object3D();
        container.add(cube);
        this.mesh = container;
        this.scene.add(this.mesh);
        
        // Set up basic collision box for temporary model
        this.boundingBox.setFromObject(cube);
        this.collisionSize = new THREE.Vector3(1, 2, 2);
        
        // Initial camera setup
        this.updateCameraPosition();
    }

    async loadModel() {
        try {
            const loader = new FBXLoader();
            const model = await loader.loadAsync('/memory-bank/Stegasaurus_20K.fbx');
            
            if (!this.mesh) {
                console.error('Mesh is null during model load');
                return;
            }
            
            // Store current position and rotation
            const currentPosition = this.mesh.position.clone();
            const currentRotation = this.mesh.rotation.clone();
            
            // Remove temporary model
            this.scene.remove(this.mesh);
            
            // Scale and position the new model
            model.scale.setScalar(0.01);
            
            // Setup materials
            const material = new THREE.MeshPhongMaterial({
                color: 0x7da87d,
                specular: 0x333333,
                shininess: 30,
                flatShading: false
            });

            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Create new container
            const container = new THREE.Object3D();
            model.rotation.y = Math.PI;
            container.add(model);
            container.rotation.y = Math.PI;
            
            // Restore position and rotation
            container.position.copy(currentPosition);
            container.rotation.copy(currentRotation);
            
            this.mesh = container;
            this.scene.add(this.mesh);
            
            // Setup animations
            if (model.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(model);
                model.animations.forEach(clip => {
                    this.animations[clip.name] = this.mixer.clipAction(clip);
                });
                if (this.animations['idle']) {
                    this.playAnimation('idle');
                }
            }
            
            // Update collision box
            this.boundingBox.setFromObject(model);
            const size = this.boundingBox.getSize(new THREE.Vector3());
            this.collisionSize = new THREE.Vector3(
                size.x * 0.8,
                size.y,
                size.z * 0.8
            );
            
            this.isLoaded = true;
            
        } catch (error) {
            console.error('Error loading Stegosaurus model:', error);
            // Keep using the temporary model if loading fails
            this.isLoaded = true;
        }
    }

    playAnimation(name) {
        if (!this.mixer || !this.animations[name]) return;
        
        try {
            if (this.currentAction) {
                this.currentAction.fadeOut(0.2);
            }
            this.animations[name].reset().fadeIn(0.2).play();
            this.currentAction = this.animations[name];
        } catch (error) {
            console.error('Error playing animation:', error);
        }
    }

    update(delta, keysPressed, obstacles) {
        if (!this.mesh || !this.isLoaded) return;

        try {
            // Update animation mixer
            if (this.mixer) {
                this.mixer.update(delta);
            }

            // Store current position for collision detection
            const previousPosition = this.mesh.position.clone();
            
            // Reset velocity
            this.velocity.x = 0;
            this.velocity.z = 0;

            // Store last rotation
            this.lastRotationY = this.mesh.rotation.y;

            // Handle rotation first
            if (keysPressed['a'] || keysPressed['ArrowLeft']) {
                this.mesh.rotation.y += this.turnSpeed;
            }
            if (keysPressed['d'] || keysPressed['ArrowRight']) {
                this.mesh.rotation.y -= this.turnSpeed;
            }

            // Calculate movement based on key presses
            if (keysPressed['w'] || keysPressed['ArrowUp']) {
                this.velocity.z = -this.speed;
            }
            if (keysPressed['s'] || keysPressed['ArrowDown']) {
                this.velocity.z = this.speed;
            }

            // Apply movement in the direction the model is facing
            if (this.velocity.length() > 0) {
                this.direction.set(0, 0, 1).applyQuaternion(this.mesh.quaternion);
                const movement = this.direction.multiplyScalar(this.velocity.z);
                
                // Try to move
                this.mesh.position.add(movement);
                
                // Check for collisions
                if (this.checkCollisions(obstacles)) {
                    // If collision occurred, revert to previous position
                    this.mesh.position.copy(previousPosition);
                }
            }

            // Update camera position
            this.updateCameraPosition();

            // Play appropriate animation
            if (this.velocity.length() > 0) {
                this.playAnimation('walk');
            } else {
                this.playAnimation('idle');
            }
            
        } catch (error) {
            console.error('Error in player update:', error);
        }
    }

    checkCollisions(obstacles) {
        if (!obstacles || !this.mesh || !this.isLoaded) return false;
        
        try {
            // Update player's bounding box
            this.boundingBox.setFromCenterAndSize(
                this.mesh.position,
                this.collisionSize
            );
            
            // Add padding to bounding box for smoother collision response
            this.boundingBox.min.subScalar(this.collisionPadding);
            this.boundingBox.max.addScalar(this.collisionPadding);
            
            // Check collision with each obstacle
            for (const obstacle of obstacles) {
                if (!obstacle.geometry) continue;
                
                // Get obstacle's world transform
                this.tempBox.setFromObject(obstacle);
                
                if (this.boundingBox.intersectsBox(this.tempBox)) {
                    return true;
                }
            }
        } catch (error) {
            console.error('Error checking collisions:', error);
            return false;
        }
        
        return false;
    }

    updateCameraPosition() {
        if (!this.mesh || !this.camera || !this.isLoaded) return;
        
        try {
            // Position camera at player's head height
            const cameraPosition = this.mesh.position.clone().add(this.cameraOffset);
            this.camera.position.copy(cameraPosition);
            
            // Calculate look direction
            const lookDirection = new THREE.Vector3(0, 0, -1);
            lookDirection.applyQuaternion(this.mesh.quaternion);
            
            // Set camera look target
            const target = cameraPosition.clone().add(lookDirection);
            this.camera.lookAt(target);
        } catch (error) {
            console.error('Error updating camera position:', error);
        }
    }

    getPosition() {
        return this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
    }

    reset(startPosition) {
        if (!this.mesh) return;
        
        try {
            this.mesh.position.copy(startPosition);
            this.mesh.rotation.set(0, 0, 0);
            this.updateCameraPosition();
        } catch (error) {
            console.error('Error resetting player:', error);
        }
    }

    getTurnSpeed() {
        if (!this.mesh) return 0;
        return Math.abs(this.mesh.rotation.y - this.lastRotationY);
    }
} 