import * as THREE from '../node_modules/three/build/three.module.js';
import { Enemy } from './enemy.js';

export class Level {
    constructor(scene, ui) {
        this.scene = scene;
        this.ui = ui;
        this.rings = [];
        this.enemies = [];
        this.obstacles = [];
        this.platforms = [];
        
        // Create texture loader
        this.textureLoader = new THREE.TextureLoader();
    }

    async loadLevel(levelNumber) {
        try {
            // Clear existing level
            this.reset();

            // Load level data
            const response = await fetch(`/data/level${levelNumber}.json`);
            if (!response.ok) {
                throw new Error('Unable to load level data');
            }
            const levelData = await response.json();

            // Create ground
            const groundGeometry = new THREE.PlaneGeometry(
                levelData.environment.groundSize.width,
                levelData.environment.groundSize.depth
            );
            
            // Load and configure grass texture
            const grassTexture = this.textureLoader.load('/textures/grass.jpg');
            grassTexture.wrapS = THREE.RepeatWrapping;
            grassTexture.wrapT = THREE.RepeatWrapping;
            grassTexture.repeat.set(20, 20); // Adjust based on ground size
            
            const groundMaterial = new THREE.MeshStandardMaterial({
                map: grassTexture,
                color: parseInt(levelData.environment.groundColor),
                roughness: 0.8,
                metalness: 0.2
            });
            
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            this.scene.add(ground);

            // Create terrain
            if (levelData.terrain) {
                // Create platforms
                if (levelData.terrain.platforms) {
                    for (const platformData of levelData.terrain.platforms) {
                        const platform = this.createPlatform(platformData);
                        this.platforms.push(platform);
                        this.scene.add(platform);
                    }
                }

                // Create obstacles
                if (levelData.terrain.obstacles) {
                    for (const obstacleData of levelData.terrain.obstacles) {
                        const obstacle = this.createObstacle(obstacleData);
                        if (obstacle) {
                            this.obstacles.push(obstacle);
                            this.scene.add(obstacle);
                        }
                    }
                }
            }

            // Create rings
            for (const ringData of levelData.rings) {
                const ring = this.createRing(ringData);
                this.rings.push(ring);
                this.scene.add(ring);
            }

            // Create enemies
            for (const enemyData of levelData.enemies) {
                const enemy = new Enemy(this.scene, enemyData);
                this.enemies.push(enemy);
            }

            // Set sky color
            this.scene.background = new THREE.Color(parseInt(levelData.environment.skyColor));

            return levelData.playerStart;

        } catch (error) {
            console.error('Error loading level:', error);
            throw error;
        }
    }

    createPlatform(data) {
        let geometry;
        if (data.type === 'ramp') {
            // Create custom geometry for ramp
            geometry = new THREE.BoxGeometry(data.size.width, data.size.height, data.size.depth);
        } else {
            geometry = new THREE.BoxGeometry(data.size.width, data.size.height, data.size.depth);
        }

        const material = new THREE.MeshStandardMaterial({
            color: parseInt(data.color),
            roughness: 0.7,
            metalness: 0.3
        });

        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(data.position.x, data.position.y, data.position.z);
        platform.rotation.set(
            THREE.MathUtils.degToRad(data.rotation.x),
            THREE.MathUtils.degToRad(data.rotation.y),
            THREE.MathUtils.degToRad(data.rotation.z)
        );
        platform.castShadow = true;
        platform.receiveShadow = true;

        return platform;
    }

    createObstacle(data) {
        let geometry, material;

        switch (data.type) {
            case 'building':
                // Create a building with windows
                const building = new THREE.Group();
                
                // Main building structure
                geometry = new THREE.BoxGeometry(data.size.width, data.size.height, data.size.depth);
                material = new THREE.MeshStandardMaterial({
                    color: parseInt(data.color),
                    roughness: 0.7,
                    metalness: 0.3
                });
                const mainStructure = new THREE.Mesh(geometry, material);
                building.add(mainStructure);

                // Add windows
                const windowMaterial = new THREE.MeshStandardMaterial({
                    color: 0xFFFFFF,
                    emissive: 0x555555,
                    metalness: 0.9,
                    roughness: 0.1
                });

                const windowSize = { width: 1, height: 1.5, depth: 0.1 };
                const windowSpacing = 2;
                const startHeight = 2;

                for (let y = startHeight; y < data.size.height - 2; y += windowSpacing) {
                    for (let x = -data.size.width/3; x <= data.size.width/3; x += windowSpacing) {
                        for (let z = -data.size.depth/3; z <= data.size.depth/3; z += windowSpacing) {
                            const windowGeom = new THREE.BoxGeometry(windowSize.width, windowSize.height, windowSize.depth);
                            const windowMesh = new THREE.Mesh(windowGeom, windowMaterial);
                            windowMesh.position.set(x, y, data.size.depth/2 + 0.1);
                            building.add(windowMesh);
                            
                            // Add window to other side
                            const windowMesh2 = windowMesh.clone();
                            windowMesh2.position.z = -data.size.depth/2 - 0.1;
                            building.add(windowMesh2);
                        }
                    }
                }

                building.position.set(data.position.x, data.position.y, data.position.z);
                building.rotation.set(
                    THREE.MathUtils.degToRad(data.rotation.x),
                    THREE.MathUtils.degToRad(data.rotation.y),
                    THREE.MathUtils.degToRad(data.rotation.z)
                );
                building.castShadow = true;
                building.receiveShadow = true;
                return building;

            case 'box':
                geometry = new THREE.BoxGeometry(data.size.width, data.size.height, data.size.depth);
                break;

            case 'cylinder':
                geometry = new THREE.CylinderGeometry(data.size.radius, data.size.radius, data.size.height, 32);
                break;

            default:
                console.warn('Unknown obstacle type:', data.type);
                return null;
        }

        material = new THREE.MeshStandardMaterial({
            color: parseInt(data.color),
            roughness: 0.7,
            metalness: 0.3
        });

        const obstacle = new THREE.Mesh(geometry, material);
        obstacle.position.set(data.position.x, data.position.y, data.position.z);
        obstacle.rotation.set(
            THREE.MathUtils.degToRad(data.rotation.x),
            THREE.MathUtils.degToRad(data.rotation.y),
            THREE.MathUtils.degToRad(data.rotation.z)
        );
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;

        return obstacle;
    }

    createRing(data) {
        const geometry = new THREE.TorusGeometry(2, 0.2, 16, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0xFFD700,
            emissiveIntensity: 0.2
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.position.set(data.position.x, data.position.y, data.position.z);
        ring.rotation.set(
            THREE.MathUtils.degToRad(data.rotation.x),
            THREE.MathUtils.degToRad(data.rotation.y),
            THREE.MathUtils.degToRad(data.rotation.z)
        );
        ring.castShadow = true;
        ring.receiveShadow = true;
        
        // Add a point light inside the ring
        const light = new THREE.PointLight(0xFFD700, 1, 5);
        light.position.copy(ring.position);
        this.scene.add(light);
        
        return ring;
    }

    update(playerPosition) {
        // Update enemies
        for (const enemy of this.enemies) {
            enemy.update(playerPosition);
            
            // Check for collision with player
            const distance = enemy.mesh.position.distanceTo(playerPosition);
            if (distance < 2) {
                return true; // Game over
            }
        }

        // Check ring collection
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const ring = this.rings[i];
            const distance = ring.position.distanceTo(playerPosition);
            if (distance < 2) {
                this.scene.remove(ring);
                this.rings.splice(i, 1);
                if (this.rings.length === 0) {
                    this.ui.showMessage('Level Complete!');
                    return true;
                }
            }
        }

        return false;
    }

    reset() {
        // Remove all objects from the scene
        for (const ring of this.rings) {
            this.scene.remove(ring);
        }
        for (const enemy of this.enemies) {
            enemy.remove();
        }
        for (const obstacle of this.obstacles) {
            this.scene.remove(obstacle);
        }
        for (const platform of this.platforms) {
            this.scene.remove(platform);
        }

        this.rings = [];
        this.enemies = [];
        this.obstacles = [];
        this.platforms = [];
    }
} 