import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw,
  Trophy,
  Zap,
  Volume2,
  Maximize2,
  Minimize2
} from "lucide-react";
import { VocabularyItem, Difficulty } from "../types";
import { Flashcard } from "./ui/Flashcard";
import { Button } from "./ui/Button";
import { ProgressBar } from "./ui/ProgressBar";
import { Mascot } from "./ui/Mascot";
import { calculateNextReview } from "../lib/srs";
import { cn } from "../lib/utils";

interface ReviewSessionProps {
  items: VocabularyItem[];
  onComplete: (updatedItems: VocabularyItem[]) => void;
  onClose: () => void;
  onPlayAudio?: (text: string) => void;
}

export function ReviewSession({ items, onComplete, onClose, onPlayAudio }: ReviewSessionProps) {
  const [sessionQueue, setSessionQueue] = useState<VocabularyItem[]>(items);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [updatedItems, setUpdatedItems] = useState<VocabularyItem[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);

  // Swipe detection
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const currentItem = sessionQueue[currentIndex];
  const progress = (updatedItems.length / items.length) * 100;

  const markCard = (status: 'known' | 'unknown') => {
    // Map status to difficulty for SRS calculation
    // Known -> medium (4), Unknown -> forgotten (0)
    const difficulty: Difficulty = status === 'known' ? 'medium' : 'forgotten';
    const srsUpdate = calculateNextReview(currentItem, difficulty);

    const updatedItem: VocabularyItem = {
      ...currentItem,
      ...srsUpdate,
      seenCount: (currentItem.seenCount || 0) + 1,
      status: status,
      lastReviewedAt: new Date().toISOString()
    };

    // Update history
    setUpdatedItems(prev => {
      const existing = prev.findIndex(i => i.id === updatedItem.id);
      if (existing !== -1) {
        const next = [...prev];
        next[existing] = updatedItem;
        return next;
      }
      return [...prev, updatedItem];
    });

    if (status === 'known') {
      setKnownCount(prev => prev + 1);
      if (currentIndex < sessionQueue.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
      } else {
        setIsComplete(true);
      }
    } else {
      setUnknownCount(prev => prev + 1);
      // Simple SRS: Re-insert 3 positions later
      const nextQueue = [...sessionQueue];
      const reInsertIndex = Math.min(currentIndex + 4, nextQueue.length);
      nextQueue.splice(reInsertIndex, 0, updatedItem);
      setSessionQueue(nextQueue);
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const goToNext = () => {
    if (currentIndex < sessionQueue.length) {
      markCard('known');
    }
  };

  const goToPrevious = () => {
    if (currentIndex < sessionQueue.length) {
      markCard('unknown');
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete) return;
      
      if (e.code === 'ArrowRight') {
        goToNext();
      } else if (e.code === 'ArrowLeft') {
        goToPrevious();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isComplete]);

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    
    if (distance > minSwipeDistance) {
      goToNext();
    } else if (distance < -minSwipeDistance) {
      goToPrevious();
    }
  };

  const handleDifficultySelect = (difficulty: Difficulty) => {
    const srsUpdate = calculateNextReview(currentItem, difficulty);
    const updatedItem: VocabularyItem = { 
      ...currentItem, 
      ...srsUpdate,
      seenCount: (currentItem.seenCount || 0) + 1,
      status: difficulty === 'forgotten' ? 'unknown' : 'known',
      lastReviewedAt: new Date().toISOString()
    };
    
    setUpdatedItems(prev => {
      const existing = prev.findIndex(i => i.id === updatedItem.id);
      if (existing !== -1) {
        const next = [...prev];
        next[existing] = updatedItem;
        return next;
      }
      return [...prev, updatedItem];
    });

    if (difficulty === 'forgotten') {
      setUnknownCount(prev => prev + 1);
      // Re-insert later
      const nextQueue = [...sessionQueue];
      const reInsertIndex = Math.min(currentIndex + 4, nextQueue.length);
      nextQueue.splice(reInsertIndex, 0, updatedItem);
      setSessionQueue(nextQueue);
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setKnownCount(prev => prev + 1);
      if (currentIndex < sessionQueue.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
      } else {
        setIsComplete(true);
      }
    }
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement
      ));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const doc = document.documentElement as any;
    const currentFullscreen = document.fullscreenElement || 
                              (document as any).webkitFullscreenElement || 
                              (document as any).mozFullScreenElement || 
                              (document as any).msFullscreenElement;

    if (!currentFullscreen) {
      if (doc.requestFullscreen) {
        doc.requestFullscreen();
      } else if (doc.webkitRequestFullscreen) {
        doc.webkitRequestFullscreen();
      } else if (doc.mozRequestFullScreen) {
        doc.mozRequestFullScreen();
      } else if (doc.msRequestFullscreen) {
        doc.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  if (isComplete) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-lg w-full text-center space-y-10 bg-pastel-yellow-50 p-12 rounded-[3.5rem] border-4 border-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-pastel-yellow-200" />
          
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-pastel-yellow-200 rounded-full animate-ping opacity-25" />
            <Mascot mood="happy" message="You're a star!" size="lg" className="relative z-10" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Session Complete!</h2>
            <p className="text-gray-500 font-semibold text-lg">You've reviewed {items.length} words today. Keep up the great work!</p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-pastel-yellow-100">
              <p className="text-3xl font-black text-pastel-yellow-600">{updatedItems.length}</p>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Total</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-pastel-green-100">
              <p className="text-3xl font-black text-pastel-green-600">{knownCount}</p>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Known</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-pastel-pink-100">
              <p className="text-3xl font-black text-pastel-pink-600">{unknownCount}</p>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Unknown</p>
            </div>
          </div>

          <Button className="w-full py-8 text-xl font-black bg-pastel-yellow-500 hover:bg-pastel-yellow-600 shadow-xl shadow-pastel-yellow-100 border-none rounded-[2rem] transition-all hover:scale-105 active:scale-95" onClick={() => onComplete(updatedItems)}>
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-gray-50 z-50 flex flex-col font-sans"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-100 p-6 flex items-center justify-between shadow-sm relative z-10">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-pastel-yellow-600 hover:bg-pastel-yellow-50 rounded-2xl font-black px-4">
            <ChevronLeft className="w-5 h-5 mr-1" /> Exit
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-gray-400 hover:text-pastel-yellow-600 hover:bg-pastel-yellow-50 rounded-2xl h-10 w-10">
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </Button>
        </div>
        <div className="flex-1 max-w-md mx-8">
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-pastel-yellow-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-lg font-black text-gray-900 tracking-tight">
            {updatedItems.length} <span className="text-gray-300 font-medium">/</span> {items.length}
          </div>
          <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest mt-1">
            <span className="text-pastel-green-600 bg-pastel-green-50 px-2 py-0.5 rounded-full">K: {knownCount}</span>
            <span className="text-pastel-pink-600 bg-pastel-pink-50 px-2 py-0.5 rounded-full">U: {unknownCount}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 -left-20 w-64 h-64 bg-pastel-yellow-100/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -right-20 w-64 h-64 bg-pastel-orange-100/30 rounded-full blur-3xl pointer-events-none" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, x: 40, rotate: 5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: -40, rotate: -5 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="w-full max-w-md relative z-10"
          >
            <Flashcard 
              item={currentItem} 
              isFlipped={isFlipped}
              onFlip={setIsFlipped} 
              onPlayAudio={onPlayAudio}
            />
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="w-full max-w-md h-32 flex items-center justify-center relative z-10">
          <AnimatePresence mode="wait">
            {isFlipped ? (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="grid grid-cols-4 gap-4 w-full"
              >
                <DifficultyButton 
                  label="Forgot" 
                  color="bg-white text-pastel-pink-600 border-pastel-pink-100 hover:bg-pastel-pink-50 hover:border-pastel-pink-200" 
                  onClick={() => handleDifficultySelect('forgotten')} 
                />
                <DifficultyButton 
                  label="Hard" 
                  color="bg-white text-pastel-orange-600 border-pastel-orange-100 hover:bg-pastel-orange-50 hover:border-pastel-orange-200" 
                  onClick={() => handleDifficultySelect('hard')} 
                />
                <DifficultyButton 
                  label="Medium" 
                  color="bg-white text-pastel-blue-600 border-pastel-blue-100 hover:bg-pastel-blue-50 hover:border-pastel-blue-200" 
                  onClick={() => handleDifficultySelect('medium')} 
                />
                <DifficultyButton 
                  label="Easy" 
                  color="bg-white text-pastel-green-600 border-pastel-green-100 hover:bg-pastel-green-50 hover:border-pastel-green-200" 
                  onClick={() => handleDifficultySelect('easy')} 
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <p className="text-gray-400 text-sm font-black uppercase tracking-[0.2em] animate-pulse">
                  Tap the card to reveal
                </p>
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-pastel-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-pastel-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-pastel-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function DifficultyButton({ label, color, onClick }: { label: string, color: string, onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex flex-col items-center justify-center p-5 rounded-[1.5rem] border-2 shadow-sm transition-all hover:scale-110 active:scale-90 font-black",
        color
      )}
    >
      <span className="text-[10px] uppercase tracking-widest">{label}</span>
    </button>
  );
}
