import { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  Play, 
  MoreVertical, 
  Volume2,
  CheckCircle,
  Clock,
  ExternalLink,
  X,
  Edit2,
  Plus,
  Share2
} from "lucide-react";
import { Topic, VocabularyItem } from "../types";
import { ShareModal } from "./ShareModal";
import { User } from "firebase/auth";
import { ADMIN_EMAIL } from "../lib/utils";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Mascot } from "./ui/Mascot";
import { cn } from "../lib/utils";

interface TopicDetailProps {
  topic: Topic;
  words: VocabularyItem[];
  onBack: () => void;
  onStartReview: () => void;
  onPlayAudio?: (text: string) => void;
  onDeleteTopic?: () => void;
  onDeleteWord?: (id: string) => void;
  onEditName?: (newName: string) => void;
  onAddVocabulary?: () => void;
  onStartPractice?: () => void;
  onShareTopic?: (emails: string[]) => Promise<void>;
  currentUser?: User | null;
}

export function TopicDetail({ 
  topic, 
  words, 
  onBack, 
  onStartReview, 
  onPlayAudio, 
  onDeleteTopic, 
  onDeleteWord,
  onEditName,
  onAddVocabulary,
  onStartPractice,
  onShareTopic,
  currentUser
}: TopicDetailProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(topic.name);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    setEditedName(topic.name);
  }, [topic.name]);

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== topic.name) {
      onEditName?.(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditedName(topic.name);
      setIsEditingName(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="w-fit text-gray-400 hover:text-pastel-green-600 hover:bg-pastel-green-50 rounded-2xl">
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Dashboard
          </Button>
          <div className="flex gap-3">
            {(topic.isOwner || isAdmin) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsShareModalOpen(true)} 
                className="text-pastel-purple-600 hover:bg-pastel-purple-50 gap-2 font-black rounded-2xl px-4"
              >
                <Share2 className="w-4 h-4" /> Sync with Students
              </Button>
            )}
            {(topic.isOwner || isAdmin) && (
              <Button variant="ghost" size="sm" onClick={onAddVocabulary} className="text-pastel-green-600 hover:bg-pastel-green-50 gap-2 font-black rounded-2xl px-4">
                <Plus className="w-4 h-4" /> Add Words
              </Button>
            )}
            {(topic.isOwner || isAdmin) && (
              <Button variant="ghost" size="sm" onClick={onDeleteTopic} className="text-red-400 hover:text-red-600 hover:bg-red-50 font-black rounded-2xl px-4">
                Delete Topic
              </Button>
            )}
          </div>
        </div>

        <div className={cn(
          "flex flex-col md:flex-row md:items-end justify-between gap-8 p-10 rounded-[3rem] border relative overflow-hidden",
          topic.isOwner ? "bg-pastel-green-50 border-pastel-green-100" : "bg-amber-50 border-amber-100"
        )}>
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 group">
                {isEditingName ? (
                  <Input
                    autoFocus
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      "text-4xl font-black h-auto py-2 px-4 w-full max-w-md bg-white border-2 rounded-2xl focus:ring-4",
                      (topic.isOwner || isAdmin) ? "border-pastel-green-200 focus:ring-pastel-green-100" : "border-amber-200 focus:ring-amber-100"
                    )}
                  />
                ) : (
                  <>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tight">{topic.name}</h1>
                    {(topic.isOwner || isAdmin) && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "h-10 w-10 text-gray-400 hover:bg-white opacity-0 group-hover:opacity-100 transition-all rounded-xl shadow-sm",
                          (topic.isOwner || isAdmin) ? "hover:text-pastel-green-600" : "hover:text-amber-600"
                        )}
                        onClick={() => setIsEditingName(true)}
                      >
                        <Edit2 className="w-5 h-5" />
                      </Button>
                    )}
                  </>
                )}
              </div>
              <span className={cn(
                "px-4 py-1.5 bg-white rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm border",
                topic.isOwner ? "text-pastel-green-600 border-pastel-green-100" : "text-amber-600 border-amber-100"
              )}>
                {topic.wordCount} words
              </span>
              {!topic.isOwner && (
                <span className="px-4 py-1.5 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-100">
                  Shared Topic
                </span>
              )}
            </div>
            <p className={cn(
              "font-semibold max-w-2xl text-lg leading-relaxed",
              topic.isOwner ? "text-pastel-green-700" : "text-amber-800"
            )}>
              {topic.description || `Collection of vocabulary related to ${topic.name}.`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full md:w-auto">
            <Button onClick={onStartPractice} className="gap-3 px-10 py-8 text-xl font-black bg-white text-pastel-blue-600 hover:bg-pastel-blue-50 border-4 border-pastel-blue-100 shadow-xl shadow-pastel-blue-100 rounded-[2rem] transition-all hover:scale-105 active:scale-95">
              <Play className="w-6 h-6 fill-pastel-blue-600" /> Practice
            </Button>
            <Button onClick={onStartReview} className="gap-3 px-10 py-8 text-xl font-black bg-pastel-green-600 hover:bg-pastel-green-700 shadow-xl shadow-pastel-green-200 border-none rounded-[2rem] transition-all hover:scale-105 active:scale-95">
              <Play className="w-6 h-6 fill-white" /> Study
            </Button>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 transform rotate-12 pointer-events-none">
            <Mascot mood="happy" size="lg" />
          </div>
        </div>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-pastel-green-500 transition-colors" />
          <Input className="pl-12 py-7 text-lg rounded-[1.5rem] border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-pastel-green-200 focus:ring-4 focus:ring-pastel-green-50 transition-all font-medium" placeholder="Search words..." />
        </div>
        <Button variant="secondary" className="gap-3 py-7 px-8 rounded-[1.5rem] font-black bg-white border-2 border-gray-50 hover:border-pastel-green-100 hover:bg-pastel-green-50 text-gray-600">
          <Filter className="w-5 h-5" /> Filter
        </Button>
      </div>

      {/* Word List */}
      <div className="grid grid-cols-1 gap-6">
        {words.map((word) => (
          <WordListItem 
            key={word.id} 
            word={word} 
            onPlayAudio={onPlayAudio} 
            onDelete={(topic.isOwner || isAdmin) ? () => onDeleteWord?.(word.id) : undefined} 
          />
        ))}
        {words.length === 0 && (
          <div className="py-32 text-center bg-gray-50/50 rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center gap-6">
            <Mascot mood="neutral" size="lg" />
            <div className="space-y-2">
              <p className="text-2xl font-black text-gray-900 tracking-tight">No words yet!</p>
              <p className="text-gray-400 font-medium">Add some vocabulary to start learning.</p>
            </div>
            <Button onClick={onAddVocabulary} className="bg-pastel-green-600 hover:bg-pastel-green-700 rounded-2xl font-black px-8">
              Add First Word
            </Button>
          </div>
        )}
      </div>
      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onShare={async (emails) => {
          if (onShareTopic) {
            await onShareTopic(emails);
          }
        }}
        currentEmails={topic.authorizedEmails}
      />
    </div>
  );
}

function WordListItem({ word, onPlayAudio, onDelete }: { word: VocabularyItem, onPlayAudio?: (text: string) => void, onDelete?: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isMastered = word.learnedStatus === 'mastered';
  const isDue = new Date(word.nextReviewDate) <= new Date();

  return (
    <Card className="p-6 hover:shadow-2xl hover:shadow-gray-200/50 transition-all group border-none bg-white rounded-[2rem] relative overflow-hidden">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 flex-1">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
            isMastered ? "bg-pastel-green-100 text-pastel-green-600" : "bg-pastel-purple-50 text-pastel-purple-500"
          )}>
            {isMastered ? <CheckCircle className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3">
              <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight">{word.english}</h3>
              <span className="text-sm text-gray-400 font-mono font-medium">{word.ipa}</span>
            </div>
            <p className="text-lg text-gray-500 font-semibold truncate">{word.vietnamese}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-12 w-12 rounded-xl transition-all",
              isPlaying ? "bg-pastel-green-100 text-pastel-green-600 scale-110" : "text-gray-400 hover:text-pastel-green-600 hover:bg-pastel-green-50"
            )}
            onClick={() => {
              setIsPlaying(true);
              onPlayAudio?.(word.english);
              setTimeout(() => setIsPlaying(false), 1000);
            }}
          >
            <Volume2 className={cn("w-6 h-6", isPlaying && "animate-pulse")} />
          </Button>
          {onDelete && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-12 w-12 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
            >
              <X className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded details on hover */}
      <div className="mt-6 pt-6 border-t-2 border-gray-50 hidden group-hover:block animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-pastel-green-50/50 p-5 rounded-2xl border border-pastel-green-100/50">
            <h4 className="text-[10px] font-black text-pastel-green-600 uppercase tracking-[0.2em] mb-3">Context</h4>
            <p className="text-sm text-gray-700 font-medium leading-relaxed">{word.usageContext}</p>
          </div>
          <div className="bg-pastel-purple-50/50 p-5 rounded-2xl border border-pastel-purple-100/50">
            <h4 className="text-[10px] font-black text-pastel-purple-500 uppercase tracking-[0.2em] mb-3">Example</h4>
            <p className="text-sm text-gray-700 font-bold italic leading-relaxed">"{word.examples[0]}"</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
