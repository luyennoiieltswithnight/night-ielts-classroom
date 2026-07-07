import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bold, Highlighter, MessageSquarePlus, X, Eraser } from "lucide-react";
import { cn } from "../../lib/utils";

export interface Annotation {
  id: string;
  start: number;
  end: number;
  type: 'highlight' | 'bold' | 'note';
  color?: string;
  noteText?: string;
}

interface TextAnnotatorProps {
  content?: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  className?: string;
  children?: (renderAnnotatedText: (text: string, offset: number) => React.ReactNode) => React.ReactNode;
}

export const cleanMarkdown = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
};

interface NoteComponentProps {
  note: Annotation;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onUpdate: (text: string) => void;
  onRemove: () => void;
}

const NoteComponent = React.memo(({ note, isEditing, onStartEdit, onEndEdit, onUpdate, onRemove }: NoteComponentProps) => {
  const [localText, setLocalText] = useState(note.noteText || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalText(note.noteText || "");
  }, [note.noteText]);

  const handleBlur = () => {
    if (localText !== note.noteText) {
      onUpdate(localText);
    }
    onEndEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (localText !== note.noteText) {
        onUpdate(localText);
      }
      onEndEdit();
    }
  };

  return (
    <span 
      className="mx-1 px-1.5 py-0.5 bg-indigo-50/50 text-indigo-600 text-[11px] font-bold rounded border border-indigo-100 align-baseline inline-flex items-center gap-0.5 annotation-note"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="opacity-50">[</span>
      {isEditing ? (
        <input
          ref={inputRef}
          autoFocus
          className="bg-transparent border-none outline-none p-0 min-w-[4px] text-indigo-700 placeholder:text-indigo-300"
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{ width: `${Math.max(8, (localText.length || 0) * 7)}px` }}
        />
      ) : (
        <span 
          className="cursor-text min-w-[4px]"
          onClick={onStartEdit}
        >
          {note.noteText || " "}
        </span>
      )}
      <span className="opacity-50">]</span>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-indigo-300 hover:text-red-500 transition-colors ml-0.5"
      >
        ×
      </button>
    </span>
  );
});

interface TextSegmentProps {
  chunkText: string;
  chunkClassName: string;
  notes: Annotation[];
  absoluteStart: number;
  editingNoteId: string | null;
  setEditingNoteId: (id: string | null) => void;
  onNoteUpdate: (id: string, text: string) => void;
  onNoteRemove: (id: string) => void;
}

const TextSegment = React.memo(({ 
  chunkText, 
  chunkClassName, 
  notes, 
  absoluteStart, 
  editingNoteId, 
  setEditingNoteId,
  onNoteUpdate,
  onNoteRemove
}: TextSegmentProps) => {
  return (
    <span 
      className={cn("transition-colors duration-200", chunkClassName)}
      data-offset={absoluteStart}
    >
      {chunkText}
      {notes.map(note => (
        <NoteComponent 
          key={note.id}
          note={note}
          isEditing={editingNoteId === note.id}
          onStartEdit={() => setEditingNoteId(note.id)}
          onEndEdit={() => setEditingNoteId(null)}
          onUpdate={(text) => onNoteUpdate(note.id, text)}
          onRemove={() => onNoteRemove(note.id)}
        />
      ))}
    </span>
  );
});

export function TextAnnotator({ content = "", annotations, onAnnotationsChange, className, children }: TextAnnotatorProps) {
  const [selectionInfo, setSelectionInfo] = useState<{
    rect: DOMRect;
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectionInfo && !(e.target as HTMLElement).closest('.annotation-toolbar')) {
        setSelectionInfo(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionInfo]);

  const handleMouseUp = (e: React.MouseEvent) => {
    // If clicking toolbar, ignore
    if ((e.target as HTMLElement).closest('.annotation-toolbar')) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;

    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setSelectionInfo(null);
      return;
    }

    const getOffset = (node: Node, offset: number) => {
      // 1. Find the nearest ancestor with data-offset
      let current: HTMLElement | null = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
      let dataOffsetEl: HTMLElement | null = null;
      
      while (current && containerRef.current?.contains(current)) {
        if (current.hasAttribute('data-offset')) {
          dataOffsetEl = current;
          break;
        }
        current = current.parentElement;
      }

      if (!dataOffsetEl) return undefined;

      const baseOffset = parseInt(dataOffsetEl.getAttribute('data-offset') || '0');
      
      // 2. Calculate offset within this data-offset element, skipping notes
      let relativeOffset = 0;
      const walker = document.createTreeWalker(dataOffsetEl, NodeFilter.SHOW_TEXT);
      
      while (walker.nextNode()) {
        const textNode = walker.currentNode;
        // Skip text nodes that are inside notes
        if ((textNode.parentElement as HTMLElement).closest('.annotation-note')) {
          continue;
        }
        if (textNode === node) {
          return baseOffset + relativeOffset + offset;
        }
        relativeOffset += textNode.textContent?.length || 0;
      }

      // If node is the element itself (e.g. INPUT)
      if (dataOffsetEl === node) return baseOffset;

      return undefined;
    };

    const start = getOffset(range.startContainer, range.startOffset);
    const end = getOffset(range.endContainer, range.endOffset);

    if (start !== undefined && end !== undefined) {
      setSelectionInfo({
        rect: range.getBoundingClientRect(),
        start,
        end,
        text: selection.toString()
      });
    }
  };

  const addAnnotation = (type: Annotation['type'], color?: string) => {
    if (!selectionInfo) return;

    // Check if an identical annotation already exists to avoid duplicates
    const isDuplicate = annotations.some(ann => 
      ann.start === selectionInfo.start && 
      ann.end === selectionInfo.end && 
      ann.type === type && 
      (type !== 'highlight' || ann.color === color)
    );

    if (isDuplicate) {
      setSelectionInfo(null);
      return;
    }

    if (type === 'note') {
      const noteId = Math.random().toString(36).substr(2, 9);
      const newAnns: Annotation[] = [
        {
          id: Math.random().toString(36).substr(2, 9),
          start: selectionInfo.start,
          end: selectionInfo.end,
          type: 'bold'
        },
        {
          id: noteId,
          start: selectionInfo.start,
          end: selectionInfo.end,
          type: 'note',
          noteText: ""
        }
      ];
      onAnnotationsChange([...annotations, ...newAnns]);
      setEditingNoteId(noteId);
    } else {
      const newAnn: Annotation = {
        id: Math.random().toString(36).substr(2, 9),
        start: selectionInfo.start,
        end: selectionInfo.end,
        type,
        color
      };
      onAnnotationsChange([...annotations, newAnn]);
    }
    
    // Do NOT clear selection here to allow multi-step annotation
    // The selection will be cleared when the user clicks elsewhere
  };

  const clearAnnotations = () => {
    if (!selectionInfo) return;
    
    const newAnns = annotations.filter(ann => {
      const overlaps = ann.start < selectionInfo.end && ann.end > selectionInfo.start;
      return !overlaps;
    });
    
    onAnnotationsChange(newAnns);
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  const renderAnnotatedText = (rawText: string, partStartOffset: number) => {
    const { cleanText, mdAnns } = (() => {
      let clean = "";
      const mdAnns: { start: number; end: number }[] = [];
      const parts = rawText.split(/(\*\*.*?\*\*)/g);
      let currentCleanOffset = 0;

      parts.forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const innerText = part.slice(2, -2);
          mdAnns.push({
            start: partStartOffset + currentCleanOffset,
            end: partStartOffset + currentCleanOffset + innerText.length
          });
          clean += innerText;
          currentCleanOffset += innerText.length;
        } else {
          clean += part;
          currentCleanOffset += part.length;
        }
      });
      return { cleanText: clean, mdAnns };
    })();

    const partEndOffset = partStartOffset + cleanText.length;
    
    // 2. Combine user annotations with markdown bold annotations
    const allRelevantAnns = [
      ...annotations.filter(ann => ann.start < partEndOffset && ann.end > partStartOffset),
      ...mdAnns.map(md => ({
        id: `md-${md.start}`,
        start: md.start,
        end: md.end,
        type: 'bold' as const
      }))
    ];

    if (allRelevantAnns.length === 0) {
      return <span data-offset={partStartOffset}>{cleanText}</span>;
    }

    // 3. Split clean text into chunks based on annotation boundaries
    const points = new Set([0, cleanText.length]);
    allRelevantAnns.forEach(ann => {
      const start = Math.max(0, ann.start - partStartOffset);
      const end = Math.min(cleanText.length, ann.end - partStartOffset);
      points.add(start);
      points.add(end);
    });

    const sortedPoints = Array.from(points).sort((a, b) => a - b);
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i + 1];
      const chunkText = cleanText.substring(start, end);
      const absoluteStart = partStartOffset + start;
      const absoluteEnd = partStartOffset + end;

      const chunkAnns = allRelevantAnns.filter(
        ann => ann.start <= absoluteStart && ann.end >= absoluteEnd
      );

      let chunkClassName = "";
      let chunkNotes: Annotation[] = [];

      chunkAnns.forEach(ann => {
        if (ann.type === 'bold') chunkClassName = cn(chunkClassName, "font-bold");
        if (ann.type === 'highlight') chunkClassName = cn(chunkClassName, ann.color);
        if (ann.type === 'note') chunkNotes.push(ann as Annotation);
      });

      elements.push(
        <TextSegment
          key={`${absoluteStart}-${absoluteEnd}`}
          chunkText={chunkText}
          chunkClassName={chunkClassName}
          notes={chunkNotes}
          absoluteStart={absoluteStart}
          editingNoteId={editingNoteId}
          setEditingNoteId={setEditingNoteId}
          onNoteUpdate={(id, text) => {
            onAnnotationsChange(annotations.map(a => a.id === id ? { ...a, noteText: text } : a));
          }}
          onNoteRemove={(id) => {
            onAnnotationsChange(annotations.filter(a => a.id !== id));
          }}
        />
      );
    }

    return elements;
  };

  return (
    <div 
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className={cn("relative select-text", className)}
    >
      {children ? children(renderAnnotatedText) : renderAnnotatedText(content, 0)}

      <AnimatePresence>
        {selectionInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed z-[100] flex items-center gap-1 p-1 bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 annotation-toolbar"
            style={{
              top: selectionInfo.rect.top - 50,
              left: selectionInfo.rect.left + selectionInfo.rect.width / 2 - 100,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <button 
              onClick={() => addAnnotation('bold')}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-700 mx-1" />
            
            <button 
              onClick={() => addAnnotation('highlight', 'bg-yellow-200 text-yellow-900')}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="Yellow Highlight"
            >
              <div className="w-4 h-4 rounded-sm bg-yellow-200" />
            </button>
            <button 
              onClick={() => addAnnotation('highlight', 'bg-pink-200 text-pink-900')}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="Pink Highlight"
            >
              <div className="w-4 h-4 rounded-sm bg-pink-200" />
            </button>
            <button 
              onClick={() => addAnnotation('highlight', 'bg-blue-200 text-blue-900')}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="Blue Highlight"
            >
              <div className="w-4 h-4 rounded-sm bg-blue-200" />
            </button>
            <button 
              onClick={() => addAnnotation('highlight', 'bg-green-200 text-green-900')}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="Green Highlight"
            >
              <div className="w-4 h-4 rounded-sm bg-green-200" />
            </button>
            
            <div className="w-px h-4 bg-gray-700 mx-1" />
            <button 
              onClick={() => addAnnotation('note')}
              className="p-2 hover:bg-gray-800 rounded transition-colors flex items-center gap-1"
              title="Add Vietnamese Note"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span className="text-[10px] font-bold">Note</span>
            </button>
            
            <div className="w-px h-4 bg-gray-700 mx-1" />
            <button 
              onClick={clearAnnotations}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="Clear Formatting"
            >
              <Eraser className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-gray-700 mx-1" />
            <button 
              onClick={() => setSelectionInfo(null)}
              className="p-2 hover:bg-red-900 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
