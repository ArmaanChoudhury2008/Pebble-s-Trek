import React from 'react';

interface PenguinSceneProps {
  progress: number; // 0 to 3
  isSad: boolean;   // Triggers sad animation
}

export const PenguinScene: React.FC<PenguinSceneProps> = ({ progress, isSad }) => {
  // Define precise positions for each stage of the journey
  // 0: Start
  // 1: 1/3 way
  // 2: 2/3 way (Base of mountain)
  // 3: Summit (On top)
  const getPosition = (stage: number) => {
    // Clamp stage between 0 and 3
    const safeStage = Math.max(0, Math.min(stage, 3));
    
    const positions = [
      { left: '10%', bottom: '2rem', rotate: '0deg' },  // Start
      { left: '40%', bottom: '2rem', rotate: '0deg' },  // Step 1
      { left: '65%', bottom: '2rem', rotate: '-5deg' }, // Step 2 (Preparing to climb)
      { left: '88%', bottom: '9rem', rotate: '0deg' }   // Summit (High up)
    ];

    return positions[safeStage];
  };

  const currentPos = getPosition(progress);
  const isWinner = progress >= 3;

  return (
    <div className="fixed bottom-0 left-0 w-full h-64 pointer-events-none z-0 overflow-hidden">
      {/* Background Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent opacity-60"></div>
      
      {/* Snow Ground */}
      <div className="absolute bottom-0 w-full h-12 bg-slate-100/10 backdrop-blur-md border-t-4 border-slate-300/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]"></div>

      {/* Mountain Goal */}
      <div className="absolute right-4 bottom-10 text-9xl transform translate-y-4 drop-shadow-2xl filter brightness-90 z-10">
        🏔️
      </div>

      {/* The Penguin Container */}
      <div 
        className="absolute transition-all duration-[1500ms] ease-in-out z-20 will-change-transform"
        style={{ 
          left: currentPos.left, 
          bottom: currentPos.bottom,
          transform: `translateX(-50%) rotate(${currentPos.rotate})`
        }}
      >
        <div className="relative group">
          {/* Penguin Character */}
          <div 
            className={`
              text-7xl filter drop-shadow-2xl transition-all duration-500
              ${isWinner ? 'animate-bounce' : 'animate-[float_6s_infinite_ease-in-out]'}
              ${isSad && !isWinner ? 'grayscale-[0.8] brightness-75 scale-90 rotate-12' : ''}
            `}
          >
            🐧
          </div>

          {/* Victory Flag - Only visible on summit */}
          <div 
            className={`
              absolute -right-4 -top-2 text-5xl origin-bottom-left transition-all duration-700 delay-1000
              ${isWinner ? 'opacity-100 scale-100 rotate-12' : 'opacity-0 scale-0 rotate-45'}
            `}
          >
            🚩
          </div>

          {/* Chat bubble */}
          <div 
            className={`
              absolute -top-16 left-1/2 -translate-x-1/2 
              bg-white text-slate-900 px-4 py-2 rounded-2xl rounded-bl-none
              text-sm font-bold whitespace-nowrap shadow-xl border-2 border-slate-200
              transition-all duration-500 transform origin-bottom-left
              ${isWinner ? 'scale-100 opacity-100 delay-[1600ms]' : 'scale-0 opacity-0'}
            `}
          >
            We conquered it! 🎉
          </div>

          {/* Sad/Confused Bubble */}
          {isSad && !isWinner && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-4xl animate-pulse">
              ❓
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};
