export class UI {
    constructor() {
        this.messageContainer = document.createElement('div');
        this.messageContainer.style.position = 'absolute';
        this.messageContainer.style.top = '50%';
        this.messageContainer.style.left = '50%';
        this.messageContainer.style.transform = 'translate(-50%, -50%)';
        this.messageContainer.style.textAlign = 'center';
        this.messageContainer.style.fontFamily = "'Press Start 2P', monospace";
        this.messageContainer.style.fontSize = '24px';
        this.messageContainer.style.color = '#fff';
        this.messageContainer.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        this.messageContainer.style.display = 'none';
        document.body.appendChild(this.messageContainer);

        // Add font link
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        // Create score display
        this.scoreContainer = document.createElement('div');
        this.scoreContainer.style.position = 'absolute';
        this.scoreContainer.style.top = '20px';
        this.scoreContainer.style.right = '20px';
        this.scoreContainer.style.fontFamily = "'Press Start 2P', monospace";
        this.scoreContainer.style.fontSize = '16px';
        this.scoreContainer.style.color = '#fff';
        this.scoreContainer.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        document.body.appendChild(this.scoreContainer);
    }

    showGameOver() {
        const skull = `
            ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣀⣀⣀⣀⡀⠀⠀⠀⠀⠀
            ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⣄⡀⠀
            ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡄
            ⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇
            ⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠁
            ⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡏⠀
            ⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠁⠀
            ⠀⣰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠁⠀⠀
            ⢰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀
            ⠈⠻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠉⠀⠀⠀⠀⠀⠀
            ⠀⠀⠀⠉⠻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠛⠁⠀⠀⠀⠀⠀⠀⠀⠀
            ⠀⠀⠀⠀⠀⠀⠉⠛⠿⣿⣿⣿⣿⣿⣿⣿⡿⠟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
            ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠋⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`;

        this.messageContainer.innerHTML = `
            <pre style="font-size: 12px; line-height: 12px; color: #ff0000; text-shadow: 0 0 10px #ff0000;">${skull}</pre>
            <div style="margin-top: 20px; font-size: 36px; color: #ff0000; text-shadow: 0 0 10px #ff0000;">GAME OVER</div>
            <div style="margin-top: 20px; font-size: 16px;">Press SPACE to restart</div>`;
        this.messageContainer.style.display = 'block';

        // Add restart listener
        const handleRestart = (event) => {
            if (event.code === 'Space') {
                document.removeEventListener('keydown', handleRestart);
                this.hideMessage();
                window.dispatchEvent(new CustomEvent('gameRestart'));
            }
        };
        document.addEventListener('keydown', handleRestart);
    }

    showMessage(message) {
        this.messageContainer.textContent = message;
        this.messageContainer.style.display = 'block';
    }

    hideMessage() {
        this.messageContainer.style.display = 'none';
    }

    updateScore(rings) {
        this.scoreContainer.textContent = `Rings: ${rings}`;
    }

    showError(message = 'Something went wrong. Please refresh the page.') {
        this.showMessage(message);
    }
} 