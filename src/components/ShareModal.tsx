import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Zap, 
  Users, 
  Check, 
  Share2, 
  Globe,
  Lock,
  User as UserIcon,
  Loader2,
  Plus,
  Info
} from 'lucide-react';
import { db, collection, getDocs, query, where, handleFirestoreError, OperationType, auth } from '../firebase';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';
import { User } from 'firebase/auth';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (emails: string[]) => Promise<void>;
  currentEmails?: string[];
}

export function ShareModal({ isOpen, onClose, onShare, currentEmails = [] }: ShareModalProps) {
  const [emailsInput, setEmailsInput] = useState('');
  const [sharedList, setSharedList] = useState<string[]>(currentEmails);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (JSON.stringify(currentEmails) !== JSON.stringify(sharedList)) {
      setSharedList(currentEmails);
    }
  }, [currentEmails, sharedList]);

  const removeEmail = (email: string) => {
    setSharedList(prev => prev.filter(e => e !== email));
  };

  const handleSynchronize = async () => {
    setIsSyncing(true);
    setError(null);
    setSuccess(false);

    try {
      const newEmails = emailsInput.split(/[\s,;]+/)
        .filter(e => e.trim() !== '' && e.includes('@'))
        .map(e => e.trim().toLowerCase());
      
      // Combine existing list with new emails, ensuring uniqueness
      const combinedList = Array.from(new Set([...sharedList, ...newEmails]));

      if (combinedList.length === 0) {
        setError("Please add at least one Gmail address.");
        setIsSyncing(false);
        return;
      }

      await onShare(combinedList);
      setSuccess(true);
      setEmailsInput('');
      
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);

    } catch (err: any) {
      console.error("Sync failed:", err);
      setError("An unexpected error occurred during synchronization.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-4 border-white"
          >
            <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-pastel-green-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-pastel-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pastel-green-100">
                  <Share2 size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Synchronization Access</h2>
                  <p className="text-sm font-bold text-pastel-green-600">Sync resources with authorized Gmails</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 border-2 border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
              <div className="space-y-8">
                {/* Current Access List */}
                {sharedList.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">
                      Currently Authorized
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {sharedList.map(email => (
                        <div 
                          key={email}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200 group hover:border-red-200 transition-colors"
                        >
                          <span className="text-sm font-black text-gray-600">{email}</span>
                          <button 
                            onClick={() => removeEmail(email)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Access */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">
                    Add New Students' Gmail
                  </label>
                  <textarea 
                    placeholder="e.g. student1@gmail.com, student2@gmail.com"
                    className={cn(
                      "w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-4 font-bold text-sm outline-none transition-all shadow-sm min-h-[100px] resize-none",
                      error ? "border-red-200 focus:border-red-300" : "focus:border-pastel-green-300"
                    )}
                    value={emailsInput}
                    onChange={(e) => {
                      setEmailsInput(e.target.value);
                      setError(null);
                      setSuccess(false);
                    }}
                  />
                  <p className="text-[10px] font-bold text-gray-400 px-1 italic">
                    Separate multiple emails with commas, semicolons or spaces.
                  </p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3"
                  >
                    <X size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-bold text-red-700 leading-relaxed">
                      {error}
                    </p>
                  </motion.div>
                )}

                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-start gap-3"
                  >
                    <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-bold text-green-700 leading-relaxed">
                      Data synchronized successfully! Access has been updated.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t-2 border-gray-100 flex gap-4">
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="flex-1 py-6 text-gray-400 font-black rounded-2xl hover:bg-gray-200"
              >
                Dismiss
              </Button>
              <Button 
                onClick={handleSynchronize}
                disabled={isSyncing || (!emailsInput.trim() && sharedList.length === currentEmails.length)}
                className="flex-[2] py-6 bg-pastel-green-500 hover:bg-pastel-green-600 text-white font-black rounded-2xl shadow-xl shadow-pastel-green-100 gap-2 disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    Synchronize
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
