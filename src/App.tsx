/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, BookOpen, BrainCircuit, CheckCircle2, XCircle, ChevronRight, RotateCcw, Loader2, Sparkles, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { MCQ, QuizState } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INITIAL_STATE: QuizState = {
  topic: '',
  grade: null,
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  isFinished: false,
  isLoading: false,
  selectedAnswer: null,
  isAuthenticated: false,
  history: [],
};

type View = 'home' | 'dashboard' | 'subjects' | 'analytics' | 'signin' | 'privacy' | 'terms' | 'contact';

export default function App() {
  const [state, setState] = useState<QuizState>(INITIAL_STATE);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<View>('home');

  const generateMCQs = async (selectedGrade?: '11' | '12') => {
    if (!searchQuery.trim()) return;

    const grade = selectedGrade || state.grade || '11';
    setState(prev => ({ ...prev, isLoading: true, topic: searchQuery, grade }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const prompt = `You are an expert science educator for CBSE Class ${grade}. Generate 20 high-quality multiple-choice questions strictly about the topic: "${searchQuery}" for Class ${grade} level. 
      The questions should be modeled after CBSE Class ${grade} science exam papers (Physics, Chemistry, Biology, Maths).
      
      CRITICAL INSTRUCTIONS:
      1. Ensure these questions are unique and different from any previous sets on this topic. Use a variety of sub-topics and difficulty levels.
      2. Ignore any watermarks, brand names, or headers from the source material.
      3. Focus purely on the scientific concepts relevant to Class ${grade} syllabus.
      4. Each question must have exactly 4 options.
      5. Provide a clear explanation for the correct answer.
      6. Return exactly 20 questions.
      7. Return the data as a JSON array of objects.
      8. Random seed for variety: ${Math.random().toString(36).substring(7)}.

      Schema:
      [
        {
          "question": "The question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0, // index of the correct option
          "explanation": "Why this is correct"
        }
      ]`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Exactly 4 options"
                },
                correctAnswer: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswer", "explanation"]
            }
          }
        },
      });

      const questions = JSON.parse(response.text || '[]');
      setState(prev => ({
        ...prev,
        questions,
        isLoading: false,
        currentQuestionIndex: 0,
        score: 0,
        isFinished: false,
        selectedAnswer: null
      }));
    } catch (error) {
      console.error("Error generating MCQs:", error);
      setState(prev => ({ ...prev, isLoading: false }));
      alert("Failed to generate questions. Please try again.");
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (state.selectedAnswer !== null) return;
    setState(prev => ({ ...prev, selectedAnswer: index }));
  };

  const nextQuestion = () => {
    const isCorrect = state.selectedAnswer === state.questions[state.currentQuestionIndex].correctAnswer;
    const newScore = isCorrect ? state.score + 1 : state.score;
    
    if (state.currentQuestionIndex === state.questions.length - 1) {
      const newResult = {
        topic: state.topic,
        grade: state.grade as '11' | '12',
        score: newScore,
        totalQuestions: state.questions.length,
        date: new Date().toLocaleString(),
      };
      
      setState(prev => ({
        ...prev,
        score: newScore,
        isFinished: true,
        selectedAnswer: null,
        history: [newResult, ...prev.history],
      }));
    } else {
      setState(prev => ({
        ...prev,
        score: newScore,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        selectedAnswer: null
      }));
    }
  };

  const handleSignIn = () => {
    setState(prev => ({ ...prev, isAuthenticated: true }));
    setCurrentView('subjects');
  };

  const resetQuiz = () => {
    setState(prev => ({ ...INITIAL_STATE, history: prev.history, isAuthenticated: prev.isAuthenticated }));
    setSearchQuery('');
  };

  const currentMCQ = state.questions[state.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-[#050505] text-[#E4E3E0] font-sans selection:bg-emerald-500/30">
      {/* Background Grid Effect */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#141414_1px,transparent_1px),linear-gradient(to_bottom,#141414_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <header className="relative z-10 border-b border-[#141414] bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { resetQuiz(); setCurrentView('subjects'); }}>
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <GraduationCap className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-xl tracking-tight">EduQuiz <span className="text-emerald-500">AI</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={cn("transition-colors hover:text-emerald-500", currentView === 'dashboard' ? "text-emerald-500" : "opacity-60")}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setCurrentView('subjects')}
              className={cn("transition-colors hover:text-emerald-500", currentView === 'subjects' ? "text-emerald-500" : "opacity-60")}
            >
              Subjects
            </button>
            <button 
              onClick={() => setCurrentView('analytics')}
              className={cn("transition-colors hover:text-emerald-500", currentView === 'analytics' ? "text-emerald-500" : "opacity-60")}
            >
              Analytics
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentView('signin')}
              className={cn("text-sm font-medium px-4 py-2 rounded-full border border-[#141414] hover:bg-[#141414] transition-colors", currentView === 'signin' && "bg-emerald-500 text-black border-emerald-500")}
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!state.isAuthenticated ? (
            <motion.div key="signin-gate" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-md mx-auto py-12">
              <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-8 md:p-12 shadow-2xl space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <GraduationCap className="w-10 h-10 text-black" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight">EduQuiz AI</h2>
                  <p className="text-[#8E9299]">Please sign in to access the educational content.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8E9299] uppercase tracking-widest">Email Address</label>
                    <input type="email" placeholder="name@example.com" className="w-full bg-[#141414] border border-[#141414] rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8E9299] uppercase tracking-widest">Password</label>
                    <input type="password" placeholder="••••••••" className="w-full bg-[#141414] border border-[#141414] rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors" />
                  </div>
                  <button 
                    onClick={handleSignIn}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl transition-all active:scale-95"
                  >
                    Sign In
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#141414]"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0A0A0A] px-2 text-[#8E9299]">Or continue with</span></div>
                </div>
                <button 
                  onClick={handleSignIn}
                  className="w-full border border-[#141414] hover:bg-[#141414] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </button>
              </div>
            </motion.div>
          ) : (
            <div key="authenticated-content">
              {currentView === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!state.questions.length && !state.isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8 py-20"
            >
              <div className="space-y-4">
                <motion.h1 
                  className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9]"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  MASTER YOUR <br />
                  <span className="text-emerald-500 italic">EXAMS</span> WITH AI
                </motion.h1>
                <p className="text-lg text-[#8E9299] max-w-xl mx-auto">
                  Generate custom practice quizzes from thousands of past year CBSE science papers in seconds.
                </p>
              </div>

              <div className="max-w-2xl mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center bg-[#0A0A0A] border border-[#141414] rounded-2xl p-2 shadow-2xl">
                  <div className="flex-1 flex items-center px-4 gap-3">
                    <Search className="w-5 h-5 text-[#8E9299]" />
                    <input
                      type="text"
                      placeholder="Enter a topic (e.g., Quantum Mechanics, Organic Chemistry...)"
                      className="w-full bg-transparent border-none focus:ring-0 text-lg py-3 outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && generateMCQs()}
                    />
                  </div>
                  <button
                    onClick={() => generateMCQs()}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-4 rounded-xl transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate MCQs
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-8">
                {['Photosynthesis', 'Newton\'s Laws', 'Periodic Table', 'Integration', 'Cell Division'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { setSearchQuery(tag); generateMCQs(); }}
                    className="px-4 py-2 rounded-full border border-[#141414] text-sm hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {state.isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 space-y-6"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                <div className="absolute inset-0 blur-xl bg-emerald-500/20 animate-pulse"></div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold tracking-tight">Analyzing Past Papers...</h3>
                <p className="text-[#8E9299]">Our AI is reading through science archives to craft your quiz.</p>
              </div>
            </motion.div>
          )}

          {state.questions.length > 0 && !state.isFinished && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-wider">
                    Question {state.currentQuestionIndex + 1} of {state.questions.length}
                  </div>
                  <div className="text-sm text-[#8E9299] font-mono">
                    Topic: <span className="text-[#E4E3E0]">{state.topic}</span>
                  </div>
                </div>
                <div className="w-32 h-2 bg-[#141414] rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((state.currentQuestionIndex + 1) / state.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-8 md:p-12 shadow-2xl space-y-8">
                <h2 className="text-2xl md:text-3xl font-medium leading-tight">
                  {currentMCQ.question}
                </h2>

                <div className="grid gap-4">
                  {currentMCQ.options.map((option, idx) => {
                    const isSelected = state.selectedAnswer === idx;
                    const isCorrect = idx === currentMCQ.correctAnswer;
                    const showResult = state.selectedAnswer !== null;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(idx)}
                        disabled={showResult}
                        className={cn(
                          "group relative flex items-center gap-4 p-6 rounded-2xl border transition-all text-left",
                          !showResult && "border-[#141414] hover:border-emerald-500/50 hover:bg-emerald-500/5",
                          showResult && isCorrect && "border-emerald-500 bg-emerald-500/10",
                          showResult && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                          showResult && !isSelected && !isCorrect && "border-[#141414] opacity-40"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
                          !showResult && "border-[#141414] group-hover:border-emerald-500 group-hover:text-emerald-500",
                          showResult && isCorrect && "bg-emerald-500 border-emerald-500 text-black",
                          showResult && isSelected && !isCorrect && "bg-red-500 border-red-500 text-white"
                        )}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="text-lg">{option}</span>
                        
                        {showResult && isCorrect && (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 ml-auto" />
                        )}
                        {showResult && isSelected && !isCorrect && (
                          <XCircle className="w-6 h-6 text-red-500 ml-auto" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {state.selectedAnswer !== null && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-6 border-t border-[#141414] space-y-4"
                    >
                      <div className="bg-[#141414] rounded-2xl p-6">
                        <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4" />
                          Explanation
                        </h4>
                        <p className="text-[#8E9299] leading-relaxed">
                          {currentMCQ.explanation}
                        </p>
                      </div>
                      <button
                        onClick={nextQuestion}
                        className="w-full bg-[#E4E3E0] hover:bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        {state.currentQuestionIndex === state.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {state.isFinished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-12 py-12"
            >
              <div className="space-y-4">
                <div className="inline-block p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                </div>
                <h2 className="text-5xl font-bold tracking-tighter">Quiz Complete!</h2>
                <p className="text-xl text-[#8E9299]">You've mastered the concepts of <span className="text-[#E4E3E0]">{state.topic}</span>.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="bg-[#0A0A0A] border border-[#141414] p-8 rounded-3xl">
                  <div className="text-4xl font-bold text-emerald-500">{state.score}</div>
                  <div className="text-xs text-[#8E9299] uppercase tracking-widest font-bold mt-2">Correct</div>
                </div>
                <div className="bg-[#0A0A0A] border border-[#141414] p-8 rounded-3xl">
                  <div className="text-4xl font-bold text-emerald-500">{Math.round((state.score / state.questions.length) * 100)}%</div>
                  <div className="text-xs text-[#8E9299] uppercase tracking-widest font-bold mt-2">Accuracy</div>
                </div>
                <div className="bg-[#0A0A0A] border border-[#141414] p-8 rounded-3xl col-span-2 md:col-span-1">
                  <div className="text-4xl font-bold text-emerald-500">{state.questions.length}</div>
                  <div className="text-xs text-[#8E9299] uppercase tracking-widest font-bold mt-2">Questions</div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <button
                  onClick={resetQuiz}
                  className="px-8 py-4 rounded-2xl bg-emerald-500 text-black font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-95"
                >
                  <RotateCcw className="w-5 h-5" />
                  Try Another Topic
                </button>
                <button
                  className="px-8 py-4 rounded-2xl border border-[#141414] hover:bg-[#141414] font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <BookOpen className="w-5 h-5" />
                  Review Answers
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {currentView === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-12">
              <div className="space-y-2">
                <h2 className="text-4xl font-bold tracking-tight">Student Dashboard</h2>
                <p className="text-[#8E9299]">Track your progress and recent activity.</p>
              </div>
              
              {state.history.length === 0 ? (
                <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-[#141414] rounded-2xl flex items-center justify-center mx-auto">
                    <BookOpen className="w-8 h-8 text-[#8E9299]" />
                  </div>
                  <h3 className="text-xl font-bold">No activity yet</h3>
                  <p className="text-[#8E9299] max-w-xs mx-auto">Complete your first quiz to see your progress and stats here.</p>
                  <button onClick={() => setCurrentView('subjects')} className="text-emerald-500 font-bold hover:underline">Start a quiz now</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: 'Total Quizzes', value: state.history.length.toString(), icon: BrainCircuit },
                      { label: 'Avg. Score', value: `${Math.round(state.history.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / state.history.length * 100)}%`, icon: Sparkles },
                      { label: 'Total Questions', value: state.history.reduce((acc, curr) => acc + curr.totalQuestions, 0).toString(), icon: GraduationCap },
                    ].map((stat, i) => (
                      <div key={i} className="bg-[#0A0A0A] border border-[#141414] p-6 rounded-3xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                          <stat.icon className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <div className="text-xs text-[#8E9299] uppercase tracking-widest font-bold">{stat.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-[#141414] flex justify-between items-center">
                      <h3 className="font-bold">Recent Quizzes</h3>
                      <button className="text-xs text-emerald-500 font-bold uppercase tracking-widest">View All</button>
                    </div>
                    <div className="divide-y divide-[#141414]">
                      {state.history.slice(0, 5).map((quiz, i) => (
                        <div key={i} className="p-6 flex items-center justify-between hover:bg-[#141414]/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#141414] flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-[#8E9299]" />
                            </div>
                            <div>
                              <div className="font-medium">{quiz.topic} (Class {quiz.grade})</div>
                              <div className="text-xs text-[#8E9299]">{quiz.date}</div>
                            </div>
                          </div>
                          <div className="text-emerald-500 font-bold">{quiz.score}/{quiz.totalQuestions}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {currentView === 'subjects' && (
            <motion.div key="subjects" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16">
              <div className="space-y-2">
                <h2 className="text-4xl font-bold tracking-tight">Subjects & Topics</h2>
                <p className="text-[#8E9299]">Select a grade and subject to start practicing.</p>
              </div>

              {/* Class 11 Section */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-[#141414]" />
                  <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-[0.2em]">Class 11 Syllabus</h3>
                  <div className="h-px flex-1 bg-[#141414]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['Physics', 'Chemistry', 'Biology', 'Mathematics'].map((subject) => (
                    <div key={`11-${subject}`} className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-8 hover:border-emerald-500/30 transition-all group">
                      <h3 className="text-2xl font-bold mb-2">Class 11 {subject}</h3>
                      <p className="text-sm text-[#8E9299] mb-6">Master Class 11 {subject} concepts with AI-generated practice sets.</p>
                      <button 
                        onClick={() => { setSearchQuery(`${subject} Class 11`); generateMCQs('11'); setCurrentView('home'); }}
                        className="w-full py-3 rounded-xl bg-[#141414] hover:bg-emerald-500 hover:text-black font-bold transition-all"
                      >
                        Start Practice
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Class 12 Section */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-[#141414]" />
                  <h3 className="text-sm font-bold text-cyan-500 uppercase tracking-[0.2em]">Class 12 Syllabus</h3>
                  <div className="h-px flex-1 bg-[#141414]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['Physics', 'Chemistry', 'Biology', 'Mathematics'].map((subject) => (
                    <div key={`12-${subject}`} className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-8 hover:border-cyan-500/30 transition-all group">
                      <h3 className="text-2xl font-bold mb-2">Class 12 {subject}</h3>
                      <p className="text-sm text-[#8E9299] mb-6">Comprehensive Class 12 {subject} preparation for board exams.</p>
                      <button 
                        onClick={() => { setSearchQuery(`${subject} Class 12`); generateMCQs('12'); setCurrentView('home'); }}
                        className="w-full py-3 rounded-xl bg-[#141414] hover:bg-cyan-500 hover:text-black font-bold transition-all"
                      >
                        Start Practice
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-12">
              <div className="space-y-2">
                <h2 className="text-4xl font-bold tracking-tight">Learning Analytics</h2>
                <p className="text-[#8E9299]">Deep dive into your strengths and weaknesses.</p>
              </div>
              
              {state.history.length === 0 ? (
                <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-12 text-center space-y-4">
                  <BrainCircuit className="w-16 h-16 text-[#141414] mx-auto" />
                  <h3 className="text-xl font-bold">No data to analyze</h3>
                  <p className="text-[#8E9299] max-w-xs mx-auto">Your performance metrics will appear here after you complete a few quizzes.</p>
                </div>
              ) : (
                <>
                  <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-8 aspect-video flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)]" />
                    <div className="text-center space-y-4 relative z-10">
                      <BrainCircuit className="w-16 h-16 text-emerald-500 mx-auto animate-pulse" />
                      <h3 className="text-xl font-bold">Performance Visualization</h3>
                      <p className="text-sm text-[#8E9299] max-w-xs">Detailed charts and topic-wise breakdown based on your {state.history.length} completed quizzes.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-6">
                      <h4 className="font-bold mb-4">Topic Mastery</h4>
                      <div className="space-y-4">
                        {state.history.slice(0, 3).map(quiz => (
                          <div key={quiz.topic} className="flex items-center gap-4">
                            <div className="flex-1 h-2 bg-[#141414] rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${(quiz.score / quiz.totalQuestions) * 100}%` }} />
                            </div>
                            <span className="text-sm font-medium w-24 truncate">{quiz.topic}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-6">
                      <h4 className="font-bold mb-4">Recent Performance</h4>
                      <div className="space-y-4">
                        {state.history.slice(0, 3).map((quiz, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm text-[#8E9299]">{quiz.date.split(',')[0]}</span>
                            <span className="text-sm font-bold text-emerald-500">{Math.round((quiz.score / quiz.totalQuestions) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {currentView === 'signin' && (
            <motion.div key="signin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-md mx-auto py-12">
              <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-8 md:p-12 shadow-2xl space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <GraduationCap className="w-10 h-10 text-black" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight">Welcome Back</h2>
                  <p className="text-[#8E9299]">Sign in to sync your progress across devices.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8E9299] uppercase tracking-widest">Email Address</label>
                    <input type="email" placeholder="name@example.com" className="w-full bg-[#141414] border border-[#141414] rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8E9299] uppercase tracking-widest">Password</label>
                    <input type="password" placeholder="••••••••" className="w-full bg-[#141414] border border-[#141414] rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors" />
                  </div>
                  <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl transition-all active:scale-95">
                    Sign In
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#141414]"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0A0A0A] px-2 text-[#8E9299]">Or continue with</span></div>
                </div>
                <button className="w-full border border-[#141414] hover:bg-[#141414] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </button>
              </div>
            </motion.div>
          )}
          {currentView === 'privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 py-12">
              <h2 className="text-4xl font-bold tracking-tight">Privacy Policy</h2>
              <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-8 space-y-6 text-[#8E9299] leading-relaxed">
                <p>At EduQuiz AI, we take your privacy seriously. This policy outlines how we handle your data.</p>
                <h3 className="text-xl font-bold text-[#E4E3E0]">1. Data Collection</h3>
                <p>We collect minimal data required to provide our educational services, including your email address and quiz performance metrics.</p>
                <h3 className="text-xl font-bold text-[#E4E3E0]">2. AI Processing</h3>
                <p>Our AI models process educational topics to generate questions. No personal data is used to train these models.</p>
                <h3 className="text-xl font-bold text-[#E4E3E0]">3. Security</h3>
                <p>We implement industry-standard security measures to protect your information from unauthorized access.</p>
              </div>
              <button onClick={() => setCurrentView('home')} className="text-emerald-500 font-bold flex items-center gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Home
              </button>
            </motion.div>
          )}

          {currentView === 'terms' && (
            <motion.div key="terms" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 py-12">
              <h2 className="text-4xl font-bold tracking-tight">Terms of Service</h2>
              <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-8 space-y-6 text-[#8E9299] leading-relaxed">
                <p>By using EduQuiz AI, you agree to the following terms.</p>
                <h3 className="text-xl font-bold text-[#E4E3E0]">1. Usage Rights</h3>
                <p>The generated content is for personal educational use only. Commercial redistribution is prohibited.</p>
                <h3 className="text-xl font-bold text-[#E4E3E0]">2. Accuracy</h3>
                <p>While our AI strives for accuracy, users should verify critical information with official textbooks.</p>
                <h3 className="text-xl font-bold text-[#E4E3E0]">3. Account Responsibility</h3>
                <p>Users are responsible for maintaining the confidentiality of their account credentials.</p>
              </div>
              <button onClick={() => setCurrentView('home')} className="text-emerald-500 font-bold flex items-center gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Home
              </button>
            </motion.div>
          )}

          {currentView === 'contact' && (
            <motion.div key="contact" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 py-12">
              <h2 className="text-4xl font-bold tracking-tight">Contact Support</h2>
              <div className="bg-[#0A0A0A] border border-[#141414] rounded-3xl p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-[#E4E3E0]">Get in Touch</h3>
                    <p className="text-[#8E9299]">Have questions or feedback? We'd love to hear from you.</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-emerald-500">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>jam0109.p@gmail.com</span>
                      </div>
                      <div className="flex items-center gap-3 text-emerald-500">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Available 24/7 for premium users</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#8E9299] uppercase tracking-widest">Message</label>
                      <textarea placeholder="How can we help?" className="w-full bg-[#141414] border border-[#141414] rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors h-32" />
                    </div>
                    <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl transition-all">
                      Send Message
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => setCurrentView('subjects')} className="text-emerald-500 font-bold flex items-center gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Home
              </button>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  </main>

      <footer className="relative z-10 border-t border-[#141414] py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-40">
            <GraduationCap className="w-6 h-6" />
            <span className="font-bold text-lg tracking-tight">EduQuiz AI</span>
          </div>
          <div className="flex gap-8 text-sm text-[#8E9299]">
            <button onClick={() => setCurrentView('privacy')} className="hover:text-emerald-500 transition-colors">Privacy Policy</button>
            <button onClick={() => setCurrentView('terms')} className="hover:text-emerald-500 transition-colors">Terms of Service</button>
            <button onClick={() => setCurrentView('contact')} className="hover:text-emerald-500 transition-colors">Contact Support</button>
          </div>
          <div className="text-xs text-[#8E9299] font-mono">
            POWERED BY ADVANCED AI
          </div>
        </div>
      </footer>
    </div>
  );
}
