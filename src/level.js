import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { PhysicsSystem } from './physics/PhysicsSystem.js';

export class Level {
    constructor(scene, physics, onRingCollected) {
        this.scene = scene;
        this.physics = physics;
        this.onRingCollected = onRingCollected;
        this.levelData = null;
        this.ground = null;
        this.rings = [];
        this.enemies = [];
        this.platforms = [];
        this.obstacles = [];
        this.trees = [];
        this.textureLoader = new THREE.TextureLoader();
    }

    async loadLevel(levelNumber) {
        try {
            // Clear any existing level elements
            this.reset();
            
            // Load level data
            const response = await fetch(`/data/level${levelNumber}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load level ${levelNumber}`);
            }
            
            const levelData = await response.json();
            
            // Validate player start position
            if (!levelData.playerStart || 
                typeof levelData.playerStart.x !== 'number' || 
                typeof levelData.playerStart.y !== 'number' || 
                typeof levelData.playerStart.z !== 'number') {
                console.error('Invalid player start position in level data:', levelData.playerStart);
                // Provide default start position
                return { x: 0, y: 0, z: 0 };
            }
            
            // Create level elements
            await this.createTerrain(levelData.terrain);
            this.createRings(levelData.rings || []);
            this.createEnemies(levelData.enemies || []);
            
            return levelData.playerStart;
        } catch (error) {
            console.error('Error loading level:', error);
            // Return safe default coordinates if loading fails
            return { x: 0, y: 0, z: 0 };
        }
    }

    async createGround() {
        // Create a large ground plane
        const groundSize = 1000;
        const geometry = new THREE.PlaneGeometry(groundSize, groundSize);
        
        // Create a procedural texture
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const context = canvas.getContext('2d');
        
        // Fill with base color
        context.fillStyle = '#4a8505';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add noise pattern for grass texture
        for (let i = 0; i < 10000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 4 + 1;
            context.fillStyle = Math.random() > 0.5 ? '#3a7000' : '#5a9010';
            context.fillRect(x, y, size, size);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50);
        
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: 0.1,
            color: 0x88aa88
        });
        
        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.1; // Slightly below 0 to avoid z-fighting
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Add ground to physics system
        this.physics.addBody(this.ground, 'static');
    }

    createBoundary() {
        const { radius, treeCount, treeTypes, spacing } = this.levelData.environment.boundary;
        const angleStep = (2 * Math.PI) / treeCount;
        
        for (let i = 0; i < treeCount; i++) {
            const angle = i * angleStep;
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            
            // Randomly select tree type
            const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
            this.createTree(x, z, treeType);
        }
    }

    createTree(x, z, type) {
        // Create simple tree geometry (can be replaced with models later)
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 5);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2810 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        let foliageGeometry;
        if (type === 'pine') {
            foliageGeometry = new THREE.ConeGeometry(3, 8, 8);
        } else { // oak
            foliageGeometry = new THREE.SphereGeometry(4, 8, 8);
        }
        
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        
        trunk.position.set(x, 2.5, z);
        foliage.position.set(x, 8, z);
        
        trunk.castShadow = true;
        foliage.castShadow = true;
        
        this.scene.add(trunk);
        this.scene.add(foliage);
        
        this.trees.push(trunk, foliage);
        
        // Add trees to physics system
        this.physics.addBody(trunk, 'static');
        this.physics.addBody(foliage, 'static');
    }

    async createTerrain(terrainData) {
        const { platforms, obstacles } = terrainData;
        
        // Create platforms
        for (const platformData of platforms) {
            const platform = await this.createPlatform(platformData);
            this.platforms.push(platform);
            this.physics.addBody(platform, 'static');
        }
        
        // Create obstacles
        for (const obstacleData of obstacles) {
            const obstacle = await this.createObstacle(obstacleData);
            this.obstacles.push(obstacle);
            this.physics.addBody(obstacle, 'static');
        }
    }

    async createPlatform(data) {
        const { position, rotation, size, color } = data;
        
        let geometry;
        if (data.type === 'flat') {
            geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
        } else if (data.type === 'ramp') {
            // Create custom geometry for ramp
            geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
            geometry.translate(0, size.height / 2, 0);
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: parseInt(color),
            roughness: 0.7,
            metalness: 0.3
        });
        
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(position.x, position.y, position.z);
        platform.rotation.set(
            THREE.MathUtils.degToRad(rotation.x),
            THREE.MathUtils.degToRad(rotation.y),
            THREE.MathUtils.degToRad(rotation.z)
        );
        
        platform.castShadow = true;
        platform.receiveShadow = true;
        
        this.scene.add(platform);
        return platform;
    }

    async createObstacle(data) {
        const { type, position, rotation, size, color } = data;
        
        if (type === 'building') {
            // Create building with windows
            const building = new THREE.Group();
            
            // Main structure
            const buildingGeometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
            const buildingMaterial = new THREE.MeshStandardMaterial({
                color: parseInt(color),
                roughness: 0.7,
                metalness: 0.3
            });
            const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
            
            // Add windows
            const windowMaterial = new THREE.MeshStandardMaterial({
                color: 0x88ccff,
                emissive: 0x88ccff,
                emissiveIntensity: 0.8,
                metalness: 0.9,
                roughness: 0.1
            });
            
            const windowSize = { width: 1, height: 1.5, depth: 0.1 };
            const windowSpacing = 2;
            const floorsCount = Math.floor(size.height / 3);
            const windowsPerSide = Math.floor(size.width / 2.5);
            
            // Create windows for each side
            for (let floor = 0; floor < floorsCount; floor++) {
                for (let w = 0; w < windowsPerSide; w++) {
                    ['front', 'back', 'left', 'right'].forEach(side => {
                        const windowGeometry = new THREE.BoxGeometry(
                            windowSize.width,
                            windowSize.height,
                            windowSize.depth
                        );
                        const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
                        
                        const y = floor * 3 + 2;
                        let x, z;
                        
                        switch (side) {
                            case 'front':
                                x = (w - windowsPerSide/2 + 0.5) * windowSpacing;
                                z = size.depth/2 + 0.1;
                                break;
                            case 'back':
                                x = (w - windowsPerSide/2 + 0.5) * windowSpacing;
                                z = -size.depth/2 - 0.1;
                                windowMesh.rotation.y = Math.PI;
                                break;
                            case 'left':
                                x = -size.width/2 - 0.1;
                                z = (w - windowsPerSide/2 + 0.5) * windowSpacing;
                                windowMesh.rotation.y = -Math.PI/2;
                                break;
                            case 'right':
                                x = size.width/2 + 0.1;
                                z = (w - windowsPerSide/2 + 0.5) * windowSpacing;
                                windowMesh.rotation.y = Math.PI/2;
                                break;
                        }
                        
                        windowMesh.position.set(x, y, z);
                        building.add(windowMesh);
                    });
                }
            }
            
            building.add(buildingMesh);
            building.position.set(position.x, position.y, position.z);
            building.rotation.set(
                THREE.MathUtils.degToRad(rotation.x),
                THREE.MathUtils.degToRad(rotation.y),
                THREE.MathUtils.degToRad(rotation.z)
            );
            
            this.scene.add(building);
            
            // Add collision bodies for each wall
            building.children.forEach((child, index) => {
                if (child.geometry && child.geometry.type.includes('BoxGeometry')) {
                    // Only add physics to the wall meshes
                    if (index < 4) {  // First 4 children are the walls
                        this.physics.addBody(child, 'static');
                    }
                }
            });
            
            return building;
            
        } else if (type === 'cylinder') {
            const geometry = new THREE.CylinderGeometry(size.radius, size.radius, size.height, 32);
            const material = new THREE.MeshStandardMaterial({
                color: parseInt(color),
                roughness: 0.7,
                metalness: 0.3
            });
            
            const cylinder = new THREE.Mesh(geometry, material);
            cylinder.position.set(position.x, position.y, position.z);
            cylinder.rotation.set(
                THREE.MathUtils.degToRad(rotation.x),
                THREE.MathUtils.degToRad(rotation.y),
                THREE.MathUtils.degToRad(rotation.z)
            );
            
            cylinder.castShadow = true;
            cylinder.receiveShadow = true;
            
            this.scene.add(cylinder);
            
            // Add cylinder collision
            this.physics.addBody(cylinder, 'static');
            
            return cylinder;
        }
    }

    createRings(ringsData = []) {
        // Clear existing rings
        for (const ring of this.rings) {
            if (ring.geometry) ring.geometry.dispose();
            if (ring.material) ring.material.dispose();
            this.scene.remove(ring);
        }
        this.rings = [];

        // Create ring geometry and material only once
        const ringGeometry = new THREE.TorusGeometry(1.5, 0.2, 16, 32);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0xffd700,
            emissiveIntensity: 0.2
        });

        // Create new rings
        for (const data of ringsData) {
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(data.position.x, data.position.y, data.position.z);
            ring.rotation.set(
                data.rotation?.x || 0,
                data.rotation?.y || 0,
                data.rotation?.z || 0
            );
            ring.castShadow = true;
            ring.receiveShadow = true;
            
            // Add to scene and tracking array
            this.scene.add(ring);
            this.rings.push(ring);
            
            // Add to physics system as static body
            this.physics.addStaticBody({
                mesh: ring,
                type: 'ring',
                boundingBox: new THREE.Box3().setFromObject(ring)
            });
        }
    }

    createEnemies(enemiesData = []) {
        // Clear existing enemies
        for (const enemy of this.enemies) {
            if (enemy.mesh) {
                if (enemy.mesh.geometry) enemy.mesh.geometry.dispose();
                if (enemy.mesh.material) enemy.mesh.material.dispose();
                this.scene.remove(enemy.mesh);
            }
        }
        this.enemies = [];

        // Create new enemies
        for (const data of enemiesData) {
            const enemy = new Enemy(this.scene, data);
            this.enemies.push(enemy);
            
            // Add to physics system
            this.physics.addBody({
                mesh: enemy.mesh,
                type: 'enemy',
                update: (deltaTime) => enemy.update(deltaTime),
                boundingBox: new THREE.Box3().setFromObject(enemy.mesh)
            });
        }
    }

    collectRing(ring) {
        const index = this.rings.indexOf(ring);
        if (index !== -1) {
            this.scene.remove(ring);
            this.physics.removeBody(ring);
            this.rings.splice(index, 1);
            if (this.onRingCollected) {
                this.onRingCollected();
            }
        }
    }

    update(deltaTime, playerPosition) {
        // Update physics
        this.physics.update(deltaTime);
        
        // Update enemies
        for (const enemy of this.enemies) {
            enemy.update(deltaTime, playerPosition);
        }
        
        // Animate rings
        for (const ring of this.rings) {
            ring.rotation.y += deltaTime;
        }
    }

    clearLevel() {
        // Remove all objects from the scene and physics system
        [...this.rings, ...this.platforms, ...this.obstacles, ...this.trees].forEach(object => {
            this.scene.remove(object);
            this.physics.removeBody(object);
        });
        
        this.enemies.forEach(enemy => {
            enemy.cleanup();
            this.physics.removeBody(enemy.mesh);
        });
        
        if (this.ground) {
            this.scene.remove(this.ground);
            this.physics.removeBody(this.ground);
        }
        
        // Clear arrays
        this.rings = [];
        this.enemies = [];
        this.platforms = [];
        this.obstacles = [];
        this.trees = [];
        this.ground = null;
    }

    reset() {
        // Remove all objects from scene
        while(this.scene.children.length > 0) { 
            const object = this.scene.children[0];
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            this.scene.remove(object);
        }

        // Reset physics system
        if (this.physics) {
            this.physics.reset();
        }

        // Clear arrays
        this.rings = [];
        this.enemies = [];
        this.platforms = [];
        this.obstacles = [];
        this.trees = [];
        
        // Reset systems
        this.physics.reset();
        this.textureLoader = new THREE.TextureLoader();
    }
} 