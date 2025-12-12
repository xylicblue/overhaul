import React, { useEffect, useRef } from "react";

const BokehBackground = ({ className = "absolute inset-0 z-0" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 80 + 20; // Large, soft particles
        this.vx = (Math.random() - 0.5) * 0.2; // Very slow movement
        this.vy = (Math.random() - 0.5) * 0.2;
        this.opacity = Math.random() * 0.1 + 0.05; // Very low opacity
        // Blue/Purple theme colors
        const colors = ["#3b82f6", "#8b5cf6", "#6366f1"];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen
        if (this.x < -this.size) this.x = canvas.width + this.size;
        if (this.x > canvas.width + this.size) this.x = -this.size;
        if (this.y < -this.size) this.y = canvas.height + this.size;
        if (this.y > canvas.height + this.size) this.y = -this.size;
      }

      draw() {
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    const init = () => {
      particles = [];
      const numberOfParticles = 15; // Few particles for cleaner look
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Blur effect for bokeh
      ctx.filter = "blur(40px)";
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      ctx.filter = "none";
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className={`pointer-events-none ${className}`} />;
};

export default BokehBackground;
