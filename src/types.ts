export type Difficulty = 'easy' | 'medium' | 'hard' | 'forgotten';

export interface VocabularyItem {
  id: string;
  english: string;
  vietnamese: string;
  ipa: string;
  partOfSpeech: string;
  simpleEnglishMeaning: string;
  usageContext: string;
  examples: string[];
  topicId: string;
  learnedStatus: 'new' | 'learning' | 'mastered';
  nextReviewDate: string; // ISO string
  interval: number; // days
  easeFactor: number;
  repetitionCount: number;
  lastReviewedAt?: string;
  seenCount?: number;
  status?: 'known' | 'unknown';
  createdAt: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  folderId?: string;
  wordCount: number;
  learnedCount: number;
  createdAt: string;
  status: 'active' | 'completed';
  isOwner?: boolean;
  sharedBy?: string;
  sharedWithUids?: string[];
  authorizedEmails?: string[];
  isPublic?: boolean;
  vocabulary?: VocabularyItem[];
}

export interface TopicFolder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
  sharedBy?: string;
  authorizedEmails?: string[];
}

export interface UserStats {
  totalWords: number;
  wordsLearnedToday: number;
  wordsReviewedToday: number;
  totalTopics: number;
  streak: number;
  masteredCount: number;
}

export interface ExtractionResult {
  vocabulary: Partial<VocabularyItem>[];
  suggestedTopic: string;
}

export interface HighlightedChunk {
  text: string;
  type: 'subject' | 'new_info' | 'additional_idea' | 'connector' | 'advanced_vocab' | 'normal';
  meaning?: string;
  colorId?: string;
  label?: string; // e.g. "Main Subject", "New Information"
}

export interface IdeaRelationship {
  fromIndex: number;
  toIndex: number;
  type: 'repetition' | 'cause_effect' | 'example' | 'support' | 'contrast' | 'addition';
  label?: string;
}

export interface LogicStep {
  id: string;
  label: string; // e.g. "Main Idea", "Cause", "Problem", "Action", "Result"
  content: string;
  meaningVi?: string; // Vietnamese explanation for tooltip
  type: 'main' | 'cause' | 'problem' | 'response' | 'action' | 'result';
  connections?: string[]; // IDs of next steps
}

export interface GapFillExercise {
  text: string; // The text with blanks like [blank1], [blank2]
  blanks: {
    id: string;
    answer: string;
    hint?: string;
    hintVi?: string;
  }[];
}

export interface ListeningModeResult {
  topic: string;
  explanationEn: string;
  explanationVi: string;
  logicMap: LogicStep[];
  vocabulary: {
    word: string;
    meaning: string;
  }[];
  gapFill: GapFillExercise;
}

export interface ReadingModeResult {
  chunks: HighlightedChunk[];
  relationships: IdeaRelationship[];
  logicMap: LogicStep[];
  explanationEn: string;
  explanationVi: string;
}

export interface AnnotatedChunk {
  text: string;
  isHighlighted: boolean;
  meaning?: string;
  ipa?: string;
}

export interface SpeakingCriterion {
  score: number;
  feedback: string;
}

export interface SpeakingRefinementResult {
  originalAnswer?: string;
  overallBand?: number;
  criteria?: {
    fluency: SpeakingCriterion;
    lexical: SpeakingCriterion;
    grammar: SpeakingCriterion;
    pronunciation: SpeakingCriterion;
  };
  generalFeedback?: string;
  refinedAnswer?: string;
  annotatedRefinedAnswer?: AnnotatedChunk[];
  usefulPhrases?: {
    phrase: string;
    meaning: string;
  }[];
}

export interface WorkflowStep {
  id: string;
  label: string;
  meaningVi: string;
}

export interface MicroIdea {
  id: string;
  phrase: string;
  meaningVi?: string;
  exampleEn?: string;
}

export interface MicroIdeaChain {
  id: string;
  topic: string;
  title?: string;
  ideas: MicroIdea[];
  createdAt: string;
  updatedAt: string;
}

export interface SpeakingSuggestionResult {
  workflow: WorkflowStep[];
  vocabulary: {
    phrase: string;
    meaning: string;
  }[];
  sampleAnswer: string;
  annotatedSampleAnswer?: AnnotatedChunk[];
}
