import { Game } from './Game.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Create and start the game
        const game = new Game();
        game.start();
    } catch (error) {
        console.error('Failed to start game:', error);
        document.body.innerHTML = '<div style="color: white; text-align: center; margin-top: 2em;">Unable to start game. Please refresh the page.</div>';
    }
}); 