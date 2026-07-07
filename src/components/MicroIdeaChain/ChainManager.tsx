import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Plus, Zap, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { ChainDisplay } from './ChainDisplay';
import { ChainModal } from './ChainModal';
import { MicroIdeaChain } from '../../types';

interface ChainManagerProps {
  chains: MicroIdeaChain[];
  onBack: () => void;
  onSave: (chain: Omit<MicroIdeaChain, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, chain: Partial<MicroIdeaChain>) => void;
  onDelete: (id: string) => void;
  onPlayAudio: (text: string) => void;
}

export const ChainManager: React.FC<ChainManagerProps> = ({ 
  chains, 
  onBack, 
  onSave, 
  onUpdate, 
  onDelete, 
  onPlayAudio 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChain, setEditingChain] = useState<MicroIdeaChain | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const handleEdit = (chain: MicroIdeaChain) => {
    setEditingChain(chain);
    setIsModalOpen(true);
  };

  const handleSaveWrapper = (data: Omit<MicroIdeaChain, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingChain) {
      onUpdate(editingChain.id, data);
    } else {
      onSave(data);
    }
  };

  const filteredChains = chains.filter(c => 
    c.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.ideas.some(i => i.phrase.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="group -ml-4 text-gray-400 hover:text-pastel-yellow-600 hover:bg-pastel-yellow-50"
          >
            <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-pastel-yellow-500 rounded-3xl flex items-center justify-center shadow-xl shadow-pastel-yellow-100 rotate-3">
              <Zap className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Micro Idea Chains</h1>
              <p className="text-gray-500 font-bold tracking-tight">Connect phrases, speak better, remember faster.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
            <input
              type="text"
              placeholder="Search chains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-4 bg-white border-2 border-gray-50 rounded-[1.5rem] shadow-sm focus:border-pastel-yellow-200 outline-none transition-all w-64 font-bold text-sm"
            />
          </div>
          <Button 
            onClick={() => {
              setEditingChain(undefined);
              setIsModalOpen(true);
            }} 
            className="bg-pastel-yellow-500 hover:bg-pastel-yellow-600 text-white border-none h-[56px] px-8 rounded-2xl shadow-xl shadow-pastel-yellow-100 gap-2"
          >
            <Plus className="w-6 h-6" />
            Create New Chain
          </Button>
        </div>
      </div>

      {/* Main Display */}
      <ChainDisplay 
        chains={filteredChains} 
        onDelete={onDelete} 
        onEdit={handleEdit}
        onPlayAudio={onPlayAudio}
      />

      {/* Quick Tips */}
      {chains.length > 0 && (
        <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2">
            <h4 className="text-xl font-black italic tracking-tight">Daily Speaking Tip</h4>
            <p className="text-gray-400 font-medium max-w-xl">
              Don't just memorize separate words. Use these chains to practice moving from one idea to the next without pausing. Try to say a whole chain in one breath!
            </p>
          </div>
          <div className="flex -space-x-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-12 h-12 rounded-full border-4 border-gray-900 bg-pastel-yellow-500 flex items-center justify-center font-black text-xs">
                {i}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Integration */}
      <AnimatePresence>
        {isModalOpen && (
          <ChainModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveWrapper}
            initialChain={editingChain}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
