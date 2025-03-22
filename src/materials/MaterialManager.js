import * as THREE from 'three';

export class MaterialManager {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.textures = new Map();
        this.materials = new Map();
    }

    async loadTexture(name, url, options = {}) {
        try {
            const texture = await this.textureLoader.loadAsync(url);
            
            // Apply common texture settings
            texture.wrapS = options.wrapS || THREE.RepeatWrapping;
            texture.wrapT = options.wrapT || THREE.RepeatWrapping;
            texture.repeat.set(options.repeatX || 1, options.repeatY || 1);
            
            if (options.generateMipmaps !== false) {
                texture.generateMipmaps = true;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
            }
            
            if (options.anisotropy) {
                texture.anisotropy = options.anisotropy;
            }
            
            this.textures.set(name, texture);
            return texture;
        } catch (error) {
            console.error(`Failed to load texture ${name} from ${url}:`, error);
            return null;
        }
    }

    async createGroundMaterial() {
        const material = new THREE.MeshStandardMaterial({
            color: 0x7da87d,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide,
            shadowSide: THREE.DoubleSide
        });

        this.materials.set('ground', material);
        return material;
    }

    async createBuildingMaterial() {
        const material = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.7,
            metalness: 0.2,
            side: THREE.FrontSide,
            shadowSide: THREE.FrontSide
        });

        this.materials.set('building', material);
        return material;
    }

    async createWindowMaterial() {
        const material = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            emissive: 0x88ccff,
            emissiveIntensity: 0.3,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            shadowSide: THREE.DoubleSide
        });

        this.materials.set('window', material);
        return material;
    }

    async createRingMaterial() {
        const material = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffd700,
            emissiveIntensity: 0.5,
            metalness: 1.0,
            roughness: 0.3,
            side: THREE.DoubleSide,
            shadowSide: THREE.DoubleSide
        });

        this.materials.set('ring', material);
        return material;
    }

    getMaterial(name) {
        return this.materials.get(name);
    }

    dispose() {
        // Properly dispose of all textures and materials
        this.textures.forEach(texture => texture.dispose());
        this.materials.forEach(material => material.dispose());
        this.textures.clear();
        this.materials.clear();
    }
} 