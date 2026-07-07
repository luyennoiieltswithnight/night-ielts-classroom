import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Volume2, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { VocabularyItem } from "../../types";
import { Button } from "./Button";
import { Card } from "./Card";
import { cn } from "../../lib/utils";

interface FlashcardProps {
  item: VocabularyItem;
  isFlipped?: boolean;
  onFlip?: (isFlipped: boolean) => void;
  onPlayAudio?: (text: string) => void;
}

export function Flashcard({ item, isFlipped: controlledFlipped, onFlip, onPlayAudio }: FlashcardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const handleFlip = () => {
    const nextState = !isFlipped;
    if (controlledFlipped === undefined) {
      setInternalFlipped(nextState);
    }
    onFlip?.(nextState);
  };

  return (
    <div className="perspective-1000 w-full max-w-md aspect-[3/4] cursor-pointer group" onClick={handleFlip}>
      <motion.div
        className="relative w-full h-full preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.15, ease: "circOut" }}
      >
        {/* Front Side */}
        <Card className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-12 text-center shadow-2xl border-none bg-white rounded-[3rem]">
          <div className="absolute top-8 left-8 w-12 h-12 bg-pastel-yellow-50 rounded-2xl flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
            <Sparkles className="w-6 h-6 text-pastel-yellow-500" />
          </div>
          
          <span className="px-4 py-1.5 bg-pastel-yellow-50 text-pastel-yellow-600 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-8 shadow-sm border border-pastel-yellow-100">
            {item.partOfSpeech}
          </span>
          
          <h2 className="text-5xl font-black text-gray-900 mb-4 tracking-tight leading-tight">{item.english}</h2>
          <p className="text-xl text-gray-400 font-mono font-medium bg-gray-50 px-4 py-2 rounded-xl">{item.ipa}</p>
          
          <div className="mt-auto flex flex-col items-center gap-3">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-pastel-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-pastel-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-pastel-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] flex items-center gap-2">
              Tap to flip <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </Card>

        {/* Back Side */}
        <Card 
          className="absolute inset-0 backface-hidden flex flex-col p-10 shadow-2xl border-none bg-pastel-yellow-50 rounded-[3rem]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">{item.english}</h3>
              <p className="text-lg text-pastel-yellow-600 font-mono font-bold">{item.ipa}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-14 w-14 rounded-2xl bg-white shadow-xl shadow-pastel-yellow-100 transition-all",
                isPlaying ? "bg-pastel-yellow-100 scale-110" : "hover:bg-pastel-yellow-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(true);
                onPlayAudio?.(item.english);
                setTimeout(() => setIsPlaying(false), 1000);
              }}
            >
              <Volume2 className={cn("w-7 h-7 text-pastel-yellow-600", isPlaying && "animate-pulse")} />
            </Button>
          </div>

          <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar flex-1">
            <div className="bg-white p-6 rounded-3xl border border-pastel-yellow-100 shadow-sm">
              <h4 className="text-[10px] font-black text-pastel-yellow-600 uppercase tracking-[0.2em] mb-3">Meaning</h4>
              <p className="text-2xl font-black text-gray-900 tracking-tight mb-2">{item.vietnamese}</p>
              <p className="text-sm text-gray-500 font-semibold italic leading-relaxed">"{item.simpleEnglishMeaning}"</p>
            </div>

            <div className="px-2">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Usage Context</h4>
              <p className="text-sm text-gray-700 font-medium leading-relaxed">{item.usageContext}</p>
            </div>

            <div className="px-2">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Examples</h4>
              <ul className="space-y-4">
                {item.examples.map((example, i) => (
                  <li key={i} className="text-sm text-gray-700 font-bold italic pl-4 border-l-4 border-pastel-yellow-200 leading-relaxed">
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-4 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Tap to flip back
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
