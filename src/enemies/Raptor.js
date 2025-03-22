import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class Raptor {
    constructor(scene, gameStateManager, position, patrolRadius = 5) {
        this.scene = scene;
        this.gameStateManager = gameStateManager;
        this.position = position;
        this.patrolRadius = patrolRadius;
        this.patrolAngle = Math.random() * Math.PI * 2;
        this.patrolSpeed = 0.5;
        this.loader = new GLTFLoader();
        
        // Temporary raptor mesh while model loads
        this.createTemporaryRaptor();
        
        // Load actual raptor model
        this.loadRaptorModel();
        
        // Animation properties
        this.breathingOffset = Math.random() * Math.PI * 2;
        this.breathingSpeed = 1.5;
    }

    createTemporaryRaptor() {
        // Create a simple dinosaur shape using primitives
        const body = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(2, 1.5, 3);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2d572c });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.add(bodyMesh);
        
        // Head
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 1.2);
        const headMesh = new THREE.Mesh(headGeometry, bodyMaterial);
        headMesh.position.set(0, 0.8, 1.5);
        body.add(headMesh);
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x1a3d1a });
        
        [-0.5, 0.5].forEach(x => {
            [-0.5, 0.5].forEach(z => {
                const leg = new THREE.Mesh(legGeometry, legMaterial);
                leg.position.set(x, -0.6, z);
                body.add(leg);
            });
        });
        
        // Tail
        const tailGeometry = new THREE.BoxGeometry(0.4, 0.4, 2);
        const tailMesh = new THREE.Mesh(tailGeometry, bodyMaterial);
        tailMesh.position.set(0, 0, -2);
        body.add(tailMesh);
        
        body.position.copy(this.position);
        body.position.y += 1; // Lift up to ground level
        
        this.mesh = body;
        this.scene.add(this.mesh);
        
        // Create collision box
        this.updateCollisionBox();
    }

    loadRaptorModel() {
        // TODO: Replace with actual raptor model path
        const modelPath = '/models/raptor.glb';
        
        this.loader.load(modelPath, 
            (gltf) => {
                // Remove temporary mesh
                if (this.mesh) {
                    this.scene.remove(this.mesh);
                    this.mesh.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    });
                }
                
                this.mesh = gltf.scene;
                this.mesh.position.copy(this.position);
                this.mesh.scale.set(0.5, 0.5, 0.5);
                
                // Apply shadows
                this.mesh.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                this.scene.add(this.mesh);
                this.updateCollisionBox();
                
                // Setup animations if available
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(this.mesh);
                    this.idleAction = this.mixer.clipAction(gltf.animations[0]);
                    this.idleAction.play();
                }
            },
            undefined,
            (error) => {
                console.error('Error loading raptor model:', error);
            }
        );
    }

    updateCollisionBox() {
        this.collisionBox = new THREE.Box3().setFromObject(this.mesh);
        // Adjust collision box to be slightly smaller than visual model
        this.collisionBox.min.add(new THREE.Vector3(0.2, 0, 0.2));
        this.collisionBox.max.sub(new THREE.Vector3(0.2, 0, 0.2));
    }

    update(deltaTime) {
        if (!this.mesh) return;
        
        // Update patrol position
        this.patrolAngle += this.patrolSpeed * deltaTime;
        const newX = this.position.x + Math.cos(this.patrolAngle) * this.patrolRadius;
        const newZ = this.position.z + Math.sin(this.patrolAngle) * this.patrolRadius;
        
        // Update mesh position
        this.mesh.position.x = newX;
        this.mesh.position.z = newZ;
        
        // Make raptor face movement direction
        this.mesh.rotation.y = this.patrolAngle + Math.PI / 2;
        
        // Breathing animation
        this.breathingOffset += this.breathingSpeed * deltaTime;
        const breatheScale = 1 + Math.sin(this.breathingOffset) * 0.05;
        this.mesh.scale.y = breatheScale * 0.5;
        
        // Update animation mixer if available
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Update collision box
        this.updateCollisionBox();
    }

    checkPlayerCollision(playerPosition) {
        const playerBox = new THREE.Box3();
        playerBox.min.set(
            playerPosition.x - 0.5,
            playerPosition.y - 1,
            playerPosition.z - 0.5
        );
        playerBox.max.set(
            playerPosition.x + 0.5,
            playerPosition.y + 1,
            playerPosition.z + 0.5
        );

        if (playerBox.intersectsBox(this.collisionBox)) {
            this.gameStateManager.triggerGameOver('Caught by a raptor!');
            return true;
        }
        return false;
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.mesh);
        }
    }
} 