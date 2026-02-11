import React, { forwardRef } from 'react';

interface OptionCardProps {
  text: string;
  index: number;
  isSelected: boolean;
  isRevealed: boolean;
  isLie: boolean;
  isHidden: boolean;
  isBroken: boolean;
  onClick: () => void;
  disabled: boolean;
}

export const OptionCard = forwardRef<HTMLDivElement, OptionCardProps>(({
  text,
  isSelected,
  isRevealed,
  isLie,
  isHidden,
  isBroken,
  onClick,
  disabled
}, ref) => {
  // Determine styles based on state
  let cardStyle = "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-purple-500/50 cursor-pointer";
  let icon = null;
  let animationClass = "";

  if (isBroken) {
    // Broken state (Wrong answer smashed) -> Highlight Red
    cardStyle = "bg-red-900/40 border-red-500 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.4)] border-dashed border-4";
    icon = <span className="text-red-400 font-extrabold rotate-12 drop-shadow-lg">SMASHED! 💥</span>;
    animationClass = "animate-[shatter_0.5s_ease-in-out_forwards]";
  } else if (isRevealed) {
    if (isLie) {
      // This is the correct answer (the lie) -> Highlight Green
      cardStyle = "bg-green-600/20 border-green-400 text-green-100 shadow-[0_0_25px_rgba(34,197,94,0.4)] z-10 border-2";
      icon = <span className="text-green-400 font-bold drop-shadow-md">LIE DETECTED!</span>;
      // Animate the correct answer to pop/glow
      animationClass = "animate-[celebrate_0.6s_cubic-bezier(0.25,1.5,0.5,1)_forwards]";
    } else if (isSelected) {
      // Fallback for selected wrong answer if not marked broken (though app logic usually marks it broken)
      cardStyle = "bg-red-500/20 border-red-500 text-red-100";
      icon = <span className="text-red-400 font-bold">TRUTH (Incorrect)</span>;
    } else {
      // Other truths (unselected)
      cardStyle = "bg-slate-800/30 border-slate-800 text-slate-500 opacity-50";
      icon = <span className="text-slate-500 text-sm">TRUTH</span>;
    }
  } else if (isSelected) {
    // Selected but waiting for result (Pebbles is walking over)
    cardStyle = "bg-purple-600 text-white border-purple-300 shadow-xl scale-105 z-10 ring-4 ring-purple-500/30";
    animationClass = "animate-[selectedPulse_1.5s_ease-in-out_infinite]";
    icon = <span className="text-purple-200 text-xs font-bold uppercase tracking-widest animate-pulse">Scanning...</span>;
  }

  return (
    <>
      <div 
        ref={ref}
        onClick={!disabled ? onClick : undefined}
        className={`
          relative p-6 rounded-xl border-2 transition-all duration-300 transform
          ${cardStyle}
          ${animationClass}
          ${!disabled && !isRevealed && !isHidden ? "hover:-translate-y-1 hover:shadow-xl" : ""}
          ${isHidden ? "opacity-0 pointer-events-none scale-90" : "opacity-100"}
        `}
      >
        <div className="flex justify-between items-start gap-4">
          <p className="text-lg leading-relaxed font-medium">{text}</p>
          {((isRevealed && !isHidden) || (isSelected && !isRevealed)) && (
            <div className="shrink-0 animate-in fade-in zoom-in duration-300">
              {icon}
            </div>
          )}
        </div>
        
        {/* Broken Overlay Effect */}
        {isBroken && (
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-red-900/50 -rotate-12 blur-[1px]"></div>
            <div className="absolute top-1/3 left-0 w-full h-1 bg-red-900/50 rotate-6 blur-[1px]"></div>
            <div className="absolute bottom-1/3 right-0 w-full h-1 bg-red-900/50 -rotate-3 blur-[1px]"></div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes shatter {
          0% { transform: rotate(0deg) scale(1); }
          20% { transform: rotate(-5deg) scale(0.95); }
          40% { transform: rotate(5deg) scale(0.95); }
          60% { transform: rotate(-3deg) scale(0.95); }
          80% { transform: rotate(2deg) scale(0.95); }
          100% { transform: rotate(2deg) scale(0.95); opacity: 0.9; }
        }
        @keyframes celebrate {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(34,197,94,0.6); }
          100% { transform: scale(1.02); }
        }
        @keyframes selectedPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(168, 85, 247, 0.5); border-color: rgba(216, 180, 254, 1); transform: scale(1.05); }
          50% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.9); border-color: white; transform: scale(1.07); }
        }
      `}</style>
    </>
  );
});

OptionCard.displayName = "OptionCard";