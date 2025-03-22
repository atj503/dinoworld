import * as THREE from 'three';
import { Player } from './player.js';
import { Level } from './level.js';
import { UI } from './ui.js';
import { Game } from './Game.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Add axes helper for debugging
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// Camera setup - positioned higher and further back for 3rd person view
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 12); // Position camera higher and further back for larger model
camera.lookAt(0, 0, 0);

// Renderer setup
const canvas = document.getElementById('game-canvas');
if (!canvas) {
    document.body.innerHTML = '<div style="color: white; text-align: center; margin-top: 2em;">Unable to initialize game. Please refresh the page.</div>';
    throw new Error('Canvas element not found');
}
const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    antialias: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Increased ambient light
scene.add(ambientLight);

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
scene.add(directionalLight);

// Add a fill light from the other side
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-5, 3, -2);
scene.add(fillLight);

// Create UI
const ui = new UI();

// Create level manager with UI
const level = new Level(scene, ui);

// Create player
const player = new Player(scene);

// Game state
let gameOver = false;
let clock = new THREE.Clock();

// Input state
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false
};

// Handle keyboard input
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    switch(key) {
        case 'w':
        case 'arrowup':
            keys.w = true;
            keys.ArrowUp = true;
            break;
        case 'a':
        case 'arrowleft':
            keys.a = true;
            keys.ArrowLeft = true;
            break;
        case 's':
        case 'arrowdown':
            keys.s = true;
            keys.ArrowDown = true;
            break;
        case 'd':
        case 'arrowright':
            keys.d = true;
            keys.ArrowRight = true;
            break;
    }
});

window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    switch(key) {
        case 'w':
        case 'arrowup':
            keys.w = false;
            keys.ArrowUp = false;
            break;
        case 'a':
        case 'arrowleft':
            keys.a = false;
            keys.ArrowLeft = false;
            break;
        case 's':
        case 'arrowdown':
            keys.s = false;
            keys.ArrowDown = false;
            break;
        case 'd':
        case 'arrowright':
            keys.d = false;
            keys.ArrowRight = false;
            break;
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Reset game
function resetGame() {
    gameOver = false;
    level.reset();
    init();
}

// Load initial level
async function init() {
    try {
        const playerStart = await level.loadLevel(1);
        if (player.mesh) {
            player.reset(new THREE.Vector3(playerStart.x, playerStart.y, playerStart.z));
        }
        ui.hideMessage();
    } catch (error) {
        ui.showError('Unable to load level. Please refresh the page.');
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (!gameOver) {
        const delta = clock.getDelta();
        
        // Update player
        player.update(delta, keys);
        
        // Update level (includes enemies and collisions)
        const playerPos = player.getPosition();
        if (level.update(playerPos)) {
            gameOver = true;
            setTimeout(resetGame, 1500);
        }
        
        // Update camera to follow player smoothly
        const idealOffset = new THREE.Vector3(0, 7, 15); // Centered behind player
        const idealLookat = new THREE.Vector3(0, 2, 0); // Looking slightly above player
        
        // Get player rotation and predict future rotation based on turn speed
        const playerRotation = player.mesh ? player.mesh.rotation.y : 0;
        const turnSpeed = Math.abs(player.getTurnSpeed());
        
        // Calculate current camera angle relative to player
        const currentCameraAngle = Math.atan2(
            camera.position.x - playerPos.x,
            camera.position.z - playerPos.z
        );
        
        // Calculate desired camera angle
        const targetAngle = playerRotation + Math.PI; // Camera should be behind player
        
        // Calculate the shortest angle difference
        let angleDiff = targetAngle - currentCameraAngle;
        angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
        
        // Calculate camera speed based on angle difference
        const maxAngleDiff = Math.PI / 2; // 90 degrees
        const angleRatio = Math.min(Math.abs(angleDiff) / maxAngleDiff, 1);
        const lerpFactor = Math.min(0.15 + angleRatio * 0.25, 0.4);
        
        // Apply rotation to ideal offset
        idealOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation);
        idealLookat.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation);
        
        // Add player position to get world space coordinates
        idealOffset.add(playerPos);
        idealLookat.add(playerPos);
        
        // Apply camera movement with increased speed when falling behind
        camera.position.lerp(idealOffset, lerpFactor);
        const currentLookat = new THREE.Vector3();
        currentLookat.copy(playerPos).add(idealLookat);
        
        // Smooth look-at with faster rotation when angle difference is large
        const currentTarget = new THREE.Vector3();
        camera.getWorldDirection(currentTarget);
        const targetDirection = currentLookat.clone().sub(camera.position).normalize();
        const lookAtLerp = currentTarget.lerp(targetDirection, lerpFactor * 1.5);
        camera.lookAt(camera.position.clone().add(lookAtLerp.multiplyScalar(10)));
    }
    
    renderer.render(scene, camera);
}

// Error handling for runtime errors
window.addEventListener('error', (event) => {
    ui.showError();
    event.preventDefault();
});

// Create and start the game
const game = new Game();
game.start();
