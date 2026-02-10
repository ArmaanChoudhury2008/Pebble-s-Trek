import React from 'react';

interface OptionCardProps {
  text: string;
  index: number;
  isSelected: boolean;
  isRevealed: boolean;
  isLie: boolean;
  onClick: () => void;
  disabled: boolean;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  text,
  isSelected,
  isRevealed,
  isLie,
  onClick,
  disabled
}) => {
  // Determine styles based on state
  let cardStyle = "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-purple-500/50 cursor-pointer";
  let icon = null;

  if (isRevealed) {
    if (isLie) {
      // This is the correct answer (the lie)
      cardStyle = "bg-green-500/20 border-green-500 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.3)]";
      icon = <span className="text-green-400 font-bold">LIE DETECTED!</span>;
    } else if (isSelected) {
      // User selected this, but it was a Truth (wrong answer)
      cardStyle = "bg-red-500/20 border-red-500 text-red-100";
      icon = <span className="text-red-400 font-bold">TRUTH (Incorrect)</span>;
    } else {
      // Other truths
      cardStyle = "bg-slate-800/30 border-slate-800 text-slate-500 opacity-50";
      icon = <span className="text-slate-500 text-sm">TRUTH</span>;
    }
  } else if (isSelected) {
    cardStyle = "bg-purple-600 text-white border-purple-400 shadow-lg";
  }

  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        relative p-6 rounded-xl border-2 transition-all duration-300 transform
        ${cardStyle}
        ${!disabled && !isRevealed ? "hover:-translate-y-1 hover:shadow-xl" : ""}
      `}
    >
      <div className="flex justify-between items-start gap-4">
        <p className="text-lg leading-relaxed font-medium">{text}</p>
        {isRevealed && (
          <div className="shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
