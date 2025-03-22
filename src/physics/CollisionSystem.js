import * as THREE from 'three';

export class CollisionSystem {
    constructor() {
        this.staticBodies = [];
        this.dynamicBodies = [];
        this.tempBox = new THREE.Box3();
        this.tempVec = new THREE.Vector3();
        this.gravity = -9.81; // m/s²
        this.groundLevel = 0;
    }

    addStaticBody(mesh, type = 'obstacle') {
        const body = {
            mesh,
            type,
            boundingBox: new THREE.Box3().setFromObject(mesh),
            isStatic: true
        };
        this.staticBodies.push(body);
        return body;
    }

    addDynamicBody(mesh, type = 'player') {
        const body = {
            mesh,
            type,
            boundingBox: new THREE.Box3().setFromObject(mesh),
            velocity: new THREE.Vector3(),
            isGrounded: false,
            isStatic: false
        };
        this.dynamicBodies.push(body);
        return body;
    }

    removeBody(body) {
        const staticIndex = this.staticBodies.indexOf(body);
        if (staticIndex !== -1) {
            this.staticBodies.splice(staticIndex, 1);
            return;
        }

        const dynamicIndex = this.dynamicBodies.indexOf(body);
        if (dynamicIndex !== -1) {
            this.dynamicBodies.splice(dynamicIndex, 1);
        }
    }

    update(deltaTime) {
        // Update dynamic bodies with physics
        for (const body of this.dynamicBodies) {
            // Store previous position for collision resolution
            const previousPosition = body.mesh.position.clone();
            
            // Apply gravity if not grounded
            if (!body.isGrounded) {
                body.velocity.y += this.gravity * deltaTime;
            }
            
            // Update position based on velocity
            body.mesh.position.addScaledVector(body.velocity, deltaTime);
            
            // Update bounding box
            body.boundingBox.setFromObject(body.mesh);
            
            // Check ground collision
            if (body.mesh.position.y <= this.groundLevel) {
                body.mesh.position.y = this.groundLevel;
                body.velocity.y = 0;
                body.isGrounded = true;
            } else {
                body.isGrounded = false;
            }
            
            // Check collisions with static bodies
            let hasCollision = false;
            for (const staticBody of this.staticBodies) {
                if (body.boundingBox.intersectsBox(staticBody.boundingBox)) {
                    hasCollision = true;
                    
                    // Handle different collision types
                    switch (staticBody.type) {
                        case 'building':
                        case 'obstacle':
                            // Revert position on collision
                            body.mesh.position.copy(previousPosition);
                            body.boundingBox.setFromObject(body.mesh);
                            break;
                            
                        case 'platform':
                            // Check if landing on top of platform
                            const platformTop = staticBody.boundingBox.max.y;
                            if (previousPosition.y >= platformTop && body.velocity.y <= 0) {
                                body.mesh.position.y = platformTop;
                                body.velocity.y = 0;
                                body.isGrounded = true;
                            } else {
                                // Side collision
                                body.mesh.position.copy(previousPosition);
                            }
                            body.boundingBox.setFromObject(body.mesh);
                            break;
                    }
                }
            }
        }
    }

    jump(body, jumpForce = 5) {
        if (body.isGrounded) {
            body.velocity.y = jumpForce;
            body.isGrounded = false;
        }
    }

    reset() {
        this.staticBodies = [];
        this.dynamicBodies = [];
    }
} 