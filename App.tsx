import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateQuestion } from './services/geminiService';
import { playSuccessSound, playFailureSound, playSmashSound, startBGM } from './services/audioService';
import { QuestionData, GameState, GameStats, PebblesAction, Coordinates } from './types';
import { Button } from './components/Button';
import { OptionCard } from './components/OptionCard';
import { PenguinScene } from './components/PenguinScene';
import { Trophy, AlertCircle, Brain, ArrowRight, Play, XCircle, Sparkles } from 'lucide-react';

const TOTAL_QUESTIONS = 10;

const LOADING_MESSAGES = [
  "Pebbles is foraging for facts...",
  "Consulting the Penguin Oracle...",
  "Sliding through the internet tubes...",
  "Breaking the ice with new data...",
  "Catching fresh trivia fish...",
  "Waddling towards wisdom...",
  "Polishing the ice crystals..."
];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [stats, setStats] = useState<GameStats>({
    correct: 0,
    total: 0,
    streak: 0,
    bestStreak: 0
  });

  // Animation States
  const [pebblesAction, setPebblesAction] = useState<PebblesAction>('idle');
  const [targetCoords, setTargetCoords] = useState<Coordinates | null>(null);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Loading message state
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Refs for card elements to calculate position
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Pre-fetching states
  const [nextQuestion, setNextQuestion] = useState<QuestionData | null>(null);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const pastTopicsRef = useRef<string[]>([]);

  // Cycle loading messages
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState === GameState.LOADING) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

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
    // Start the Background Music on user interaction
    startBGM();

    setGameState(GameState.LOADING);
    setPebblesAction('idle');
    setTargetCoords(null);
    setStats({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
    pastTopicsRef.current = [];
    setNextQuestion(null);
    setLoadingMessageIndex(0);

    try {
      const data = await fetchNewQuestion();
      setCurrentQuestion(data);
      pastTopicsRef.current.push(data.topic);
      setGameState(GameState.PLAYING);
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
    setPebblesAction('idle');
    setTargetCoords(null);
    
    // Check if game should end
    if (stats.total >= TOTAL_QUESTIONS) {
        handleGameOver();
        return;
    }
    
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      pastTopicsRef.current.push(nextQuestion.topic);
      setNextQuestion(null);
      setTimeout(() => preloadNextQuestion(), 100); 
    } else {
      setGameState(GameState.LOADING);
      setLoadingMessageIndex(0);
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

  // Handle Answer Animation Sequence
  const handleOptionClick = (index: number) => {
    if (pebblesAction !== 'idle' || isRevealed || !currentQuestion) return;
    
    setSelectedOption(index);
    
    // 1. Calculate Target Position
    const cardEl = cardRefs.current[index];
    if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        // Target is relative to viewport
        setTargetCoords({ x: rect.left, y: rect.top });
    }

    // 2. Start Walking Animation (Slow Walk)
    setPebblesAction('walking');

    // 3. Arrive and Smash (after 2s for slow walk)
    setTimeout(() => {
        setPebblesAction('smashing');
        playSmashSound();
        
        // 4. Reveal Result (after 0.8s of smashing)
        setTimeout(() => {
            setIsRevealed(true);
            const isCorrect = index === currentQuestion.lieIndex;
            
            // Play appropriate sound
            if (isCorrect) {
              playSuccessSound();
            } else {
              playFailureSound();
            }

            // 5. Reaction
            setPebblesAction(isCorrect ? 'celebrating' : 'mocking');

            setStats(prev => {
              const newStreak = isCorrect ? prev.streak + 1 : 0;
              return {
                correct: isCorrect ? prev.correct + 1 : prev.correct,
                total: prev.total + 1,
                streak: newStreak,
                bestStreak: Math.max(prev.bestStreak, newStreak)
              };
            });

        }, 800); // Duration of smash
    }, 2000); // Duration of walk (Slow)
  };

  // End Game Sequence
  const handleGameOver = () => {
    setGameState(GameState.GAME_OVER);
  };

  // Ensure preloader runs whenever current question changes
  useEffect(() => {
    if (currentQuestion && !nextQuestion && !isLoadingNext && stats.total < TOTAL_QUESTIONS) {
      preloadNextQuestion();
    }
  }, [currentQuestion, nextQuestion, isLoadingNext, preloadNextQuestion, stats.total]);


  // Helper to determine visibility of options during animation
  const getCardVisibility = (idx: number) => {
    // If nothing selected, show all
    if (selectedOption === null) return true;
    
    // Always show the one the user clicked
    if (idx === selectedOption) return true;
    
    // If Revealed, also show the Correct Answer (if it wasn't the one clicked)
    if (isRevealed && idx === currentQuestion?.lieIndex) return true;

    // Otherwise, hide it (instantly disappears when selection happens)
    return false;
  };

  // --- Render Functions ---

  if (gameState === GameState.START) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 overflow-hidden relative">
        <PenguinScene pebblesAction="idle" targetCoords={null} />
        
        <div className="relative z-30 max-w-lg w-full bg-slate-800/90 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center space-y-8 backdrop-blur-md">
          <div className="inline-flex p-4 rounded-full bg-blue-500/20 mb-2 ring-1 ring-blue-500/50">
            <span className="text-4xl">🐧</span>
          </div>
          <div>
            <h1 className="text-5xl font-extrabold text-white mb-4">
              Truth Sleuth
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Join <span className="text-blue-300 font-bold">Pebbles</span> on a snowy adventure!
              <br/>
              Spot the lie in 10 rounds of trivia.
            </p>
          </div>
          
          <Button onClick={startGame} className="w-full justify-center text-lg py-4 shadow-blue-500/20">
            <Play className="w-5 h-5 fill-current" /> Play Now (10 Questions)
          </Button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER || gameState === GameState.SUMMARY) {
    const isWin = stats.correct >= 7;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
        {isWin && (
            <div className="absolute inset-0 pointer-events-none z-30">
                <div className="absolute top-10 left-10 text-4xl animate-bounce">🎉</div>
                <div className="absolute top-20 right-20 text-4xl animate-bounce delay-100">✨</div>
            </div>
        )}

        <PenguinScene pebblesAction={isWin ? 'celebrating' : 'mocking'} targetCoords={null} />

        <div className="relative z-30 max-w-lg w-full bg-slate-800/95 p-8 rounded-3xl border border-slate-600 shadow-2xl text-center space-y-6 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4 ${isWin ? 'bg-green-500/20' : 'bg-slate-700/50'}`}>
             {isWin ? <Trophy className="w-12 h-12 text-green-400" /> : <Brain className="w-12 h-12 text-slate-400" />}
          </div>
          
          <div>
            <h2 className="text-4xl font-bold text-white mb-2">
                {isWin ? "Snow-tacular!" : "Adventure Complete!"}
            </h2>
            <p className="text-slate-300">
                {isWin ? "Pebbles is impressed by your knowledge." : "Pebbles had a good laugh, but keep trying!"}
            </p>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 grid grid-cols-2 gap-4">
             <div className="flex flex-col">
               <span className="text-sm text-slate-500 font-bold uppercase">Final Score</span>
               <span className="text-4xl font-bold text-blue-400">{stats.correct}<span className="text-xl text-slate-600">/{TOTAL_QUESTIONS}</span></span>
             </div>
             <div className="flex flex-col border-l border-slate-700 pl-4">
               <span className="text-sm text-slate-500 font-bold uppercase">Best Streak</span>
               <span className="text-4xl font-bold text-amber-400">{stats.bestStreak}</span>
             </div>
          </div>
          
          <Button onClick={startGame} variant="primary" className="w-full justify-center text-lg">
            Play Again
          </Button>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (gameState === GameState.LOADING) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
        <PenguinScene pebblesAction="idle" targetCoords={null} />
        
        {/* Dynamic Background Elements for Loading */}
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
           <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="z-30 flex flex-col items-center space-y-6 bg-slate-900/60 p-10 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl max-w-sm w-full">
            <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Outer spinning ring */}
                <div className="absolute inset-0 border-4 border-blue-500/30 border-t-blue-400 rounded-full animate-spin"></div>
                {/* Inner reverse spinning ring */}
                <div className="absolute inset-2 border-4 border-purple-500/20 border-b-purple-400 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
                
                {/* Glow */}
                <div className="absolute inset-0 bg-blue-400/20 blur-xl rounded-full animate-pulse"></div>
                
                {/* Brain Icon */}
                <Brain className="w-10 h-10 text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-[bounce_2s_infinite]" />
            </div>
            
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-white tracking-wide animate-pulse min-h-[3.5rem] flex items-center justify-center">
                    {LOADING_MESSAGES[loadingMessageIndex]}
                </h2>
                <div className="flex gap-1 justify-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-0"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // Main Game
  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto p-4 md:p-6 pb-64 relative">
      <PenguinScene pebblesAction={pebblesAction} targetCoords={targetCoords} />

      {/* Header */}
      <header className="flex justify-between items-center mb-6 bg-slate-800/90 p-4 rounded-2xl border border-slate-700 backdrop-blur-md sticky top-4 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-2 rounded-lg shadow-lg shadow-blue-500/20">
            <span className="text-xl font-bold text-white">TS</span>
          </div>
          <span className="font-bold text-slate-100 hidden sm:inline">Truth Sleuth</span>
        </div>

        <div className="flex items-center gap-6">
             <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Question</span>
                <span className="text-base font-bold text-white">
                    {stats.total < TOTAL_QUESTIONS ? stats.total + 1 : TOTAL_QUESTIONS} <span className="text-slate-500">/ {TOTAL_QUESTIONS}</span>
                </span>
             </div>
             <div className="w-px h-8 bg-slate-700"></div>
             <div className="flex flex-col items-start">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Score</span>
                <span className="text-base font-bold text-green-400">
                    {stats.correct}
                </span>
             </div>
        </div>

        <Button 
          variant="ghost" 
          onClick={() => setGameState(GameState.START)}
          className="px-2 py-1.5 text-xs h-auto min-h-0 text-slate-400 hover:text-red-400"
        >
          <XCircle className="w-5 h-5" />
        </Button>
      </header>

      {/* Game Content */}
      <main className="flex-grow flex flex-col relative z-20">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl text-center space-y-4 mt-10 backdrop-blur-sm">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <p className="text-red-200">{error}</p>
            <Button onClick={startGame} className="mx-auto">Try Again</Button>
          </div>
        ) : currentQuestion ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
            <div className="text-center space-y-2 mb-4 bg-slate-900/40 p-6 rounded-3xl backdrop-blur-sm border border-white/5">
              <span className="text-blue-300 font-bold tracking-wider text-xs uppercase bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30">
                Topic
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-2 drop-shadow-lg">
                {currentQuestion.topic}
              </h2>
              <p className="text-slate-400 text-sm">Find the lie!</p>
            </div>

            <div className="grid gap-3 md:grid-cols-1 relative min-h-[400px]">
              {currentQuestion.statements.map((stmt, idx) => {
                  const isVisible = getCardVisibility(idx);
                  const isUserSelection = selectedOption === idx;
                  const isCorrect = idx === currentQuestion.lieIndex;
                  // A card is "broken" if it's the user selection, it's revealed, and it's NOT the correct answer (i.e. user picked a Truth)
                  const isBroken = isRevealed && isUserSelection && !isCorrect;

                  return (
                    <OptionCard
                      key={idx}
                      ref={el => cardRefs.current[idx] = el}
                      index={idx}
                      text={stmt}
                      isSelected={isUserSelection}
                      isRevealed={isRevealed}
                      isLie={isCorrect}
                      isHidden={!isVisible}
                      isBroken={isBroken}
                      onClick={() => handleOptionClick(idx)}
                      disabled={selectedOption !== null}
                    />
                  );
              })}
            </div>

            {/* Explanation Area */}
            {isRevealed && (
              <div className="mt-6 animate-in slide-in-from-bottom-4 fade-in duration-300 pb-8">
                <div className={`p-6 rounded-2xl border shadow-xl backdrop-blur-md ${
                  selectedOption === currentQuestion.lieIndex 
                    ? "bg-green-900/40 border-green-500/50 shadow-green-900/20" 
                    : "bg-red-900/40 border-red-500/50 shadow-red-900/20"
                }`}>
                  <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${
                    selectedOption === currentQuestion.lieIndex ? "text-green-400" : "text-red-400"
                  }`}>
                    {selectedOption === currentQuestion.lieIndex ? (
                      <>
                        <Sparkles className="w-5 h-5" /> Correct!
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5" /> Oops!
                      </>
                    )}
                  </h3>
                  <p className="text-slate-200 leading-relaxed text-base">
                    {currentQuestion.explanation}
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                    {stats.total < TOTAL_QUESTIONS ? (
                        <Button 
                            onClick={handleNextQuestion} 
                            className="w-full md:w-auto shadow-xl shadow-blue-900/30 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-blue-400/30 text-lg py-4"
                        >
                            {isLoadingNext && !nextQuestion ? "Preparing Next..." : "Next Round"} <ArrowRight className="w-5 h-5" />
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleGameOver} 
                            className="w-full md:w-auto shadow-xl shadow-purple-900/30 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-purple-400/30 text-lg py-4"
                        >
                            See Final Score <Trophy className="w-5 h-5" />
                        </Button>
                    )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;