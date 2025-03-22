import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { MaterialManager } from './materials/MaterialManager.js';
import { CollisionSystem } from './physics/CollisionSystem.js';
import { Environment } from './environment/Environment.js';
import { Raptor } from './enemies/Raptor.js';

class Ring {
    constructor(mesh, position, rotation) {
        this.mesh = mesh;
        this.position = position;
        this.rotation = rotation;
        this.boundingSphere = new THREE.Sphere(position, 2); // Increased collision radius
    }

    intersectsBounds(playerBounds) {
        // Update bounding sphere position to match mesh
        this.boundingSphere.center.copy(this.mesh.position);
        
        // Check if player's bounding box intersects ring's bounding sphere
        return playerBounds.intersectsSphere(this.boundingSphere);
    }

    update(deltaTime) {
        // Rotate the ring
        this.mesh.rotation.y += deltaTime * 2;
        
        // Add a gentle floating motion
        this.mesh.position.y = this.position.y + Math.sin(Date.now() * 0.002) * 0.2;
    }

    remove() {
        // Remove the ring from the scene
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}

export class Level {
    constructor(scene, physics, onRingCollected) {
        this.scene = scene;
        this.physics = physics;
        this.onRingCollected = onRingCollected;
        this.collisionSystem = new CollisionSystem();
        this.materialManager = new MaterialManager();
        
        // Initialize environment
        this.environment = new Environment(scene, this.physics);
        
        // Collections
        this.rings = [];
        this.raptors = [];
        this.platforms = [];
        this.obstacles = [];
        this.buildings = [];
        this.trees = [];
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
                return { x: 0, y: 0, z: 0 };
            }
            
            // Create level elements
            await this.createGround();
            await this.createTerrain(levelData.terrain);
            this.createRings(levelData.rings || []);
            this.createRaptors(levelData.enemies || []); // Replace enemies with raptors
            await this.createTrees(); // Add trees around perimeter
            
            return levelData.playerStart;
        } catch (error) {
            console.error('Error loading level:', error);
            return { x: 0, y: 0, z: 0 };
        }
    }

    async createGround() {
        const groundSize = 1000;
        const geometry = new THREE.PlaneGeometry(groundSize, groundSize, 64, 64);
        const material = await this.materialManager.createGroundMaterial();
        
        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.1;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Add ground to collision system
        this.collisionSystem.addStaticBody(this.ground, 'ground');
    }

    async createBuilding(data) {
        const { position, rotation, size, color } = data;
        
        // Create building group
        const building = new THREE.Group();
        
        // Create main structure with collision
        const buildingGeometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
        const buildingMaterial = await this.materialManager.createBuildingMaterial(color);
        const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
        buildingMesh.castShadow = true;
        buildingMesh.receiveShadow = true;
        building.add(buildingMesh);
        
        // Create windows
        const windowMaterial = await this.materialManager.createWindowMaterial();
        const windowSize = { width: 1, height: 1.5, depth: 0.1 };
        const windowSpacing = 2;
        const floorsCount = Math.floor(size.height / 3);
        const windowsPerSide = Math.floor(size.width / 2.5);
        
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
        
        // Position and rotate building
        building.position.set(position.x, position.y, position.z);
        building.rotation.set(
            rotation?.x || 0,
            rotation?.y || 0,
            rotation?.z || 0
        );
        
        this.scene.add(building);
        this.buildings.push(building);
        
        // Add building to collision system
        this.collisionSystem.addStaticBody(buildingMesh, 'building');
    }

    async createTerrain(terrainData = {}) {
        const { platforms = [], obstacles = [], buildings = [] } = terrainData;
        
        // Create platforms
        for (const platformData of platforms) {
            const geometry = new THREE.BoxGeometry(
                platformData.size.width,
                platformData.size.height,
                platformData.size.depth
            );
            const material = await this.materialManager.createBuildingMaterial(platformData.color);
            const platform = new THREE.Mesh(geometry, material);
            
            platform.position.set(
                platformData.position.x,
                platformData.position.y,
                platformData.position.z
            );
            platform.rotation.set(
                platformData.rotation?.x || 0,
                platformData.rotation?.y || 0,
                platformData.rotation?.z || 0
            );
            
            platform.castShadow = true;
            platform.receiveShadow = true;
            
            this.scene.add(platform);
            this.platforms.push(platform);
            
            // Add platform to collision system
            this.collisionSystem.addStaticBody(platform, 'platform');
        }
        
        // Create buildings
        for (const buildingData of buildings) {
            await this.createBuilding(buildingData);
        }
        
        // Create obstacles
        for (const obstacleData of obstacles) {
            const geometry = obstacleData.type === 'cylinder' 
                ? new THREE.CylinderGeometry(
                    obstacleData.size.radius,
                    obstacleData.size.radius,
                    obstacleData.size.height,
                    32
                )
                : new THREE.BoxGeometry(
                    obstacleData.size.width,
                    obstacleData.size.height,
                    obstacleData.size.depth
                );
            
            const material = await this.materialManager.createBuildingMaterial(obstacleData.color);
            const obstacle = new THREE.Mesh(geometry, material);
            
            obstacle.position.set(
                obstacleData.position.x,
                obstacleData.position.y,
                obstacleData.position.z
            );
            obstacle.rotation.set(
                obstacleData.rotation?.x || 0,
                obstacleData.rotation?.y || 0,
                obstacleData.rotation?.z || 0
            );
            
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;
            
            this.scene.add(obstacle);
            this.obstacles.push(obstacle);
            
            // Add obstacle to collision system
            this.collisionSystem.addStaticBody(obstacle, 'obstacle');
        }
    }

    createRings(ringsData = []) {
        const ringGeometry = new THREE.TorusGeometry(1.5, 0.2, 16, 32);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0xffd700,
            emissiveIntensity: 0.8
        });
        
        for (const data of ringsData) {
            const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            ringMesh.position.set(data.position.x, data.position.y, data.position.z);
            ringMesh.rotation.set(
                data.rotation?.x || 0,
                data.rotation?.y || 0,
                data.rotation?.z || 0
            );
            ringMesh.castShadow = true;
            ringMesh.receiveShadow = true;
            
            this.scene.add(ringMesh);
            
            // Create Ring instance with collision detection
            const ring = new Ring(
                ringMesh,
                new THREE.Vector3(data.position.x, data.position.y, data.position.z),
                new THREE.Vector3(data.rotation?.x || 0, data.rotation?.y || 0, data.rotation?.z || 0)
            );
            this.rings.push(ring);
        }
    }

    createRaptors(enemyData) {
        // Clear existing raptors
        this.raptors.forEach(raptor => raptor.dispose());
        this.raptors = [];
        
        // Create new raptors from enemy data
        enemyData.forEach(data => {
            const position = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
            const raptor = new Raptor(
                this.scene,
                this.physics,
                position,
                data.patrolRadius || 5
            );
            this.raptors.push(raptor);
        });
    }

    async createTrees() {
        const treeGeometry = new THREE.CylinderGeometry(0, 4, 20, 8);
        const trunkGeometry = new THREE.CylinderGeometry(1, 1, 8, 8);
        
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a27,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a2f1b,
            roughness: 0.9,
            metalness: 0.1
        });

        // Create trees around the perimeter
        const perimeter = 100; // Size of play area
        const spacing = 15; // Space between trees
        const offset = 5; // Random offset range

        for (let x = -perimeter; x <= perimeter; x += spacing) {
            for (let z = -perimeter; z <= perimeter; z += spacing) {
                // Only place trees on the perimeter
                if (Math.abs(x) < perimeter - spacing && Math.abs(z) < perimeter - spacing) continue;

                const randomOffset = new THREE.Vector3(
                    (Math.random() - 0.5) * offset,
                    0,
                    (Math.random() - 0.5) * offset
                );

                const tree = new THREE.Group();

                // Create trunk
                const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                trunk.position.y = 4;
                trunk.castShadow = true;
                trunk.receiveShadow = true;
                tree.add(trunk);

                // Create leaves
                const leaves = new THREE.Mesh(treeGeometry, leafMaterial);
                leaves.position.y = 14;
                leaves.castShadow = true;
                leaves.receiveShadow = true;
                tree.add(leaves);

                // Position the tree
                tree.position.set(
                    x + randomOffset.x,
                    0,
                    z + randomOffset.z
                );

                // Add random rotation for variety
                tree.rotation.y = Math.random() * Math.PI * 2;

                this.scene.add(tree);
                this.trees.push(tree);

                // Add tree to collision system
                this.collisionSystem.addStaticBody(tree, 'tree');
            }
        }
    }

    checkRingCollisions(playerBounds) {
        // Check each ring for collision
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const ring = this.rings[i];
            if (ring.intersectsBounds(playerBounds)) {
                ring.remove();
                this.rings.splice(i, 1);
                if (this.onRingCollected) {
                    this.onRingCollected();
                }
            }
        }
    }

    update(deltaTime, playerPosition) {
        // Update environment
        this.environment.update(deltaTime);
        
        // Update raptors
        this.raptors.forEach(raptor => {
            raptor.update(deltaTime);
            raptor.checkPlayerCollision(playerPosition);
        });
        
        // Update rings without collision checks (now handled in checkRingCollisions)
        this.rings.forEach(ring => {
            ring.update(deltaTime);
        });
        
        // Check lava collision
        this.environment.checkLavaCollision(playerPosition);
    }

    reset() {
        // Clear existing elements
        this.rings.forEach(ring => ring.remove());
        this.rings = [];
        
        this.raptors.forEach(raptor => raptor.dispose());
        this.raptors = [];
        
        this.platforms.forEach(platform => this.scene.remove(platform));
        this.platforms = [];
        
        this.obstacles.forEach(obstacle => this.scene.remove(obstacle));
        this.obstacles = [];
        
        this.buildings.forEach(building => {
            building.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.scene.remove(building);
        });
        this.buildings = [];
        
        this.trees.forEach(tree => {
            tree.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.scene.remove(tree);
        });
        this.trees = [];
        
        // Reset environment
        if (this.environment) {
            this.environment.dispose();
        }
        this.environment = new Environment(this.scene, this.physics);
        
        // Reset collision system
        this.collisionSystem.reset();
    }
} 