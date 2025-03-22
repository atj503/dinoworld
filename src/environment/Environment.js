import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class Environment {
    constructor(scene, gameStateManager) {
        this.scene = scene;
        this.gameStateManager = gameStateManager;
        this.loader = new GLTFLoader();
        
        // Store camera reference
        this.camera = this.scene.getObjectByName('camera') || this.scene.getObjectByProperty('type', 'PerspectiveCamera');
        
        // Collections
        this.lavaPits = [];
        this.smokeParticles = [];
        
        // Materials
        this.lavaMaterial = new THREE.MeshStandardMaterial({
            color: 0xff4400,
            emissive: 0xff2200,
            emissiveIntensity: 2,
            roughness: 0.3,
            metalness: 0.0
        });

        this.smokeMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        // Initialize environment
        this.init();
    }

    init() {
        this.createVolcano();
        this.createLavaPits();
        this.createSmokeEffect();
    }

    createVolcano() {
        // Create a large cone for the volcano
        const volcanoGeometry = new THREE.ConeGeometry(50, 100, 32);
        const volcanoMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.8,
            metalness: 0.2
        });
        
        this.volcano = new THREE.Mesh(volcanoGeometry, volcanoMaterial);
        this.volcano.position.set(200, 0, -200); // Far in the background
        this.volcano.castShadow = true;
        this.volcano.receiveShadow = true;
        this.scene.add(this.volcano);

        // Add crater at the top
        const craterGeometry = new THREE.CylinderGeometry(10, 15, 20, 32);
        const craterMesh = new THREE.Mesh(craterGeometry, this.lavaMaterial);
        craterMesh.position.y = 40;
        this.volcano.add(craterMesh);
    }

    createLavaPits() {
        // Create several lava pits in strategic locations
        const lavaPitPositions = [
            { x: 20, z: 30 },
            { x: -25, z: -20 },
            { x: 40, z: -35 }
        ];

        lavaPitPositions.forEach(pos => {
            const pitGeometry = new THREE.CylinderGeometry(3, 3, 1, 32);
            const lavaPit = new THREE.Mesh(pitGeometry, this.lavaMaterial);
            
            lavaPit.position.set(pos.x, -0.5, pos.z);
            lavaPit.rotation.x = Math.PI / 2;
            
            // Create collision box slightly smaller than visual
            const collisionBox = new THREE.Box3();
            collisionBox.setFromObject(lavaPit);
            lavaPit.userData.collisionBox = collisionBox;
            
            this.lavaPits.push(lavaPit);
            this.scene.add(lavaPit);
        });
    }

    createSmokeEffect() {
        // Create billboarded smoke planes
        const smokeGeometry = new THREE.PlaneGeometry(20, 40);
        
        for (let i = 0; i < 3; i++) {
            const smoke = new THREE.Mesh(smokeGeometry, this.smokeMaterial.clone());
            smoke.position.copy(this.volcano.position);
            smoke.position.y += 60 + (i * 10);
            smoke.userData.baseY = smoke.position.y;
            smoke.userData.offsetY = Math.random() * Math.PI;
            
            // Make smoke always face camera
            if (this.camera) {
                smoke.lookAt(this.camera.position);
            }
            
            this.smokeParticles.push(smoke);
            this.scene.add(smoke);
        }
    }

    update(deltaTime) {
        // Skip update if no camera is available
        if (!this.camera) {
            this.camera = this.scene.getObjectByName('camera') || 
                         this.scene.getObjectByProperty('type', 'PerspectiveCamera');
            if (!this.camera) return;
        }

        // Animate smoke
        this.smokeParticles.forEach(smoke => {
            smoke.userData.offsetY += deltaTime * 0.5;
            smoke.position.y = smoke.userData.baseY + Math.sin(smoke.userData.offsetY) * 2;
            smoke.material.opacity = 0.4 + Math.sin(smoke.userData.offsetY * 0.5) * 0.2;
            
            // Make smoke billboards always face camera
            smoke.lookAt(this.camera.position);
        });
    }

    checkLavaCollision(playerPosition) {
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

        for (const lavaPit of this.lavaPits) {
            if (playerBox.intersectsBox(lavaPit.userData.collisionBox)) {
                this.gameStateManager.triggerGameOver('Melted in lava!');
                return true;
            }
        }
        return false;
    }

    dispose() {
        // Cleanup resources
        this.lavaPits.forEach(pit => {
            this.scene.remove(pit);
            pit.geometry.dispose();
            pit.material.dispose();
        });

        this.smokeParticles.forEach(smoke => {
            this.scene.remove(smoke);
            smoke.geometry.dispose();
            smoke.material.dispose();
        });

        if (this.volcano) {
            this.scene.remove(this.volcano);
            this.volcano.geometry.dispose();
            this.volcano.material.dispose();
        }
    }
} 