export class UI {
    constructor() {
        this.createUIElements();
        this.ringCount = 0;
        this.totalRings = 0;
        this.timeRemaining = 60; // 60 seconds default
        this.timerInterval = null;
    }

    createUIElements() {
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

        // Create ring counter
        this.ringCounter = document.createElement('div');
        this.ringCounter.textContent = 'Rings: 0/0';
        this.container.appendChild(this.ringCounter);

        // Create timer
        this.timer = document.createElement('div');
        this.timer.textContent = 'Time: 60s';
        this.container.appendChild(this.timer);

        // Create message display (for game over, win, etc.)
        this.messageDisplay = document.createElement('div');
        this.messageDisplay.style.position = 'fixed';
        this.messageDisplay.style.top = '50%';
        this.messageDisplay.style.left = '50%';
        this.messageDisplay.style.transform = 'translate(-50%, -50%)';
        this.messageDisplay.style.color = 'white';
        this.messageDisplay.style.fontFamily = 'Arial, sans-serif';
        this.messageDisplay.style.fontSize = '48px';
        this.messageDisplay.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        this.messageDisplay.style.display = 'none';
        document.body.appendChild(this.messageDisplay);
    }

    setTotalRings(total) {
        this.totalRings = total;
        this.updateRingCounter();
    }

    updateRingCounter() {
        this.ringCounter.textContent = `Rings: ${this.ringCount}/${this.totalRings}`;
    }

    incrementRings() {
        this.ringCount++;
        this.updateRingCounter();
        
        // Check for win condition
        if (this.ringCount === this.totalRings) {
            this.showMessage('Level Complete!', 'green');
            this.stopTimer();
            return true;
        }
        return false;
    }

    startTimer(seconds = 60) {
        this.timeRemaining = seconds;
        this.updateTimer();
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimer();
            
            if (this.timeRemaining <= 0) {
                this.stopTimer();
                this.showMessage('Time\'s Up!', 'red');
                return true;
            }
        }, 1000);
    }

    updateTimer() {
        this.timer.textContent = `Time: ${this.timeRemaining}s`;
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    showMessage(text, color = 'white') {
        this.messageDisplay.textContent = text;
        this.messageDisplay.style.color = color;
        this.messageDisplay.style.display = 'block';
    }

    hideMessage() {
        this.messageDisplay.style.display = 'none';
    }

    reset() {
        this.ringCount = 0;
        this.updateRingCounter();
        this.hideMessage();
        this.stopTimer();
    }

    showError(message = 'Something went wrong. Please refresh the page.') {
        this.showMessage(message, '#ff4444');
    }
} 