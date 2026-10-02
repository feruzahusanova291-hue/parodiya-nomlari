/* ==========================================================================
   COSMIC CANVAS & PARTICLE MATRIX
   Lightweight, performant starry nebula & cyber grid background
   ========================================================================== */

(function () {
    const canvas = document.getElementById('cosmicCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let particles = [];
    const PARTICLE_COUNT = 55;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 1.8 + 0.6;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.alpha = Math.random() * 0.6 + 0.2;
            this.fadeSpeed = (Math.random() * 0.008 + 0.003) * (Math.random() > 0.5 ? 1 : -1);
            
            // Randomly assign neon colors (cyan, purple, pink)
            const colors = [
                'rgba(0, 240, 255,',   // cyan
                'rgba(168, 85, 247,',  // purple
                'rgba(255, 0, 127,'    // pink
            ];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha += this.fadeSpeed;

            if (this.alpha <= 0.1 || this.alpha >= 0.8) {
                this.fadeSpeed = -this.fadeSpeed;
            }

            if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `${this.color} ${this.alpha})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = `${this.color} 0.8)`;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function init() {
        resize();
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Draw connecting ethereal threads between nearby particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 110) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    const lineAlpha = (1 - dist / 110) * 0.15;
                    ctx.strokeStyle = `rgba(168, 85, 247, ${lineAlpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }

        // Draw particles
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    init();
    animate();
})();
