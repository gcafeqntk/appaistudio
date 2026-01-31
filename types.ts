
export interface Idea {
  id: number;
  title: string;
  description: string;
  charactersContext: string;
  highlightValue: string;
  viralPotential: string;
}

export interface SkeletonAnalysis {
  wordCount: number;
  content: string;
  style: string;
}

export interface CharacterProfile {
  name: string;
  gender: string;
  country: string;
  age: string;
  bodyType: string;
  facialDetails: string;
}

export interface ActionDetail {
  action: string;
  voiceText: string;
  motionPrompt: string;
}

export interface TagData {
  content: string;
  actions: ActionDetail[];
  isAnalyzing: boolean;
}

export interface AppState {
  opponentScript: string;
  skeleton: SkeletonAnalysis | null;
  ideas: Idea[];
  selectedIdeaIndex: number | null;
  outlines: Record<number, string>;
  finalScripts: Record<number, string>;
  selectedStyle: string;
  characters: CharacterProfile[];
  tags: Record<number, TagData[]>;
  showCharacterSection: boolean;
  loading: {
    analysis: boolean;
    ideas: boolean;
    outline: boolean;
    script: boolean;
    characters: boolean;
  };
  outputLanguage?: string;
}

// Types for Image Script App
export interface ScriptTag {
  id: string;
  content: string;
  analysis?: string;
  sceneCount?: number;
  rows?: string[];
  prompts?: string[];
  videoPrompts?: string[];
}

export interface AnalysisResult {
  breakdown: string;
  count: number;
}

export interface PromptResult {
  prompts: string[];
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  role: UserRole;
  allowedApps?: string[]; // e.g., ['video-viral', 'image-script']
  createdAt: number;
}

// Types for Translation App
export type TargetLanguage = 'CHINESE' | 'JAPANESE' | 'KOREAN';

export interface TranslationConfig {
  batchSize: number;
  delaySeconds: number;
  customPrompt: string;
  removeSourceText: boolean;
  autoFixFormat: boolean;
}

export interface SubtitleItem {
  index: string;
  timecode: string;
  text: string;
}

export interface TranslationState {
  isProcessing: boolean;
  progress: number;
  currentBatch: number;
  totalBatches: number;
  error?: string;
  result?: string;
}



export interface AppConfig {
  appNames: Record<string, string>;
}
