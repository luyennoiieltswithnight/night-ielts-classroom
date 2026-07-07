import { useState, useEffect, useRef } from "react";
import { 
  Loader2, 
  Mic, 
  Sparkles, 
  ChevronLeft, 
  Play, 
  Info, 
  CheckCircle2, 
  Volume2, 
  BookOpen, 
  Keyboard, 
  CheckCircle, 
  VolumeX, 
  ArrowRight,
  Shuffle,
  Volume1,
  Plus,
  Trash2,
  Award,
  BookOpenCheck,
  Zap,
  Sparkle,
  Layers,
  Undo2,
  Folder,
  FolderPlus,
  Edit2,
  X,
  FolderOpen
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Mascot } from "./ui/Mascot";
import { chunkSentence } from "../services/geminiService";
import { db, auth } from "../firebase";
import { collection, onSnapshot, query, orderBy, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface SpeakingModeProps {
  onBack: () => void;
}

// Dynamic level packs will be created inside the component

interface ChunkItem {
  text: string;
  meaning: string;
  ipa: string;
}

interface SpeakingLessonItem {
  sentence: string;
  vietnamese: string;
  chunks: ChunkItem[];
}

interface SpeakingLesson {
  id: string;
  title: string;
  level: string; // e.g. 'basic', 'band-0-4', etc.
  folderId?: string; // sub-folder inside pack
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  items: SpeakingLessonItem[];
}

// Vibrant but soft pastel colors for chunks
const CHUNK_COLORS = [
  { bg: "bg-pink-50 border-pink-200 text-pink-700 shadow-pink-100/50", badge: "bg-pink-100 text-pink-800", active: "ring-pink-300 ring-2 shadow-pink-200/50" },
  { bg: "bg-purple-50 border-purple-200 text-purple-700 shadow-purple-100/50", badge: "bg-purple-100 text-purple-800", active: "ring-purple-300 ring-2 shadow-purple-200/50" },
  { bg: "bg-blue-50 border-blue-200 text-blue-700 shadow-blue-100/50", badge: "bg-blue-100 text-blue-800", active: "ring-blue-300 ring-2 shadow-blue-200/50" },
  { bg: "bg-amber-50 border-amber-200 text-amber-700 shadow-amber-100/50", badge: "bg-amber-100 text-amber-800", active: "ring-amber-300 ring-2 shadow-amber-200/50" },
  { bg: "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-100/50", badge: "bg-emerald-100 text-emerald-800", active: "ring-emerald-300 ring-2 shadow-emerald-200/50" },
  { bg: "bg-rose-50 border-rose-200 text-rose-700 shadow-rose-100/50", badge: "bg-rose-100 text-rose-800", active: "ring-rose-300 ring-2 shadow-rose-200/50" }
];

const PRESET_LESSONS: SpeakingLesson[] = [
  {
    id: "preset-1",
    title: "Lesson 1: Daily Greetings & Small Talk",
    level: "basic",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "admin",
    items: [
      {
        sentence: "Hello! My name is John, and I am thrilled to meet you today.",
        vietnamese: "Xin chào! Tên tôi là John, và tôi rất vui mừng được gặp bạn ngày hôm nay.",
        chunks: [
          { text: "Hello!", meaning: "Xin chào!", ipa: "/həˈloʊ/" },
          { text: "My name is John,", meaning: "Tên của tôi là John,", ipa: "/maɪ neɪm ɪz dʒɑːn/" },
          { text: "and I am thrilled", meaning: "và tôi rất vui mừng/hào hứng", ipa: "/ænd aɪ æm θrɪld/" },
          { text: "to meet you today.", meaning: "được gặp bạn ngày hôm nay.", ipa: "/tu miːt ju təˈdeɪ/" }
        ]
      },
      {
        sentence: "How has your week been going so far?",
        vietnamese: "Tuần này của bạn diễn ra như thế nào rồi?",
        chunks: [
          { text: "How has", meaning: "Như thế nào rồi", ipa: "/haʊ hæz/" },
          { text: "your week been going", meaning: "tuần lễ của bạn đang trôi qua", ipa: "/jɔːr wiːk bɪn ˈɡoʊɪŋ/" },
          { text: "so far?", meaning: "cho đến nay?", ipa: "/soʊ fɑːr/" }
        ]
      }
    ]
  },
  {
    id: "preset-2",
    title: "Lesson 2: Sharing Opinions about Technology",
    level: "band-5-6",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "admin",
    items: [
      {
        sentence: "To be honest, living in a big city has both pros and cons.",
        vietnamese: "Thực lòng mà nói, sống ở một thành phố lớn mang lại cả lợi ích lẫn tác hại.",
        chunks: [
          { text: "To be honest,", meaning: "Thật lòng mà nói,", ipa: "/tu bi ˈɑːnɪst/" },
          { text: "living in a big city", meaning: "việc sống ở thành phố lớn", ipa: "/ˈlɪvɪŋ ɪn ə bɪɡ ˈsɪti/" },
          { text: "has both", meaning: "có cả hai khía cạnh", ipa: "/hæz boʊθ/" },
          { text: "pros and cons.", meaning: "ưu điểm và nhược điểm.", ipa: "/proʊz ænd kɑːnz/" }
        ]
      }
    ]
  },
  {
    id: "preset-3",
    title: "Lesson 3: High-level Environmental Arguments",
    level: "band-7-8",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "admin",
    items: [
      {
        sentence: "It is widely anticipated that sustainable energy will completely replace fossil fuels in the near future.",
        vietnamese: "Người ta kỳ vọng rộng rãi rằng năng lượng bền vững sẽ thay thế hoàn toàn nhiên liệu hóa thạch trong tương lai gần.",
        chunks: [
          { text: "It is widely anticipated that", meaning: "Nhiều người kỳ vọng/mong đợi rằng", ipa: "/ɪt ɪz ˈwaɪdli ænˈtɪsəpeɪtɪd ðæt/" },
          { text: "sustainable energy", meaning: "năng lượng bền vững", ipa: "/səˈsteɪnəbl ˈenərdʒi/" },
          { text: "will completely replace", meaning: "sẽ thay thế hoàn toàn", ipa: "/wɪl kəmˈpliːtli rɪˈpleɪs/" },
          { text: "fossil fuels", meaning: "nhiên liệu hóa thạch", ipa: "/ˈfɑːsl ˈfjuːəlz/" },
          { text: "in the near future.", meaning: "trong tương lai gần.", ipa: "/ɪn ðə nɪr ˈfjuːtʃər/" }
        ]
      }
    ]
  }
];

export function SpeakingMode({ onBack }: SpeakingModeProps) {
  const [dbLessons, setDbLessons] = useState<SpeakingLesson[]>([]);
  const [dbPacks, setDbPacks] = useState<Array<{ id: string; label: string; desc: string; icon: string; createdBy: string }>>([]);
  const [dbFolders, setDbFolders] = useState<Array<{ id: string; name: string; packId: string; createdBy: string }>>([]);
  const [selectedPack, setSelectedPack] = useState<string>('basic');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all'); // 'all', 'none', or specific folder ID
  const [activeLesson, setActiveLesson] = useState<SpeakingLesson | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Studying state
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [showLessonMastered, setShowLessonMastered] = useState(false);
  const [showItemMastered, setShowItemMastered] = useState(false);
  
  // Custom creator form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLevel, setNewLevel] = useState("basic");
  const [newLessonFolderId, setNewLessonFolderId] = useState("");
  const [newRawItems, setNewRawItems] = useState("");
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [creationStatusText, setCreationStatusText] = useState("");

  // Custom pack creation
  const [showAddPackForm, setShowAddPackForm] = useState(false);
  const [newPackLabel, setNewPackLabel] = useState("");
  const [newPackDesc, setNewPackDesc] = useState("");
  const [newPackIcon, setNewPackIcon] = useState("📦");

  // Custom folder creation
  const [showAddFolderForm, setShowAddFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Editing states (Renaming)
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [editingPackLabel, setEditingPackLabel] = useState("");
  const [editingPackDesc, setEditingPackDesc] = useState("");
  const [editingPackIcon, setEditingPackIcon] = useState("");

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState("");
  const [editingLessonFolderId, setEditingLessonFolderId] = useState("");

  // Sparkles & particle effects
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);

  // Audio & speech
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Fetch from Firebase custom speaking lessons
  useEffect(() => {
    const lessonsRef = collection(db, "speakingLessons");
    const unsubscribe = onSnapshot(lessonsRef, (snapshot) => {
      const fetched = snapshot.docs.map(docDoc => ({ ...docDoc.data(), id: docDoc.id }) as SpeakingLesson);
      setDbLessons(fetched);
    }, (err) => {
      console.error("Error reading speaking lessons from Firestore:", err);
    });
    return unsubscribe;
  }, []);

  // Fetch from Firebase custom level packs
  useEffect(() => {
    const packsRef = collection(db, "speakingPacks");
    const unsubscribe = onSnapshot(packsRef, (snapshot) => {
      const fetched = snapshot.docs.map(docDoc => ({ ...docDoc.data(), id: docDoc.id }) as any);
      setDbPacks(fetched);
    }, (err) => {
      console.error("Error reading speaking packs from Firestore:", err);
    });
    return unsubscribe;
  }, []);

  // Fetch from Firebase custom folders
  useEffect(() => {
    const foldersRef = collection(db, "speakingFolders");
    const unsubscribe = onSnapshot(foldersRef, (snapshot) => {
      const fetched = snapshot.docs.map(docDoc => ({ ...docDoc.data(), id: docDoc.id }) as any);
      setDbFolders(fetched);
    }, (err) => {
      console.error("Error reading speaking folders from Firestore:", err);
    });
    return unsubscribe;
  }, []);

  // Merge presets and DB custom level packs
  const LEVEL_PACKS = [
    { id: 'basic', label: 'Từ Vựng Cơ Bản', desc: 'Các cụm từ & từ vựng thông dụng hàng ngày', icon: '🌱', createdBy: 'admin' },
    { id: 'band-0-4', label: 'IELTS Band 0 - 4.0', desc: 'Nền tảng phát âm và từ vựng cốt lõi', icon: '📖', createdBy: 'admin' },
    { id: 'band-4-5', label: 'IELTS Band 4.0 - 5.0', desc: 'Phát triển câu đơn và cụm từ thông dụng', icon: '🚀', createdBy: 'admin' },
    { id: 'band-5-6', label: 'IELTS Band 5.0 - 6.0', desc: 'Luyện mẫu câu phức và nối ý tự nhiên', icon: '🧠', createdBy: 'admin' },
    { id: 'band-6-7', label: 'IELTS Band 6.0 - 7.0', desc: 'Từ vựng học thuật & cấu trúc linh hoạt', icon: '⭐️', createdBy: 'admin' },
    { id: 'band-7-8', label: 'IELTS Band 7.0 - 8.0', desc: 'Cụm từ nâng cao, thành ngữ & lập luận trôi chảy', icon: '🏆', createdBy: 'admin' },
    ...dbPacks
  ];

  // All lessons combining presets and DB lessons
  const allLessons = [...PRESET_LESSONS, ...dbLessons];
  const lessonsInPack = allLessons.filter(l => l.level === selectedPack);
  const filteredLessons = lessonsInPack.filter(l => {
    if (selectedFolderId === 'all') return true;
    if (selectedFolderId === 'none') return !l.folderId;
    return l.folderId === selectedFolderId;
  });

  const activeItem: SpeakingLessonItem | null = activeLesson && activeLesson.items && activeLesson.items[activeItemIndex]
    ? activeLesson.items[activeItemIndex]
    : null;

  // Sound Synthesizers
  const playKeypressSound = (isCorrectPrefix: boolean = true) => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.type = "sine";
      
      if (isCorrectPrefix) {
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.04);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      } else {
        // Red alert/incorrect low click
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      }

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn(e);
    }
  };

  const playCorrectSound = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;

      // Tone 1: E5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Tone 2: A5
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.00, now + 0.08);
      gain2.gain.setValueAtTime(0.1, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    } catch (e) {
      console.warn(e);
    }
  };

  const playFanfareSound = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;

      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((f, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, now + index * 0.07);
        gain.gain.setValueAtTime(0.08, now + index * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.4);
        osc.start(now + index * 0.07);
        osc.stop(now + index * 0.07 + 0.4);
      });
    } catch (e) {
      console.warn(e);
    }
  };

  // Text to speech auto player
  const speakActiveSentence = (text: string, speed: number = 1.0) => {
    if (!text || !synthRef.current) return;
    synthRef.current.cancel();

    const cleanSpeechText = text.replace(/[\/\(\)\{\}\[\]\-\+\_]/g, " ").trim();
    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.lang = "en-US";
    utterance.rate = speed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("US"))) || voices.find(v => v.lang.startsWith("en"));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    setTimeout(() => {
      if (synthRef.current) {
        synthRef.current.speak(utterance);
      }
    }, 50);
  };

  // Sparkle Burst Generator
  const triggerSparkles = () => {
    const colors = ["#F472B6", "#A78BFA", "#60A5FA", "#FBBF24", "#34D399", "#FB7185"];
    const newParticles = [];
    for (let i = 0; i < 24; i++) {
      newParticles.push({
        id: Date.now() + Math.random(),
        x: Math.random() * 100 - 50, // relative center
        y: Math.random() * 100 - 50,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1200);
  };

  // Trigger auto play of audio when current active item changes
  useEffect(() => {
    if (activeItem) {
      speakActiveSentence(activeItem.sentence, 1.0);
      setTypedText("");
      setCurrentChunkIndex(0);
      setShowItemMastered(false);
      setShowLessonMastered(false);
    }
  }, [activeLesson, activeItemIndex]);

  // Clean text comparative helpers
  const getNormalized = (str: string): string => {
    return str.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const currentTargetChunk = activeItem?.chunks[currentChunkIndex];

  // Helper to count correct prefix letters
  const checkPrefixProgress = (input: string, target: string) => {
    const cleanIn = getNormalized(input);
    const cleanTar = getNormalized(target);
    
    if (cleanTar.startsWith(cleanIn)) {
      return { ok: true, matchedCount: cleanIn.length, total: cleanTar.length };
    }
    return { ok: false, matchedCount: 0, total: cleanTar.length };
  };

  const handleTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!currentTargetChunk) return;

    const targetVal = currentTargetChunk.text;
    const progress = checkPrefixProgress(val, targetVal);

    setTypedText(val);
    playKeypressSound(progress.ok);

    if (progress.ok && getNormalized(val) === getNormalized(targetVal)) {
      // Chunk mastered!
      playCorrectSound();
      triggerSparkles();
      setTypedText("");
      
      if (activeItem && currentChunkIndex + 1 < activeItem.chunks.length) {
        // Go to next chunk
        setCurrentChunkIndex(prev => prev + 1);
      } else {
        // Entire sentence mastered!
        playFanfareSound();
        setShowItemMastered(true);
      }
    }
  };

  // Reveal chunk solution
  const handleRevealAnswer = () => {
    if (currentTargetChunk) {
      setTypedText(currentTargetChunk.text);
      setTimeout(() => {
        // Auto trigger complete
        playCorrectSound();
        triggerSparkles();
        setTypedText("");
        if (activeItem && currentChunkIndex + 1 < activeItem.chunks.length) {
          setCurrentChunkIndex(prev => prev + 1);
        } else {
          playFanfareSound();
          setShowItemMastered(true);
        }
      }, 500);
    }
  };

  // Flow controllers
  const handleNextItem = () => {
    if (!activeLesson) return;
    if (activeItemIndex + 1 < activeLesson.items.length) {
      setActiveItemIndex(prev => prev + 1);
    } else {
      setShowLessonMastered(true);
    }
  };

  const handlePreviousItem = () => {
    if (activeItemIndex > 0) {
      setActiveItemIndex(prev => prev - 1);
    }
  };

  // Auto parsing teacher's input lessons via Gemini
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newRawItems.trim()) return;

    setIsCreatingLesson(true);
    setCreationStatusText("Đang phân tích và chia cụm các câu bằng Gemini AI...");

    try {
      // Split raw inputs by new line
      const lines = newRawItems.split('\n').map(l => l.trim()).filter(Boolean);
      const parsedItems: SpeakingLessonItem[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        setCreationStatusText(`Đang xử lý câu ${i + 1}/${lines.length}: "${line.substring(0, 30)}..."`);
        
        let english = line;
        let vietnamese = "Mẫu câu luyện tập";

        // Try to split English & Vietnamese if split by pipe '|' or tab or dash
        if (line.includes('|')) {
          const parts = line.split('|');
          english = parts[0].trim();
          vietnamese = parts[1].trim();
        } else if (line.includes('-')) {
          const parts = line.split('-');
          english = parts[0].trim();
          vietnamese = parts[1].trim();
        }

        // Call Gemini chunking
        try {
          const response = await chunkSentence(english);
          if (response && response.chunks && response.chunks.length > 0) {
            parsedItems.push({
              sentence: english,
              vietnamese: vietnamese,
              chunks: response.chunks
            });
          } else {
            throw new Error("No chunks");
          }
        } catch (err) {
          console.warn(`Fallback chunking for: ${english}`);
          // Fallback word-by-word or 3-word chunks
          const fallbackChunks = english.split(/\s+/).filter(Boolean);
          const chunkObjects = [];
          for (let c = 0; c < fallbackChunks.length; c += 2) {
            const grp = fallbackChunks.slice(c, c + 2).join(" ");
            chunkObjects.push({
              text: grp,
              meaning: "Cụm từ",
              ipa: "/pronounce/"
            });
          }
          parsedItems.push({
            sentence: english,
            vietnamese: vietnamese,
            chunks: chunkObjects
          });
        }
      }

      setCreationStatusText("Đang lưu bài học vào hệ thống dữ liệu...");

      const newLessonObj = {
        title: newTitle,
        level: newLevel,
        folderId: newLessonFolderId || "",
        items: parsedItems,
        createdBy: auth.currentUser?.email || "guest",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, "speakingLessons"), newLessonObj);

      // Reset
      setNewTitle("");
      setNewLessonFolderId("");
      setNewRawItems("");
      setShowAddForm(false);
      alert("Chúc mừng! Bài học nói mới đã được tạo thành công cho toàn bộ lớp học!");
    } catch (error) {
      console.error(error);
      alert("Đã xảy ra lỗi khi tạo bài học. Vui lòng thử lại.");
    } finally {
      setIsCreatingLesson(false);
      setCreationStatusText("");
    }
  };

  const handleDeleteLesson = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Bạn có chắc chắn muốn xóa bài học này?")) {
      try {
        await deleteDoc(doc(db, "speakingLessons", id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Create Pack
  const handleCreatePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackLabel.trim()) return;
    try {
      await addDoc(collection(db, "speakingPacks"), {
        label: newPackLabel,
        desc: newPackDesc,
        icon: newPackIcon || "📦",
        createdBy: auth.currentUser?.email || "guest",
        createdAt: new Date().toISOString()
      });
      setNewPackLabel("");
      setNewPackDesc("");
      setNewPackIcon("📦");
      setShowAddPackForm(false);
    } catch (err) {
      console.error("Error creating pack:", err);
      alert("Lỗi khi tạo Pack mới.");
    }
  };

  // Rename Pack
  const handleRenamePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackId || !editingPackLabel.trim()) return;
    try {
      await updateDoc(doc(db, "speakingPacks", editingPackId), {
        label: editingPackLabel,
        desc: editingPackDesc,
        icon: editingPackIcon || "📦"
      });
      setEditingPackId(null);
    } catch (err) {
      console.error("Error renaming pack:", err);
      alert("Lỗi khi đổi tên Pack.");
    }
  };

  // Delete Pack
  const handleDeletePack = async (packId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Bạn có chắc chắn muốn xóa khóa học / pack này?")) {
      try {
        await deleteDoc(doc(db, "speakingPacks", packId));
        if (selectedPack === packId) {
          setSelectedPack("basic");
        }
      } catch (err) {
        console.error("Error deleting pack:", err);
      }
    }
  };

  // Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await addDoc(collection(db, "speakingFolders"), {
        name: newFolderName,
        packId: selectedPack,
        createdBy: auth.currentUser?.email || "guest",
        createdAt: new Date().toISOString()
      });
      setNewFolderName("");
      setShowAddFolderForm(false);
    } catch (err) {
      console.error("Error creating folder:", err);
      alert("Lỗi khi tạo thư mục mới.");
    }
  };

  // Rename Folder
  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolderId || !editingFolderName.trim()) return;
    try {
      await updateDoc(doc(db, "speakingFolders", editingFolderId), {
        name: editingFolderName
      });
      setEditingFolderId(null);
    } catch (err) {
      console.error("Error renaming folder:", err);
      alert("Lỗi khi đổi tên thư mục.");
    }
  };

  // Delete Folder
  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Bạn có chắc chắn muốn xóa thư mục này? Các bài học bên trong sẽ được dời ra ngoài thư mục chung.")) {
      try {
        await deleteDoc(doc(db, "speakingFolders", folderId));
        // Remove folderId reference from any lessons
        const lessonsToUpdate = dbLessons.filter(l => l.folderId === folderId);
        for (const lesson of lessonsToUpdate) {
          await updateDoc(doc(db, "speakingLessons", lesson.id), {
            folderId: ""
          });
        }
        if (selectedFolderId === folderId) {
          setSelectedFolderId("all");
        }
      } catch (err) {
        console.error("Error deleting folder:", err);
      }
    }
  };

  // Edit Lesson (Title / Folder association)
  const handleEditLessonMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLessonId || !editingLessonTitle.trim()) return;
    try {
      await updateDoc(doc(db, "speakingLessons", editingLessonId), {
        title: editingLessonTitle,
        folderId: editingLessonFolderId || ""
      });
      setEditingLessonId(null);
    } catch (err) {
      console.error("Error updating lesson metadata:", err);
      alert("Lỗi khi lưu bài học.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12 relative">
      {/* Visual background sparkles overlay */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          animate={{ opacity: 0, scale: 2, x: p.x * 4, y: p.y * 4 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: "50%",
            top: "40%",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: p.color,
            pointerEvents: "none",
            zIndex: 999
          }}
        />
      ))}

      {/* Header */}
      {!activeLesson && (
        <header className="flex flex-col gap-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="w-fit text-gray-500 hover:text-pastel-pink-600 hover:bg-pastel-pink-50 rounded-2xl gap-2 font-bold transition-all">
            <Undo2 className="w-5 h-5" /> Trở về Trang Chủ
          </Button>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-pastel-pink-50 to-purple-50 p-8 md:p-10 rounded-[2.5rem] border border-pastel-pink-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-6 relative z-10">
              <div className="p-5 bg-white rounded-3xl shadow-md border border-pastel-pink-100">
                <Mic className="w-10 h-10 text-pastel-pink-600 animate-pulse" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Speaking Pro: Học Cụm Từ</h1>
                <p className="text-gray-500 font-semibold mt-2 max-w-lg leading-relaxed">
                  Phương pháp chia nhỏ câu thành các khối từ ngữ màu sắc (**Chunks**). Luyện phát âm tự động, nhập liệu thông minh tiến độ xanh lá, tích hợp trí tuệ nhân tạo Gemini.
                </p>
              </div>
            </div>

            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-pastel-pink-600 hover:bg-pastel-pink-700 text-white font-black py-4 px-6 rounded-2xl border-none shadow-lg shadow-pastel-pink-100/50 flex items-center gap-2 relative z-10"
            >
              <Plus className="w-5 h-5" /> Thêm Bài Học Mới
            </Button>

            <div className="absolute right-4 -bottom-6 opacity-5 transform rotate-12 pointer-events-none hidden md:block">
              <Mascot mood="happy" size="lg" />
            </div>
          </div>
        </header>
      )}

      {/* Adding lesson form */}
      {showAddForm && !activeLesson && (
        <Card className="p-8 border-none bg-white shadow-xl shadow-gray-200/50 rounded-[2.5rem] space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Sparkle className="text-pastel-pink-500" /> Tạo Tiết Học Speaking Cho Học Sinh
            </h3>
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setShowAddForm(false)}>Hủy bỏ</Button>
          </div>

          <form onSubmit={handleCreateLesson} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Tiêu Đề Bài Học</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Lesson 1: At the Airport"
                  required
                  className="w-full p-4 border border-gray-200 rounded-2xl outline-none font-bold text-gray-800 focus:border-pastel-pink-500 focus:ring-4 focus:ring-pastel-pink-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Chọn Pack / Level</label>
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  className="w-full p-4 border border-gray-200 rounded-2xl outline-none font-bold text-gray-800 focus:border-pastel-pink-500 focus:ring-4 focus:ring-pastel-pink-50 bg-white"
                >
                  {LEVEL_PACKS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Chọn Thư Mục (Folder)</label>
                <select
                  value={newLessonFolderId}
                  onChange={(e) => setNewLessonFolderId(e.target.value)}
                  className="w-full p-4 border border-gray-200 rounded-2xl outline-none font-bold text-gray-800 focus:border-pastel-pink-500 focus:ring-4 focus:ring-pastel-pink-50 bg-white"
                >
                  <option value="">Không thuộc thư mục nào</option>
                  {dbFolders.filter(f => f.packId === newLevel).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                Danh Sách Câu / Cụm Từ Luyện Tập <span className="text-pastel-pink-500 text-[10px] normal-case font-bold">(Mỗi dòng một câu)</span>
              </label>
              <textarea 
                value={newRawItems}
                onChange={(e) => setNewRawItems(e.target.value)}
                rows={5}
                required
                placeholder="Nhập câu tiếng Anh và nghĩa tiếng Việt cách nhau bằng dấu gạch đứng |&#10;Ví dụ:&#10;To make a difference, you need to step out of your comfort zone. | Để tạo nên sự khác biệt, bạn cần bước ra khỏi vùng an toàn của mình.&#10;I am planning to study abroad soon. | Tôi đang lên kế hoạch đi du học sớm."
                className="w-full p-5 border border-gray-200 rounded-2xl outline-none font-bold text-gray-800 focus:border-pastel-pink-500 focus:ring-4 focus:ring-pastel-pink-50 bg-gray-50/50"
              />
            </div>

            {isCreatingLesson ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-3 bg-pastel-pink-50/50 rounded-2xl border border-pastel-pink-100">
                <Loader2 className="w-8 h-8 text-pastel-pink-500 animate-spin" />
                <p className="font-bold text-pastel-pink-600 text-sm animate-pulse">{creationStatusText}</p>
              </div>
            ) : (
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl border-none shadow-md">
                Tạo Bài Học & Chia Chunks Tự Động
              </Button>
            )}
          </form>
        </Card>
      )}

      {/* Main Selector Dashboard */}
      {!activeLesson && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Level packs selector sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Layers size={14} /> Chọn Khóa Học / Pack
              </h3>
              <button
                onClick={() => setShowAddPackForm(true)}
                className="text-xs font-bold text-pastel-pink-600 hover:text-pastel-pink-700 flex items-center gap-1"
                title="Thêm khóa học mới"
              >
                <Plus size={14} /> Thêm Pack
              </button>
            </div>

            {/* Pack form popup/card if adding/editing */}
            {showAddPackForm && (
              <Card className="p-4 border border-pastel-pink-100 bg-pastel-pink-50/20 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-gray-700">Tạo Khóa Học Mới</h4>
                  <button onClick={() => setShowAddPackForm(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
                <form onSubmit={handleCreatePack} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Tên Pack (Ví dụ: Tiếng Anh Du Lịch)"
                    value={newPackLabel}
                    onChange={(e) => setNewPackLabel(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold bg-white border rounded-xl outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Mô tả ngắn"
                    value={newPackDesc}
                    onChange={(e) => setNewPackDesc(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold bg-white border rounded-xl outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Emoji (Ví dụ: ✈️)"
                      value={newPackIcon}
                      onChange={(e) => setNewPackIcon(e.target.value)}
                      className="w-1/3 p-2.5 text-xs text-center font-semibold bg-white border rounded-xl outline-none"
                    />
                    <Button type="submit" size="sm" className="w-2/3 bg-pastel-pink-600 hover:bg-pastel-pink-700 text-white text-xs font-black rounded-xl border-none">
                      Tạo Pack
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {editingPackId && (
              <Card className="p-4 border border-pastel-pink-100 bg-amber-50/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-gray-700">Đổi Tên Pack</h4>
                  <button onClick={() => setEditingPackId(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
                <form onSubmit={handleRenamePack} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Tên Pack"
                    value={editingPackLabel}
                    onChange={(e) => setEditingPackLabel(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold bg-white border rounded-xl outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Mô tả ngắn"
                    value={editingPackDesc}
                    onChange={(e) => setEditingPackDesc(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold bg-white border rounded-xl outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Emoji"
                      value={editingPackIcon}
                      onChange={(e) => setEditingPackIcon(e.target.value)}
                      className="w-1/3 p-2.5 text-xs text-center font-semibold bg-white border rounded-xl outline-none"
                    />
                    <Button type="submit" size="sm" className="w-2/3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl border-none">
                      Lưu thay đổi
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-3 pb-3 lg:pb-0">
              {LEVEL_PACKS.map(pack => {
                const isActive = selectedPack === pack.id;
                const isCustom = pack.createdBy !== 'admin';
                return (
                  <div key={pack.id} className="relative group/pack shrink-0 w-64 lg:w-full">
                    <button
                      onClick={() => {
                        setSelectedPack(pack.id);
                        setSelectedFolderId("all"); // Reset folder filter when changing pack
                      }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl text-left border transition-all w-full pr-14",
                        isActive 
                          ? "bg-pastel-pink-600 text-white border-none shadow-lg shadow-pastel-pink-100 ring-4 ring-pastel-pink-100" 
                          : "bg-white text-gray-700 border-gray-100 hover:border-pastel-pink-100 hover:bg-pastel-pink-50/20"
                      )}
                    >
                      <span className="text-2xl">{pack.icon}</span>
                      <div className="truncate">
                        <p className="font-extrabold text-sm truncate">{pack.label}</p>
                        <p className={cn("text-[10px] mt-0.5 truncate", isActive ? "text-pastel-pink-100" : "text-gray-400")}>
                          {pack.desc}
                        </p>
                      </div>
                    </button>

                    {isCustom && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/pack:opacity-100 transition-opacity bg-transparent pr-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPackId(pack.id);
                            setEditingPackLabel(pack.label);
                            setEditingPackDesc(pack.desc || "");
                            setEditingPackIcon(pack.icon || "📦");
                          }}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isActive ? "text-white/80 hover:text-white hover:bg-white/20" : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                          )}
                          title="Sửa tên Pack"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => handleDeletePack(pack.id, e)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isActive ? "text-white/80 hover:text-white hover:bg-white/20" : "text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                          )}
                          title="Xóa Pack"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lessons List in selected pack */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Folders Toolbar & Management */}
            <div className="bg-gradient-to-r from-gray-50 to-pastel-pink-50/20 p-5 rounded-3xl border border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-2">
                    <Folder className="text-pastel-pink-500 w-5 h-5" /> Thư Mục Trong Pack Này
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-1">Phân chia bài học nói thành các nhóm nhỏ hơn</p>
                </div>
                
                <Button
                  onClick={() => setShowAddFolderForm(true)}
                  size="sm"
                  className="bg-white border hover:bg-pastel-pink-50/30 text-pastel-pink-600 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <FolderPlus size={14} /> + Thêm Thư Mục
                </Button>
              </div>

              {/* Add folder inline form */}
              {showAddFolderForm && (
                <Card className="p-4 border border-pastel-pink-100 bg-white rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-gray-700">Tạo Thư Mục Mới</h4>
                    <button onClick={() => setShowAddFolderForm(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                  <form onSubmit={handleCreateFolder} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Tên thư mục (Ví dụ: Unit 1: Travel & Holidays)"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="flex-1 p-2.5 text-xs font-semibold bg-white border rounded-xl outline-none focus:border-pastel-pink-500"
                    />
                    <Button type="submit" size="sm" className="bg-pastel-pink-600 hover:bg-pastel-pink-700 text-white text-xs font-black rounded-xl border-none">
                      Tạo
                    </Button>
                  </form>
                </Card>
              )}

              {/* Edit folder inline form */}
              {editingFolderId && (
                <Card className="p-4 border border-pastel-pink-100 bg-white rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-gray-700">Đổi Tên Thư Mục</h4>
                    <button onClick={() => setEditingFolderId(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                  <form onSubmit={handleRenameFolder} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Tên thư mục mới"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      className="flex-1 p-2.5 text-xs font-semibold bg-white border rounded-xl outline-none focus:border-pastel-pink-500"
                    />
                    <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl border-none">
                      Cập nhật
                    </Button>
                  </form>
                </Card>
              )}

              {/* Folders horizontal / bento scroll list */}
              <div className="flex flex-wrap gap-3">
                {/* 'All' Folder Button */}
                <button
                  onClick={() => setSelectedFolderId("all")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all",
                    selectedFolderId === "all"
                      ? "bg-pastel-pink-600 text-white border-none shadow-sm"
                      : "bg-white text-gray-600 border-gray-100 hover:bg-gray-50"
                  )}
                >
                  <FolderOpen size={14} />
                  <span>Tất Cả ({lessonsInPack.length})</span>
                </button>

                {/* 'Uncategorized' Button if any */}
                {lessonsInPack.some(l => !l.folderId) && (
                  <button
                    onClick={() => setSelectedFolderId("none")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all",
                      selectedFolderId === "none"
                        ? "bg-pastel-pink-600 text-white border-none shadow-sm"
                        : "bg-white text-gray-600 border-gray-100 hover:bg-gray-50"
                    )}
                  >
                    <Folder size={14} />
                    <span>Ngoài Thư Mục ({lessonsInPack.filter(l => !l.folderId).length})</span>
                  </button>
                )}

                {/* Render database custom folders */}
                {dbFolders.filter(f => f.packId === selectedPack).map(folder => {
                  const isSelected = selectedFolderId === folder.id;
                  const lessonsCount = lessonsInPack.filter(l => l.folderId === folder.id).length;
                  return (
                    <div
                      key={folder.id}
                      className={cn(
                        "relative flex items-center rounded-xl border font-bold text-xs transition-all group/folder",
                        isSelected
                          ? "bg-pastel-pink-600 text-white border-none shadow-sm"
                          : "bg-white text-gray-600 border-gray-100 hover:bg-gray-50"
                      )}
                    >
                      <button
                        onClick={() => setSelectedFolderId(folder.id)}
                        className="flex items-center gap-2 px-4 py-2.5 pr-14"
                      >
                        {isSelected ? <FolderOpen size={14} /> : <Folder size={14} />}
                        <span>{folder.name} ({lessonsCount})</span>
                      </button>

                      {/* Folder operations */}
                      <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover/folder:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolderId(folder.id);
                            setEditingFolderName(folder.name);
                          }}
                          className={cn(
                            "p-1 rounded hover:bg-black/10 transition-colors",
                            isSelected ? "text-white/80 hover:text-white" : "text-gray-400 hover:text-amber-600"
                          )}
                          title="Đổi tên Thư mục"
                        >
                          <Edit2 size={10} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                          className={cn(
                            "p-1 rounded hover:bg-black/10 transition-colors",
                            isSelected ? "text-white/80 hover:text-white" : "text-gray-400 hover:text-rose-600"
                          )}
                          title="Xóa Thư mục"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lesson Title Editing popup/card if editing */}
            {editingLessonId && (
              <Card className="p-6 border border-amber-100 bg-amber-50/20 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-extrabold text-sm text-gray-800">Chỉnh Sửa Thông Tin Bài Học</h4>
                  <button onClick={() => setEditingLessonId(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
                <form onSubmit={handleEditLessonMetadata} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Tên Bài Học</label>
                      <input
                        type="text"
                        required
                        value={editingLessonTitle}
                        onChange={(e) => setEditingLessonTitle(e.target.value)}
                        className="w-full p-3 text-sm font-semibold bg-white border rounded-xl outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Di chuyển Thư Mục</label>
                      <select
                        value={editingLessonFolderId}
                        onChange={(e) => setEditingLessonFolderId(e.target.value)}
                        className="w-full p-3 text-sm font-semibold bg-white border rounded-xl outline-none focus:border-amber-500"
                      >
                        <option value="">Không thuộc thư mục nào</option>
                        {dbFolders.filter(f => f.packId === selectedPack).map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingLessonId(null)} className="rounded-xl text-xs font-bold">Hủy</Button>
                    <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl border-none">Lưu thay đổi</Button>
                  </div>
                </form>
              </Card>
            )}

            {/* List of lessons header */}
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpenCheck size={14} /> Danh Sách Tiết Học: <span className="text-pastel-pink-600 font-extrabold normal-case">
                  {selectedFolderId === "all" ? "Tất Cả" : selectedFolderId === "none" ? "Không thuộc thư mục nào" : dbFolders.find(f => f.id === selectedFolderId)?.name || "Thư mục"}
                </span>
              </h3>
            </div>

            {filteredLessons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredLessons.map(lesson => (
                  <Card
                    key={lesson.id}
                    onClick={() => {
                      setActiveLesson(lesson);
                      setActiveItemIndex(0);
                      setCurrentChunkIndex(0);
                      setTypedText("");
                      setShowItemMastered(false);
                      setShowLessonMastered(false);
                    }}
                    className="p-6 cursor-pointer bg-white border border-gray-100 hover:border-pastel-pink-200 hover:shadow-xl rounded-3xl transition-all relative flex flex-col justify-between group overflow-hidden"
                  >
                    {/* Corner accent glow */}
                    <div className="absolute right-0 top-0 w-24 h-24 bg-pastel-pink-50 rounded-bl-[6rem] -z-10 group-hover:scale-110 transition-transform duration-300" />
                    
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <span className="p-3 bg-pastel-pink-50 text-pastel-pink-600 rounded-2xl font-bold group-hover:bg-pastel-pink-600 group-hover:text-white transition-colors duration-300">
                          <BookOpen size={20} />
                        </span>
                        
                        {lesson.createdBy !== "admin" && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingLessonId(lesson.id);
                                setEditingLessonTitle(lesson.title);
                                setEditingLessonFolderId(lesson.folderId || "");
                              }}
                              className="p-2 text-gray-300 hover:text-amber-500 rounded-xl hover:bg-amber-50 transition-colors"
                              title="Sửa tên / Chuyển mục"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteLesson(lesson.id, e)}
                              className="p-2 text-gray-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors"
                              title="Xóa bài học"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-extrabold text-gray-900 group-hover:text-pastel-pink-600 transition-colors text-lg">
                          {lesson.title}
                        </h4>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                          {lesson.items?.length || 0} Câu Luyện Tập
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-pastel-pink-600 font-extrabold text-xs mt-6 group-hover:translate-x-1.5 transition-transform duration-300">
                      Bấm vào để học <ArrowRight size={14} />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-[2.5rem] bg-white space-y-4">
                <Mascot mood="neutral" size="md" />
                <div className="space-y-1">
                  <h3 className="font-extrabold text-gray-800 text-lg">Trống trải quá!</h3>
                  <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                    Khóa học hiện tại chưa có bài học nào từ giáo viên. Bấm nút phía trên để tạo bài học Speaking mới nhé!
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE SCREEN: INTERACTIVE STUDYING FRAMEWORK */}
      <AnimatePresence mode="wait">
        {activeLesson && activeItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            {/* Header Study mode */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveLesson(null);
                    setShowItemMastered(false);
                    setShowLessonMastered(false);
                  }}
                  className="rounded-xl font-extrabold text-gray-500 hover:text-pastel-pink-600 hover:bg-pastel-pink-50"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" /> Thoát Học
                </Button>
                <div>
                  <h2 className="text-lg font-black text-gray-900">{activeLesson.title}</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                    Câu {activeItemIndex + 1} trên {activeLesson.items.length}
                  </p>
                </div>
              </div>

              {/* Top progress line */}
              <div className="w-full sm:w-64 h-3 bg-gray-100 rounded-full overflow-hidden border">
                <div 
                  className="h-full bg-pastel-pink-500 transition-all duration-300"
                  style={{ width: `${((activeItemIndex + (showItemMastered ? 1 : 0)) / activeLesson.items.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Main Interactive Stage */}
            <Card className="p-8 md:p-12 border-none bg-white shadow-2xl shadow-gray-200/50 rounded-[3rem] space-y-10 relative overflow-hidden min-h-[500px] flex flex-col justify-between">
              
              {/* TOP Vietnamese prompt */}
              <div className="space-y-3 text-center">
                <span className="bg-pastel-pink-100 text-pastel-pink-700 font-black text-[10px] uppercase tracking-wider px-3.5 py-1 rounded-full border border-pastel-pink-200">
                  Dịch Nghĩa Tiếng Việt
                </span>
                <h3 className="text-2xl md:text-3xl font-black text-gray-800 leading-snug">
                  "{activeItem.vietnamese}"
                </h3>
              </div>

              {/* CHUNK BOXES CONTAINER */}
              <div className="flex flex-wrap gap-5 justify-center items-stretch py-4">
                {activeItem.chunks.map((chunk, idx) => {
                  const isCompleted = idx < currentChunkIndex || showItemMastered;
                  const isActive = idx === currentChunkIndex && !showItemMastered;
                  const isUpcoming = idx > currentChunkIndex && !showItemMastered;

                  // Get index specific pastel style
                  const colorStyle = CHUNK_COLORS[idx % CHUNK_COLORS.length];

                  return (
                    <motion.div
                      key={idx}
                      layout
                      className={cn(
                        "p-5 md:p-6 rounded-3xl border transition-all text-center flex flex-col items-center justify-center min-w-[160px] max-w-[300px] relative shadow-sm",
                        isCompleted ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
                        isActive ? cn(colorStyle.bg, colorStyle.active, "scale-105") :
                        "bg-gray-50/50 border-gray-100 text-gray-300 blur-[1px] opacity-40 select-none"
                      )}
                    >
                      {/* Visual Badge indicator */}
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-2",
                        isCompleted ? "bg-emerald-100 text-emerald-800" :
                        isActive ? colorStyle.badge : "bg-gray-100 text-gray-400"
                      )}>
                        Cụm {idx + 1}
                      </span>

                      {/* English text word/chunk */}
                      <div className={cn(
                        "font-black text-lg md:text-xl leading-snug",
                        isCompleted ? "text-emerald-800" :
                        isActive ? "text-gray-900" : "text-gray-300"
                      )}>
                        {isCompleted ? chunk.text : "•••••••"}
                      </div>

                      {/* Play individual chunk pronunciation */}
                      {(isCompleted || isActive) && (
                        <button
                          onClick={() => speakActiveSentence(chunk.text, 0.9)}
                          className="p-1.5 hover:bg-black/5 rounded-full mt-2 text-gray-400 hover:text-gray-700 transition-colors"
                          title="Nghe cụm từ này"
                        >
                          <Volume2 size={14} />
                        </button>
                      )}

                      {/* Meaning and IPA */}
                      {(isCompleted) && (
                        <div className="mt-3 space-y-1 text-center border-t border-emerald-100/60 pt-2 w-full">
                          <p className="text-xs text-emerald-600 font-bold leading-tight">{chunk.meaning}</p>
                          <p className="text-[10px] text-emerald-400 font-mono tracking-wide">{chunk.ipa}</p>
                        </div>
                      )}

                      {isActive && (
                        <div className="mt-3 space-y-1 text-center border-t border-gray-100 pt-2 w-full">
                          <p className="text-xs text-gray-500 font-semibold leading-tight italic">{chunk.meaning}</p>
                          <p className="text-[10px] text-gray-400 font-mono tracking-wide">{chunk.ipa}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* INPUT AREA OR MASTERY SPLASH */}
              <div className="w-full">
                {!showItemMastered ? (
                  <div className="max-w-xl mx-auto space-y-4">
                    
                    {/* Word Space visual helpers / characters indicator */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Gõ các chữ cái của cụm từ màu nổi phía trên:
                      </span>
                      
                      {/* Character boxes representation */}
                      <div className="flex flex-wrap gap-1.5 justify-center py-2 select-none">
                        {currentTargetChunk?.text.split("").map((char, index) => {
                          const userChar = typedText[index];
                          const isSpace = char === " ";
                          
                          let boxClass = "w-7 h-9 text-base border-b-2 font-black flex items-center justify-center rounded-t-md transition-all ";
                          
                          if (isSpace) {
                            boxClass += "border-transparent bg-transparent w-4";
                          } else if (!userChar) {
                            // Untyped empty slot
                            boxClass += "border-gray-300 text-gray-300 bg-gray-50";
                          } else if (userChar.toLowerCase() === char.toLowerCase()) {
                            // Correct matching char
                            boxClass += "border-emerald-500 bg-emerald-50 text-emerald-600";
                          } else {
                            // Mismatched char
                            boxClass += "border-rose-500 bg-rose-50 text-rose-600";
                          }

                          return (
                            <span key={index} className={boxClass}>
                              {isSpace ? "" : (userChar && userChar.toLowerCase() === char.toLowerCase() ? char : "_")}
                            </span>
                          );
                        })}
                      </div>

                      {/* Continuous Progress Bar under active chunk */}
                      {currentTargetChunk && (
                        <div className="w-full max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div 
                            className={cn(
                              "h-full transition-all duration-150",
                              checkPrefixProgress(typedText, currentTargetChunk.text).ok 
                                ? "bg-emerald-500" 
                                : "bg-rose-500"
                            )}
                            style={{ 
                              width: `${Math.min(100, (typedText.length / currentTargetChunk.text.length) * 100)}%` 
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Dedicated input field */}
                    <div className="relative">
                      <input
                        type="text"
                        value={typedText}
                        onChange={handleTypingChange}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck="false"
                        className={cn(
                          "w-full p-5 rounded-2xl border-2 text-center font-extrabold text-xl md:text-2xl outline-none shadow-md focus:ring-4 transition-all uppercase tracking-wide",
                          checkPrefixProgress(typedText, currentTargetChunk?.text || "").ok 
                            ? "border-emerald-200 focus:border-emerald-500 focus:ring-emerald-50 text-emerald-700 bg-emerald-50/10" 
                            : "border-rose-300 focus:border-rose-500 focus:ring-rose-50 text-rose-600 bg-rose-50/10"
                        )}
                        placeholder="NHẬP TIẾNG ANH ĐÚNG VỚI CỤM TỪ SÁNG MÀU..."
                        autoFocus
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300">
                        <Keyboard size={24} />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Item Completed mastery splash */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 md:p-8 bg-emerald-500 text-white rounded-3xl text-center space-y-6 max-w-xl mx-auto shadow-xl"
                  >
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle size={36} className="text-white" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black tracking-tight">Tuyệt Vời! Đã Hoàn Thành</h3>
                      <p className="text-emerald-100 font-semibold text-sm">
                        Bạn đã luyện viết thành công và phát âm trôi chảy tất cả các cụm từ này!
                      </p>
                    </div>

                    <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
                      <p className="text-lg font-extrabold italic">"{activeItem.sentence}"</p>
                    </div>

                    <div className="flex justify-center gap-3">
                      <Button
                        onClick={() => {
                          setCurrentChunkIndex(0);
                          setTypedText("");
                          setShowItemMastered(false);
                          speakActiveSentence(activeItem.sentence, 1.0);
                        }}
                        className="bg-white text-emerald-700 font-extrabold hover:bg-emerald-50 px-6 py-2.5 rounded-xl border-none"
                      >
                        Luyện Lại Câu Này
                      </Button>
                      <Button
                        onClick={handleNextItem}
                        className="bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 px-6 py-2.5 rounded-xl border border-emerald-400"
                      >
                        Chuyển Sang Câu Tiếp Theo
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* BOTTOM CONTROLLERS (matching requested UX: Nghe, Nghe chậm, Trở lại, Tiếp câu, Đáp án) */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-gray-100">
                <Button
                  variant="outline"
                  disabled={activeItemIndex === 0}
                  onClick={handlePreviousItem}
                  className="rounded-2xl border-gray-200 text-gray-500 hover:text-pastel-pink-600 hover:bg-pastel-pink-50 font-extrabold text-sm"
                >
                  ◀ Quay Lại
                </Button>

                <Button
                  onClick={() => speakActiveSentence(activeItem.sentence, 1.0)}
                  className="bg-pastel-pink-100 hover:bg-pastel-pink-200 text-pastel-pink-700 font-extrabold rounded-2xl border-none flex items-center gap-2 text-sm"
                >
                  <Volume2 size={16} /> Nghe (1.0x)
                </Button>

                <Button
                  onClick={() => speakActiveSentence(activeItem.sentence, 0.6)}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold rounded-2xl border-none flex items-center gap-2 text-sm"
                >
                  <Volume1 size={16} /> Nghe Chậm (0.6x)
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRevealAnswer}
                  disabled={showItemMastered}
                  className="rounded-2xl border-gray-200 text-gray-500 hover:text-pastel-pink-600 hover:bg-pastel-pink-50 font-extrabold text-sm"
                >
                  💡 Đáp Án
                </Button>

                <Button
                  variant="outline"
                  onClick={handleNextItem}
                  className="rounded-2xl border-gray-200 text-gray-500 hover:text-pastel-pink-600 hover:bg-pastel-pink-50 font-extrabold text-sm"
                >
                  Tiếp Theo ▶
                </Button>
              </div>

            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lesson Completed Final Splash Modal */}
      <AnimatePresence>
        {showLessonMastered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-[2.5rem] max-w-lg w-full text-center space-y-6 border border-gray-100"
            >
              <div className="w-20 h-20 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-200">
                <Award size={44} className="text-white" />
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl font-black text-gray-900">Hoàn Thành Tiết Học!</h3>
                <p className="text-gray-500 font-semibold text-sm">
                  Chúc mừng bạn đã hoàn thành xuất sắc tất cả các thử thách cụm từ trong tiết học này!
                </p>
              </div>

              <div className="p-4 bg-pastel-pink-50 rounded-2xl border border-pastel-pink-100">
                <p className="text-sm font-bold text-pastel-pink-700">
                  {activeLesson?.title}
                </p>
                <p className="text-[10px] text-pastel-pink-500 font-extrabold uppercase mt-1">
                  Đã ghi nhận vào lịch sử học tập
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    setActiveItemIndex(0);
                    setCurrentChunkIndex(0);
                    setTypedText("");
                    setShowItemMastered(false);
                    setShowLessonMastered(false);
                  }}
                  className="w-1/2 rounded-xl font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"
                >
                  Học Lại Bài Này
                </Button>
                <Button
                  onClick={() => {
                    setActiveLesson(null);
                    setShowItemMastered(false);
                    setShowLessonMastered(false);
                  }}
                  className="w-1/2 bg-pastel-pink-600 hover:bg-pastel-pink-700 text-white rounded-xl font-black border-none"
                >
                  Chọn Bài Học Khác
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
