import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Plus, 
  Search,
  ChevronRight,
  FolderOpen,
  Zap,
  Mic,
  Headphones,
  Maximize2,
  Monitor,
  Pencil,
  Trash2,
  Share2
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { ProgressBar } from "./ui/ProgressBar";
import { Mascot } from "./ui/Mascot";
import { Topic, UserStats, TopicFolder } from "../types";
import { ShareModal } from "./ShareModal";
import { cn, ADMIN_EMAIL } from "../lib/utils";

interface DashboardProps {
  stats: UserStats;
  topics: Topic[];
  topicFolders: TopicFolder[];
  nextReviewDate: string | null;
  upcomingReviews: {
    tomorrow: number;
    thisWeek: number;
  };
  onNewTopic: () => void;
  onSelectTopic: (topic: Topic) => void;
  onStartReview: () => void;
  onViewAllTopics: () => void;
  onViewProgress: () => void;
  onReadingMode: () => void;
  onSpeakingMode: () => void;
  onListeningMode: () => void;
  onIdeaChains: () => void;
  onToggleTheaterMode: () => void;
  onToggleBrowserFullScreen: () => void;
  onNewTopicFolder: (name: string) => void;
  onDeleteTopicFolder: (id: string, deleteContents: boolean) => void;
  onRenameTopicFolder: (id: string, name: string) => void;
  onMoveTopicToFolder: (topicId: string, folderId: string | null) => void;
  onShareTopicFolder: (folderId: string, emails: string[]) => void;
  currentUser?: any;
}

export function Dashboard({ 
  stats, 
  topics, 
  topicFolders,
  nextReviewDate, 
  upcomingReviews, 
  onNewTopic, 
  onSelectTopic, 
  onStartReview, 
  onViewAllTopics, 
  onViewProgress, 
  onReadingMode, 
  onSpeakingMode, 
  onListeningMode, 
  onIdeaChains, 
  onToggleTheaterMode, 
  onToggleBrowserFullScreen,
  onNewTopicFolder,
  onDeleteTopicFolder,
  onRenameTopicFolder,
  onMoveTopicToFolder,
  onShareTopicFolder,
  currentUser
}: DashboardProps) {
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [isAddingFolder, setIsAddingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [isMovingTopicId, setIsMovingTopicId] = React.useState<string | null>(null);
  const [isRenamingFolderId, setIsRenamingFolderId] = React.useState<string | null>(null);
  const [editFolderName, setEditFolderName] = React.useState("");
  const [isDeletingFolderId, setIsDeletingFolderId] = React.useState<string | null>(null);
  const [isSharingFolderId, setIsSharingFolderId] = React.useState<string | null>(null);

  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  const currentFolder = topicFolders.find(f => f.id === selectedFolderId);

  const filteredTopics = topics.filter(t => t.folderId === (selectedFolderId || undefined));
  const rootTopics = topics.filter(t => !t.folderId);
  const itemsToDisplay = selectedFolderId ? filteredTopics : rootTopics;
  const getNextReviewLabel = () => {
    if (stats.wordsReviewedToday > 0) return "Now";
    if (!nextReviewDate) return "None";
    
    const next = new Date(nextReviewDate);
    const now = new Date();
    const diff = next.getTime() - now.getTime();
    
    if (diff <= 0) return "Now";
    
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    if (hours <= 1) return "Soon";
    if (hours < 24) return `In ${hours}h`;
    
    const days = Math.ceil(hours / 24);
    if (days === 1) return "Tomorrow";
    return `In ${days}d`;
  };
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-pastel-green-50 p-8 rounded-[2.5rem] border border-pastel-green-100 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Welcome back!</h1>
          <p className="text-pastel-green-600 font-semibold mt-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            You have {stats.wordsReviewedToday} reviews due today.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 relative z-10">
          <Button variant="secondary" onClick={onSpeakingMode} className="gap-2 bg-pastel-pink-600 hover:bg-pastel-pink-700 text-white shadow-lg shadow-pastel-pink-100 border-none">
            <Mic className="w-5 h-5" /> Speaking Mode
          </Button>
          <Button onClick={onNewTopic} className="gap-2 bg-pastel-green-600 hover:bg-pastel-green-700 text-white border-none">
            <Plus className="w-5 h-5" /> New Topic
          </Button>
          <Button variant="outline" onClick={onStartReview} className="gap-2 border-pastel-green-200 text-pastel-green-600 bg-white/50 hover:bg-pastel-green-50">
            <Zap className="w-5 h-5 fill-pastel-green-600" /> Review Now
          </Button>
        </div>
        
        {/* Decorative Mascot */}
        <div className="absolute -right-4 -bottom-4 opacity-20 transform rotate-12 pointer-events-none">
          <Mascot mood="happy" size="lg" />
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Words" 
          value={stats.totalWords} 
          icon={<BookOpen className="w-6 h-6 text-pastel-green-600" />} 
          color="bg-pastel-green-100"
        />
        <StatCard 
          label="Mastered" 
          value={stats.masteredCount} 
          icon={<CheckCircle className="w-6 h-6 text-emerald-600" />} 
          color="bg-emerald-100"
        />
        <StatCard 
          label="Study Streak" 
          value={`${stats.streak} days`} 
          icon={<TrendingUp className="w-6 h-6 text-orange-500" />} 
          color="bg-orange-100"
        />
        <StatCard 
          label="Next Review" 
          value={getNextReviewLabel()} 
          icon={<Clock className="w-6 h-6 text-pastel-blue-600" />} 
          color="bg-pastel-blue-100"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Topics Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-pastel-green-100 rounded-2xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-pastel-green-600" />
              </div>
              {selectedFolderId ? topicFolders.find(f => f.id === selectedFolderId)?.name : "Your Flashcards"}
            </h2>
            <div className="flex gap-2">
               {selectedFolderId && (
                 <>
                   <Button variant="ghost" size="sm" onClick={() => setSelectedFolderId(null)} className="text-gray-400">Back</Button>
                   {(currentFolder?.isOwner || isAdmin) && (
                     <Button variant="ghost" size="sm" onClick={() => { setIsRenamingFolderId(selectedFolderId); setEditFolderName(currentFolder?.name || ""); }} className="text-pastel-purple-600 font-bold">Rename</Button>
                   )}
                   {(currentFolder?.isOwner || isAdmin) && (
                     <Button variant="ghost" size="sm" onClick={() => setIsSharingFolderId(selectedFolderId)} className="text-pastel-purple-600 font-bold">Share</Button>
                   )}
                   {(currentFolder?.isOwner || isAdmin) && (
                     <Button variant="ghost" size="sm" onClick={() => setIsDeletingFolderId(selectedFolderId)} className="text-red-400 font-bold">Delete</Button>
                   )}
                 </>
               )}
               {!selectedFolderId && (
                 <Button variant="ghost" size="sm" className="text-pastel-green-600 font-bold" onClick={() => setIsAddingFolder(true)}>+ New Folder</Button>
               )}
               <Button variant="ghost" size="sm" className="text-pastel-green-600 font-bold" onClick={onViewAllTopics}>View All</Button>
            </div>
          </div>

          <AnimatePresence>
            {isAddingFolder && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-white rounded-2xl border-2 border-pastel-green-100">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newFolderName} 
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name..."
                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 font-bold outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && (onNewTopicFolder(newFolderName), setIsAddingFolder(false), setNewFolderName(""))}
                  />
                  <Button onClick={() => {onNewTopicFolder(newFolderName); setIsAddingFolder(false); setNewFolderName("");}}>Create</Button>
                  <Button variant="ghost" onClick={() => setIsAddingFolder(false)}>Cancel</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Folder List (Only show at root) */}
          {!selectedFolderId && topicFolders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4">
              {topicFolders.map(folder => (
                <Card 
                  key={folder.id} 
                  className="p-4 flex items-center gap-3 bg-white hover:bg-pastel-green-50/30 cursor-pointer border-none shadow-sm transition-all group"
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <div className="w-10 h-10 bg-pastel-green-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-6 h-6 text-pastel-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 line-clamp-1">{folder.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{topics.filter(t => t.folderId === folder.id).length} Topics</p>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {itemsToDisplay.map((topic) => (
              <TopicCard 
                key={topic.id} 
                topic={topic} 
                onClick={() => onSelectTopic(topic)} 
                onMove={() => setIsMovingTopicId(topic.id)}
                isAdmin={isAdmin}
              />
            ))}
            {itemsToDisplay.length === 0 && !selectedFolderId && (
              <div className="col-span-full py-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-pastel-green-100 flex flex-col items-center">
                <Mascot mood="thinking" message="No topics yet? Let's add some!" size="lg" className="mb-6" />
                <p className="text-gray-500 font-medium">Your learning journey starts here.</p>
                <Button variant="outline" onClick={onNewTopic} className="mt-6 border-pastel-green-200 text-pastel-green-600">
                  Upload Material
                </Button>
              </div>
            )}
            {selectedFolderId && itemsToDisplay.length === 0 && (
               <div className="col-span-full py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                 <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Empty Folder</p>
               </div>
            )}
          </div>
        </div>

        {/* Move Topic Dialog */}
        <AnimatePresence>
          {isMovingTopicId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
                <h3 className="text-2xl font-black text-gray-900 mb-6 font-sans">Move Topic to Folder</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => {onMoveTopicToFolder(isMovingTopicId, null); setIsMovingTopicId(null);}}
                    className="w-full text-left p-4 rounded-2xl hover:bg-gray-50 transition-colors flex items-center gap-3 border border-gray-100"
                  >
                    <FolderOpen className="text-gray-400" />
                    <span className="font-bold text-gray-700">(No Folder)</span>
                  </button>
                  {topicFolders.map(f => (
                    <button 
                      key={f.id}
                      onClick={() => {onMoveTopicToFolder(isMovingTopicId, f.id); setIsMovingTopicId(null);}}
                      className="w-full text-left p-4 rounded-2xl hover:bg-pastel-green-50 transition-colors flex items-center gap-3 border border-gray-100"
                    >
                      <FolderOpen className="text-pastel-green-500" />
                      <span className="font-bold text-gray-700">{f.name}</span>
                    </button>
                  ))}
                </div>
                <Button variant="ghost" onClick={() => setIsMovingTopicId(null)} className="w-full mt-6">Cancel</Button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Rename Folder Dialog */}
        <AnimatePresence>
          {isRenamingFolderId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
                <h3 className="text-2xl font-black text-gray-900 mb-6 font-sans">Rename Folder</h3>
                <input 
                  type="text" 
                  value={editFolderName} 
                  onChange={(e) => setEditFolderName(e.target.value)}
                  placeholder="New folder name..."
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none focus:border-pastel-purple-200 transition-colors mb-6"
                  autoFocus
                />
                <div className="flex gap-3">
                  <Button className="flex-1 bg-pastel-purple-600 hover:bg-pastel-purple-700" onClick={() => { onRenameTopicFolder(isRenamingFolderId, editFolderName); setIsRenamingFolderId(null); }}>Save</Button>
                  <Button variant="ghost" className="flex-1" onClick={() => setIsRenamingFolderId(null)}>Cancel</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Folder Dialog */}
        <AnimatePresence>
          {isDeletingFolderId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
                <h2 className="text-2xl font-black text-gray-900 mb-2 font-sans">Delete Folder?</h2>
                <p className="text-gray-500 mb-8 font-medium">What would you like to do with the topics inside this folder?</p>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => { onDeleteTopicFolder(isDeletingFolderId, true); setIsDeletingFolderId(null); setSelectedFolderId(null); }}
                    className="w-full text-left p-6 rounded-2xl border-2 border-red-50 hover:bg-red-50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <Trash2 className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="font-black text-red-600">Delete Everything</p>
                        <p className="text-xs text-red-400 font-bold uppercase tracking-widest mt-0.5">Folder + All Topics inside</p>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => { onDeleteTopicFolder(isDeletingFolderId, false); setIsDeletingFolderId(null); setSelectedFolderId(null); }}
                    className="w-full text-left p-6 rounded-2xl border-2 border-gray-50 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <FolderOpen className="w-6 h-6 text-gray-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="font-black text-gray-900">Just Dissolve Folder</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Keep topics, just remove folder</p>
                      </div>
                    </div>
                  </button>
                </div>

                <Button variant="ghost" onClick={() => setIsDeletingFolderId(null)} className="w-full mt-6 text-gray-400">Cancel</Button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Share Folder Modal */}
        <ShareModal 
          isOpen={!!isSharingFolderId}
          onClose={() => setIsSharingFolderId(null)}
          onShare={async (emails) => {
            if (isSharingFolderId) {
              await onShareTopicFolder(isSharingFolderId, emails);
              setIsSharingFolderId(null);
            }
          }}
          currentEmails={topicFolders.find(f => f.id === isSharingFolderId)?.authorizedEmails || []}
        />

        {/* Sidebar / Progress */}
        <div className="space-y-6">
          <h2 className="text-2xl font-extrabold text-gray-900 px-2">Progress</h2>
          <Card className="p-8 space-y-8 border-none bg-white shadow-xl shadow-gray-200/50">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Daily Goal</p>
                  <p className="text-2xl font-black text-gray-900">{stats.wordsLearnedToday} <span className="text-gray-400 text-lg font-bold">/ 20</span></p>
                </div>
                <Mascot mood={stats.wordsLearnedToday >= 20 ? 'happy' : 'neutral'} size="sm" />
              </div>
              <ProgressBar value={stats.wordsLearnedToday} max={20} className="h-3 bg-pastel-green-50" />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Upcoming</h3>
              <div className="space-y-2">
                <ReviewItem label="Due Today" count={stats.wordsReviewedToday} color="text-pastel-pink-600" />
                <ReviewItem label="Tomorrow" count={upcomingReviews.tomorrow} color="text-orange-500" />
                <ReviewItem label="This Week" count={upcomingReviews.thisWeek} color="text-pastel-blue-600" />
              </div>
            </div>

            <Button variant="secondary" className="w-full justify-between group bg-pastel-green-50 border-none text-pastel-green-600 hover:bg-pastel-green-100" onClick={onViewProgress}>
              View details
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Card>

          <Card className="p-6 bg-pastel-yellow-50 border border-pastel-yellow-100 space-y-4 hover:shadow-lg transition-all cursor-pointer group" onClick={onIdeaChains}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pastel-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pastel-yellow-100 group-hover:rotate-6 transition-transform">
                <Zap className="w-6 h-6 text-white fill-white" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 tracking-tight">Idea Chains</h3>
                <p className="text-xs text-pastel-yellow-600 font-bold uppercase tracking-widest">Speaking Practice</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Master connected phrases to sound more natural and fluent.
            </p>
            <div className="flex items-center text-pastel-yellow-600 font-black text-xs uppercase tracking-[0.2em] gap-2 pt-2">
              Practice Now
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const StatCard = React.memo(({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) => {
  return (
    <Card className="p-6 flex items-center gap-5 border-none bg-white shadow-lg shadow-gray-100/50 hover:-translate-y-1 transition-all">
      <div className={cn("w-14 h-14 rounded-[1.25rem] flex items-center justify-center", color)}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
      </div>
    </Card>
  );
});

const TopicCard = React.memo(({ topic, onClick, onMove, isAdmin }: { topic: Topic, onClick: () => void, onMove?: () => void, isAdmin?: boolean }) => {
  const progress = (topic.learnedCount / topic.wordCount) * 100 || 0;

  return (
    <Card 
      className={cn(
        "p-6 hover:shadow-xl transition-all cursor-pointer group border-none shadow-lg shadow-gray-100/50 relative overflow-hidden",
        topic.isOwner ? "bg-white" : "bg-amber-50/50"
      )}
      onClick={onClick}
    >
      {(topic.isOwner || isAdmin) && (
        <button 
          onClick={(e) => { e.stopPropagation(); onMove?.(); }}
          className="absolute top-4 right-4 p-2 bg-gray-50 text-gray-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-pastel-green-50 hover:text-pastel-green-600 z-10"
          title="Move to folder"
        >
          <FolderOpen size={16} />
        </button>
      )}
      {!topic.isOwner && (
        <div className="absolute top-0 right-0 px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-bl-xl">
          Shared
        </div>
      )}
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <h3 className={cn(
            "text-lg font-extrabold transition-colors leading-tight",
            topic.isOwner ? "text-gray-900 group-hover:text-pastel-green-600" : "text-amber-900 group-hover:text-amber-600"
          )}>
            {topic.name}
          </h3>
          <p className="text-xs font-bold text-gray-400">{topic.wordCount} words • {new Date(topic.createdAt).toLocaleDateString()}</p>
        </div>
        <div className={cn(
          "text-xs font-black px-3 py-1.5 rounded-xl",
          topic.isOwner ? "bg-pastel-green-50 text-pastel-green-600" : "bg-amber-100 text-amber-600"
        )}>
          {Math.round(progress)}%
        </div>
      </div>
      <ProgressBar 
        value={topic.learnedCount} 
        max={topic.wordCount} 
        className={cn("h-2", topic.isOwner ? "bg-pastel-green-50" : "bg-amber-100/50")} 
        color={topic.isOwner ? "bg-pastel-green-400" : "bg-amber-400"}
      />
      <div className="mt-5 flex justify-between items-center">
        <span className="text-xs font-bold text-gray-400">{topic.learnedCount} / {topic.wordCount} learned</span>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          topic.isOwner ? "bg-gray-50 group-hover:bg-pastel-green-50" : "bg-amber-100 group-hover:bg-amber-200"
        )}>
          <ChevronRight className={cn(
            "w-4 h-4 transition-all",
            topic.isOwner ? "text-gray-300 group-hover:text-pastel-green-600" : "text-amber-400 group-hover:text-amber-700"
          )} />
        </div>
      </div>
    </Card>
  );
});

const ReviewItem = React.memo(({ label, count, color }: { label: string, count: number, color: string }) => {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={cn("text-sm font-bold", color)}>{count} words</span>
    </div>
  );
});
