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
        this.camera.position.set(0, 5, 12);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.setupRenderer();

        // Lighting setup
        this.setupLighting();

        // Systems setup
        this.physics = new PhysicsSystem();
        this.ui = new UI();
        this.level = new Level(this.scene, this.ui, this.physics);
        this.player = new Player(this.scene);

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

        // Event listeners
        this.setupEventListeners();
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

    updateCamera(deltaTime) {
        const playerPos = this.player.getPosition();
        const idealOffset = new THREE.Vector3(0, 7, 15);
        const idealLookat = new THREE.Vector3(0, 2, 0);
        
        const playerRotation = this.player.mesh ? this.player.mesh.rotation.y : 0;
        const turnSpeed = Math.abs(this.player.getTurnSpeed());
        
        const currentCameraAngle = Math.atan2(
            this.camera.position.x - playerPos.x,
            this.camera.position.z - playerPos.z
        );
        
        const targetAngle = playerRotation + Math.PI;
        let angleDiff = targetAngle - currentCameraAngle;
        angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
        
        const maxAngleDiff = Math.PI / 2;
        const angleRatio = Math.min(Math.abs(angleDiff) / maxAngleDiff, 1);
        const lerpFactor = Math.min(0.15 + angleRatio * 0.25, 0.4);
        
        idealOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation);
        idealLookat.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation);
        
        idealOffset.add(playerPos);
        idealLookat.add(playerPos);
        
        this.camera.position.lerp(idealOffset, lerpFactor);
        const currentLookat = new THREE.Vector3();
        currentLookat.copy(playerPos).add(idealLookat);
        
        const currentTarget = new THREE.Vector3();
        this.camera.getWorldDirection(currentTarget);
        const targetDirection = currentLookat.clone().sub(this.camera.position).normalize();
        const lookAtLerp = currentTarget.lerp(targetDirection, lerpFactor * 1.5);
        this.camera.lookAt(this.camera.position.clone().add(lookAtLerp.multiplyScalar(10)));
    }

    async init() {
        try {
            const playerStart = await this.level.loadLevel(1);
            if (this.player.mesh) {
                this.player.reset(new THREE.Vector3(playerStart.x, playerStart.y, playerStart.z));
            }
            this.stateManager.transition('playing');
        } catch (error) {
            this.ui.showError('Unable to load level. Please refresh the page.');
        }
    }

    reset() {
        this.level.reset();
        this.init();
    }

    start() {
        this.init().then(() => {
            this.animate();
        }).catch(() => {
            this.ui.showError();
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const deltaTime = this.clock.getDelta();
        this.stateManager.update(deltaTime);
        this.stateManager.render();
    }
} 