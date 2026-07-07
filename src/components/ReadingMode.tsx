import { useState, useRef, useEffect, useMemo } from "react";
import { Loader2, Sparkles, BookOpen, ChevronLeft, Info, ArrowRight, GitBranch, ArrowDown, AlertCircle } from "lucide-react";
import Markdown from "react-markdown";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Mascot } from "./ui/Mascot";
import { TextAnnotator, Annotation, cleanMarkdown } from "./ui/TextAnnotator";
import { processReadingMode } from "../services/geminiService";
import { ReadingModeResult, HighlightedChunk, IdeaRelationship, LogicStep } from "../types";
import { cn } from "../lib/utils";

interface ReadingModeProps {
  onBack: () => void;
}

export function ReadingMode({ onBack }: ReadingModeProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReadingModeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredChunkIndex, setHoveredChunkIndex] = useState<number | null>(null);
  const [boardAnnotations, setBoardAnnotations] = useState<Annotation[]>([]);
  const [summaryAnnotations, setSummaryAnnotations] = useState<Annotation[]>([]);
  
  const chunkRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const logicStepRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const logicMapContainerRef = useRef<HTMLDivElement>(null);
  const [arrows, setArrows] = useState<{ d: string, type: string, label?: string }[]>([]);
  const [logicArrows, setLogicArrows] = useState<{ d: string, fromId: string, toId: string }[]>([]);

  const handleProcess = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setArrows([]);
    try {
      const data = await processReadingMode(text);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Failed to process text. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate arrow paths when result or window size changes
  useEffect(() => {
    if (!result || !containerRef.current) return;

    const calculateArrows = () => {
      const newArrows: { d: string, type: string, label?: string }[] = [];
      const containerRect = containerRef.current!.getBoundingClientRect();

      result.relationships.forEach(rel => {
        const fromEl = chunkRefs.current[rel.fromIndex];
        const toEl = chunkRefs.current[rel.toIndex];

        if (fromEl && toEl) {
          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();

          const startX = fromRect.left + fromRect.width / 2 - containerRect.left;
          const startY = fromRect.bottom - containerRect.top;
          const endX = toRect.left + toRect.width / 2 - containerRect.left;
          const endY = toRect.top - containerRect.top;

          // Create a curved path
          const cp1x = startX;
          const cp1y = startY + 20;
          const cp2x = endX;
          const cp2y = endY - 20;

          const d = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
          newArrows.push({ d, type: rel.type, label: rel.label });
        }
      });
      setArrows(newArrows);
    };

    // Delay slightly to ensure DOM is rendered
    const timer = setTimeout(() => {
      calculateArrows();
    }, 100);
    window.addEventListener('resize', calculateArrows);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateArrows);
    };
  }, [result]);

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

          // Calculate start and end points
          // If toEl is below fromEl, start from bottom, end at top
          // If toEl is to the right, start from right, end at left
          
          let startX, startY, endX, endY;
          
          const horizontalDiff = toRect.left - fromRect.left;
          const verticalDiff = toRect.top - fromRect.top;

          if (Math.abs(verticalDiff) > Math.abs(horizontalDiff)) {
            // Vertical flow
            startX = fromRect.left + fromRect.width / 2 - containerRect.left;
            startY = fromRect.bottom - containerRect.top;
            endX = toRect.left + toRect.width / 2 - containerRect.left;
            endY = toRect.top - containerRect.top;
          } else {
            // Horizontal flow
            startX = fromRect.right - containerRect.left;
            startY = fromRect.top + fromRect.height / 2 - containerRect.top;
            endX = toRect.left - containerRect.left;
            endY = toRect.top + toRect.height / 2 - containerRect.top;
          }

          // Create a smooth curve
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

  const getHighlightClass = (type: HighlightedChunk['type'], isHovered: boolean) => {
    const base = "px-1 rounded transition-all duration-200 cursor-help relative group inline-block my-1 mx-0.5";
    const hoverEffect = isHovered ? "ring-2 ring-offset-1 ring-indigo-400 scale-105 z-10" : "";
    
    switch (type) {
      case 'subject': return cn(base, "bg-yellow-200 text-yellow-900", hoverEffect);
      case 'new_info': return cn(base, "bg-green-200 text-green-900", hoverEffect);
      case 'additional_idea': return cn(base, "bg-blue-200 text-blue-900", hoverEffect);
      case 'connector': return cn(base, "bg-red-100 text-red-700 font-bold", hoverEffect);
      case 'advanced_vocab': return cn(base, "border-b-2 border-indigo-500 text-indigo-700 font-semibold", hoverEffect);
      default: return "inline";
    }
  };

  const getArrowColor = (type: string) => {
    switch (type) {
      case 'repetition': return "#EAB308"; // yellow-500
      case 'cause_effect': return "#EF4444"; // red-500
      case 'example': return "#10B981"; // green-500
      case 'support': return "#3B82F6"; // blue-500
      case 'contrast': return "#F97316"; // orange-500
      default: return "#6366F1"; // indigo-500
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <header className="flex flex-col gap-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="w-fit text-gray-400 hover:text-pastel-purple-600 hover:bg-pastel-purple-50 rounded-2xl">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-5 bg-pastel-purple-50 p-8 rounded-[2.5rem] border border-pastel-purple-100 relative overflow-hidden">
          <div className="p-4 bg-white rounded-2xl shadow-sm relative z-10">
            <BookOpen className="w-8 h-8 text-pastel-purple-600" />
          </div>
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Reading Mode</h1>
            <p className="text-pastel-purple-600 font-semibold mt-1">Visual relationship mapping for deep comprehension.</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12 pointer-events-none">
            <Mascot mood="happy" size="lg" />
          </div>
        </div>
      </header>

      <div className="space-y-10">
        {/* Compact Input Area */}
        <Card className="p-8 space-y-8 border-none bg-white shadow-xl shadow-gray-200/50 rounded-[2.5rem]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 bg-pastel-purple-50 rounded-xl flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-pastel-purple-600" />
              </div>
              Input Text
            </h3>
            {text && (
              <Button variant="ghost" size="sm" onClick={() => setText("")} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl">
                Clear
              </Button>
            )}
          </div>
          <textarea
            className="w-full h-32 p-5 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-pastel-purple-200 focus:ring-4 focus:ring-pastel-purple-50 focus:outline-none text-gray-700 leading-relaxed font-medium transition-all resize-none"
            placeholder="Paste a paragraph of English text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button 
            className="w-full py-8 text-xl font-black gap-3 bg-pastel-purple-600 hover:bg-pastel-purple-700 shadow-xl shadow-pastel-purple-100 border-none rounded-[2rem]" 
            disabled={!text.trim() || isLoading}
            onClick={handleProcess}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" /> Map Relationships
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

        {/* Large Analysis Canvas */}
        <Card className="p-10 min-h-[600px] flex flex-col relative overflow-hidden bg-white border-none shadow-2xl shadow-gray-200/50 rounded-[3rem]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
              Analysis Board
              <span className="text-[10px] font-black text-pastel-purple-500 bg-pastel-purple-50 px-3 py-1 rounded-full uppercase tracking-widest">Interactive</span>
            </h3>
            <div className="flex flex-wrap gap-4">
              <LegendItem color="bg-yellow-200" label="Subject" />
              <LegendItem color="bg-green-200" label="New Info" />
              <LegendItem color="bg-blue-200" label="Details" />
              <LegendItem color="bg-red-100" label="Connector" />
              <LegendItem color="border-b-4 border-pastel-purple-400" label="Advanced" />
            </div>
          </div>

          {!result ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 space-y-8">
              <Mascot mood="neutral" message="Paste your text and I'll map it out!" size="lg" />
              <div className="max-w-xs space-y-3">
                <p className="font-black text-gray-900 text-2xl tracking-tight">Ready for analysis</p>
                <p className="text-sm font-medium text-gray-400">Paste your text above to see visual connections and phrase-level insights.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 relative" ref={containerRef}>
              {/* SVG Layer for Arrows */}
              <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible" style={{ width: '100%', height: '100%' }}>
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                  </marker>
                </defs>
                {arrows.map((arrow, i) => (
                  <g key={i} className="transition-opacity duration-300" style={{ color: getArrowColor(arrow.type) }}>
                    <path
                      d={arrow.d}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      markerEnd="url(#arrowhead)"
                      className="opacity-30 hover:opacity-100 transition-opacity"
                    />
                    {arrow.label && (
                      <text className="text-[10px] font-bold uppercase fill-current opacity-0 hover:opacity-100 transition-opacity">
                        <textPath href={`#arrow-${i}`} startOffset="50%" textAnchor="middle">
                          {arrow.label}
                        </textPath>
                      </text>
                    )}
                  </g>
                ))}
              </svg>

              {/* Text Layer */}
              <TextAnnotator
                annotations={boardAnnotations}
                onAnnotationsChange={setBoardAnnotations}
                className="relative z-10 bg-gray-50/50 p-12 rounded-[2.5rem] border-2 border-gray-50 shadow-inner leading-[3.5rem] text-2xl text-gray-800 font-medium"
              >
                {(renderAnnotatedText) => {
                  let currentOffset = 0;
                  return (
                    <>
                      {result.chunks.map((chunk, i) => {
                        const startOffset = currentOffset;
                        currentOffset += chunk.text.length;
                        return (
                          <span 
                            key={i} 
                            ref={el => { chunkRefs.current[i] = el; }}
                            className={getHighlightClass(chunk.type, hoveredChunkIndex === i)}
                            onMouseEnter={() => setHoveredChunkIndex(i)}
                            onMouseLeave={() => setHoveredChunkIndex(null)}
                            data-offset={startOffset}
                          >
                            {renderAnnotatedText(chunk.text, startOffset)}
                            
                            {/* Tooltip */}
                            {chunk.type !== 'normal' && hoveredChunkIndex === i && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-4 bg-gray-900 text-white rounded-[1.5rem] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 min-w-[240px] scale-105">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className={cn(
                                    "w-3 h-3 rounded-full",
                                    chunk.type === 'subject' ? "bg-yellow-400" :
                                    chunk.type === 'new_info' ? "bg-green-400" :
                                    chunk.type === 'additional_idea' ? "bg-blue-400" :
                                    chunk.type === 'connector' ? "bg-red-400" : "bg-pastel-purple-400"
                                  )} />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    {chunk.label || chunk.type.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="text-sm font-bold leading-relaxed">{chunk.meaning || "Key concept"}</p>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-gray-900" />
                              </div>
                            )}
                          </span>
                        );
                      })}
                    </>
                  );
                }}
              </TextAnnotator>

              {/* Relationship Summary */}
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                {result.relationships.length > 0 && (
                  <div className="col-span-full mb-2">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Info className="w-4 h-4" /> Logical Flow
                    </h4>
                  </div>
                )}
                {result.relationships.map((rel, i) => (
                  <div key={i} className="p-5 bg-white rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm" style={{ backgroundColor: getArrowColor(rel.type) }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900 capitalize tracking-tight">{rel.type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-gray-500 font-medium line-clamp-1 italic">"{result.chunks[rel.fromIndex].text.trim()}" → "{result.chunks[rel.toIndex].text.trim()}"</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Logic Map / Idea Flow Section */}
              <div className="mt-20 pt-16 border-t-2 border-gray-50">
                <div className="flex items-center gap-4 mb-12">
                  <div className="p-3 bg-pastel-purple-50 rounded-2xl">
                    <GitBranch className="w-6 h-6 text-pastel-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900 tracking-tight">Logic Map: Idea Flow</h4>
                    <p className="text-sm text-gray-500 font-medium">Visual reasoning chain of the paragraph's argument. Hover for Vietnamese.</p>
                  </div>
                </div>

                <div className="relative" ref={logicMapContainerRef}>
                  {/* SVG Layer for Logic Map Arrows */}
                  <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <marker id="logic-arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
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
                        markerEnd="url(#logic-arrowhead)"
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
                            "relative p-6 rounded-[2rem] border-4 shadow-sm w-[220px] transition-all hover:shadow-2xl hover:-translate-y-2 cursor-help",
                            step.type === 'main' ? "bg-yellow-50 border-yellow-200" :
                            step.type === 'cause' ? "bg-blue-50 border-blue-200" :
                            step.type === 'problem' ? "bg-red-50 border-red-200" :
                            step.type === 'response' ? "bg-purple-50 border-purple-200" :
                            step.type === 'action' ? "bg-green-50 border-green-200" :
                            "bg-slate-50 border-slate-200"
                          )}>
                            <div className="absolute -top-4 left-8 px-4 py-1 bg-white border-2 border-inherit rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm">
                              {step.label}
                            </div>
                            <p className="text-sm font-black text-gray-800 leading-relaxed tracking-tight">
                              {step.content}
                            </p>
                          </div>
                          
                          {/* Vietnamese Tooltip */}
                          {step.meaningVi && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-4 bg-gray-900 text-white text-xs font-bold rounded-[1.5rem] opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 w-60 text-center shadow-2xl scale-95 group-hover:scale-100">
                              {step.meaningVi}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-gray-900" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Explanations Section */}
              <TextAnnotator
                annotations={summaryAnnotations}
                onAnnotationsChange={setSummaryAnnotations}
                className="mt-20 pt-16 border-t-2 border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-10"
              >
                {(renderAnnotatedText) => (
                  <>
                    <div className="space-y-6 relative group">
                      <div className="absolute -left-4 top-0 w-1 h-full bg-pastel-purple-200 rounded-full group-hover:bg-pastel-purple-400 transition-colors" />
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="w-8 h-8 bg-pastel-purple-50 text-pastel-purple-600 rounded-xl flex items-center justify-center text-[10px] font-black">EN</span>
                        English Summary
                      </h4>
                      <div className="prose prose-sm max-w-none text-gray-600 font-medium leading-relaxed">
                        {renderAnnotatedText(result.explanationEn, 0)}
                      </div>
                    </div>
                    <div className="space-y-6 relative group">
                      <div className="absolute -left-4 top-0 w-1 h-full bg-pastel-pink-200 rounded-full group-hover:bg-pastel-pink-400 transition-colors" />
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="w-8 h-8 bg-pastel-pink-50 text-pastel-pink-600 rounded-xl flex items-center justify-center text-[10px] font-black">VI</span>
                        Vietnamese Summary
                      </h4>
                      <div className="prose prose-sm max-w-none text-gray-600 font-medium leading-relaxed">
                        {renderAnnotatedText(result.explanationVi, cleanMarkdown(result.explanationEn).length)}
                      </div>
                    </div>
                  </>
                )}
              </TextAnnotator>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
      <div className={cn("w-2 h-2 rounded-full", color)} />
      {label}
    </div>
  );
}
