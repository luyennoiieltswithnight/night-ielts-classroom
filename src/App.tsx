/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInAnonymously, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  limit, 
  Timestamp,
  User,
  handleFirestoreError,
  OperationType
} from "./firebase";
import { Topic, VocabularyItem, UserStats, ExtractionResult, MicroIdeaChain, TopicFolder } from "./types";
import { getInitialSRSParams } from "./lib/srs";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { UploadModal } from "./components/UploadModal";
import { TopicDetail } from "./components/TopicDetail";
import { ReviewSession } from "./components/ReviewSession";
import { ReadingMode } from "./components/ReadingMode";
import { SpeakingMode } from "./components/SpeakingMode";
import { ListeningMode } from "./components/ListeningMode";
import { PracticeMode } from "./components/PracticeMode";
import { ChainManager } from "./components/MicroIdeaChain/ChainManager";
import { ChainModal } from "./components/MicroIdeaChain/ChainModal";
import { generateAudio } from "./services/geminiService";
import { 
  Loader2, 
  LogOut, 
  User as UserIcon, 
  Settings, 
  ChevronLeft, 
  Plus, 
  ChevronRight,
  Maximize2,
  Minimize2,
  Monitor,
  Zap,
  Boxes
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { ProgressBar } from "./components/ui/ProgressBar";
import { Mascot } from "./components/ui/Mascot";
import { cn, ADMIN_EMAIL } from "./lib/utils";

function ExitFullScreenIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M4 14h6m0 0v6m0-6L3 21" />
      <path d="M20 10h-6m0 0V4m0 6l7-7" />
    </svg>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isIntentionalLogout = useRef(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicFolders, setTopicFolders] = useState<TopicFolder[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);

  // Derived Stats Calculation
  const derivedStats = React.useMemo(() => {
    const totalWords = vocabulary.length;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const learnedToday = vocabulary.filter(v => v.lastReviewedAt?.startsWith(todayStr)).length;
    const dueToday = vocabulary.filter(v => v.nextReviewDate && new Date(v.nextReviewDate) <= now).length;
    const mastered = vocabulary.filter(v => v.learnedStatus === 'mastered').length;

    const reviewDates = Array.from(new Set(
      vocabulary
        .filter(v => v.lastReviewedAt)
        .map(v => v.lastReviewedAt!.split('T')[0])
        .sort((a, b) => b.localeCompare(a))
    ));

    let streak = 0;
    let checkDate = todayStr;
    if (reviewDates.length > 0 && !reviewDates.includes(todayStr)) {
      checkDate = yesterdayStr;
    }

    for (const date of reviewDates) {
      if (date === checkDate) {
        streak++;
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split('T')[0];
      } else if (date < checkDate) {
        break;
      }
    }

    return {
      totalWords,
      wordsLearnedToday: learnedToday,
      wordsReviewedToday: dueToday,
      totalTopics: topics.length,
      streak: streak || (reviewDates.includes(todayStr) ? 1 : 0),
      masteredCount: mastered
    };
  }, [vocabulary, topics.length]);

  const [view, setView] = useState<'dashboard' | 'topic-detail' | 'review' | 'settings' | 'topic-library' | 'progress' | 'reading-mode' | 'speaking-mode' | 'listening-mode' | 'practice' | 'micro-idea-chains'>('dashboard');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [microIdeaChains, setMicroIdeaChains] = useState<MicroIdeaChain[]>([]);
  const [activeTopicIdForUpload, setActiveTopicIdForUpload] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (audioError) {
      const timer = setTimeout(() => setAudioError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [audioError]);

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

  const toggleBrowserFullScreen = useCallback(() => {
    const doc = document.documentElement as any;
    const currentFullscreen = document.fullscreenElement || 
                              (document as any).webkitFullscreenElement || 
                              (document as any).mozFullScreenElement || 
                              (document as any).msFullscreenElement;

    if (!currentFullscreen) {
      if (doc.requestFullscreen) {
        doc.requestFullscreen().catch((err: any) => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
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
  }, []);

  // Auth User Registry logic
  const registerUser = useCallback(async (authUser: User) => {
    try {
      const userRef = doc(db, 'users', authUser.uid);
      await setDoc(userRef, {
        uid: authUser.uid,
        displayName: authUser.displayName,
        email: authUser.email?.toLowerCase(),
        photoURL: authUser.photoURL,
        lastLogin: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error registering user:", error);
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Wait for Firebase to determine if there's a cached session
        await auth.authStateReady();
      } catch (e) {
        console.error("Auth state ready error:", e);
      }
    };
    checkAuthStatus();

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log("Auth State Changed:", authUser ? `User: ${authUser.email}` : "Sign-out");
      
      if (authUser) {
        const customUser = {
          ...authUser,
          email: authUser.email || "guest@example.com",
          displayName: authUser.displayName || "Guest User",
          photoURL: authUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${authUser.uid}`
        };
        setUser(customUser);
        registerUser(customUser);
        localStorage.setItem('ais_auth_active', 'true');
        isIntentionalLogout.current = false;
        // Default to dashboard if no view is set
        setView(v => !v || v === 'dashboard' ? 'dashboard' : v);
        setIsAuthLoading(false);
      } else {
        // No user, immediately initialize secure local guest credentials
        console.log("[Auth] No active session. Initializing secure guest workspace...");
        let guestUid = localStorage.getItem('ais_guest_uid');
        if (!guestUid) {
          guestUid = 'guest-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('ais_guest_uid', guestUid);
        }
        const mockUser: any = {
          uid: guestUid,
          displayName: "Guest User",
          email: "guest@example.com",
          photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${guestUid}`
        };
        setUser(mockUser);
        setIsAuthLoading(false);
      }
    });
    return unsubscribe;
  }, [registerUser]);

  // Data Listeners
  useEffect(() => {
    if (!user) return;
    const isAdmin = user.email === ADMIN_EMAIL;

    // Listen to personal topics
    const topicsRef = collection(db, `users/${user.uid}/topics`);
    const unsubscribePersonal = onSnapshot(query(topicsRef, orderBy("createdAt", "desc")), (snapshot) => {
      const personalData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isOwner: true } as any));
      setTopics(prev => {
        const others = prev.filter(t => !t.isOwner);
        const combined = [...others, ...personalData];
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/topics`));

    // Listen to personal topic folders
    const topicFoldersRef = collection(db, `users/${user.uid}/topicFolders`);
    const unsubscribeFolders = onSnapshot(query(topicFoldersRef, orderBy("createdAt", "desc")), (snapshot) => {
      const foldersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isOwner: true } as any));
      setTopicFolders(prev => {
        const others = prev.filter(f => !f.isOwner);
        const combined = [...others, ...foldersData];
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/topicFolders`));

    // Listen to shared topics
    const sharedTopicsRef = collection(db, "sharedTopics");
    const sharedTopicsQuery = isAdmin 
      ? query(sharedTopicsRef)
      : query(sharedTopicsRef, where("authorizedEmails", "array-contains", user.email?.toLowerCase()));

    const unsubscribeShared = onSnapshot(sharedTopicsQuery, (snapshot) => {
      const sharedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isOwner: false } as any));
      setTopics(prev => {
        const personal = prev.filter(t => t.isOwner);
        const combined = [...sharedData, ...personal];
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, "sharedTopics"));

    // Listen to shared topic folders
    const sharedTopicFoldersRef = collection(db, "sharedTopicFolders");
    const sharedTopicFoldersQuery = isAdmin
      ? query(sharedTopicFoldersRef)
      : query(sharedTopicFoldersRef, where("authorizedEmails", "array-contains", user.email?.toLowerCase()));

    const unsubscribeSharedFolders = onSnapshot(sharedTopicFoldersQuery, (snapshot) => {
      const sharedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isOwner: false } as any));
      setTopicFolders(prev => {
        const personal = prev.filter(f => f.isOwner);
        const combined = [...sharedData, ...personal];
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, "sharedTopicFolders"));

    const vocabRef = collection(db, `users/${user.uid}/vocabulary`);
    const unsubscribeVocab = onSnapshot(query(vocabRef, orderBy("createdAt", "desc")), (snapshot) => {
      const vocabData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VocabularyItem));
      setVocabulary(vocabData);
    });

    const chainsRef = collection(db, `users/${user.uid}/microIdeaChains`);
    const unsubscribeChains = onSnapshot(query(chainsRef, orderBy("createdAt", "desc")), (snapshot) => {
      const chainsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MicroIdeaChain));
      setMicroIdeaChains(chainsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/microIdeaChains`));

    return () => {
      unsubscribePersonal();
      unsubscribeFolders();
      unsubscribeShared();
      unsubscribeSharedFolders();
      unsubscribeVocab();
      unsubscribeChains();
    };
  }, [user]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setUser(result.user);
        setView('dashboard');
        // Reset logging in state on success
        setIsLoggingIn(false);
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      setIsLoggingIn(false);
      
      let message = "Login failed. Please try again.";
      if (error.code === 'auth/network-request-failed') {
        message = "Network error: Firebase couldn't be reached. This often happens if tracking protection is enabled or if the network is restricted. Try opening the app in a new tab.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = "Login popup was closed before completion. Please try again.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = "Login request cancelled - another request is likely in progress.";
      } else if (error.message) {
        message = `Login error: ${error.message}`;
      }
      
      alert(message);
    }
  };

  const handleLogout = () => {
    isIntentionalLogout.current = true;
    localStorage.removeItem('ais_auth_active');
    auth.signOut();
    setView('dashboard');
    setSelectedTopic(null);
    setIsLoggingIn(false);
  };

  const handleExtractionConfirm = async (result: ExtractionResult) => {
    if (!user) return;

    try {
      let topicId = activeTopicIdForUpload;
      
      if (!topicId) {
        // 1. Create new topic
        const topicRef = doc(collection(db, `users/${user.uid}/topics`));
        topicId = topicRef.id;
        const newTopic: Topic = {
          id: topicId,
          name: result.suggestedTopic,
          wordCount: result.vocabulary.length,
          learnedCount: 0,
          createdAt: new Date().toISOString(),
          status: 'active'
        };
        await setDoc(topicRef, newTopic);
      } else {
        // Update existing topic word count
        const topicRef = doc(db, `users/${user.uid}/topics`, topicId);
        const topicSnap = await getDoc(topicRef);
        if (topicSnap.exists()) {
          const currentTopic = topicSnap.data() as Topic;
          await updateDoc(topicRef, {
            wordCount: currentTopic.wordCount + result.vocabulary.length
          });
        }
      }

      // 2. Save vocabulary items
      const batch = result.vocabulary.map(async (v) => {
        const vocabRef = doc(collection(db, `users/${user.uid}/vocabulary`));
        const newItem: VocabularyItem = {
          ...v,
          id: vocabRef.id,
          topicId: topicId!,
          ...getInitialSRSParams(),
          createdAt: new Date().toISOString(),
          examples: v.examples || []
        } as VocabularyItem;
        await setDoc(vocabRef, newItem);
      });
      await Promise.all(batch);
      if (topicId) {
        await syncTopicToStudents(topicId);
      }
      setActiveTopicIdForUpload(null);
    } catch (error) {
      // @ts-ignore
      handleFirestoreError(error, 'write', `users/${user.uid}/topics`);
    }
  };

  const handleEditTopicName = async (topicId: string, newName: string) => {
    if (!user || !newName.trim()) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/topics`, topicId), {
        name: newName.trim()
      });
      if (selectedTopic?.id === topicId) {
        setSelectedTopic(prev => prev ? { ...prev, name: newName.trim() } : null);
      }
    } catch (error) {
      // @ts-ignore
      handleFirestoreError(error, 'update', `users/${user.uid}/topics/${topicId}`);
    }
  };

  const handleReviewComplete = async (updatedItems: VocabularyItem[]) => {
    if (!user) return;
    
    try {
      const batch = updatedItems.map(async (item) => {
        const vocabRef = doc(db, `users/${user.uid}/vocabulary`, item.id);
        // Use setDoc with merge to handle cases where the word doesn't exist in personal collection yet
        await setDoc(vocabRef, { ...item }, { merge: true });
      });
      await Promise.all(batch);
      
      // Update topic counts for all affected topics
      const affectedTopicIds = Array.from(new Set(updatedItems.map(i => i.topicId)));
      const topicUpdates = affectedTopicIds.map(async (topicId) => {
        // If this was a shared topic we just practiced, save a personal copy of the topic metadata
        if (selectedTopic && selectedTopic.id === topicId && !selectedTopic.isOwner) {
          const studentTopicRef = doc(db, `users/${user.uid}/topics`, topicId);
          const { vocabulary: _, ...topicData } = selectedTopic; // Exclude the embedded words from personal topic doc
          await setDoc(studentTopicRef, {
            ...topicData,
            isOwner: true, 
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        // Use a small delay or calculate from updatedItems + current vocabulary
        const topicVocab = vocabulary.filter(v => v.topicId === topicId);
        const learnedCount = topicVocab.filter(v => v.learnedStatus !== 'new').length;
        
        await setDoc(doc(db, `users/${user.uid}/topics`, topicId), {
          learnedCount
        }, { merge: true });
      });
      await Promise.all(topicUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/vocabulary`);
    }

    setView('dashboard');
  };

  const handleDeleteTopic = async (topicId: string, isOwner: boolean) => {
    if (!user || !topicId) return;
    const isAdmin = user.email === ADMIN_EMAIL;
    
    try {
      if (isOwner) {
        // 1. Delete all vocabulary items in this topic
        const topicVocab = vocabulary.filter(v => v.topicId === topicId);
        const vocabDeletions = topicVocab.map(v => deleteDoc(doc(db, `users/${user.uid}/vocabulary`, v.id)));
        await Promise.all(vocabDeletions);

        // 2. Delete the topic itself from personal collection
        await deleteDoc(doc(db, `users/${user.uid}/topics`, topicId));
        
        // 3. Try to clean up shared version
        try { await deleteDoc(doc(db, "sharedTopics", topicId)); } catch(e) {}
      } else if (isAdmin) {
        // Admin deletes shared version directly
        await deleteDoc(doc(db, "sharedTopics", topicId));
      }
      
      if (selectedTopic?.id === topicId) {
        setSelectedTopic(null);
        setView('dashboard');
      }
    } catch (error) {
      // @ts-ignore
      handleFirestoreError(error, 'delete', `users/${user.uid}/topics/${topicId}`);
    }
  };

  const handleDeleteWord = async (wordId: string) => {
    if (!user) return;
    try {
      const wordToDelete = vocabulary.find(v => v.id === wordId);
      await deleteDoc(doc(db, `users/${user.uid}/vocabulary`, wordId));
      
      if (wordToDelete) {
        const topicRef = doc(db, `users/${user.uid}/topics`, wordToDelete.topicId);
        const topicSnap = await getDoc(topicRef);
        if (topicSnap.exists()) {
          const currentTopic = topicSnap.data() as Topic;
          await updateDoc(topicRef, {
            wordCount: Math.max(0, currentTopic.wordCount - 1),
            learnedCount: vocabulary.filter(v => v.topicId === wordToDelete.topicId && v.id !== wordId && v.learnedStatus !== 'new').length
          });
        }
        if (wordToDelete) {
          await syncTopicToStudents(wordToDelete.topicId);
        }
      }
    } catch (error) {
      // @ts-ignore
      handleFirestoreError(error, 'delete', `users/${user.uid}/vocabulary/${wordId}`);
    }
  };

  const handleSaveChain = async (chain: Omit<MicroIdeaChain, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const chainRef = doc(collection(db, `users/${user.uid}/microIdeaChains`));
      const now = new Date().toISOString();
      await setDoc(chainRef, {
        ...chain,
        id: chainRef.id,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      // @ts-ignore
      handleFirestoreError(error, 'write', `users/${user.uid}/microIdeaChains`);
    }
  };

  const handleUpdateChain = async (id: string, updates: Partial<MicroIdeaChain>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/microIdeaChains`, id), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      // @ts-ignore
      handleFirestoreError(error, 'update', `users/${user.uid}/microIdeaChains/${id}`);
    }
  };

  const handleDeleteChain = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/microIdeaChains`, id));
    } catch (error) {
      // @ts-ignore
      handleFirestoreError(error, 'delete', `users/${user.uid}/microIdeaChains/${id}`);
    }
  };

  // Global audio unlock for browser restrictions
  useEffect(() => {
    const unlock = () => {
      console.log("Unlocking audio systems...");
      // Unlock Web Audio
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        try {
          const ctx = new Ctx();
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
          ctx.resume().then(() => {
            console.log("AudioContext unlocked and resumed.");
            setTimeout(() => ctx.close(), 100);
          });
        } catch (e) {
          console.error("AudioContext unlock failed:", e);
        }
      }
      // Unlock Speech Synthesis
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.resume();
          const utterance = new SpeechSynthesisUtterance("");
          utterance.volume = 0;
          window.speechSynthesis.speak(utterance);
          console.log("SpeechSynthesis unlocked.");
        } catch (e) {
          console.error("SpeechSynthesis unlock failed:", e);
        }
      }
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    // Pre-load and select the best voice
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const preferredVoice = 
            voices.find(v => v.lang.startsWith('en') && v.name.includes('Google') && v.name.includes('US')) ||
            voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
            voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Enhanced'))) ||
            voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) ||
            voices.find(v => v.lang.startsWith('en'));
          
          if (preferredVoice) {
            bestVoiceRef.current = preferredVoice;
          }
        }
      }
    };
    
    window.addEventListener('mousedown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      loadVoices();
    }

    return () => {
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, []);

  const handlePlayAudio = useCallback((text: string) => {
    if (!text || typeof window === "undefined") return;
    
    const synth = window.speechSynthesis;
    if (!synth) return;

    console.log("TTS playing:", text);

    // 1. Force interrupt any existing speech
    synth.cancel();
    
    // 2. Clear any paused state (common in Chrome/Safari)
    synth.resume();

    // 3. Prepare the utterance instantly
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // 4. Use pre-selected high-quality voice if ready
    if (bestVoiceRef.current) {
      utterance.voice = bestVoiceRef.current;
    } else {
      const voices = synth.getVoices();
      const preferred = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("US")));
      if (preferred) utterance.voice = preferred;
    }

    // 5. Debug events
    utterance.onstart = () => console.log("Speech started");
    utterance.onerror = (e) => console.error("Speech error:", e);

    // 6. Speak with a minimal 20ms delay to allow previous cancel() to settle 
    // This solves the common "silent playback" bug in Chromium and WebKit.
    setTimeout(() => {
      synth.speak(utterance);
    }, 20);
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const handleNewTopicFolder = async (name: string) => {
    if (!user || !name.trim()) return;
    try {
      const folderRef = doc(collection(db, `users/${user.uid}/topicFolders`));
      const now = new Date().toISOString();
      await setDoc(folderRef, {
        id: folderRef.id,
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
        authorizedEmails: []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/topicFolders`);
    }
  };

  const handleRenameTopicFolder = async (id: string, name: string) => {
    if (!user || !name.trim()) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/topicFolders`, id), {
        name: name.trim(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/topicFolders/${id}`);
    }
  };

  const handleDeleteTopicFolder = async (id: string, deleteContents: boolean, isOwner: boolean) => {
    if (!user) return;
    const isAdmin = user.email === ADMIN_EMAIL;

    try {
      if (isOwner) {
        if (deleteContents) {
          const topicsInFolder = topics.filter(t => t.folderId === id && t.isOwner);
          const deletions = topicsInFolder.map(t => handleDeleteTopic(t.id, true));
          await Promise.all(deletions);
        } else {
          const topicsInFolder = topics.filter(t => t.folderId === id && t.isOwner);
          const updates = topicsInFolder.map(t => {
             const tRef = doc(db, `users/${user.uid}/topics`, t.id);
             return updateDoc(tRef, { folderId: null });
          });
          await Promise.all(updates);
        }
        await deleteDoc(doc(db, `users/${user.uid}/topicFolders`, id));
        // Try to clean up shared version
        try { await deleteDoc(doc(db, "sharedTopicFolders", id)); } catch(e) {}
      } else if (isAdmin) {
        await deleteDoc(doc(db, "sharedTopicFolders", id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/topicFolders/${id}`);
    }
  };

  const handleMoveTopicToFolder = async (topicId: string, folderId: string | null) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/topics`, topicId), {
        folderId: folderId
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/topics/${topicId}`);
    }
  };

  const handleShareTopicFolder = async (folderId: string, emails: string[]) => {
    if (!user) return;
    const isAdmin = user.email === ADMIN_EMAIL;
    try {
      const folder = topicFolders.find(f => f.id === folderId);
      if (!folder) return;

      if (folder.isOwner) {
        // Update personal folder record
        const folderRef = doc(db, `users/${user.uid}/topicFolders`, folderId);
        await updateDoc(folderRef, {
          authorizedEmails: emails,
          updatedAt: new Date().toISOString()
        });
      }

      const sharedFolderRef = doc(db, "sharedTopicFolders", folderId);
      await setDoc(sharedFolderRef, {
        ...folder,
        authorizedEmails: emails,
        sharedBy: folder.isOwner ? user.uid : (folder.sharedBy || user.uid),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Share all topics in this folder automatically
      const folderTopics = topics.filter(t => t.folderId === folderId);
      for (const topic of folderTopics) {
        await handleShareTopic(topic.id, emails);
      }

      alert("Folder and all contained topics synchronized successfully!");
    } catch (error) {
      console.error("Folder sharing failed:", error);
      alert("Sharing failed. Please check your connection.");
    }
  };

  const syncTopicToStudents = async (topicId: string, emails?: string[]) => {
    if (!user) return;
    const topicToSync = topics.find(t => t.id === topicId);
    if (!topicToSync || !topicToSync.isOwner) return;

    try {
      const authorizedEmails = emails || topicToSync.authorizedEmails || [];
      if (authorizedEmails.length === 0) return;

      const vocabRef = collection(db, `users/${user.uid}/vocabulary`);
      const q = query(vocabRef, where("topicId", "==", topicId));
      const vocabSnap = await getDocs(q);
      const vocabData = vocabSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      const sharedTopicRef = doc(db, "sharedTopics", topicId);
      await setDoc(sharedTopicRef, {
        ...topicToSync,
        vocabulary: vocabData,
        sharedBy: user.uid,
        authorizedEmails: authorizedEmails,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log(`Topic ${topicId} synchronized with students.`);
    } catch (error) {
      console.error("Shared topic sync failed:", error);
    }
  };

  const handleShareTopic = async (topicId: string, emails: string[]) => {
    if (!user) return;
    try {
      const topicToShare = topics.find(t => t.id === topicId);
      if (!topicToShare || !topicToShare.isOwner) return;

      // Update personal topic record
      const topicRef = doc(db, `users/${user.uid}/topics`, topicId);
      await updateDoc(topicRef, {
        authorizedEmails: emails,
        updatedAt: new Date().toISOString()
      });

      // Synchronize data immediately
      await syncTopicToStudents(topicId, emails);

      alert("Topic synchronized successfully!");
    } catch (error) {
      console.error("Topic sharing failed:", error);
      alert("Sharing failed. Please check your connection.");
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-[#fafafa] flex flex-col font-sans transition-all duration-500",
      isTheaterMode && "bg-white"
    )}>
      {/* Navbar - hidden in theater mode */}
      <AnimatePresence>
        {!isTheaterMode && (
          <motion.nav 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="bg-white/80 backdrop-blur-md border-b-2 border-gray-50 sticky top-0 z-30"
          >
            <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setView('dashboard')}>
                <div className="w-12 h-12 bg-pastel-green-500 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-pastel-green-100 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 overflow-hidden">
                  <Mascot size="sm" className="scale-125 translate-y-1" />
                </div>
                <div className="flex flex-col -space-y-1">
                  <span className="text-2xl font-black text-gray-900 tracking-tighter">Study English</span>
                  <span className="text-[10px] font-black text-pastel-green-500 uppercase tracking-[0.3em] ml-0.5">with Mr. Night</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex bg-gray-50 p-1 rounded-2xl border-2 border-gray-100 shadow-sm">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsTheaterMode(!isTheaterMode)} 
                    className={cn(
                      "h-10 w-10 text-gray-400 hover:text-pastel-green-600 hover:bg-pastel-green-50 rounded-xl transition-all",
                      isTheaterMode && "text-pastel-green-600 bg-pastel-green-50"
                    )}
                    title="Theater Mode (Full Browser)"
                  >
                    <Monitor className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleBrowserFullScreen} 
                    className={cn(
                      "h-10 w-10 text-gray-400 hover:text-pastel-green-600 hover:bg-pastel-green-50 rounded-xl transition-all",
                      isFullscreen && "text-pastel-green-600 bg-pastel-green-50"
                    )}
                    title="Full Screen (Entire Monitor)"
                  >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </Button>
                </div>

                <Button variant="ghost" size="icon" onClick={() => setView('settings')} className="h-12 w-12 text-gray-400 hover:text-pastel-green-600 hover:bg-pastel-green-50 rounded-2xl transition-all">
                  <Settings className="w-7 h-7" />
                </Button>
                <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-gray-50 rounded-2xl border-2 border-gray-100 shadow-sm">
                  <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-50">
                    <UserIcon className="w-5 h-5 text-pastel-green-600" />
                  </div>
                  <div className="flex flex-col -space-y-1">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Student</span>
                    <span className="text-sm font-black text-gray-800">{user.displayName}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="h-12 w-12 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                  <LogOut className="w-7 h-7" />
                </Button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Floating Exit Theater Mode Button */}
      <AnimatePresence>
        {isTheaterMode && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-8 right-8 z-[100]"
          >
            <Button 
              onClick={() => setIsTheaterMode(false)}
              className="group gap-3 bg-gray-900 text-white border-none rounded-2xl px-6 py-6 shadow-2xl hover:scale-105"
            >
              <ExitFullScreenIcon className="w-5 h-5" />
              <span className="font-black text-sm uppercase tracking-widest">Exit Theater Mode</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Error Toast */}
      <AnimatePresence>
        {audioError && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <LogOut className="w-4 h-4 rotate-90" />
            </div>
            {audioError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-500 ease-in-out relative",
        isTheaterMode ? "w-full max-w-7xl mx-auto px-4" : ""
      )}>
        {/* Floating Quick Add Button for Chains */}
        <div className="fixed bottom-32 right-8 z-[90] flex flex-col gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="flex flex-col items-end gap-2"
          >
            <Button
              onClick={() => setView('micro-idea-chains')}
              className="bg-gray-900 border-none text-white w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center p-0"
              title="View Idea Chains"
            >
              <Boxes className="w-6 h-6" />
            </Button>
          </motion.div>
          <motion.div
            initial={{ scale: 0, rotate: 20 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.1, rotate: -5 }}
            className="flex flex-col items-end gap-2"
          >
            <Button
              onClick={() => setIsChainModalOpen(true)}
              className="bg-pastel-yellow-500 border-none text-white w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center p-0"
              title="Quick Add Idea Chain"
            >
              <Zap className="w-8 h-8 fill-white" />
            </Button>
          </motion.div>
        </div>

        <AnimatePresence>
          {isChainModalOpen && (
            <ChainModal
              isOpen={isChainModalOpen}
              onClose={() => setIsChainModalOpen(false)}
              onSave={handleSaveChain}
            />
          )}
        </AnimatePresence>
        {view === 'dashboard' && (
          <Dashboard 
            stats={derivedStats} 
            topics={topics} 
            nextReviewDate={vocabulary.length > 0 ? 
              vocabulary.reduce((earliest, v) => {
                if (!v.nextReviewDate) return earliest;
                if (!earliest) return v.nextReviewDate;
                return v.nextReviewDate < earliest ? v.nextReviewDate : earliest;
              }, null as string | null) 
              : null
            }
            upcomingReviews={{
              tomorrow: vocabulary.filter(v => {
                if (!v.nextReviewDate) return false;
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];
                return v.nextReviewDate.startsWith(tomorrowStr);
              }).length,
              thisWeek: vocabulary.filter(v => {
                if (!v.nextReviewDate) return false;
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                return new Date(v.nextReviewDate) <= nextWeek;
              }).length
            }}
            onNewTopic={() => setIsUploadModalOpen(true)}
            onSelectTopic={(topic) => {
              setSelectedTopic(topic);
              setView('topic-detail');
            }}
            onViewAllTopics={() => setView('topic-library')}
            onViewProgress={() => setView('progress')}
            onReadingMode={() => setView('reading-mode')}
            onSpeakingMode={() => setView('speaking-mode')}
            onListeningMode={() => setView('listening-mode')}
            onIdeaChains={() => setView('micro-idea-chains')}
            onStartReview={() => {
              const dueItems = vocabulary.filter(v => v.nextReviewDate && new Date(v.nextReviewDate) <= new Date());
              if (dueItems.length > 0) {
                setView('review');
              } else {
                alert("No words due for review today! Great job.");
              }
            }}
            topicFolders={topicFolders}
            onNewTopicFolder={handleNewTopicFolder}
            onDeleteTopicFolder={(id, delContents) => {
              const folder = topicFolders.find(f => f.id === id);
              handleDeleteTopicFolder(id, delContents, folder?.isOwner || false);
            }}
            onRenameTopicFolder={handleRenameTopicFolder}
            onMoveTopicToFolder={handleMoveTopicToFolder}
            onShareTopicFolder={handleShareTopicFolder}
            onToggleTheaterMode={() => setIsTheaterMode(!isTheaterMode)}
            onToggleBrowserFullScreen={toggleBrowserFullScreen}
            currentUser={user}
          />
        )}

        {view === 'topic-detail' && selectedTopic && (
          <TopicDetail 
            topic={selectedTopic}
            words={(() => {
              const personalWords = vocabulary.filter(v => v.topicId === selectedTopic.id);
              if (selectedTopic.isOwner) return personalWords;
              
              // For shared topics, merge personal SRS data with the shared word list
              const sharedWords = selectedTopic.vocabulary || [];
              return sharedWords.map(sw => {
                const pw = personalWords.find(p => p.id === sw.id);
                return pw ? { ...sw, ...pw } : sw;
              });
            })()}
            onBack={() => setView('dashboard')}
            onStartReview={() => setView('review')}
            onStartPractice={() => setView('practice')}
            onPlayAudio={handlePlayAudio}
            onDeleteTopic={() => handleDeleteTopic(selectedTopic.id, selectedTopic.isOwner || false)}
            onDeleteWord={handleDeleteWord}
            onEditName={(newName) => handleEditTopicName(selectedTopic.id, newName)}
            onAddVocabulary={() => {
              setActiveTopicIdForUpload(selectedTopic.id);
              setIsUploadModalOpen(true);
            }}
            onShareTopic={(emails) => handleShareTopic(selectedTopic.id, emails)}
            currentUser={user}
          />
        )}

        {view === 'practice' && selectedTopic && (
          <PracticeMode 
            items={(() => {
              const personalWords = vocabulary.filter(v => v.topicId === selectedTopic.id);
              if (selectedTopic.isOwner) return personalWords;
              
              const sharedWords = selectedTopic.vocabulary || [];
              const merged = sharedWords.map(sw => {
                const pw = personalWords.find(p => p.id === sw.id);
                // Important: merge personal SRS state into shared definitions
                return pw ? { ...sw, ...pw } : sw;
              });
              return merged;
            })()}
            onClose={() => setView('topic-detail')}
            onPlayAudio={handlePlayAudio}
          />
        )}

        {view === 'micro-idea-chains' && (
          <ChainManager
            chains={microIdeaChains}
            onBack={() => setView('dashboard')}
            onSave={handleSaveChain}
            onUpdate={handleUpdateChain}
            onDelete={handleDeleteChain}
            onPlayAudio={handlePlayAudio}
          />
        )}

        {view === 'review' && (
          <ReviewSession 
            items={(() => {
              const personalWords = vocabulary.filter(v => v.topicId === (selectedTopic?.id || ''));
              
              if (selectedTopic) {
                if (selectedTopic.isOwner) {
                  return personalWords.filter(v => v.nextReviewDate && new Date(v.nextReviewDate) <= new Date());
                }
                const sharedWords = selectedTopic.vocabulary || [];
                const merged = sharedWords.map(sw => {
                  const pw = personalWords.find(p => p.id === sw.id);
                  return pw ? { ...sw, ...pw } : sw;
                });
                return merged.filter(v => v.nextReviewDate && new Date(v.nextReviewDate) <= new Date());
              }
              
              // Global review
              return vocabulary.filter(v => v.nextReviewDate && new Date(v.nextReviewDate) <= new Date());
            })()}
            onComplete={handleReviewComplete}
            onClose={() => setView('dashboard')}
            onPlayAudio={handlePlayAudio}
          />
        )}

        {view === 'settings' && (
          <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
            <header className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-500">Manage your account and learning preferences.</p>
            </header>
            
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Account</h3>
                  <p className="text-sm text-gray-500">
                    {user.isAnonymous || user.email === 'guest@example.com' 
                      ? "Guest Account (Progress saved locally/anonymously)" 
                      : user.email}
                  </p>
                </div>
                {user.isAnonymous || user.email === 'guest@example.com' ? (
                  <Button variant="primary" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={handleLogin}>
                    Sign in with Google
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleLogout}>Sign Out</Button>
                )}
              </div>
              
              <div className="pt-6 border-t">
                <h3 className="font-bold text-gray-900 mb-4">Learning Goals</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Daily New Words</span>
                    <span className="font-bold text-indigo-600">20</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Daily Review Goal</span>
                    <span className="font-bold text-indigo-600">50</span>
                  </div>
                </div>
              </div>
            </Card>
            
            <Button variant="ghost" onClick={() => setView('dashboard')}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Button>
          </div>
        )}
        {view === 'topic-library' && (
          <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-pastel-green-50 p-10 rounded-[3rem] border border-pastel-green-100 relative overflow-hidden">
              <div className="relative z-10">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Topic Library</h1>
                <p className="text-pastel-green-700 font-semibold mt-2 text-lg">Browse and manage your vocabulary collections.</p>
              </div>
              <Button onClick={() => setIsUploadModalOpen(true)} className="gap-3 py-8 px-10 text-xl font-black bg-pastel-green-600 hover:bg-pastel-green-700 shadow-xl shadow-pastel-green-200 border-none rounded-[2rem] relative z-10 transition-all hover:scale-105 active:scale-95">
                <Plus className="w-6 h-6" /> New Topic
              </Button>
              <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12 pointer-events-none">
                <Mascot mood="happy" size="lg" />
              </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {topics.map((topic) => (
                <Card 
                  key={topic.id} 
                  className="p-8 hover:shadow-2xl hover:shadow-gray-200/50 transition-all cursor-pointer group border-none bg-white rounded-[2.5rem] relative overflow-hidden"
                  onClick={() => {
                    setSelectedTopic(topic);
                    setView('topic-detail');
                  }}
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-pastel-green-400 group-hover:w-3 transition-all" />
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-black text-gray-900 group-hover:text-pastel-green-600 transition-colors tracking-tight">{topic.name}</h3>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">{topic.wordCount} words • {new Date(topic.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-[10px] font-black px-3 py-1 bg-pastel-green-50 text-pastel-green-600 rounded-full border border-pastel-green-100 shadow-sm">
                      {Math.round((topic.learnedCount / topic.wordCount) * 100 || 0)}%
                    </div>
                  </div>
                  <ProgressBar value={topic.learnedCount} max={topic.wordCount} className="h-2.5" color="bg-pastel-green-400" />
                  <div className="mt-6 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500">{topic.learnedCount} <span className="text-gray-300">/</span> {topic.wordCount} learned</span>
                    <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-pastel-green-50 group-hover:text-pastel-green-600 transition-all">
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button variant="ghost" onClick={() => setView('dashboard')} className="text-gray-400 hover:text-pastel-green-600 hover:bg-pastel-green-50 rounded-2xl font-black px-6 py-4">
              <ChevronLeft className="w-5 h-5 mr-2" /> Back to Dashboard
            </Button>
          </div>
        )}
        {view === 'progress' && (
          <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-pastel-blue-50 p-10 rounded-[3rem] border border-pastel-blue-100 relative overflow-hidden">
              <div className="relative z-10">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Learning Progress</h1>
                <p className="text-pastel-blue-700 font-semibold mt-2 text-lg">Track your vocabulary mastery over time.</p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12 pointer-events-none">
                <Mascot mood="happy" size="lg" />
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-10 col-span-2 border-none bg-white shadow-2xl shadow-gray-200/50 rounded-[3rem]">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Weekly Activity</h3>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-pastel-blue-400 rounded-full" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Words Reviewed</span>
                  </div>
                </div>
                <div className="h-80 flex items-end justify-between gap-4">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const dateStr = d.toISOString().split('T')[0];
                    const count = vocabulary.filter(v => v.lastReviewedAt?.startsWith(dateStr)).length;
                    const maxCount = Math.max(...Array.from({ length: 7 }).map((_, j) => {
                      const dj = new Date();
                      dj.setDate(dj.getDate() - (6 - j));
                      return vocabulary.filter(v => v.lastReviewedAt?.startsWith(dj.toISOString().split('T')[0])).length;
                    }), 10);
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-4 group relative">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${(count / maxCount) * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                          className="w-full bg-pastel-blue-400 rounded-2xl transition-all duration-300 hover:bg-pastel-blue-500 hover:shadow-lg hover:shadow-pastel-blue-100" 
                        />
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-xl scale-90 group-hover:scale-100">
                          {count} words
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-10 flex flex-col justify-center text-center space-y-8 border-none bg-white shadow-2xl shadow-gray-200/50 rounded-[3rem]">
                <div className="relative inline-block mx-auto">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="text-gray-50"
                    />
                    <motion.circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 80}
                      initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - derivedStats.masteredCount / (derivedStats.totalWords || 1)) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      strokeLinecap="round"
                      className="text-pastel-green-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-gray-900">{Math.round((derivedStats.masteredCount / (derivedStats.totalWords || 1)) * 100)}%</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mastery</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-black text-gray-900 tracking-tight">{derivedStats.masteredCount} Words</p>
                  <p className="text-sm font-semibold text-gray-400">Mastered out of {derivedStats.totalWords}</p>
                </div>
              </Card>
            </div>

            <Button variant="ghost" onClick={() => setView('dashboard')} className="text-gray-400 hover:text-pastel-blue-600 hover:bg-pastel-blue-50 rounded-2xl font-black px-6 py-4">
              <ChevronLeft className="w-5 h-5 mr-2" /> Back to Dashboard
            </Button>
          </div>
        )}

        {view === 'reading-mode' && (
          <ReadingMode onBack={() => setView('dashboard')} />
        )}

        {view === 'speaking-mode' && (
          <SpeakingMode onBack={() => setView('dashboard')} />
        )}
        
        {view === 'listening-mode' && (
          <ListeningMode onBack={() => setView('dashboard')} />
        )}
      </main>

      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => {
          setIsUploadModalOpen(false);
          setActiveTopicIdForUpload(null);
        }}
        onConfirm={handleExtractionConfirm}
      />
    </div>
  );
}
