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
        this.level = new Level(this.scene, () => this.onRingCollected());
        this.player = new Player(this.scene, this.camera);

        // State management
        this.stateManager = new GameStateManager();
        this.stateManager.addState(new PlayingState(this));
        this.stateManager.addState(new GameOverState(this));

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
            ArrowRight: false
        };
        
        // Setup systems
        this.setupRenderer();
        this.setupLighting();
        this.setupEventListeners();
    }

    onRingCollected() {
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
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(5, 8, 2);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-5, 3, -2);
        this.scene.add(fillLight);
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
            // Create loading message
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
            
            // Hide loading message
            this.ui.hideMessage();
            
            // Start game
            this.stateManager.transition('playing');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.ui.showError('Unable to load level. Please refresh the page.');
            throw error; // Re-throw to trigger global error handler
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
            // Start animation loop
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
            
            // Only update if we have required components
            if (this.stateManager && this.renderer && this.scene && this.camera) {
                this.stateManager.update(deltaTime);
                this.stateManager.render();
            }
        } catch (error) {
            console.error('Error in animation loop:', error);
            this.ui.showError('Something went wrong. Please refresh the page.');
        }
    }
} 