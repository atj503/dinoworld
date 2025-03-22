/**
 * Represents a game state (e.g., Playing, GameOver, Paused)
 */
export class GameState {
    constructor(name) {
        this.name = name;
    }

    enter() {}
    exit() {}
    update(deltaTime) {}
    render() {}
}

/**
 * Playing state - handles normal gameplay
 */
export class PlayingState extends GameState {
    constructor(game) {
        super('playing');
        this.game = game;
    }

    enter() {
        this.game.ui.hideMessage();
    }

    update(deltaTime) {
        // Get all static obstacles
        const obstacles = [
            ...this.game.level.platforms,
            ...this.game.level.obstacles,
            ...this.game.level.trees
        ];
        
        // Update player with obstacles for collision detection
        this.game.player.update(deltaTime, this.game.keys, obstacles);
        
        // Update physics
        this.game.physics.update(deltaTime);
        
        // Update level (includes enemies)
        const playerPos = this.game.player.getPosition();
        if (this.game.level.update(deltaTime, playerPos)) {
            this.game.stateManager.transition('gameOver');
        }
        
        // Update camera
        this.game.updateCamera(deltaTime);
    }

    render() {
        this.game.renderer.render(this.game.scene, this.game.camera);
    }
}

/**
 * GameOver state - handles game over screen and restart
 */
export class GameOverState extends GameState {
    constructor(game) {
        super('gameOver');
        this.game = game;
        this.restartDelay = 1500; // ms
        this.restartTimer = 0;
    }

    enter() {
        // Show game over UI
        this.game.ui.showGameOver();
        this.restartTimer = this.restartDelay;
    }

    update(deltaTime) {
        this.restartTimer -= deltaTime * 1000;
        if (this.restartTimer <= 0) {
            this.game.reset();
            this.game.stateManager.transition('playing');
        }
    }

    render() {
        this.game.renderer.render(this.game.scene, this.game.camera);
    }
}

/**
 * Manages game states and transitions between them
 */
export class GameStateManager {
    constructor() {
        this.states = new Map();
        this.currentState = null;
    }

    /**
     * Adds a state to the manager
     * @param {GameState} state - The state to add
     */
    addState(state) {
        this.states.set(state.name, state);
    }

    /**
     * Transitions to a new state
     * @param {string} stateName - Name of the state to transition to
     */
    transition(stateName) {
        if (this.currentState) {
            this.currentState.exit();
        }

        const newState = this.states.get(stateName);
        if (!newState) {
            console.error(`State '${stateName}' not found`);
            return;
        }

        this.currentState = newState;
        this.currentState.enter();
    }

    /**
     * Updates the current state
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (this.currentState) {
            this.currentState.update(deltaTime);
        }
    }

    /**
     * Renders the current state
     */
    render() {
        if (this.currentState) {
            this.currentState.render();
        }
    }
} 