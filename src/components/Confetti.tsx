import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle';
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  gravity: number;
  friction: number;
}

export default function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    // Colors: Gold, Blue, Coral, Purple, Mint, Emerald
    const COLORS = [
      '#FFD700', '#FFDF00', '#3B82F6', '#60A5FA', 
      '#F43F5E', '#FB7185', '#8B5CF6', '#A78BFA', 
      '#10B981', '#34D399', '#F59E0B'
    ];
    const SHAPES: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial burst from center of screen
    const initParticles = () => {
      const count = 150;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight * 0.45;

      for (let i = 0; i < count; i++) {
        // Explode outward radially
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 4; // Radial speed speed

        particles.push({
          x: centerX,
          y: centerY,
          size: Math.random() * 8 + 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
          speedX: Math.cos(angle) * speed,
          speedY: Math.sin(angle) * speed - (Math.random() * 5 + 3), // bias upwards
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8,
          opacity: 1,
          gravity: Math.random() * 0.15 + 0.15,
          friction: 0.98
        });
      }
    };

    // Spawn 3 additional side fountains to keep the celebration exciting
    const spawnSidestream = (startX: number, angleRange: [number, number]) => {
      const count = 30;
      const centerY = window.innerHeight + 10;
      
      for (let i = 0; i < count; i++) {
        const angle = angleRange[0] + Math.random() * (angleRange[1] - angleRange[0]);
        const speed = Math.random() * 15 + 10;
        
        particles.push({
          x: startX,
          y: centerY,
          size: Math.random() * 8 + 5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
          speedX: Math.cos(angle) * speed,
          speedY: Math.sin(angle) * speed,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          opacity: 1,
          gravity: 0.22,
          friction: 0.97
        });
      }
    };

    initParticles();
    
    // Delayed streams from bottom corners for enhanced flair
    const timer1 = setTimeout(() => spawnSidestream(0, [-Math.PI / 4, -Math.PI / 12]), 400);
    const timer2 = setTimeout(() => spawnSidestream(window.innerWidth, [-Math.PI * 11 / 12, -Math.PI * 3 / 4]), 800);

    const updateAndRender = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Physics
        p.speedX *= p.friction;
        p.speedY += p.gravity;
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
        
        // Slower fade out as particles reach bottom
        if (p.y > canvas.height * 0.7) {
          p.opacity -= 0.012;
        }

        // Remove dead particles
        if (p.opacity <= 0 || p.y > canvas.height + 20 || p.x < -20 || p.x > canvas.width + 20) {
          particles.splice(i, 1);
          continue;
        }

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        ctx.beginPath();
        if (p.shape === 'circle') {
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        } else if (p.shape === 'square') {
          ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else if (p.shape === 'triangle') {
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(updateAndRender);
    };

    updateAndRender();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="confetti-canvas"
      className="fixed inset-0 pointer-events-none z-55 w-full h-full"
    />
  );
}
