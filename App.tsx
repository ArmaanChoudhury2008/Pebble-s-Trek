import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateQuestion } from './services/geminiService';
import { QuestionData, GameState, GameStats } from './types';
import { Button } from './components/Button';
import { OptionCard } from './components/OptionCard';
import { PenguinScene } from './components/PenguinScene';
import { Trophy, AlertCircle, Brain, ArrowRight, Play, XCircle, Sparkles, Frown } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [stats, setStats] = useState<GameStats>({
    correct: 0,
    total: 0,
    streak: 0,
    bestStreak: 0
  });
  
  // Penguin Progress State (0 to 3)
  const [levelProgress, setLevelProgress] = useState(0);
  
  // Track if the last interaction was a failure (for Sad Penguin)
  const [isPenguinSad, setIsPenguinSad] = useState(false);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pre-fetching states
  const [nextQuestion, setNextQuestion] = useState<QuestionData | null>(null);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const pastTopicsRef = useRef<string[]>([]);

  // Function to fetch a question (helper)
  const fetchNewQuestion = async () => {
    return await generateQuestion(pastTopicsRef.current);
  };

  // Pre-load the next question in the background
  const preloadNextQuestion = useCallback(async () => {
    if (isLoadingNext || nextQuestion) return;
    
    setIsLoadingNext(true);
    try {
      const data = await fetchNewQuestion();
      setNextQuestion(data);
    } catch (e) {
      console.error("Background pre-fetch failed", e);
    } finally {
      setIsLoadingNext(false);
    }
  }, [isLoadingNext, nextQuestion]);

  // Initial Game Start / Reset Logic
  const startGame = async () => {
    setGameState(GameState.LOADING);
    setLevelProgress(0);
    setIsPenguinSad(false); // Reset mood
    setStats({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
    pastTopicsRef.current = [];
    setNextQuestion(null);

    try {
      const data = await fetchNewQuestion();
      setCurrentQuestion(data);
      pastTopicsRef.current.push(data.topic);
      setGameState(GameState.PLAYING);
      
      // Start preloading the next one immediately
      preloadNextQuestion();
    } catch (err) {
      setError("Failed to start game. Check connection.");
      setGameState(GameState.START);
    }
  };

  // Move to next question (Instant load if pre-fetched)
  const handleNextQuestion = async () => {
    setIsRevealed(false);
    setSelectedOption(null);
    setError(null);
    
    // Note: We do NOT reset isPenguinSad here. 
    // If the user was wrong, the penguin stays sad during the load/transition
    // until they answer the NEXT one correctly.
    
    if (nextQuestion) {
      // Use pre-loaded question
      setCurrentQuestion(nextQuestion);
      pastTopicsRef.current.push(nextQuestion.topic);
      setNextQuestion(null);
      // Fetch the ONE AFTER that in background
      setTimeout(() => preloadNextQuestion(), 100); 
    } else {
      // Fallback if user was too fast
      setGameState(GameState.LOADING);
      try {
        const data = await fetchNewQuestion();
        setCurrentQuestion(data);
        pastTopicsRef.current.push(data.topic);
        setGameState(GameState.PLAYING);
        preloadNextQuestion();
      } catch (err) {
        setError("Failed to load question.");
      }
    }
  };

  // Handle Answer
  const handleOptionClick = (index: number) => {
    if (isRevealed || !currentQuestion) return;
    
    setSelectedOption(index);
    setIsRevealed(true);
    
    const isCorrect = index === currentQuestion.lieIndex;
    const newProgress = isCorrect ? levelProgress + 1 : levelProgress;
    const newTotal = stats.total + 1;
    
    // Update Mood immediately
    setIsPenguinSad(!isCorrect);

    if (isCorrect) {
      setLevelProgress(newProgress);
    }

    setStats(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      return {
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        total: newTotal,
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak)
      };
    });

    // Check End Game Conditions
    if (newProgress >= 3) {
        // Win: Reached 3 correct answers
        // Ensure he is happy for the win
        setIsPenguinSad(false);
        setTimeout(() => {
           handleLevelComplete();
        }, 2000); // Slightly longer delay to see the mountain climb animation
    } else if (newTotal >= 5) {
        // Loss: Reached 5 questions without 3 correct
        setTimeout(() => {
            handleGameOver();
        }, 2500);
    }
  };

  // Win Sequence
  const handleLevelComplete = () => {
    setGameState(GameState.SUMMARY);
    // Auto reset after 8 seconds (give time to celebrate on mountain)
    setTimeout(() => {
      // Only auto-reset if we are still on the summary screen
      setGameState(currentState => {
        if (currentState === GameState.SUMMARY) {
          startGame(); 
          return GameState.LOADING; 
        }
        return currentState;
      });
    }, 8000);
  };

  // Loss Sequence
  const handleGameOver = () => {
    setGameState(GameState.GAME_OVER);
    // Auto reset after 6 seconds
    setTimeout(() => {
      setGameState(currentState => {
        if (currentState === GameState.GAME_OVER) {
          startGame(); 
          return GameState.LOADING; 
        }
        return currentState;
      });
    }, 6000);
  };

  // Ensure preloader runs whenever current question changes (if next is empty)
  useEffect(() => {
    if (currentQuestion && !nextQuestion && !isLoadingNext) {
      preloadNextQuestion();
    }
  }, [currentQuestion, nextQuestion, isLoadingNext, preloadNextQuestion]);


  // --- Render Functions ---

  if (gameState === GameState.START) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 overflow-hidden relative">
        <PenguinScene progress={0} isSad={false} />
        
        <div className="relative z-10 max-w-lg w-full bg-slate-800/90 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center space-y-8 backdrop-blur-md">
          <div className="inline-flex p-4 rounded-full bg-blue-500/20 mb-2 ring-1 ring-blue-500/50">
            <span className="text-4xl">🐧</span>
          </div>
          <div>
            <h1 className="text-5xl font-extrabold text-white mb-4">
              Truth Sleuth
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Help the Penguin reach the mountain peak!
              <br/>
              Spot <span className="text-blue-400 font-bold">3 Lies</span> correctly within <span className="text-orange-400 font-bold">5 Attempts</span>.
            </p>
          </div>
          
          <Button onClick={startGame} className="w-full justify-center text-lg py-4">
            <Play className="w-5 h-5 fill-current" /> Start Adventure
          </Button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.SUMMARY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
        {/* Confetti effect */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 left-10 text-4xl animate-bounce">🎉</div>
            <div className="absolute top-20 right-20 text-4xl animate-bounce delay-100">✨</div>
            <div className="absolute bottom-40 left-1/4 text-4xl animate-bounce delay-200">🎊</div>
        </div>

        {/* Penguin is at the summit (progress 3) */}
        <PenguinScene progress={3} isSad={false} />

        <div className="relative z-10 max-w-lg w-full bg-slate-800/90 p-8 rounded-3xl border border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.2)] text-center space-y-6 backdrop-blur-md animate-in fade-in zoom-in duration-300 mt-[-100px]">
          <div className="mx-auto bg-green-500/20 w-24 h-24 rounded-full flex items-center justify-center mb-4">
             <Trophy className="w-12 h-12 text-green-400" />
          </div>
          
          <div>
            <h2 className="text-4xl font-bold text-white mb-2">Adventure Complete!</h2>
            <p className="text-slate-300">The penguin reached the summit safely.</p>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Starting new expedition in...</p>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full w-full animate-[loading_8s_linear]"></div>
            </div>
          </div>
          
          <Button onClick={startGame} variant="secondary" className="w-full justify-center">
            Start Now
          </Button>
        </div>
         <style>{`
          @keyframes loading {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
        <PenguinScene progress={levelProgress} isSad={true} />

        <div className="relative z-10 max-w-lg w-full bg-slate-800/90 p-8 rounded-3xl border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center space-y-6 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="mx-auto bg-red-500/20 w-24 h-24 rounded-full flex items-center justify-center mb-4">
             <Frown className="w-12 h-12 text-red-400" />
          </div>
          
          <div>
            <h2 className="text-4xl font-bold text-white mb-2">Out of Moves!</h2>
            <p className="text-slate-300">You used all 5 attempts but didn't find enough lies.</p>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
             <div className="flex justify-around mb-2">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-blue-400">{stats.correct}</span>
                  <span className="text-xs text-slate-500">CORRECT</span>
                </div>
                 <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-400">{stats.total}</span>
                  <span className="text-xs text-slate-500">TOTAL</span>
                </div>
             </div>
            <p className="text-slate-400 text-sm mb-1 mt-4">Retrying in...</p>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full w-full animate-[loading_6s_linear]"></div>
            </div>
          </div>
          
          <Button onClick={startGame} variant="danger" className="w-full justify-center">
            Try Again
          </Button>
        </div>
         <style>{`
          @keyframes loading {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    );
  }

  // Loading Screen (Only for initial load or if user is faster than API)
  if (gameState === GameState.LOADING) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 relative">
        <PenguinScene progress={levelProgress} isSad={isPenguinSad} />
        <div className="z-10 flex flex-col items-center space-y-4">
            <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
            <Brain className="w-16 h-16 text-blue-400 animate-bounce relative z-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-200 animate-pulse">
                {isPenguinSad ? "Regrouping..." : "Scouting the path..."}
            </h2>
        </div>
      </div>
    );
  }

  // Main Game
  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto p-4 md:p-6 pb-64 relative">
      <PenguinScene progress={levelProgress} isSad={isPenguinSad} />

      {/* Header */}
      <header className="flex justify-between items-center mb-6 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 backdrop-blur-sm sticky top-4 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <span className="text-xl">🐧</span>
          </div>
          <span className="font-bold text-slate-200 hidden sm:inline">Penguin Trek</span>
        </div>

        <div className="flex items-center gap-6">
             <div className="flex flex-col items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Progress</span>
                <span className="text-sm font-bold text-blue-400">{levelProgress}/3</span>
             </div>
             <div className="w-px h-8 bg-slate-600"></div>
             <div className="flex flex-col items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Attempts</span>
                <span className={`text-sm font-bold ${stats.total >= 4 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                    {Math.min(stats.total + 1, 5)}/5
                </span>
             </div>
        </div>

        <Button 
          variant="danger" 
          onClick={() => setGameState(GameState.START)}
          className="px-3 py-1.5 text-xs h-auto min-h-0"
        >
          <XCircle className="w-4 h-4" /> Quit
        </Button>
      </header>

      {/* Game Content */}
      <main className="flex-grow flex flex-col relative z-10">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl text-center space-y-4 mt-10">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <p className="text-red-200">{error}</p>
            <Button onClick={startGame} className="mx-auto">Try Again</Button>
          </div>
        ) : currentQuestion ? (
          <div className="space-y-6">
            <div className="text-center space-y-2 mb-4">
              <span className="text-blue-400 font-bold tracking-wider text-xs uppercase bg-blue-500/10 px-3 py-1 rounded-full">
                Topic: {currentQuestion.topic}
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
                Find the Lie!
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-1">
              {currentQuestion.statements.map((stmt, idx) => (
                <OptionCard
                  key={idx}
                  index={idx}
                  text={stmt}
                  isSelected={selectedOption === idx}
                  isRevealed={isRevealed}
                  isLie={idx === currentQuestion.lieIndex}
                  onClick={() => handleOptionClick(idx)}
                  disabled={isRevealed}
                />
              ))}
            </div>

            {/* Explanation Area */}
            {isRevealed && (
              <div className="mt-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
                <div className={`p-5 rounded-xl border shadow-lg ${
                  selectedOption === currentQuestion.lieIndex 
                    ? "bg-green-500/10 border-green-500/30 shadow-green-900/20" 
                    : "bg-red-500/10 border-red-500/30 shadow-red-900/20"
                }`}>
                  <h3 className={`text-lg font-bold mb-1 flex items-center gap-2 ${
                    selectedOption === currentQuestion.lieIndex ? "text-green-400" : "text-red-400"
                  }`}>
                    {selectedOption === currentQuestion.lieIndex ? (
                      <>
                        <Sparkles className="w-5 h-5" /> Correct!
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5" /> Not quite!
                      </>
                    )}
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                    {currentQuestion.explanation}
                  </p>
                </div>

                {/* Only show next button if game is not over (progress < 3 AND total < 5) */}
                {levelProgress < 3 && stats.total < 5 && (
                   <div className="mt-4 flex justify-end">
                    <Button onClick={handleNextQuestion} className="w-full md:w-auto shadow-xl shadow-blue-900/20 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 border-blue-400/30">
                        {isLoadingNext && !nextQuestion ? "Loading..." : "Next Question"} <ArrowRight className="w-5 h-5" />
                    </Button>
                   </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;