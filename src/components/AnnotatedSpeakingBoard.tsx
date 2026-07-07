import React from "react";
import { AnnotatedChunk } from "../types";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface AnnotatedSpeakingBoardProps {
  chunks: AnnotatedChunk[];
  className?: string;
  highlightColor?: string;
  showQuotes?: boolean;
}

export const AnnotatedSpeakingBoard = React.memo(({ 
  chunks, 
  className, 
  highlightColor = "bg-pastel-pink-100 text-pastel-pink-900",
  showQuotes = false
}: AnnotatedSpeakingBoardProps) => {
  return (
    <div className={cn("leading-relaxed relative", className)}>
      {showQuotes && <span className="opacity-40 mr-1">"</span>}
      {chunks.map((chunk, index) => (
        <React.Fragment key={index}>
          {chunk.isHighlighted ? (
            <span className="group relative inline-block">
              <span className={cn(
                "px-1 py-0.5 rounded-md cursor-help transition-all duration-200 border-b-2 border-transparent hover:border-current",
                highlightColor
              )}>
                {chunk.text}
              </span>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="bg-gray-900 text-white p-3 rounded-xl shadow-2xl space-y-1">
                  {chunk.meaning && (
                    <div className="text-sm font-bold text-pastel-pink-300">
                      {chunk.meaning}
                    </div>
                  )}
                  {chunk.ipa && (
                    <div className="text-[10px] font-mono opacity-70 tracking-wider">
                      {chunk.ipa}
                    </div>
                  )}
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
                </div>
              </div>
            </span>
          ) : (
            <span>{chunk.text}</span>
          )}
        </React.Fragment>
      ))}
      {showQuotes && <span className="opacity-40 ml-1">"</span>}
    </div>
  );
});
