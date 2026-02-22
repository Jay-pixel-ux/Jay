export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: number; // index of options
  explanation: string;
}

export interface QuizResult {
  topic: string;
  grade: '11' | '12';
  score: number;
  totalQuestions: number;
  date: string;
}

export interface QuizState {
  topic: string;
  grade: '11' | '12' | null;
  questions: MCQ[];
  currentQuestionIndex: number;
  score: number;
  isFinished: boolean;
  isLoading: boolean;
  selectedAnswer: number | null;
  isAuthenticated: boolean;
  history: QuizResult[];
}
