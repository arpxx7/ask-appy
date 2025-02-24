// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('starCanvas');
    const ctx = canvas.getContext('2d');
    let mouseX = 0;
    let mouseY = 0;
    let time = 0;

    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Set canvas size to window size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // Initial resize
    resizeCanvas();

    // Resize canvas when window is resized
    window.addEventListener('resize', resizeCanvas);

    // Star class with enhanced features
    class Star {
        constructor(isShootingStar = false) {
            this.isShootingStar = isShootingStar;
            this.reset();
            if (!isShootingStar) {
                this.z = Math.random() * 2; // Parallax depth
                this.baseSize = Math.random() * 3 + 0.5;
                this.color = this.generateStarColor();
            }
        }

        generateStarColor() {
            const colors = [
                { r: 255, g: 255, b: 255 },    // White
                { r: 255, g: 240, b: 220 },    // Warm white
                { r: 220, g: 240, b: 255 },    // Cool white
                { r: 255, g: 210, b: 170 },    // Slight orange
                { r: 200, g: 220, b: 255 }     // Slight blue
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        reset() {
            if (this.isShootingStar) {
                this.x = Math.random() * canvas.width;
                this.y = -20;
                this.speed = Math.random() * 15 + 10;
                this.size = Math.random() * 2 + 2;
                this.tail = [];
                this.tailLength = 20;
                this.angle = (Math.random() * 30 + 30) * (Math.PI / 180);
            } else {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.baseSpeed = Math.random() * 0.2 + 0.1;
                this.brightness = Math.random();
                this.maxBrightness = Math.random() * 0.8 + 0.2;
                this.pulseSpeed = Math.random() * 0.01 + 0.005;
                this.direction = Math.random() > 0.5 ? this.pulseSpeed : -this.pulseSpeed;
            }
        }

        update() {
            if (this.isShootingStar) {
                // Update shooting star position
                this.tail.unshift({ x: this.x, y: this.y });
                if (this.tail.length > this.tailLength) {
                    this.tail.pop();
                }
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;

                // Reset if off screen
                if (this.y > canvas.height || this.x < 0 || this.x > canvas.width) {
                    this.reset();
                }
            } else {
                // Parallax effect based on mouse movement
                const parallaxX = (mouseX - canvas.width / 2) * 0.001 * this.z;
                const parallaxY = (mouseY - canvas.height / 2) * 0.001 * this.z;
                
                this.x += this.baseSpeed + parallaxX;
                this.y += this.baseSpeed + parallaxY;
                
                // Pulse brightness
                this.brightness += this.direction;
                if (this.brightness <= 0 || this.brightness >= this.maxBrightness) {
                    this.direction *= -1;
                }

                // Reset if off screen
                if (this.y > canvas.height || this.x > canvas.width) {
                    this.x = Math.random() * canvas.width;
                    this.y = 0;
                }
            }
        }

        draw() {
            if (this.isShootingStar) {
                // Draw shooting star and its tail
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                for (let i = 0; i < this.tail.length; i++) {
                    const opacity = 1 - (i / this.tail.length);
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
                    ctx.fillRect(this.tail[i].x, this.tail[i].y, this.size * (1 - i/this.tail.length), this.size * (1 - i/this.tail.length));
                }
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(this.x, this.y, this.size, this.size);
            } else {
                // Draw regular star with color and glow
                const { r, g, b } = this.color;
                const size = this.baseSize * (1 + Math.sin(time * 0.001) * 0.2);
                
                // Create gradient for glow effect
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, size * 2
                );
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${this.brightness})`);
                gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${this.brightness * 0.4})`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                // Draw star glow
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size * 2, 0, Math.PI * 2);
                ctx.fill();

                // Draw star core
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.brightness})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Create stars with different types
    const stars = [];
    const numStars = Math.floor((canvas.width * canvas.height) / 3000);
    const numShootingStars = 2;
    
    for (let i = 0; i < numStars; i++) {
        stars.push(new Star(false));
    }
    
    for (let i = 0; i < numShootingStars; i++) {
        stars.push(new Star(true));
    }

    // Animation loop with smooth color transition
    function animate() {
        time++;
        
        // Create smooth color transition for background
        const bgColor = {
            r: 11 + Math.sin(time * 0.0002) * 2,
            g: 10 + Math.sin(time * 0.0002) * 2,
            b: 11 + Math.sin(time * 0.0002) * 2
        };
        
        ctx.fillStyle = `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw all stars
        stars.forEach(star => {
            star.update();
            star.draw();
        });

        requestAnimationFrame(animate);
    }

    animate();

    // Handle checkbox and button interaction
    const termsCheckbox = document.getElementById('termsCheckbox');
    const startButton = document.getElementById('startButton');
    const termsLink = document.querySelector('.terms-link');

    termsCheckbox.addEventListener('change', () => {
        if (termsCheckbox.checked) {
            startButton.classList.add('enabled');
            startButton.disabled = false;
        } else {
            startButton.classList.remove('enabled');
            startButton.disabled = true;
        }
    });

    startButton.addEventListener('click', () => {
        if (termsCheckbox.checked) {
            window.location.href = 'chat/chat.html';
        }
    });

    // Handle terms link click
    termsLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 't&c/t&c.html';
    });

    // Initialize star background
    initStarBackground();
}); 