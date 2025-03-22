import * as THREE from 'three';
import { Player } from './player.js';
import { Level } from './level.js';
import { UI } from './ui/UI.js';
import { PhysicsSystem } from './physics/PhysicsSystem.js';
import { GameStateManager, PlayingState, GameOverState } from './core/GameStateManager.js';

export class Game {
    constructor() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Systems setup
        this.physics = new PhysicsSystem();
        this.ui = new UI();
        this.level = new Level(this.scene, this.physics, () => this.onRingCollected());
        this.player = new Player(this.scene, this.camera);

        // State management
        this.stateManager = new GameStateManager();
        this.stateManager.addState(new PlayingState(this));
        this.stateManager.addState(new GameOverState(this));
        this.stateManager.transition('playing');

        // Game state
        this.clock = new THREE.Clock();
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            ArrowUp: false,
            ArrowLeft: false,
            ArrowDown: false,
            ArrowRight: false,
            ' ': false,
            'Shift': false
        };
        
        // Setup systems
        this.setupRenderer();
        this.setupLighting();
        this.setupEventListeners();

        // Setup game state manager with new conditions
        this.gameStateManager = {
            gameOver: false,
            gameOverReason: '',
            score: 0,
            timeRemaining: 120, // 2 minutes
            
            triggerGameOver: (reason) => {
                this.gameStateManager.gameOver = true;
                this.gameStateManager.gameOverReason = reason;
                this.showGameOverScreen(reason);
            },
            
            reset: () => {
                this.gameStateManager.gameOver = false;
                this.gameStateManager.gameOverReason = '';
                this.gameStateManager.score = 0;
                this.gameStateManager.timeRemaining = 120;
            }
        };

        // Initialize scene with improved lighting for volcanic environment
        this.initScene();
        this.initLighting();
    }

    onRingCollected() {
        this.ui.addScore(10);
        // Check if all rings are collected
        if (this.level.rings.length === 0) {
            this.ui.showMessage('Level Complete!');
            this.stateManager.transition('gameOver');
        }
    }

    setupRenderer() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            document.body.innerHTML = '<div style="color: white; text-align: center; margin-top: 2em;">Unable to initialize game. Please refresh the page.</div>';
            throw new Error('Canvas element not found');
        }

        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.setClearColor(0x666666); // Darker sky color for volcanic atmosphere
    }

    setupLighting() {
        // Main directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffa95c, 1);
        this.directionalLight.position.set(-50, 100, 50);
        this.directionalLight.castShadow = true;
        
        // Improve shadow quality
        this.directionalLight.shadow.mapSize.width = 4096;
        this.directionalLight.shadow.mapSize.height = 4096;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.directionalLight.shadow.bias = -0.0001;
        
        this.scene.add(this.directionalLight);

        // Ambient light for base visibility
        this.ambientLight = new THREE.AmbientLight(0x666666, 0.5);
        this.scene.add(this.ambientLight);

        // Add red point light for lava glow
        this.lavaLight = new THREE.PointLight(0xff4400, 1, 50);
        this.lavaLight.position.set(0, 2, 0);
        this.scene.add(this.lavaLight);

        // Add hemisphere light for sky color
        this.hemisphereLight = new THREE.HemisphereLight(0xffeeb1, 0xff4400, 0.6);
        this.scene.add(this.hemisphereLight);
    }

    setupEventListeners() {
        // Keyboard input
        window.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            switch(key) {
                case 'w':
                case 'arrowup':
                    this.keys.w = true;
                    this.keys.ArrowUp = true;
                    break;
                case 'a':
                case 'arrowleft':
                    this.keys.a = true;
                    this.keys.ArrowLeft = true;
                    break;
                case 's':
                case 'arrowdown':
                    this.keys.s = true;
                    this.keys.ArrowDown = true;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.d = true;
                    this.keys.ArrowRight = true;
                    break;
                case ' ':
                    this.keys[' '] = true;
                    if (this.stateManager.currentState.name === 'gameOver') {
                        this.reset();
                    }
                    break;
                case 'shift':
                    this.keys['Shift'] = true;
                    break;
            }
        });

        window.addEventListener('keyup', (event) => {
            const key = event.key.toLowerCase();
            switch(key) {
                case 'w':
                case 'arrowup':
                    this.keys.w = false;
                    this.keys.ArrowUp = false;
                    break;
                case 'a':
                case 'arrowleft':
                    this.keys.a = false;
                    this.keys.ArrowLeft = false;
                    break;
                case 's':
                case 'arrowdown':
                    this.keys.s = false;
                    this.keys.ArrowDown = false;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.d = false;
                    this.keys.ArrowRight = false;
                    break;
                case ' ':
                    this.keys[' '] = false;
                    break;
                case 'shift':
                    this.keys['Shift'] = false;
                    break;
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Game restart
        window.addEventListener('gameRestart', () => {
            this.reset();
            this.stateManager.transition('playing');
        });

        // Error handling
        window.addEventListener('error', (event) => {
            this.ui.showError();
            event.preventDefault();
        });
    }

    async init() {
        try {
            this.ui.showMessage('Loading game...');
            
            // Load level first and ensure we have valid start coordinates
            const playerStart = await this.level.loadLevel(1);
            if (!playerStart || typeof playerStart.x === 'undefined') {
                throw new Error('Invalid player start position from level data');
            }
            
            // Wait for player model to initialize
            await new Promise((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 50; // 5 seconds maximum wait
                
                const checkPlayer = () => {
                    attempts++;
                    if (this.player && this.player.isLoaded) {
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        reject(new Error('Timeout waiting for player model to load'));
                    } else {
                        setTimeout(checkPlayer, 100);
                    }
                };
                checkPlayer();
            });
            
            // Reset player position with safe coordinates
            const startPosition = new THREE.Vector3(
                playerStart.x || 0,
                playerStart.y || 0,
                playerStart.z || 0
            );
            
            if (this.player && this.player.mesh) {
                this.player.reset(startPosition);
            } else {
                throw new Error('Player or player mesh not initialized');
            }
            
            // Start game
            this.ui.reset();
            this.ui.hideMessage();
            this.stateManager.transition('playing');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.ui.showError('Unable to load level. Please refresh the page.');
            throw error;
        }
    }

    reset() {
        try {
            if (this.level) {
                this.level.reset();
            }
            this.init().catch(error => {
                console.error('Failed to reset game:', error);
                this.ui.showError('Unable to reset game. Please refresh the page.');
            });
        } catch (error) {
            console.error('Failed to reset game:', error);
            this.ui.showError('Unable to reset game. Please refresh the page.');
        }
    }

    start() {
        console.log('Starting game...');
        this.init().then(() => {
            console.log('Game initialized successfully');
            this.animate();
        }).catch(error => {
            console.error('Failed to start game:', error);
            this.ui.showError('Unable to start game. Please refresh the page.');
        });
    }

    animate() {
        try {
            requestAnimationFrame(() => this.animate());
            const deltaTime = this.clock.getDelta();
            
            if (this.stateManager && this.renderer && this.scene && this.camera) {
                // Update game state
                this.stateManager.update(deltaTime);
                
                // Update UI timer
                if (this.stateManager.currentState.name === 'playing') {
                    this.ui.updateTime(deltaTime);
                }
                
                // Render scene
                this.renderer.render(this.scene, this.camera);
            }
        } catch (error) {
            console.error('Error in animation loop:', error);
            this.ui.showError('Something went wrong. Please refresh the page.');
        }
    }

    initScene() {
        // ... existing scene initialization ...

        // Set a darker sky color for volcanic atmosphere
        this.renderer.setClearColor(0x666666);
    }

    initLighting() {
        // Main directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffa95c, 1);
        this.directionalLight.position.set(-50, 100, 50);
        this.directionalLight.castShadow = true;
        
        // Improve shadow quality
        this.directionalLight.shadow.mapSize.width = 4096;
        this.directionalLight.shadow.mapSize.height = 4096;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.directionalLight.shadow.bias = -0.0001;
        
        this.scene.add(this.directionalLight);

        // Ambient light for base visibility
        this.ambientLight = new THREE.AmbientLight(0x666666, 0.5);
        this.scene.add(this.ambientLight);

        // Add red point light for lava glow
        this.lavaLight = new THREE.PointLight(0xff4400, 1, 50);
        this.lavaLight.position.set(0, 2, 0);
        this.scene.add(this.lavaLight);

        // Add hemisphere light for sky color
        this.hemisphereLight = new THREE.HemisphereLight(0xffeeb1, 0xff4400, 0.6);
        this.scene.add(this.hemisphereLight);
    }

    showGameOverScreen(reason) {
        // Create or update game over UI
        if (!this.gameOverElement) {
            this.gameOverElement = document.createElement('div');
            this.gameOverElement.style.position = 'absolute';
            this.gameOverElement.style.top = '50%';
            this.gameOverElement.style.left = '50%';
            this.gameOverElement.style.transform = 'translate(-50%, -50%)';
            this.gameOverElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            this.gameOverElement.style.color = 'white';
            this.gameOverElement.style.padding = '20px';
            this.gameOverElement.style.borderRadius = '10px';
            this.gameOverElement.style.textAlign = 'center';
            document.body.appendChild(this.gameOverElement);
        }

        this.gameOverElement.innerHTML = `
            <h2>Game Over</h2>
            <p>${reason}</p>
            <p>Score: ${this.gameStateManager.score}</p>
            <button onclick="location.reload()">Try Again</button>
        `;
        this.gameOverElement.style.display = 'block';
    }

    update(deltaTime) {
        if (this.gameStateManager.gameOver) {
            // Slow down camera movement when game is over
            if (this.camera) {
                this.camera.position.y *= 0.95;
            }
            return;
        }

        // Update game timer
        this.gameStateManager.timeRemaining -= deltaTime;
        if (this.gameStateManager.timeRemaining <= 0) {
            this.gameStateManager.triggerGameOver('Time\'s up!');
            return;
        }

        // Update UI
        if (this.ui) {
            this.ui.updateTimer(Math.max(0, Math.floor(this.gameStateManager.timeRemaining)));
            this.ui.updateScore(this.gameStateManager.score);
        }

        // Update level and check collisions
        if (this.level) {
            this.level.update(deltaTime, this.player.position);
        }

        // Update player movement and camera
        if (this.player) {
            this.player.update(deltaTime);
        }

        // Animate lava light
        if (this.lavaLight) {
            this.lavaLight.intensity = 1 + Math.sin(Date.now() * 0.002) * 0.2;
        }
    }
} 