import React, { useEffect, useRef } from "react";

const StarField = ({ className = "absolute inset-0 z-0" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let stars = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    class Star {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5;
        this.opacity = Math.random();
        this.speed = Math.random() * 0.05;
        this.direction = Math.random() > 0.5 ? 1 : -1;
      }

      update() {
        this.opacity += this.speed * this.direction;
        if (this.opacity < 0 || this.opacity > 1) {
          this.direction *= -1;
        }
      }

      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      stars = [];
      const numberOfStars = (canvas.width * canvas.height) / 10000;
      for (let i = 0; i < numberOfStars; i++) {
        stars.push(new Star());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        star.update();
        star.draw();
      });
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

export default StarField;
