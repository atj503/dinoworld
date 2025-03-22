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
        this.jumpForce = 8;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.lastRotationY = 0;
        this.isGrounded = true;
        this.isJumping = false;
        this.jumpCooldown = 0;
        this.jumpCooldownTime = 0.1; // 100ms cooldown between jumps
        
        // Camera settings
        this.cameraOffset = new THREE.Vector3(1.5, 2, 0); // Offset to the right
        this.cameraLookOffset = new THREE.Vector3(0, 0.5, -5); // Look ahead and slightly up
        this.cameraBobAmount = 0.05;
        this.cameraBobSpeed = 5;
        this.cameraBobTime = 0;
        
        // Physics
        this.boundingBox = new THREE.Box3();
        this.tempBox = new THREE.Box3();
        this.collisionPadding = 0.2;
        this.gravity = 20;
        this.isLoaded = false;
        
        // Create a temporary cube as placeholder
        this.createTemporaryModel();
        
        // Load the actual model
        this.loadModel().catch(error => {
            console.error('Failed to load dinosaur model, using fallback:', error);
        });
    }

    createTemporaryModel() {
        const geometry = new THREE.BoxGeometry(1, 2, 2);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00  // Bright green for visibility
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.castShadow = true;
        cube.receiveShadow = true;
        
        const container = new THREE.Object3D();
        container.add(cube);
        this.mesh = container;
        this.scene.add(this.mesh);
        
        this.boundingBox.setFromObject(cube);
        this.collisionSize = new THREE.Vector3(1, 2, 2);
        
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
            
            const currentPosition = this.mesh.position.clone();
            const currentRotation = this.mesh.rotation.clone();
            
            this.scene.remove(this.mesh);
            
            model.scale.setScalar(0.01);
            
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00  // Bright green for visibility
            });

            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            const container = new THREE.Object3D();
            model.rotation.y = Math.PI;
            container.add(model);
            container.rotation.y = Math.PI;
            
            container.position.copy(currentPosition);
            container.rotation.copy(currentRotation);
            
            this.mesh = container;
            this.scene.add(this.mesh);
            
            if (model.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(model);
                model.animations.forEach(clip => {
                    this.animations[clip.name] = this.mixer.clipAction(clip);
                });
                if (this.animations['idle']) {
                    this.playAnimation('idle');
                }
            }
            
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

    update(deltaTime, keysPressed, obstacles) {
        if (!this.mesh || !this.isLoaded) return;

        try {
            if (this.mixer) {
                this.mixer.update(deltaTime);
            }

            const previousPosition = this.mesh.position.clone();
            
            // Reset horizontal velocity
            this.velocity.x = 0;
            this.velocity.z = 0;

            this.lastRotationY = this.mesh.rotation.y;

            // Handle rotation
            if (keysPressed['a'] || keysPressed['ArrowLeft']) {
                this.mesh.rotation.y += this.turnSpeed;
            }
            if (keysPressed['d'] || keysPressed['ArrowRight']) {
                this.mesh.rotation.y -= this.turnSpeed;
            }

            // Handle movement
            if (keysPressed['w'] || keysPressed['ArrowUp']) {
                this.velocity.z = -this.speed;
            }
            if (keysPressed['s'] || keysPressed['ArrowDown']) {
                this.velocity.z = this.speed;
            }

            // Update jump cooldown
            if (this.jumpCooldown > 0) {
                this.jumpCooldown -= deltaTime;
            }

            // Handle jumping
            if (keysPressed[' '] && this.isGrounded && !this.isJumping && this.jumpCooldown <= 0) {
                this.velocity.y = this.jumpForce;
                this.isGrounded = false;
                this.isJumping = true;
                this.jumpCooldown = this.jumpCooldownTime;
            }

            // Apply gravity
            if (!this.isGrounded) {
                this.velocity.y -= this.gravity * deltaTime;
            }

            // Apply movement in facing direction
            if (this.velocity.length() > 0) {
                this.direction.set(0, 0, 1).applyQuaternion(this.mesh.quaternion);
                const movement = this.direction.multiplyScalar(this.velocity.z);
                movement.y = this.velocity.y; // Add vertical movement
                
                this.mesh.position.add(movement);
                
                // Check collisions
                if (this.checkCollisions(obstacles)) {
                    this.mesh.position.copy(previousPosition);
                }
            }

            // Ground check
            if (this.mesh.position.y <= 0) {
                this.mesh.position.y = 0;
                this.velocity.y = 0;
                this.isGrounded = true;
                this.isJumping = false;
            }

            // Update camera with bob effect
            this.updateCameraPosition(deltaTime);

            // Play appropriate animation
            if (this.isJumping) {
                this.playAnimation('jump');
            } else if (this.velocity.length() > 0) {
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
            this.boundingBox.setFromCenterAndSize(
                this.mesh.position,
                this.collisionSize
            );
            
            this.boundingBox.min.subScalar(this.collisionPadding);
            this.boundingBox.max.addScalar(this.collisionPadding);
            
            for (const obstacle of obstacles) {
                if (!obstacle.geometry) continue;
                
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

    updateCameraPosition(deltaTime = 0) {
        if (!this.mesh || !this.camera || !this.isLoaded) return;
        
        try {
            // Calculate camera bob
            if (this.velocity.length() > 0 && this.isGrounded) {
                this.cameraBobTime += deltaTime * this.cameraBobSpeed;
                const bobOffset = Math.sin(this.cameraBobTime) * this.cameraBobAmount;
                this.cameraOffset.y = 2 + bobOffset;
            } else {
                this.cameraOffset.y = 2;
            }
            
            // Calculate camera position
            const cameraPosition = this.mesh.position.clone();
            const offsetVector = this.cameraOffset.clone();
            offsetVector.applyQuaternion(this.mesh.quaternion);
            cameraPosition.add(offsetVector);
            
            // Calculate look target
            const lookTarget = this.mesh.position.clone();
            const lookOffset = this.cameraLookOffset.clone();
            lookOffset.applyQuaternion(this.mesh.quaternion);
            lookTarget.add(lookOffset);
            
            // Update camera
            this.camera.position.copy(cameraPosition);
            this.camera.lookAt(lookTarget);
            
        } catch (error) {
            console.error('Error updating camera position:', error);
        }
    }

    getPosition() {
        return this.mesh ? this.mesh.position : new THREE.Vector3();
    }

    getBounds() {
        if (!this.mesh || !this.isLoaded) {
            return new THREE.Box3();
        }
        
        // Update bounding box with current position and size
        this.boundingBox.setFromCenterAndSize(
            this.mesh.position,
            this.collisionSize
        );
        
        // Add padding for better collision detection
        this.boundingBox.min.subScalar(this.collisionPadding);
        this.boundingBox.max.addScalar(this.collisionPadding);
        
        return this.boundingBox;
    }

    reset(startPosition) {
        if (!this.mesh) return;
        
        try {
            this.mesh.position.copy(startPosition);
            this.mesh.rotation.set(0, 0, 0);
            this.velocity.set(0, 0, 0);
            this.isGrounded = true;
            this.isJumping = false;
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