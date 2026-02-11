import React from 'react';
import { PebblesAction, Coordinates } from '../types';

interface PenguinSceneProps {
  pebblesAction: PebblesAction;
  targetCoords: Coordinates | null;
}

export const PenguinScene: React.FC<PenguinSceneProps> = ({ pebblesAction, targetCoords }) => {
  // Determine if Pebbles should be overlaying content or in background
  const isInteracting = pebblesAction === 'walking' || pebblesAction === 'smashing';
  const isReacting = pebblesAction === 'celebrating' || pebblesAction === 'mocking';
  const zIndexClass = isInteracting ? 'z-50' : 'z-0';

  // Calculate position styles
  const getPebblesStyle = () => {
    // 1. Reaction Phase: Move to the right side
    if (isReacting) {
        return {
            left: 'calc(100% - 160px)', // Safe distance from right edge
            top: 'calc(100% - 150px)', // Ground level
            transform: 'scale(1.1)', // Slightly larger hero pose
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' // Bouncy arrival
        };
    }

    // 2. Interaction Phase: At the card
    if (isInteracting && targetCoords) {
      // When interacting, move to the specific card coordinates
      // We offset slightly to stand "next" to the card or on top-right of it
      return {
        left: `${targetCoords.x + 220}px`, // Shift to right side of card
        top: `${targetCoords.y}px`, // Align with top of card
        transform: 'scale(0.8)', // Slightly smaller when interacting with UI
        transition: pebblesAction === 'walking' ? 'all 2s ease-in-out' : 'all 0.1s linear' // Fast shake during smash
      };
    }
    
    // 3. Idle Position: Bottom Left
    return {
      left: '5%', // Start at the left side
      top: 'calc(100% - 140px)', // Fixed from bottom
      transform: 'scale(1)',
      transition: 'all 0.8s ease-in-out'
    };
  };

  // Adjust bubble position based on where the penguin is
  // If reacting (Right side), bubble should be to the left of the penguin to stay on screen
  const getBubbleStyle = () => {
      if (isReacting) {
          return "rounded-br-none -left-48 origin-bottom-right";
      }
      return "rounded-bl-none -left-12 origin-bottom-left";
  };

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${zIndexClass}`}>
      {/* Static Background Layers */}
      <div className="absolute inset-0 -z-10">
        {/* Sky Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#334155]"></div>

        {/* Snow Particles */}
        <div className="absolute inset-0 opacity-80">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full opacity-60 animate-[fall_linear_infinite]"
              style={{
                width: Math.random() * 4 + 2 + 'px',
                height: Math.random() * 4 + 2 + 'px',
                left: Math.random() * 100 + '%',
                top: -20 + 'px',
                animationDuration: Math.random() * 5 + 5 + 's',
                animationDelay: Math.random() * 5 + 's'
              }}
            />
          ))}
        </div>

        {/* Mountains Background */}
        <div className="absolute bottom-0 w-full h-[40vh] md:h-[50vh] flex items-end">
           {/* Distant peaks */}
           <div className="absolute bottom-0 left-0 w-full h-full opacity-60">
               <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 400">
                  <path d="M0 400 L200 150 L400 400 L600 100 L800 400 L1000 180 L1200 400 Z" fill="#475569" />
               </svg>
           </div>
           {/* Main snowy mountains */}
           <div className="relative w-full h-[90%] z-10">
               <svg className="w-full h-full drop-shadow-2xl" preserveAspectRatio="none" viewBox="0 0 1200 500">
                  <path d="M0 500 L300 100 L600 500 L900 150 L1200 500 Z" fill="#cbd5e1" />
                  {/* Snow caps */}
                  <path d="M230 193 L300 100 L370 193 Z" fill="white" />
                  <path d="M840 230 L900 150 L960 230 Z" fill="white" />
               </svg>
           </div>
        </div>

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-slate-200 to-slate-300 z-10 border-t-4 border-white/50"></div>
      </div>

      {/* Pebbles the Penguin */}
      <div 
        className="absolute flex flex-col items-center"
        style={getPebblesStyle()}
      >
        
        {/* Feedback Bubble */}
        <div className={`
             mb-2 px-6 py-3 bg-white text-slate-900 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.3)]
             transform transition-all duration-300 max-w-[200px] text-center absolute -top-24 w-64
             ${getBubbleStyle()}
             ${isReacting ? 'opacity-100 scale-100' : 'opacity-0 scale-50 translate-y-10'}
        `}>
          <p className="font-extrabold text-lg leading-tight">
            {pebblesAction === 'celebrating' && "Respect! 🙇‍♂️"}
            {pebblesAction === 'mocking' && "Haha! NOPE! 🤣"}
          </p>
        </div>

        {/* Character Container */}
        <div className="relative">
            {/* Hammer - Only visible during smashing */}
            <div className={`
                absolute -right-8 -top-8 text-[5rem] origin-bottom-left
                ${pebblesAction === 'smashing' ? 'animate-[smash_0.4s_ease-in-out_infinite]' : 'opacity-0 scale-0'}
            `}>
                🔨
            </div>

            {/* Penguin Emoji */}
            <div className={`
                text-[8rem] leading-none filter drop-shadow-2xl transition-all duration-500 origin-bottom
                ${pebblesAction === 'idle' ? 'animate-[breathe_3s_ease-in-out_infinite]' : ''}
                ${pebblesAction === 'walking' ? 'animate-[waddle_0.5s_linear_infinite]' : ''} 
                ${pebblesAction === 'celebrating' ? 'rotate-[20deg] translate-y-4 scale-90 grayscale-[0.2]' : ''} 
                ${pebblesAction === 'mocking' ? 'animate-[shake_0.5s_ease-in-out_infinite]' : ''}
                ${pebblesAction === 'smashing' ? 'animate-[recoil_0.4s_ease-in-out_infinite]' : ''}
            `}>
              🐧
            </div>
        </div>
        
        <div className="mt-2 bg-slate-900/40 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
          Pebbles
        </div>
      </div>

      <style>{`
        @keyframes fall {
          0% { transform: translateY(-20px); }
          100% { transform: translateY(105vh); }
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        @keyframes smash {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); } /* Wind up */
          50% { transform: rotate(-70deg); } /* Hit */
          75% { transform: rotate(-70deg); } /* Hold */
          100% { transform: rotate(0deg); } /* Reset */
        }
        @keyframes breathe {
          0%, 100% { transform: scaleY(1) translateY(0); }
          50% { transform: scaleY(0.95) translateY(5px); }
        }
        @keyframes waddle {
          0% { transform: rotate(-5deg) translateY(0); }
          25% { transform: rotate(0deg) translateY(-8px); }
          50% { transform: rotate(5deg) translateY(0); }
          75% { transform: rotate(0deg) translateY(-8px); }
          100% { transform: rotate(-5deg) translateY(0); }
        }
        @keyframes recoil {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(0.95) rotate(5deg); } /* Squish down on impact */
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
