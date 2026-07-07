import { useState } from "react";
import { Sparkles, Loader2, ArrowRight, Info, MessageSquare, BookOpen } from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { AnnotatedSpeakingBoard } from "./AnnotatedSpeakingBoard";
import { generateCoreSuggestions, generateAnnotatedAnswer } from "../services/geminiService";
import { SpeakingSuggestionResult } from "../types";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface AnswerSuggestionGeneratorProps {
  question: string;
  speakingPart: 'Part 1' | 'Part 2' | 'Part 3';
}

export function AnswerSuggestionGenerator({ question, speakingPart }: AnswerSuggestionGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [result, setResult] = useState<SpeakingSuggestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!question.trim()) {
      setError("Please enter a question first.");
      return;
    }
    
    setIsGenerating(true);
    setIsAnnotating(true);
    setError(null);
    setResult(null);

    try {
      // 1. Generate core suggestions (workflow, vocab, raw answer)
      const coreData = await generateCoreSuggestions(question, speakingPart);
      setResult(coreData);
      setIsGenerating(false);

      // 2. Generate annotations in the background
      try {
        const annotatedData = await generateAnnotatedAnswer(coreData.sampleAnswer);
        setResult(prev => prev ? { ...prev, ...annotatedData } : null);
      } catch (annErr) {
        console.error("Annotation failed:", annErr);
        // We don't show an error to the user if only annotation fails
      } finally {
        setIsAnnotating(false);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate suggestions. Please try again.");
      setIsGenerating(false);
      setIsAnnotating(false);
    }
  };

  return (
    <Card className="p-8 space-y-8 border-none bg-white shadow-xl shadow-gray-200/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pastel-purple-50 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-pastel-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Answer Suggestion Generator</h3>
            <p className="text-sm text-gray-400 font-medium">Get ideas and vocabulary for your answer.</p>
          </div>
        </div>
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || isAnnotating || !question.trim()}
          className="bg-pastel-purple-600 hover:bg-pastel-purple-700 shadow-lg shadow-pastel-purple-100 rounded-2xl px-8 font-bold"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
            </>
          ) : isAnnotating && result ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Annotating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" /> Generate
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-2">
          <Info className="w-4 h-4" /> {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {result ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            {/* A. Idea Workflow */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-pastel-purple-500 rounded-full" />
                <h4 className="text-lg font-black text-gray-900 tracking-tight">Idea Workflow</h4>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {result.workflow.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-4">
                    <div className="group relative">
                      <div className="px-6 py-4 bg-pastel-purple-50 border-2 border-pastel-purple-100 rounded-[1.5rem] text-pastel-purple-700 font-black tracking-tight hover:bg-pastel-purple-100 hover:border-pastel-purple-200 transition-all cursor-help shadow-sm">
                        {step.label}
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                        {step.meaningVi}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                    {index < result.workflow.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* B. Useful Vocabulary */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-pastel-blue-500 rounded-full" />
                <h4 className="text-lg font-black text-gray-900 tracking-tight">Useful Vocabulary & Phrases</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.vocabulary.map((item, i) => (
                  <div key={i} className="p-5 bg-pastel-blue-50 rounded-2xl border border-pastel-blue-100 flex items-center justify-between group hover:bg-pastel-blue-100 transition-all duration-200">
                    <span className="font-black text-pastel-blue-900 text-lg">{item.phrase}</span>
                    <span className="text-sm text-pastel-blue-600 font-bold bg-white px-3 py-1.5 rounded-xl shadow-sm">{item.meaning}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* C. Sample Answer */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-pastel-green-500 rounded-full" />
                <h4 className="text-lg font-black text-gray-900 tracking-tight">Sample Answer (Band 8-9)</h4>
              </div>
              <Card className="p-8 bg-pastel-green-50 border-none rounded-[2rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <MessageSquare className="w-32 h-32 text-pastel-green-600" />
                </div>
                {result.annotatedSampleAnswer ? (
                  <AnnotatedSpeakingBoard 
                    chunks={result.annotatedSampleAnswer} 
                    className="text-xl text-gray-800 leading-relaxed font-bold italic tracking-tight relative z-10"
                    highlightColor="bg-pastel-green-200 text-pastel-green-900"
                    showQuotes={true}
                  />
                ) : (
                  <div className="relative">
                    <p className="text-xl text-gray-800 leading-relaxed font-bold italic tracking-tight relative z-10">
                      "{result.sampleAnswer}"
                    </p>
                    {isAnnotating && (
                      <div className="mt-4 flex items-center gap-2 text-pastel-green-600 font-bold text-sm animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding annotations...
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </motion.div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-gray-100 rounded-[2rem]">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-gray-300" />
            </div>
            <div className="max-w-xs">
              <p className="text-gray-400 font-bold">No suggestions generated yet</p>
              <p className="text-xs text-gray-300 font-medium mt-1">Enter an IELTS question and click generate to get expert guidance.</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}
