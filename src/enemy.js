import * as THREE from 'three';

export class Enemy {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        this.type = data.type;
        this.speed = data.speed;
        
        // Create enemy mesh (red cube)
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Set initial position
        this.mesh.position.set(
            data.position.x,
            data.position.y,
            data.position.z
        );
        
        // Add to scene
        scene.add(this.mesh);
        
        // Patrol-specific properties
        if (this.type === 'patrol') {
            this.patrolPoints = data.patrolPoints;
            this.currentPoint = 0;
            this.direction = 1; // 1 for forward, -1 for backward
        }
        
        // Chase-specific properties
        if (this.type === 'chase') {
            this.detectionRange = data.detectionRange;
            this.isChasing = false;
        }
    }
    
    update(playerPosition) {
        if (this.type === 'patrol') {
            this.updatePatrol();
        } else if (this.type === 'chase') {
            this.updateChase(playerPosition);
        }
    }
    
    updatePatrol() {
        const targetPoint = this.patrolPoints[this.currentPoint];
        const position = this.mesh.position;
        
        // Calculate direction to target
        const direction = new THREE.Vector3(
            targetPoint.x - position.x,
            0,
            targetPoint.z - position.z
        );
        
        // Check if we're close to the target point
        if (direction.length() < 0.1) {
            // Switch direction at endpoints
            if (this.currentPoint === 0 || this.currentPoint === this.patrolPoints.length - 1) {
                this.direction *= -1;
            }
            this.currentPoint = Math.max(0, Math.min(
                this.currentPoint + this.direction,
                this.patrolPoints.length - 1
            ));
            return;
        }
        
        // Move towards target point
        direction.normalize();
        position.add(direction.multiplyScalar(this.speed));
        
        // Rotate enemy to face movement direction
        this.mesh.lookAt(targetPoint.x, position.y, targetPoint.z);
    }
    
    updateChase(playerPosition) {
        const position = this.mesh.position;
        const distanceToPlayer = position.distanceTo(playerPosition);
        
        // Check if player is within detection range
        if (distanceToPlayer < this.detectionRange) {
            this.isChasing = true;
        } else if (distanceToPlayer > this.detectionRange * 1.5) {
            // Stop chasing if player gets too far
            this.isChasing = false;
        }
        
        if (this.isChasing) {
            // Calculate direction to player
            const direction = new THREE.Vector3(
                playerPosition.x - position.x,
                0,
                playerPosition.z - position.z
            );
            
            // Move towards player
            direction.normalize();
            position.add(direction.multiplyScalar(this.speed));
            
            // Rotate enemy to face player
            this.mesh.lookAt(playerPosition.x, position.y, playerPosition.z);
        }
    }
    
    checkCollision(playerPosition) {
        const collisionDistance = 1.5;
        return this.mesh.position.distanceTo(playerPosition) < collisionDistance;
    }
} 