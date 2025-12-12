import React, { useEffect, useRef } from "react";

const NetworkMesh = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    
    // Configuration
    const particleCount = 60;
    const connectionDistance = 100;
    const sphereRadius = 120;
    const rotationSpeed = 0.005;
    
    let particles = [];
    let angleX = 0;
    let angleY = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    class Particle3D {
      constructor() {
        // Initialize points on a sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        this.x = sphereRadius * Math.sin(phi) * Math.cos(theta);
        this.y = sphereRadius * Math.sin(phi) * Math.sin(theta);
        this.z = sphereRadius * Math.cos(phi);
        
        this.baseX = this.x;
        this.baseY = this.y;
        this.baseZ = this.z;
        
        this.size = Math.random() * 2 + 1.5;
        this.color = `rgba(${100 + Math.random() * 100}, ${150 + Math.random() * 105}, 255, 0.8)`;
      }

      rotate(angleX, angleY) {
        // Rotate around Y axis
        let cosY = Math.cos(angleY);
        let sinY = Math.sin(angleY);
        let x1 = this.baseX * cosY - this.baseZ * sinY;
        let z1 = this.baseZ * cosY + this.baseX * sinY;

        // Rotate around X axis
        let cosX = Math.cos(angleX);
        let sinX = Math.sin(angleX);
        let y1 = this.baseY * cosX - z1 * sinX;
        let z2 = z1 * cosX + this.baseY * sinX;

        this.x = x1;
        this.y = y1;
        this.z = z2;
      }

      draw(centerX, centerY) {
        // Simple perspective projection
        const fov = 300;
        const scale = fov / (fov + this.z);
        
        const px = this.x * scale + centerX;
        const py = this.y * scale + centerY;
        const pSize = this.size * scale;

        // Draw particle
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.5, pSize), 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Return projected coordinates for connecting lines
        return { x: px, y: py, scale: scale, z: this.z };
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle3D());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Update rotation
      angleY += rotationSpeed;
      angleX += rotationSpeed * 0.5;

      // Update and store projected points
      const projectedPoints = particles.map(p => {
        p.rotate(angleX, angleY);
        return p.draw(centerX, centerY);
      });

      // Draw connections
      ctx.lineWidth = 1;
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const p1 = projectedPoints[i];
          const p2 = projectedPoints[j];
          
          // Calculate distance in 3D space (approximate using projected 2D for visual connectivity)
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Only connect if close enough and not too far back in Z
          if (dist < connectionDistance && p1.z < 100 && p2.z < 100) {
            const opacity = (1 - dist / connectionDistance) * 0.5 * p1.scale; // Fade with distance and depth
            ctx.strokeStyle = `rgba(100, 180, 255, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="w-full h-[400px] overflow-hidden relative group flex items-center justify-center">

       
       <canvas 
        ref={canvasRef} 
        className="w-full h-full relative z-10"
      />
      

    </div>
  );
};

export default NetworkMesh;
