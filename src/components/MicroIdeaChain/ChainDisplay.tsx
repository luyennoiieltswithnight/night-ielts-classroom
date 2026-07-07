import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Trash2, Edit2, Volume2, Info } from 'lucide-react';
import { MicroIdeaChain } from '../../types';

interface ChainDisplayProps {
  chains: MicroIdeaChain[];
  onDelete: (id: string) => void;
  onEdit: (chain: MicroIdeaChain) => void;
  onPlayAudio: (text: string) => void;
}

export const ChainDisplay: React.FC<ChainDisplayProps> = ({ chains, onDelete, onEdit, onPlayAudio }) => {
  if (chains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Info className="w-10 h-10 text-gray-200" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">No Idea Chains Yet</h3>
        <p className="text-gray-500 font-medium max-w-xs">
          Start connecting spoken phrases to build your first speaking map.
        </p>
      </div>
    );
  }

  // Group chains by topic
  const groupedChains = chains.reduce((acc, chain) => {
    if (!acc[chain.topic]) acc[chain.topic] = [];
    acc[chain.topic].push(chain);
    return acc;
  }, {} as Record<string, MicroIdeaChain[]>);

  return (
    <div className="space-y-12">
      {Object.entries(groupedChains).map(([topic, topicChains]) => (
        <div key={topic} className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black text-white bg-pastel-yellow-500 px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg shadow-pastel-yellow-100">
              {topic}
            </h2>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
              {topicChains.length} {topicChains.length === 1 ? 'Chain' : 'Chains'}
            </span>
          </div>

          <div className="grid gap-8">
            {topicChains.map((chain) => (
              <motion.div
                key={chain.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100 border border-gray-100 relative group overflow-hidden"
              >
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-pastel-yellow-50/50 rounded-bl-[5rem] -mr-8 -mt-8 -z-10 group-hover:scale-110 transition-transform duration-500" />

                <div className="flex items-start justify-between mb-8">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">
                      {chain.title || `Chain for ${topic}`}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Spoken Flow • Created {new Date(chain.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(chain)}
                      className="p-3 bg-gray-50 text-gray-400 hover:text-pastel-yellow-600 hover:bg-pastel-yellow-50 rounded-2xl transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDelete(chain.id)}
                      className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {chain.ideas.map((idea, idx) => (
                    <React.Fragment key={idea.id}>
                      <motion.div
                        className="group/item relative"
                        whileHover={{ y: -5 }}
                      >
                        <div className="bg-white border-2 border-gray-50 p-5 rounded-[2rem] shadow-lg shadow-gray-50 max-w-[240px] transition-all hover:border-pastel-yellow-200 hover:shadow-xl hover:shadow-pastel-yellow-50">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <span className="text-[10px] font-black text-pastel-yellow-500 bg-pastel-yellow-50 px-2 py-0.5 rounded-full uppercase italic">
                              Step {idx + 1}
                            </span>
                            <button
                              onClick={() => onPlayAudio(idea.phrase)}
                              className="p-1.5 bg-gray-50 text-gray-400 hover:text-pastel-yellow-600 rounded-lg transition-colors"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <p className="text-sm font-bold text-gray-800 leading-relaxed mb-2">
                            {idea.phrase}
                          </p>
                          
                          {idea.meaningVi && (
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 line-clamp-1 italic">
                              {idea.meaningVi}
                            </p>
                          )}
                          
                          {idea.exampleEn && (
                            <p className="text-[10px] font-medium text-gray-500 border-t border-gray-50 pt-2 line-clamp-2 italic">
                              "{idea.exampleEn}"
                            </p>
                          )}
                        </div>
                      </motion.div>

                      {idx < chain.ideas.length - 1 && (
                        <div className="p-2 flex items-center justify-center">
                          <ArrowRight className="w-5 h-5 text-pastel-yellow-300 animate-pulse" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
