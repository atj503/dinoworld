import * as THREE from 'three';

export class UI {
    constructor() {
        this.score = 0;
        this.timeRemaining = 60; // 60 seconds
        this.isGameOver = false;
        
        // Create UI container
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '20px';
        this.container.style.left = '20px';
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.fontSize = '24px';
        this.container.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        document.body.appendChild(this.container);
        
        // Create score display
        this.scoreElement = document.createElement('div');
        this.scoreElement.style.marginBottom = '10px';
        this.container.appendChild(this.scoreElement);
        
        // Create timer display
        this.timerElement = document.createElement('div');
        this.container.appendChild(this.timerElement);
        
        // Create message overlay
        this.messageOverlay = document.createElement('div');
        this.messageOverlay.style.position = 'fixed';
        this.messageOverlay.style.top = '50%';
        this.messageOverlay.style.left = '50%';
        this.messageOverlay.style.transform = 'translate(-50%, -50%)';
        this.messageOverlay.style.color = 'white';
        this.messageOverlay.style.fontFamily = 'Arial, sans-serif';
        this.messageOverlay.style.fontSize = '36px';
        this.messageOverlay.style.textAlign = 'center';
        this.messageOverlay.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        this.messageOverlay.style.display = 'none';
        document.body.appendChild(this.messageOverlay);
        
        this.updateScore();
        this.updateTimer();
    }
    
    updateScore() {
        this.scoreElement.textContent = `Score: ${this.score}`;
    }
    
    updateTimer() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = Math.floor(this.timeRemaining % 60);
        this.timerElement.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    addScore(points) {
        this.score += points;
        this.updateScore();
    }
    
    startTimer() {
        this.timeRemaining = 60;
        this.isGameOver = false;
        this.messageOverlay.style.display = 'none';
        this.updateTimer();
    }
    
    updateTime(deltaTime) {
        if (this.isGameOver) return;
        
        this.timeRemaining -= deltaTime;
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.isGameOver = true;
            this.showGameOver();
        }
        this.updateTimer();
    }
    
    showMessage(text) {
        this.messageOverlay.textContent = text;
        this.messageOverlay.style.display = 'block';
    }
    
    hideMessage() {
        this.messageOverlay.style.display = 'none';
    }
    
    showGameOver() {
        this.showMessage(`Game Over!\nFinal Score: ${this.score}\nPress Space to Restart`);
    }
    
    showError(message = 'An error occurred. Please refresh the page.') {
        this.showMessage(message);
    }
    
    reset() {
        this.score = 0;
        this.updateScore();
        this.startTimer();
    }
} 