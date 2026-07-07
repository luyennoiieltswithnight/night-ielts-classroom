import { useState, useEffect, useMemo, useRef } from "react";
import { 
  X, 
  ChevronRight, 
  RotateCcw, 
  Search, 
  Volume2, 
  CheckCircle2, 
  Trophy,
  GraduationCap,
  Waves,
  Cloud,
  Bird
} from "lucide-react";
import { VocabularyItem } from "../types";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { ProgressBar } from "./ui/ProgressBar";
import { Mascot } from "./ui/Mascot";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { cn } from "../lib/utils";

interface PracticeModeProps {
  items: VocabularyItem[];
  onClose: () => void;
  onPlayAudio: (text: string) => void;
}

type ExerciseType = 'match' | 'scramble' | 'listen' | 'choice' | 'fill';

interface Exercise {
  id: string;
  type: ExerciseType;
  item: VocabularyItem;
  options?: string[]; // for choice
  scrambledWords?: string[]; // for scramble
  correctAnswer: string;
}

export function PracticeMode({ items, onClose, onPlayAudio }: PracticeModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // Initialize exercises
  useEffect(() => {
    if (items.length === 0) return;

    const types: ExerciseType[] = ['match', 'scramble', 'listen', 'choice', 'fill'];
    const generated: Exercise[] = [];

    // Create a variety of exercises covering all items
    items.forEach((item, index) => {
      // Rotate through exercise types
      const type = types[index % types.length];
      
      const exercise: Exercise = {
        id: `ex-${item.id}-${index}`,
        type,
        item,
        correctAnswer: type === 'match' ? item.vietnamese : (type === 'listen' || type === 'fill' ? item.english : item.vietnamese)
      };

      if (type === 'choice') {
        const distractors = items
          .filter(i => i.id !== item.id)
          .map(i => i.vietnamese)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        exercise.options = [item.vietnamese, ...distractors].sort(() => Math.random() - 0.5);
      }

      if (type === 'scramble' && item.examples?.length > 0) {
        const sentence = item.examples[0];
        exercise.correctAnswer = sentence;
        exercise.scrambledWords = sentence.split(' ').sort(() => Math.random() - 0.5);
      } else if (type === 'scramble') {
        // Fallback for scramble if no example
        exercise.type = 'choice';
        const distractors = items
          .filter(i => i.id !== item.id)
          .map(i => i.vietnamese)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        exercise.options = [item.vietnamese, ...distractors].sort(() => Math.random() - 0.5);
      }

      generated.push(exercise);
    });

    setExercises(generated.sort(() => Math.random() - 0.5));
  }, [items]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        audioCtxRef.current = new Ctx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playFeedbackSound = (type: 'correct' | 'wrong') => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'correct') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // C6
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        oscillator.start(now);
        oscillator.stop(now + 0.4);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
      }
    } catch (e) {
      console.warn("Audio feedback failed", e);
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(console.error);
      }
    };
  }, []);

  const currentExercise = exercises[currentStep];
  const progress = (currentStep / exercises.length) * 100;

  const handleAnswer = (isCorrect: boolean) => {
    if (feedback) return;

    // Ensure audio systems are unlocked before playing sound
    initAudio();

    if (isCorrect) {
      setScore(s => s + 1);
      setFeedback('correct');
      playFeedbackSound('correct');
      setTimeout(() => {
        nextStep();
      }, 1500);
    } else {
      setFeedback('wrong');
      setShowAnswer(true);
      playFeedbackSound('wrong');
    }
  };

  const nextStep = () => {
    setFeedback(null);
    setShowAnswer(false);
    if (currentStep < exercises.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      setIsComplete(true);
    }
  };

  const restart = () => {
    setCurrentStep(0);
    setIsComplete(false);
    setScore(0);
    setFeedback(null);
    setShowAnswer(false);
    // Shuffle again
    setExercises(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  if (items.length === 0) return null;

  if (isComplete) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F0F7F4] flex items-center justify-center p-6 lg:p-12 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Cloud className="absolute top-20 left-[10%] text-white/40 w-32 h-32" />
          <Cloud className="absolute top-40 right-[15%] text-white/40 w-48 h-48" />
          <Bird className="absolute bottom-20 left-[20%] text-pastel-green-200 w-12 h-12" />
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-xl w-full bg-white rounded-[3rem] p-12 text-center shadow-2xl relative z-10 border-8 border-[#D8E6DF]"
        >
          <div className="mb-8">
            <div className="w-40 h-40 bg-[#E8F3ED] rounded-full mx-auto flex items-center justify-center mb-6">
              <Trophy className="w-20 h-20 text-[#6BA083]" />
            </div>
            <h2 className="text-4xl font-black text-[#2D4F3C] mb-4 tracking-tight">Practice Complete!</h2>
            <p className="text-xl text-[#6BA083] font-bold">Wonderful progress, neighbor! Your vocabulary garden is flourishing.</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="bg-[#F8FBF9] p-6 rounded-[2rem] border-2 border-[#E8F3ED]">
              <div className="text-3xl font-black text-[#2D4F3C]">{score}</div>
              <div className="text-sm font-black text-[#6BA083] uppercase tracking-widest">Correct</div>
            </div>
            <div className="bg-[#F8FBF9] p-6 rounded-[2rem] border-2 border-[#E8F3ED]">
              <div className="text-3xl font-black text-[#2D4F3C]">{Math.round((score / exercises.length) * 100)}%</div>
              <div className="text-sm font-black text-[#6BA083] uppercase tracking-widest">Accuracy</div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Button onClick={restart} className="bg-[#6BA083] hover:bg-[#5A896F] text-white py-8 rounded-[2rem] text-xl font-black shadow-xl shadow-[#6BA083]/20">
              <RotateCcw className="w-6 h-6 mr-3" /> Practice Again
            </Button>
            <Button variant="ghost" onClick={onClose} className="text-[#6BA083] font-black py-4">
              Back to Topic
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#F0F7F4] flex flex-col font-sans overflow-hidden">
      {/* Ghibli Sky Background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ x: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[5%] text-white/50"
        >
          <Cloud size={100} />
        </motion.div>
        <motion.div 
          animate={{ x: [0, -40, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[15%] right-[10%] text-white/40"
        >
          <Cloud size={140} />
        </motion.div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-8 h-24 flex items-center justify-between">
        <div className="flex-1 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-[#6BA083] uppercase tracking-widest">Progress</span>
            <span className="text-[10px] font-black text-[#6BA083] uppercase tracking-widest">{currentStep + 1} / {exercises.length}</span>
          </div>
          <div className="h-3 bg-[#E8F3ED] rounded-full overflow-hidden border border-[#D8E6DF]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-[#6BA083] rounded-full"
            />
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={onClose} className="text-[#6BA083] hover:bg-[#E8F3ED] rounded-2xl h-14 w-14">
          <X className="w-8 h-8" />
        </Button>
      </header>

      {/* Main Exercise Area */}
      <main 
        className="flex-1 relative z-10 flex flex-col items-center justify-center p-6"
        onClick={initAudio}
      >
        <AnimatePresence mode="wait">
          {currentExercise && (
            <motion.div
              key={currentStep}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="w-full max-w-4xl"
            >
              <div className="mb-12 text-center">
                <span className="inline-block px-4 py-1.5 bg-[#E8F3ED] text-[#6BA083] rounded-full text-xs font-black uppercase tracking-widest mb-6">
                  {currentExercise.type.toUpperCase()} EXERCISE
                </span>
                <h2 className="text-4xl font-black text-[#2D4F3C] tracking-tight">
                  {currentExercise.type === 'match' && "Match the meanings"}
                  {currentExercise.type === 'scramble' && "Build the sentence"}
                  {currentExercise.type === 'listen' && "Type what you hear"}
                  {currentExercise.type === 'choice' && "Choose the meaning"}
                  {currentExercise.type === 'fill' && "Complete the sentence"}
                </h2>
              </div>

              {/* Exercise Component Render */}
              <div className="bg-white/80 backdrop-blur-sm rounded-[3rem] p-10 shadow-2xl shadow-[#6BA083]/5 border-4 border-[#E8F3ED]">
                {currentExercise.type === 'match' && (
                  <DragMatch 
                    item={currentExercise.item} 
                    allVocabulary={items}
                    onAnswer={handleAnswer} 
                  />
                )}
                {currentExercise.type === 'scramble' && (
                  <SentenceScramble 
                    sentence={currentExercise.correctAnswer} 
                    words={currentExercise.scrambledWords!} 
                    onAnswer={handleAnswer} 
                  />
                )}
                {currentExercise.type === 'listen' && (
                  <ListenType 
                    item={currentExercise.item} 
                    onPlayAudio={onPlayAudio} 
                    onAnswer={handleAnswer} 
                  />
                )}
                {currentExercise.type === 'choice' && (
                  <MultipleChoice 
                    item={currentExercise.item} 
                    options={currentExercise.options!} 
                    onAnswer={handleAnswer} 
                  />
                )}
                {currentExercise.type === 'fill' && (
                  <FillBlank 
                    item={currentExercise.item} 
                    onAnswer={handleAnswer} 
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Feedback Overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className={cn(
              "fixed bottom-0 inset-x-0 p-8 pt-12 z-[60] flex items-center justify-between rounded-t-[3rem] shadow-2xl",
              feedback === 'correct' ? "bg-[#E8F3ED] border-t-8 border-[#6BA083]" : "bg-[#FFF2F2] border-t-8 border-red-400"
            )}
          >
            <div className="flex items-center gap-8 px-8">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center animate-bounce",
                feedback === 'correct' ? "bg-white text-[#6BA083]" : "bg-white text-red-500"
              )}>
                {feedback === 'correct' ? <CheckCircle2 className="w-12 h-12" /> : <RotateCcw className="w-12 h-12" />}
              </div>
              <div className="space-y-1">
                <h3 className={cn(
                  "text-3xl font-black",
                  feedback === 'correct' ? "text-[#2D4F3C]" : "text-red-700"
                )}>
                  {feedback === 'correct' ? "Amazing!" : "Oh no, neighbor!"}
                </h3>
                <p className="text-lg font-bold text-gray-600">
                  {feedback === 'correct' ? "You're getting so good at this." : `The correct answer was: ${currentExercise.correctAnswer}`}
                </p>
              </div>
            </div>

            {feedback === 'wrong' && (
              <Button onClick={nextStep} className="bg-red-500 hover:bg-red-600 text-white px-12 py-8 rounded-[2rem] text-xl font-black shadow-xl shadow-red-200">
                Next Task <ChevronRight className="w-6 h-6 ml-2" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Water decoration */}
      <div className="absolute bottom-0 inset-x-0 h-40 opacity-20 pointer-events-none transform translate-y-20">
        <Waves className="w-full h-full text-[#6BA083]" />
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

interface DragMatchProps {
  item: VocabularyItem;
  allVocabulary: VocabularyItem[];
  onAnswer: (correct: boolean) => void;
}

function DragMatch({ item, allVocabulary, onAnswer }: DragMatchProps) {
  const pairs = useMemo(() => {
    const distractors = allVocabulary
      .filter(i => i.id !== item.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    
    const engItems = [item, ...distractors].sort(() => Math.random() - 0.5);
    // Shuffle meanings for dragging
    const viItems = [...engItems].sort(() => Math.random() - 0.5);
    
    return { engItems, viItems };
  }, [item, allVocabulary]);

  const [currentOrder, setCurrentOrder] = useState(pairs.viItems.map(i => i.id));

  const checkMatches = () => {
    const isCorrect = currentOrder.every((id, index) => id === pairs.engItems[index].id);
    onAnswer(isCorrect);
  };

  return (
    <div className="space-y-12 max-w-xl mx-auto">
      <div className="grid grid-cols-1 gap-4">
        <div className="flex gap-4 mb-4">
          <div className="w-1/2 text-center text-[10px] font-black text-[#6BA083] uppercase tracking-[0.2em]">Target Word</div>
          <div className="w-1/2 text-center text-[10px] font-black text-[#6BA083] uppercase tracking-[0.2em]">Match Meaning</div>
        </div>
        
        <div className="flex gap-4 h-full">
          {/* Static English Column */}
          <div className="w-1/2 space-y-4">
            {pairs.engItems.map((eng) => (
              <div 
                key={eng.id}
                className="h-20 bg-pastel-green-50/30 border-2 border-dashed border-[#6BA083]/20 rounded-2xl flex items-center justify-center font-black text-[#2D4F3C]"
              >
                {eng.english}
              </div>
            ))}
          </div>

          {/* Draggable Vietnamese Column */}
          <Reorder.Group 
            axis="y" 
            values={currentOrder} 
            onReorder={setCurrentOrder}
            className="w-1/2 space-y-4"
          >
            {currentOrder.map((id) => {
              const vi = pairs.viItems.find(i => i.id === id)!;
              return (
                <Reorder.Item 
                  key={id} 
                  value={id}
                  className="h-20 bg-white border-4 border-[#E8F3ED] rounded-2xl flex items-center justify-center font-black text-[#2D4F3C] cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
                >
                  {vi.vietnamese}
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>
      </div>

      <div className="text-center">
        <Button 
          onClick={checkMatches}
          className="bg-[#6BA083] hover:bg-[#5A896F] px-12 py-6 rounded-2xl font-black"
        >
          Verify Order
        </Button>
      </div>
    </div>
  );
}

function SentenceScramble({ sentence, words, onAnswer }: { sentence: string, words: string[], onAnswer: (correct: boolean) => void }) {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState(words);

  const toggleWord = (word: string, index: number, isAvailable: boolean) => {
    if (isAvailable) {
      setSelectedWords([...selectedWords, word]);
      const newAvailable = [...availableWords];
      newAvailable.splice(index, 1);
      setAvailableWords(newAvailable);
    } else {
      const newSelected = [...selectedWords];
      newSelected.splice(index, 1);
      setSelectedWords(newSelected);
      setAvailableWords([...availableWords, word]);
    }
  };

  const check = () => {
    const isCorrect = selectedWords.join(' ') === sentence;
    onAnswer(isCorrect);
  };

  return (
    <div className="space-y-12">
      <div className="min-h-[140px] p-8 border-4 border-dashed border-[#E8F3ED] rounded-[2.5rem] flex flex-wrap gap-3 items-center justify-center bg-[#F8FBF9]/50">
        <AnimatePresence>
          {selectedWords.map((word, i) => (
            <motion.button
              key={`${word}-${i}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={() => toggleWord(word, i, false)}
              className="px-6 py-3 bg-white border-2 border-[#6BA083] rounded-2xl font-bold text-[#2D4F3C] shadow-sm hover:shadow-md transition-all"
            >
              {word}
            </motion.button>
          ))}
        </AnimatePresence>
        {selectedWords.length === 0 && (
          <span className="text-[#6BA083] font-bold opacity-30 italic">Tap words below to build the sentence...</span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {availableWords.map((word, i) => (
          <motion.button
            key={`${word}-${i}`}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleWord(word, i, true)}
            className="px-6 py-3 bg-[#E8F3ED] text-[#2D4F3C] rounded-2xl font-bold shadow-sm hover:bg-white hover:shadow-lg transition-all"
          >
            {word}
          </motion.button>
        ))}
      </div>

      <div className="flex justify-center pt-8">
        <Button 
          disabled={selectedWords.length === 0}
          onClick={check}
          className="bg-[#6BA083] hover:bg-[#5A896F] px-12 py-6 rounded-2xl font-black"
        >
          Check Sentence
        </Button>
      </div>
    </div>
  );
}

function ListenType({ item, onPlayAudio, onAnswer }: { item: VocabularyItem, onPlayAudio: (text: string) => void, onAnswer: (correct: boolean) => void }) {
  const [value, setValue] = useState("");

  const check = () => {
    const isCorrect = value.trim().toLowerCase() === item.english.toLowerCase();
    onAnswer(isCorrect);
  };

  return (
    <div className="space-y-10 text-center max-w-lg mx-auto">
      <div className="flex justify-center">
        <Button 
          variant="ghost" 
          onClick={() => onPlayAudio(item.english)}
          className="w-32 h-32 rounded-full bg-[#E8F3ED] text-[#6BA083] hover:bg-[#D8E6DF] transition-all group"
        >
          <Volume2 className="w-16 h-16 group-hover:scale-110 transition-transform" />
        </Button>
      </div>

      <div className="space-y-4">
        <input 
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder="What did you hear?"
          className="w-full text-center py-6 px-10 text-3xl font-black text-[#2D4F3C] bg-white border-4 border-[#E8F3ED] rounded-[2rem] focus:outline-none focus:border-[#6BA083] transition-all placeholder:text-[#D8E6DF]"
        />
        <p className="text-sm font-bold text-[#6BA083] uppercase tracking-widest">Type in English</p>
      </div>

      <Button 
        onClick={check}
        className="w-full bg-[#6BA083] hover:bg-[#5A896F] py-6 rounded-2xl font-black text-xl"
      >
        Check Spelling
      </Button>
    </div>
  );
}

function MultipleChoice({ item, options, onAnswer }: { item: VocabularyItem, options: string[], onAnswer: (correct: boolean) => void }) {
  return (
    <div className="space-y-10">
      <div className="text-center">
        <h3 className="text-5xl font-black text-[#2D4F3C] mb-4 tracking-tighter">{item.english}</h3>
        <p className="text-xl font-bold text-[#6BA083] italic">"{item.usageContext}"</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {options.map((opt, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAnswer(opt === item.vietnamese)}
            className="p-8 bg-white border-4 border-[#E8F3ED] hover:border-[#6BA083] hover:bg-[#F8FBF9] rounded-[2rem] text-xl font-black text-[#2D4F3C] shadow-sm hover:shadow-xl transition-all"
          >
            {opt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function FillBlank({ item, onAnswer }: { item: VocabularyItem, onAnswer: (correct: boolean) => void }) {
  const [value, setValue] = useState("");
  const sentence = item.examples[0] || "";
  
  // Replace the word in the sentence with a blank
  // Using a regex to find the word regardless of case/punctuation
  const parts = sentence.split(new RegExp(`(${item.english})`, 'gi'));

  const check = () => {
    const isCorrect = value.trim().toLowerCase() === item.english.toLowerCase();
    onAnswer(isCorrect);
  };

  return (
    <div className="space-y-12 text-center max-w-2xl mx-auto">
      <div className="bg-[#F8FBF9] p-10 rounded-[3rem] border-2 border-[#E8F3ED]">
        <h3 className="text-2xl font-black text-[#2D4F3C] leading-relaxed">
          {parts.map((part, i) => (
            part.toLowerCase() === item.english.toLowerCase() ? (
              <span key={i} className="inline-block min-w-[120px] px-4 border-b-4 border-[#6BA083] text-[#6BA083]">
                {value || '...'}
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          ))}
        </h3>
      </div>

      <div className="space-y-4">
        <input 
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder="Fill in the blank"
          className="w-full text-center py-6 px-10 text-3xl font-black text-[#2D4F3C] bg-white border-4 border-[#E8F3ED] rounded-[2rem] focus:outline-none focus:border-[#6BA083] transition-all placeholder:text-[#D8E6DF]"
        />
        <p className="text-sm font-bold text-[#6BA083] uppercase tracking-widest">{item.vietnamese}</p>
      </div>

      <Button 
        onClick={check}
        className="w-full bg-[#6BA083] hover:bg-[#5A896F] py-6 rounded-2xl font-black text-xl"
      >
        Submit Answer
      </Button>
    </div>
  );
}
