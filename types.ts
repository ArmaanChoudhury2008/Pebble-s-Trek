export interface QuestionData {
  topic: string;
  statements: string[];
  lieIndex: number;
  explanation: string;
}

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  LOADING = 'LOADING',
  SUMMARY = 'SUMMARY',
  GAME_OVER = 'GAME_OVER',
}

export interface GameStats {
  correct: number;
  total: number;
  streak: number;
  bestStreak: number;
}