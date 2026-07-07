import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Save, Trash2, ArrowRight, BookOpen, Quote } from 'lucide-react';
import { MicroIdeaChain, MicroIdea } from '../../types';

interface ChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chain: Omit<MicroIdeaChain, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialChain?: MicroIdeaChain;
}

export const ChainModal: React.FC<ChainModalProps> = ({ isOpen, onClose, onSave, initialChain }) => {
  const [topic, setTopic] = useState(initialChain?.topic || '');
  const [title, setTitle] = useState(initialChain?.title || '');
  const [ideas, setIdeas] = useState<Omit<MicroIdea, 'id'>[]>(
    initialChain?.ideas.map(({ id, ...rest }) => rest) || [{ phrase: '' }]
  );

  const topics = ['Accommodation', 'Work', 'Study', 'Travel', 'Hobbies', 'Health', 'Environment'];

  const handleAddIdea = () => {
    setIdeas([...ideas, { phrase: '' }]);
  };

  const handleRemoveIdea = (index: number) => {
    setIdeas(ideas.filter((_, i) => i !== index));
  };

  const handleUpdateIdea = (index: number, updates: Partial<Omit<MicroIdea, 'id'>>) => {
    const newIdeas = [...ideas];
    newIdeas[index] = { ...newIdeas[index], ...updates };
    setIdeas(newIdeas);
  };

  const handleSave = () => {
    if (!topic || ideas.some(i => !i.phrase.trim())) return;
    onSave({
      topic,
      title: title.trim() || undefined,
      ideas: ideas.map((i, idx) => ({ ...i, id: `${idx}` })) as MicroIdea[],
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-pastel-yellow-50">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              {initialChain ? 'Edit Idea Chain' : 'New Micro Idea Chain'}
            </h2>
            <p className="text-sm text-gray-500 font-medium tracking-tight">Connect phrases into a powerful speaking map</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Topic</label>
              <div className="flex flex-wrap gap-2">
                {topics.map(t => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      topic === t ? 'bg-pastel-yellow-500 text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="Custom..."
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 text-gray-500 hover:bg-gray-100 outline-none w-24 focus:bg-white focus:ring-2 focus:ring-pastel-yellow-200"
                  onBlur={(e) => e.target.value && setTopic(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Title (Optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My Workspace Description"
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-pastel-yellow-200 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Chain Sequence</label>
            <div className="space-y-3">
              {ideas.map((idea, index) => (
                <motion.div
                  key={index}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative group bg-gray-50/50 p-4 rounded-3xl border border-gray-100"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1 mt-3">
                      <div className="w-6 h-6 rounded-full bg-pastel-yellow-500 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                        {index + 1}
                      </div>
                      {index < ideas.length - 1 && (
                        <div className="w-0.5 h-12 bg-pastel-yellow-200 rounded-full my-1" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <Quote className="w-4 h-4 text-pastel-yellow-400" />
                        <input
                          type="text"
                          value={idea.phrase}
                          onChange={(e) => handleUpdateIdea(index, { phrase: e.target.value })}
                          placeholder="Type phrase..."
                          className="flex-1 bg-transparent border-none outline-none text-base font-semibold text-gray-800 placeholder:text-gray-300"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 opacity-60 group-focus-within:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100">
                          <BookOpen className="w-3 h-3 text-gray-400" />
                          <input
                            type="text"
                            value={idea.meaningVi || ''}
                            onChange={(e) => handleUpdateIdea(index, { meaningVi: e.target.value })}
                            placeholder="Meaning (Vi)..."
                            className="flex-1 bg-transparent border-none outline-none text-[10px] font-bold text-gray-500 uppercase tracking-wider"
                          />
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100">
                          <Plus className="w-3 h-3 text-gray-400" />
                          <input
                            type="text"
                            value={idea.exampleEn || ''}
                            onChange={(e) => handleUpdateIdea(index, { exampleEn: e.target.value })}
                            placeholder="Example..."
                            className="flex-1 bg-transparent border-none outline-none text-[10px] font-medium text-gray-500"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveIdea(index)}
                      disabled={ideas.length === 1}
                      className="p-2 text-gray-300 hover:text-red-400 disabled:opacity-0 transition-all rounded-xl hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              onClick={handleAddIdea}
              className="w-full py-4 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-pastel-yellow-300 hover:text-pastel-yellow-500 hover:bg-pastel-yellow-50/30 transition-all font-bold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Next Idea in Chain
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <p className="text-xs text-gray-400 font-medium italic">
            Connecting ideas helps your brain recall speech patterns faster.
          </p>
          <button
            onClick={handleSave}
            disabled={!topic || ideas.some(i => !i.phrase.trim())}
            className="px-8 py-3 bg-pastel-yellow-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-pastel-yellow-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Chain
          </button>
        </div>
      </motion.div>
    </div>
  );
};
