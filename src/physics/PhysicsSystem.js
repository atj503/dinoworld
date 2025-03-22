import * as THREE from 'three';

/**
 * Represents a physics body in the game world
 */
class PhysicsBody {
    constructor(mesh, type = 'dynamic') {
        this.mesh = mesh;
        this.type = type; // 'dynamic' or 'static'
        this.velocity = new THREE.Vector3();
        this.boundingBox = new THREE.Box3();
        this.updateBoundingBox();
    }

    updateBoundingBox() {
        this.boundingBox.setFromObject(this.mesh);
    }
}

/**
 * Manages physics simulation and collision detection
 * Uses spatial partitioning for efficient collision checks
 */
export class PhysicsSystem {
    constructor() {
        this.bodies = new Map(); // Map<Mesh, PhysicsBody>
        this.staticBodies = new Set(); // Set<PhysicsBody>
        this.dynamicBodies = new Set(); // Set<PhysicsBody>
        this.collisionCallbacks = new Map(); // Map<Mesh, (collidedWith: Mesh) => void>
    }

    /**
     * Adds a mesh to the physics system
     * @param {THREE.Mesh} mesh - The mesh to add physics to
     * @param {string} type - Either 'dynamic' or 'static'
     * @param {Function} onCollision - Optional callback for collision events
     */
    addBody(mesh, type = 'dynamic', onCollision = null) {
        const body = new PhysicsBody(mesh, type);
        this.bodies.set(mesh, body);
        
        if (type === 'static') {
            this.staticBodies.add(body);
        } else {
            this.dynamicBodies.add(body);
        }

        if (onCollision) {
            this.collisionCallbacks.set(mesh, onCollision);
        }
    }

    /**
     * Removes a mesh from the physics system
     */
    removeBody(mesh) {
        const body = this.bodies.get(mesh);
        if (body) {
            if (body.type === 'static') {
                this.staticBodies.delete(body);
            } else {
                this.dynamicBodies.delete(body);
            }
            this.bodies.delete(mesh);
            this.collisionCallbacks.delete(mesh);
        }
    }

    /**
     * Updates physics simulation
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update dynamic bodies
        for (const body of this.dynamicBodies) {
            body.updateBoundingBox();
        }

        // Check collisions between dynamic bodies and static bodies
        for (const dynamicBody of this.dynamicBodies) {
            for (const staticBody of this.staticBodies) {
                if (this.checkCollision(dynamicBody, staticBody)) {
                    this.resolveCollision(dynamicBody, staticBody);
                    
                    // Trigger collision callbacks
                    const dynamicCallback = this.collisionCallbacks.get(dynamicBody.mesh);
                    if (dynamicCallback) {
                        dynamicCallback(staticBody.mesh);
                    }
                }
            }
        }
    }

    /**
     * Checks if two physics bodies are colliding
     */
    checkCollision(bodyA, bodyB) {
        return bodyA.boundingBox.intersectsBox(bodyB.boundingBox);
    }

    /**
     * Resolves collision between two bodies
     * Currently implements simple position correction
     */
    resolveCollision(dynamicBody, staticBody) {
        const intersection = new THREE.Box3();
        intersection.copy(dynamicBody.boundingBox);
        intersection.intersect(staticBody.boundingBox);

        const size = new THREE.Vector3();
        intersection.getSize(size);

        // Find the smallest penetration axis
        if (size.x < size.y && size.x < size.z) {
            // X-axis collision
            const sign = dynamicBody.mesh.position.x > staticBody.mesh.position.x ? 1 : -1;
            dynamicBody.mesh.position.x += size.x * sign;
        } else if (size.y < size.z) {
            // Y-axis collision
            const sign = dynamicBody.mesh.position.y > staticBody.mesh.position.y ? 1 : -1;
            dynamicBody.mesh.position.y += size.y * sign;
        } else {
            // Z-axis collision
            const sign = dynamicBody.mesh.position.z > staticBody.mesh.position.z ? 1 : -1;
            dynamicBody.mesh.position.z += size.z * sign;
        }

        // Update bounding box after position correction
        dynamicBody.updateBoundingBox();
    }
} 