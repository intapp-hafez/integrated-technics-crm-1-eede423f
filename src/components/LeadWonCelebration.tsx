import React, { useEffect, useState } from "react";
import { actions, useStoreState } from "@/lib/store";

export function LeadWonCelebration() {
  const { celebrationLead } = useStoreState();
  const [mounted, setMounted] = useState(false);
  const [currentValue, setCurrentValue] = useState(0);

  // Trigger animations and mount state when celebrationLead becomes available
  useEffect(() => {
    if (celebrationLead) {
      setMounted(true);
      setCurrentValue(0);

      // Value counter animation
      const target = celebrationLead.value || 0;
      if (target > 0) {
        let value = 0;
        const increment = Math.ceil(target / 80);
        const timer = setInterval(() => {
          value += increment;
          if (value >= target) {
            value = target;
            clearInterval(timer);
          }
          setCurrentValue(value);
        }, 25);
        return () => clearInterval(timer);
      }
    } else {
      // Small delay before unmounting to allow fade out (if we added one)
      setMounted(false);
    }
  }, [celebrationLead]);

  if (!mounted || !celebrationLead) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 overflow-hidden backdrop-blur-sm">
      <style>{`
        .celebrate-card {
          width: 420px;
          background: white;
          border-radius: 25px;
          padding: 35px;
          text-align: center;
          position: relative;
          z-index: 10;
          animation: celebrate-popup 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .celebrate-trophy {
          font-size: 90px;
          animation: celebrate-bounce 1s infinite;
          line-height: 1;
          margin-bottom: 10px;
        }
        .celebrate-confetti {
          position: absolute;
          width: 10px;
          height: 18px;
          top: -20px;
          animation: celebrate-fall linear forwards;
          z-index: 5;
        }
        .celebrate-firework {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: white;
          animation: celebrate-explode 1s forwards;
          z-index: 4;
        }
        @keyframes celebrate-popup {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes celebrate-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes celebrate-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes celebrate-explode {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--x), var(--y)) scale(0); opacity: 0; }
        }
      `}</style>

      {/* Animations Overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Confetti />
        <Fireworks />
      </div>

      <div className="celebrate-card text-foreground">
        <div className="celebrate-trophy">🏆</div>
        
        <h1 className="mt-2 text-3xl font-bold text-emerald-600">Congratulations!</h1>
        <p className="mt-2 text-muted-foreground">Lead Successfully Won</p>
        
        <div className="mt-6 text-2xl font-bold text-foreground">
          {celebrationLead.contact || "Unknown Contact"}
        </div>
        <div className="mt-1 text-base text-muted-foreground">
          {celebrationLead.company || "Unknown Company"}
        </div>
        
        <div className="my-8 text-5xl font-bold text-emerald-600 tracking-tight">
          ${currentValue.toLocaleString()}
        </div>
        
        <div className="text-xl text-amber-500 font-semibold mb-6">
          🎉 Another Deal Closed!
        </div>
        
        <button 
          onClick={() => actions.clearCelebration()}
          className="rounded-xl bg-emerald-600 px-8 py-3 text-lg font-semibold text-white transition-transform hover:scale-105 hover:bg-emerald-700 active:scale-95"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// Sub-components for particle effects
function Confetti() {
  const colors = ["#ff4757", "#2ed573", "#1e90ff", "#ffa502", "#e056fd", "#00d2d3"];
  const pieces = Array.from({ length: 150 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    duration: 2 + Math.random() * 4,
    rotation: Math.random() * 360,
  }));

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="celebrate-confetti"
          style={{
            left: `${p.left}vw`,
            background: p.color,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </>
  );
}

function Fireworks() {
  const [bursts, setBursts] = useState<any[]>([]);

  useEffect(() => {
    const newBursts = Array.from({ length: 8 }).map((_, k) => {
      const cx = Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000);
      const cy = Math.random() * (typeof window !== "undefined" ? window.innerHeight / 2 : 500);
      
      const particles = Array.from({ length: 30 }).map((__, i) => {
        const angle = (Math.PI * 2 / 30) * i;
        const distance = 60 + Math.random() * 90;
        return {
          id: `${k}-${i}`,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          color: `hsl(${Math.random() * 360}, 100%, 60%)`,
        };
      });

      return { id: k, cx, cy, particles };
    });

    setBursts(newBursts);
  }, []);

  return (
    <>
      {bursts.map((b) => (
        <div key={b.id} style={{ position: "absolute", left: b.cx, top: b.cy }}>
          {b.particles.map((p: any) => (
            <div
              key={p.id}
              className="celebrate-firework"
              style={{
                "--x": `${p.x}px`,
                "--y": `${p.y}px`,
                background: p.color,
              } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </>
  );
}
