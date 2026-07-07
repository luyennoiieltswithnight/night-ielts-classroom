import React, { useState, useRef, useEffect } from "react";
import { 
  Loader2, 
  Sparkles, 
  Headphones, 
  ChevronLeft, 
  Info, 
  ArrowRight, 
  GitBranch, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  AlertCircle,
  BookOpen,
  Check,
  ArrowDown,
  Bold,
  Highlighter,
  MessageSquarePlus,
  Type,
  Eraser
} from "lucide-react";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { TextAnnotator, Annotation } from "./ui/TextAnnotator";
import { processListeningMode } from "../services/geminiService";
import { ListeningModeResult, LogicStep } from "../types";
import { cn } from "../lib/utils";
import { Mascot } from "./ui/Mascot";

interface ListeningModeProps {
  onBack: () => void;
}

export function ListeningMode({ onBack }: ListeningModeProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<{ data: string, mimeType: string }[]>([]);
  const [result, setResult] = useState<ListeningModeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [isChecked, setIsChecked] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [gapFillAnnotations, setGapFillAnnotations] = useState<Annotation[]>([]);
  const [hintLanguage, setHintLanguage] = useState<'en' | 'vi'>('en');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logicStepRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const logicMapContainerRef = useRef<HTMLDivElement>(null);
  const gapFillContainerRef = useRef<HTMLDivElement>(null);
  const [logicArrows, setLogicArrows] = useState<{ d: string, fromId: string, toId: string }[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setImages(prev => [...prev, { data: base64, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (!text.trim() && images.length === 0) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setIsChecked(false);
    setStudentAnswers({});
    
    try {
      const input = images.length > 0 ? images : text;
      const data = await processListeningMode(input);
      
      // Process markdown bold in summaries
      const { cleanedText: enText, annotations: enAnns } = extractMarkdownBold(data.explanationEn);
      const { cleanedText: viText, annotations: viAnns } = extractMarkdownBold(data.explanationVi);
      
      const adjustedViAnns = viAnns.map(ann => ({
        ...ann,
        start: ann.start + enText.length,
        end: ann.end + enText.length
      }));
      
      setAnnotations([...enAnns, ...adjustedViAnns]);
      setResult({
        ...data,
        explanationEn: enText,
        explanationVi: viText
      });
    } catch (err) {
      console.error(err);
      setError("Failed to process script. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate logic map arrows
  useEffect(() => {
    if (!result || !logicMapContainerRef.current) return;

    const calculateLogicArrows = () => {
      const newArrows: { d: string, fromId: string, toId: string }[] = [];
      const containerRect = logicMapContainerRef.current!.getBoundingClientRect();

      result.logicMap.forEach(step => {
        if (!step.connections) return;
        
        const fromEl = logicStepRefs.current[step.id];
        if (!fromEl) return;

        step.connections.forEach(toId => {
          const toEl = logicStepRefs.current[toId];
          if (!toEl) return;

          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();

          let startX, startY, endX, endY;
          
          const horizontalDiff = toRect.left - fromRect.left;
          const verticalDiff = toRect.top - fromRect.top;

          if (Math.abs(verticalDiff) > Math.abs(horizontalDiff)) {
            startX = fromRect.left + fromRect.width / 2 - containerRect.left;
            startY = fromRect.bottom - containerRect.top;
            endX = toRect.left + toRect.width / 2 - containerRect.left;
            endY = toRect.top - containerRect.top;
          } else {
            startX = fromRect.right - containerRect.left;
            startY = fromRect.top + fromRect.height / 2 - containerRect.top;
            endX = toRect.left - containerRect.left;
            endY = toRect.top + toRect.height / 2 - containerRect.top;
          }

          const cp1x = startX + (endX - startX) * 0.1;
          const cp1y = startY + (endY - startY) * 0.5;
          const cp2x = startX + (endX - startX) * 0.9;
          const cp2y = startY + (endY - startY) * 0.5;

          const d = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
          newArrows.push({ d, fromId: step.id, toId });
        });
      });
      setLogicArrows(newArrows);
    };

    const timer = setTimeout(calculateLogicArrows, 200);
    window.addEventListener('resize', calculateLogicArrows);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateLogicArrows);
    };
  }, [result]);

  const handleCheck = () => {
    setIsChecked(true);
  };

  const renderGapFill = () => {
    if (!result) return null;

    let currentOffset = 0;
    const parts = result.gapFill.text.split(/(\[blank\d+\])/g);
    
    return (
      <div className="leading-loose text-lg text-gray-800 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        {parts.map((part, i) => {
          const startOffset = currentOffset;
          currentOffset += part.length;

          const match = part.match(/\[(blank\d+)\]/);
          if (match) {
            const blankId = match[1];
            const blank = result.gapFill.blanks.find(b => b.id === blankId);
            const isCorrect = isChecked && studentAnswers[blankId]?.toLowerCase().trim() === blank?.answer.toLowerCase().trim();
            const hint = hintLanguage === 'en' ? blank?.hint : blank?.hintVi;
            const minWidth = Math.max((blank?.answer.length || 5) * 12, 100);

            return (
              <span key={i} className="inline-flex flex-col items-center align-bottom mx-1 min-w-[100px] group">
                {hint && (
                  <span className="text-[10px] font-bold text-indigo-400 leading-tight text-center mb-1 max-w-[150px] break-words animate-in fade-in slide-in-from-bottom-1">
                    {hint}
                  </span>
                )}
                <input
                  type="text"
                  style={{ width: `${minWidth}px` }}
                  className={cn(
                    "px-2 py-1 border-b-2 focus:outline-none transition-all text-center font-bold bg-transparent",
                    !isChecked ? "border-indigo-200 focus:border-indigo-600 placeholder:text-indigo-200" :
                    isCorrect ? "border-green-500 text-green-700 bg-green-50/50" : "border-red-500 text-red-700 bg-red-50/50"
                  )}
                  placeholder={!hint ? "..." : ""}
                  value={studentAnswers[blankId] || ""}
                  onChange={(e) => setStudentAnswers(prev => ({ ...prev, [blankId]: e.target.value }))}
                  disabled={isChecked}
                />
                {isChecked && !isCorrect && (
                  <span className="mt-1 text-[10px] font-bold text-green-600 whitespace-nowrap bg-white px-2 py-0.5 rounded shadow-sm border border-green-100">
                    {blank?.answer}
                  </span>
                )}
              </span>
            );
          }
          
          return (
            <SimpleTextAnnotator
              key={i}
              text={part}
              startOffset={startOffset}
              annotations={gapFillAnnotations}
              onAnnotationsChange={setGapFillAnnotations}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <header className="flex flex-col gap-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="w-fit text-gray-400 hover:text-pastel-blue-600 hover:bg-pastel-blue-50 rounded-2xl">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-5 bg-pastel-blue-50 p-8 rounded-[2.5rem] border border-pastel-blue-100 relative overflow-hidden">
          <div className="p-4 bg-white rounded-2xl shadow-sm relative z-10">
            <Headphones className="w-8 h-8 text-pastel-blue-600" />
          </div>
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Listening Mode</h1>
            <p className="text-pastel-blue-600 font-semibold mt-1">Transform scripts into interactive gap-fill exercises.</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12 pointer-events-none">
            <Mascot mood="happy" size="lg" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Input Section */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="p-8 space-y-8 border-none bg-white shadow-xl shadow-gray-200/50">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-pastel-blue-50 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-pastel-blue-600" />
                  </div>
                  Script Input
                </h3>
                {(text || images.length > 0) && (
                  <Button variant="ghost" size="sm" onClick={() => { setText(""); setImages([]); }} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl">
                    Clear
                  </Button>
                )}
              </div>
              
              <textarea
                className="w-full h-56 p-5 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-pastel-blue-200 focus:ring-4 focus:ring-pastel-blue-50 focus:outline-none text-gray-700 leading-relaxed font-medium transition-all resize-none"
                placeholder="Paste the listening script here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={images.length > 0}
              />

              <div className="relative space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Or Upload Images</span>
                </div>
                
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                
                <div className="grid grid-cols-3 gap-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 group shadow-sm">
                      <img src={`data:${img.mimeType};base64,${img.data}`} alt="upload" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-pastel-blue-300 hover:text-pastel-blue-500 hover:bg-pastel-blue-50 transition-all group"
                  >
                    <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black mt-2 uppercase tracking-wider">Add Image</span>
                  </button>
                </div>
              </div>
            </div>

            <Button 
              className="w-full py-8 text-xl font-black gap-3 bg-pastel-blue-600 hover:bg-pastel-blue-700 shadow-xl shadow-pastel-blue-100 border-none rounded-[2rem]" 
              disabled={(!text.trim() && images.length === 0) || isLoading}
              onClick={handleProcess}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" /> Generate Exercise
                </>
              )}
            </Button>
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}
          </Card>

          {result && (
            <Card className="p-8 space-y-8 bg-pastel-blue-50 border-none rounded-[2.5rem] shadow-lg shadow-pastel-blue-100/50">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-pastel-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Info className="w-4 h-4" /> Topic Detected
                </h4>
                <p className="text-2xl font-black text-pastel-blue-900 capitalize tracking-tight">{result.topic}</p>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-pastel-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Key Vocabulary
                </h4>
                <div className="space-y-3">
                  {result.vocabulary.map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-pastel-blue-100 shadow-sm hover:shadow-md transition-shadow group">
                      <span className="font-black text-pastel-blue-900 text-lg group-hover:text-pastel-blue-600 transition-colors">{v.word}</span>
                      <span className="text-xs text-pastel-blue-500 font-bold bg-pastel-blue-50 px-3 py-1.5 rounded-xl">{v.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Output Section */}
        <div className="lg:col-span-2 space-y-10">
          {!result ? (
            <Card className="p-16 h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-8 border-dashed border-2 border-pastel-blue-100 bg-white rounded-[3rem]">
              <Mascot mood="neutral" message="I'm ready to help you with listening!" size="lg" />
              <div className="max-w-xs space-y-3">
                <p className="font-black text-gray-900 text-2xl tracking-tight">Awaiting Listening Script</p>
                <p className="text-sm font-medium text-gray-400">Provide a script or images above to generate a visual explanation and gap-fill exercise.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
              {/* Explanation Section */}
              <TextAnnotator
                annotations={annotations}
                onAnnotationsChange={setAnnotations}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                {(renderAnnotatedText) => (
                  <>
                    <Card className="p-8 space-y-4 border-none bg-white shadow-xl shadow-gray-200/50 rounded-[2.5rem] relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-2 h-full bg-pastel-blue-500 group-hover:w-3 transition-all" />
                      <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                        <span className="w-8 h-8 bg-pastel-blue-100 text-pastel-blue-600 rounded-xl flex items-center justify-center text-xs font-black">EN</span>
                        English Summary
                      </h3>
                      <div className="prose prose-sm max-w-none text-gray-600 font-medium leading-relaxed">
                        {renderAnnotatedText(result.explanationEn, 0)}
                      </div>
                    </Card>
                    <Card className="p-8 space-y-4 border-none bg-white shadow-xl shadow-gray-200/50 rounded-[2.5rem] relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-2 h-full bg-pastel-pink-500 group-hover:w-3 transition-all" />
                      <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                        <span className="w-8 h-8 bg-pastel-pink-100 text-pastel-pink-600 rounded-xl flex items-center justify-center text-xs font-black">VI</span>
                        Vietnamese Summary
                      </h3>
                      <div className="prose prose-sm max-w-none text-gray-600 font-medium leading-relaxed">
                        {renderAnnotatedText(result.explanationVi, result.explanationEn.length)}
                      </div>
                    </Card>
                  </>
                )}
              </TextAnnotator>

              {/* Logic Map Section */}
              <Card className="p-10 space-y-10 border-none bg-white shadow-xl shadow-gray-200/50 rounded-[3rem]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-pastel-blue-50 rounded-2xl">
                    <GitBranch className="w-6 h-6 text-pastel-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900 tracking-tight">Visual Logic Map</h4>
                    <p className="text-sm text-gray-500 font-medium">Understanding the flow of ideas. Hover for Vietnamese.</p>
                  </div>
                </div>

                <div className="relative" ref={logicMapContainerRef}>
                  {/* SVG Layer for Logic Map Arrows */}
                  <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <marker id="logic-arrowhead-listening" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                      </marker>
                    </defs>
                    {logicArrows.map((arrow, i) => (
                      <path
                        key={i}
                        d={arrow.d}
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="2"
                        markerEnd="url(#logic-arrowhead-listening)"
                        className="animate-in fade-in duration-1000"
                      />
                    ))}
                  </svg>

                  <div className="flex flex-wrap items-start gap-12 justify-center w-full relative z-10">
                    {result.logicMap.map((step, i) => (
                      <div 
                        key={step.id || i} 
                        ref={el => { logicStepRefs.current[step.id] = el; }}
                        className="flex flex-col items-center"
                      >
                        <div className="relative group">
                          <div className={cn(
                            "relative p-5 rounded-[1.5rem] border-4 shadow-sm w-[200px] transition-all hover:shadow-xl hover:-translate-y-2 cursor-help",
                            step.type === 'main' ? "bg-yellow-50 border-yellow-200" :
                            step.type === 'cause' ? "bg-blue-50 border-blue-200" :
                            step.type === 'problem' ? "bg-red-50 border-red-200" :
                            step.type === 'response' ? "bg-purple-50 border-purple-200" :
                            step.type === 'action' ? "bg-green-50 border-green-200" :
                            "bg-slate-50 border-slate-200"
                          )}>
                            <div className="absolute -top-4 left-6 px-3 py-1 bg-white border-2 border-inherit rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm">
                              {step.label}
                            </div>
                            <p className="text-sm font-black text-gray-800 leading-snug tracking-tight">
                              {step.content}
                            </p>
                          </div>
                          
                          {/* Vietnamese Tooltip */}
                          {step.meaningVi && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-4 py-3 bg-gray-900 text-white text-xs font-bold rounded-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 w-56 text-center shadow-2xl scale-95 group-hover:scale-100">
                              {step.meaningVi}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Gap-Fill Exercise Section */}
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-pastel-green-50 rounded-2xl">
                      <CheckCircle2 className="w-6 h-6 text-pastel-green-600" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-gray-900 tracking-tight">Gap-Fill Exercise</h4>
                      <p className="text-sm text-gray-500 font-medium">Test your listening comprehension.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl">
                      <button
                        onClick={() => setHintLanguage('en')}
                        className={cn(
                          "px-4 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest",
                          hintLanguage === 'en' ? "bg-white text-pastel-blue-600 shadow-md" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        EN HINT
                      </button>
                      <button
                        onClick={() => setHintLanguage('vi')}
                        className={cn(
                          "px-4 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest",
                          hintLanguage === 'vi' ? "bg-white text-pastel-blue-600 shadow-md" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        VI HINT
                      </button>
                    </div>

                    {isChecked && (
                      <div className="flex items-center gap-6 animate-in fade-in slide-in-from-right-4">
                        <div className="text-lg font-black text-gray-900 bg-white px-5 py-2 rounded-2xl shadow-sm border border-gray-100">
                          Score: <span className="text-pastel-blue-600">{Object.entries(studentAnswers).filter(([id, val]) => val.toLowerCase().trim() === result.gapFill.blanks.find(b => b.id === id)?.answer.toLowerCase().trim()).length}</span> / {result.gapFill.blanks.length}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setIsChecked(false); setStudentAnswers({}); }} className="text-pastel-blue-600 font-black hover:bg-pastel-blue-50 rounded-xl">
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -top-6 -right-6 opacity-20 pointer-events-none transform rotate-12">
                    <Mascot mood="happy" size="md" />
                  </div>
                  {renderGapFill()}
                </div>

                {!isChecked && (
                  <Button 
                    className="w-full py-8 text-xl font-black gap-3 bg-pastel-green-600 hover:bg-pastel-green-700 shadow-xl shadow-pastel-green-100 border-none rounded-[2rem]"
                    onClick={handleCheck}
                  >
                    <Check className="w-6 h-6" /> Check Answers
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function extractMarkdownBold(text: string) {
  const annotations: any[] = [];
  let cleanedText = "";
  let lastIndex = 0;
  const regex = /\*\*(.*?)\*\*/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    cleanedText += text.substring(lastIndex, match.index);
    const start = cleanedText.length;
    cleanedText += match[1];
    const end = cleanedText.length;
    
    annotations.push({
      id: `system-bold-${Math.random().toString(36).substr(2, 9)}`,
      start,
      end,
      type: 'bold'
    });
    
    lastIndex = regex.lastIndex;
  }
  
  cleanedText += text.substring(lastIndex);
  return { cleanedText, annotations };
}

function Plus({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14M12 5v14"/>
    </svg>
  );
}

function SimpleTextAnnotator({ 
  text, 
  startOffset, 
  annotations, 
  onAnnotationsChange 
}: { 
  text: string, 
  startOffset: number, 
  annotations: Annotation[], 
  onAnnotationsChange: (anns: Annotation[]) => void 
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [selection, setSelection] = useState<{ start: number, end: number, text: string } | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      setMenuPos(null);
      return;
    }

    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setMenuPos(null);
      return;
    }

    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length + startOffset;
    const end = start + range.toString().length;

    const rect = range.getBoundingClientRect();
    setMenuPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setSelection({ start, end, text: range.toString() });
  };

  const applyAnnotation = (type: 'highlight' | 'bold' | 'note' | 'clear') => {
    if (!selection) return;
    
    if (type === 'clear') {
      const newAnns = annotations.filter(ann => 
        ann.end <= selection.start || ann.start >= selection.end
      );
      onAnnotationsChange(newAnns);
    } else if (type === 'note') {
      const id = Math.random().toString(36).substr(2, 9);
      const newAnns = [...annotations];
      // Automatically bold
      newAnns.push({
        id: Math.random().toString(36).substr(2, 9),
        start: selection.start,
        end: selection.end,
        type: 'bold'
      });
      // Add note
      newAnns.push({
        id,
        start: selection.start,
        end: selection.end,
        type: 'note',
        noteText: ''
      });
      onAnnotationsChange(newAnns);
      setEditingNoteId(id);
    } else {
      onAnnotationsChange([...annotations, {
        id: Math.random().toString(36).substr(2, 9),
        start: selection.start,
        end: selection.end,
        type
      }]);
    }
    setMenuPos(null);
    window.getSelection()?.removeAllRanges();
  };

  const renderContent = () => {
    const segmentAnns = annotations.filter(ann => 
      (ann.start >= startOffset && ann.start < startOffset + text.length) ||
      (ann.end > startOffset && ann.end <= startOffset + text.length) ||
      (ann.start < startOffset && ann.end > startOffset + text.length)
    );

    if (segmentAnns.length === 0) return text;

    const chars = text.split('');
    return chars.map((char, i) => {
      const globalIdx = startOffset + i;
      const activeAnns = segmentAnns.filter(ann => globalIdx >= ann.start && globalIdx < ann.end);
      
      if (activeAnns.length === 0) return char;

      let hasBold = false;
      let hasHighlight = false;
      let noteText: string | undefined = undefined;
      let noteId: string | null = null;

      activeAnns.forEach(ann => {
        if (ann.type === 'bold') hasBold = true;
        if (ann.type === 'highlight') hasHighlight = true;
        if (ann.type === 'note') {
          noteText = ann.noteText || "";
          noteId = ann.id;
        }
      });

      return (
        <span 
          key={i} 
          className={cn(
            hasBold && "font-bold text-indigo-700",
            hasHighlight && "bg-yellow-200"
          )}
        >
          {char}
          {noteText !== undefined && globalIdx === activeAnns.find(a => a.type === 'note')?.end - 1 && (
            <span className="inline-flex items-center text-indigo-600 font-bold ml-1">
              [
              {editingNoteId === noteId ? (
                <input
                  autoFocus
                  className="w-20 bg-transparent border-none outline-none p-0 text-inherit font-inherit"
                  value={noteText}
                  onChange={(e) => {
                    const id = editingNoteId;
                    const newAnns = annotations.map(ann => 
                      ann.id === id ? { ...ann, noteText: e.target.value } : ann
                    );
                    onAnnotationsChange(newAnns);
                  }}
                  onBlur={() => setEditingNoteId(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingNoteId(null);
                  }}
                />
              ) : (
                <span 
                  className="cursor-pointer hover:underline min-w-[4px]"
                  onClick={() => setEditingNoteId(noteId)}
                >
                  {noteText || " "}
                </span>
              )}
              ]
            </span>
          )}
        </span>
      );
    });
  };

  return (
    <span 
      ref={containerRef} 
      onMouseUp={handleMouseUp}
      className="relative"
    >
      {renderContent()}
      {menuPos && (
        <div 
          className="fixed z-[100] flex items-center gap-1 p-1 bg-gray-900 rounded-lg shadow-xl -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in-95 duration-200"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button onClick={() => applyAnnotation('bold')} className="p-1.5 hover:bg-white/10 rounded text-white transition-colors" title="Bold">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => applyAnnotation('highlight')} className="p-1.5 hover:bg-white/10 rounded text-white transition-colors" title="Highlight">
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => applyAnnotation('note')} className="p-1.5 hover:bg-white/10 rounded text-white transition-colors" title="Add Note">
            <MessageSquarePlus className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-white/20 mx-0.5" />
          <button onClick={() => applyAnnotation('clear')} className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors" title="Clear Formatting">
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </span>
  );
}
