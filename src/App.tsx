import { useState } from 'react';
import { BookOpen, HelpCircle, ChevronRight, ChevronDown, Menu, X, Sparkles, Loader2, CheckCircle2, Download, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notesData, questionsData as initialQuestionsData, mcqsData as initialMcqsData } from './data';
import { GoogleGenAI, Type } from '@google/genai';

function MCQCard({ mcq, showAnswer }: { mcq: any; key?: any; showAnswer?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const isCorrect = selected === mcq.correctAnswer;
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <div className="mb-5">
        <p className="font-extrabold text-slate-900 text-2xl leading-relaxed">{mcq.question}</p>
        {mcq.questionOdia && <p className="font-bold text-indigo-900 text-xl leading-relaxed mt-2">{mcq.questionOdia}</p>}
      </div>
      <div className="space-y-3">
        {mcq.options.map((opt: string, index: number) => {
          let btnClass = "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800";
          
          if (showAnswer && opt === mcq.correctAnswer) {
             btnClass = "bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold ring-2 ring-emerald-500 ring-offset-1";
          } else if (selected) {
            if (opt === mcq.correctAnswer) {
              btnClass = "bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold";
            } else if (selected === opt) {
              btnClass = "bg-red-50 border-red-500 text-red-900 font-extrabold";
            } else {
              btnClass = "bg-slate-50 border-slate-200 text-slate-400 opacity-50 font-bold";
            }
          } else {
             btnClass += " font-bold";
          }
          
          const optOdia = mcq.optionsOdia ? mcq.optionsOdia[index] : null;
          
          return (
            <button 
              key={opt}
              disabled={selected !== null || showAnswer}
              onClick={() => setSelected(opt)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all text-xl ${btnClass}`}
            >
              <div>{opt}</div>
              {optOdia && <div className="text-lg mt-1 opacity-90">{optOdia}</div>}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {(selected || showAnswer) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`mt-5 p-5 rounded-xl overflow-hidden ${(isCorrect || showAnswer) ? 'bg-emerald-50 text-emerald-900 border-2 border-emerald-200' : 'bg-red-50 text-red-900 border-2 border-red-200'}`}
          >
            {!showAnswer && <p className="font-extrabold mb-2 text-xl">{isCorrect ? '✅ Correct!' : '❌ Incorrect!'}</p>}
            {(!isCorrect && !showAnswer) && <p className="text-lg font-extrabold mb-3">Correct Answer: {mcq.correctAnswer}</p>}
            <div className="text-lg mt-2 pt-3 border-t-2 border-current/20">
              <p><span className="font-extrabold">Explanation:</span> <span className="font-bold">{mcq.explanation}</span></p>
              {mcq.explanationOdia && <p className="mt-2 font-bold text-indigo-900">{mcq.explanationOdia}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const SUBJECTS = [
  { id: 'Language-I', title: 'Language-I (Odia/Urdu/Hindi/Telugu/Bengali)' },
  { id: 'Language-II', title: 'Language-II (English)' },
  { id: 'Social Studies', title: 'Social Studies' },
  { id: 'Mathematics', title: 'Mathematics (Science Stream)' },
  { id: 'General', title: 'General Information' }
];

export default function App() {
  const [activeSubject, setActiveSubject] = useState(SUBJECTS[0].id);
  const [activeTab, setActiveTab] = useState<'notes' | 'mcqs'>('notes');
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const [questions, setQuestions] = useState(initialQuestionsData);
  const [generatingSubject, setGeneratingSubject] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mcqs, setMcqs] = useState(initialMcqsData);
  const [generatingMCQs, setGeneratingMCQs] = useState(false);
  const [errorMCQ, setErrorMCQ] = useState<string | null>(null);
  const [showAllAnswers, setShowAllAnswers] = useState(false);

  const toggleAnswer = (id: number) => {
    const newSet = new Set(revealedAnswers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setRevealedAnswers(newSet);
  };

  const handleGenerate = async (subjectId: string, subjectTitle: string) => {
    setGeneratingSubject(subjectId);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Generate exactly 20 short questions and answers for the subject '${subjectTitle}' based on the upper primary teacher eligibility syllabus. The questions should cover both pedagogy and content. Also provide accurate Odia translations for the question and the answer. Ensure translations are clean and neat without distortion.`,
        config: {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "The short question in English" },
                questionOdia: { type: Type.STRING, description: "Accurate Odia translation of the question" },
                answer: { type: Type.STRING, description: "The answer to the question in English" },
                answerOdia: { type: Type.STRING, description: "Accurate Odia translation of the answer" }
              },
              required: ["question", "questionOdia", "answer", "answerOdia"]
            }
          }
        }
      });

      const jsonStr = response.text;
      if (jsonStr) {
        const newQs = JSON.parse(jsonStr);
        const formattedQs = newQs.map((q: any, index: number) => ({
          id: Date.now() + index,
          subject: subjectId,
          question: q.question,
          questionOdia: q.questionOdia,
          answer: q.answer,
          answerOdia: q.answerOdia
        }));
        
        setQuestions(prev => {
          const filtered = prev.filter(q => q.subject !== subjectId);
          return [...filtered, ...formattedQs];
        });
      }
    } catch (err: any) {
      console.error("Failed to generate questions:", err);
      setError(`Failed to generate questions for ${subjectTitle}: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setGeneratingSubject(null);
    }
  };

  const handleGenerateMCQs = async () => {
    const subjectTitle = SUBJECTS.find(s => s.id === activeSubject)?.title || activeSubject;
    setGeneratingMCQs(true);
    setErrorMCQ(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Generate exactly 40 multiple choice questions for the subject '${subjectTitle}' based on the upper primary teacher eligibility syllabus. Each question must have exactly 4 options, a correct answer, and a brief explanation. Also provide accurate Odia translations for the question, options, and explanation. Ensure translations are clean and neat without distortion.`,
        config: {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                questionOdia: { type: Type.STRING, description: "Accurate Odia translation of the question" },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Exactly 4 options in English"
                },
                optionsOdia: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Exactly 4 options translated to Odia, corresponding to the English options"
                },
                correctAnswer: { type: Type.STRING, description: "Must exactly match one of the English options" },
                explanation: { type: Type.STRING },
                explanationOdia: { type: Type.STRING, description: "Accurate Odia translation of the explanation" }
              },
              required: ["question", "questionOdia", "options", "optionsOdia", "correctAnswer", "explanation", "explanationOdia"]
            }
          }
        }
      });

      const jsonStr = response.text;
      if (jsonStr) {
        const newQs = JSON.parse(jsonStr);
        const formattedQs = newQs.map((q: any, index: number) => ({
          id: Date.now() + index,
          subject: activeSubject,
          question: q.question,
          questionOdia: q.questionOdia,
          options: q.options,
          optionsOdia: q.optionsOdia,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          explanationOdia: q.explanationOdia
        }));
        
        setMcqs(prev => {
          const filtered = prev.filter(q => q.subject !== activeSubject);
          return [...formattedQs, ...filtered];
        });
      }
    } catch (err: any) {
      console.error("Failed to generate MCQs:", err);
      setErrorMCQ(`Failed to generate MCQs for ${subjectTitle}: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setGeneratingMCQs(false);
    }
  };

  const exportToHTML = () => {
    if (mcqs.length === 0) {
      alert("No MCQs to export.");
      return;
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>All Subjects - MCQs</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 20px; color: #333; font-size: 14pt; }
          h1 { color: #4f46e5; text-align: center; margin-bottom: 40px; font-size: 24pt; font-weight: 900; }
          h2 { color: #1e293b; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; margin-top: 50px; font-size: 20pt; font-weight: 900; }
          .mcq-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
          .question { font-weight: 900; font-size: 18pt; margin-bottom: 15px; color: #0f172a; }
          .question-odia { font-weight: bold; font-size: 16pt; color: #4338ca; margin-top: 5px; }
          .options { list-style-type: none; padding: 0; }
          .option { padding: 12px; margin-bottom: 8px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f8fafc; font-size: 16pt; font-weight: bold; color: #1e293b; }
          .option-odia { font-size: 14pt; color: #4338ca; margin-top: 4px; }
          .correct-answer { background-color: #dcfce7; border-color: #22c55e; color: #166534; font-weight: 900; }
          .explanation { margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1; font-size: 14pt; color: #475569; font-weight: bold; }
          .explanation-odia { color: #4338ca; margin-top: 5px; }
        </style>
      </head>
      <body>
        <h1>Comprehensive MCQ Study Guide</h1>
    `;

    SUBJECTS.forEach(subject => {
      const subjectMcqs = mcqs.filter(m => m.subject === subject.id);
      if (subjectMcqs.length > 0) {
        htmlContent += `<h2>${subject.title}</h2>`;
        subjectMcqs.forEach((mcq, index) => {
          htmlContent += `
            <div class="mcq-card">
              <div class="question">
                ${index + 1}. ${mcq.question}
                ${mcq.questionOdia ? `<div class="question-odia">${mcq.questionOdia}</div>` : ''}
              </div>
              <ul class="options">
                ${mcq.options.map((opt: string, i: number) => `
                  <li class="option ${opt === mcq.correctAnswer ? 'correct-answer' : ''}">
                    <div>${opt} ${opt === mcq.correctAnswer ? '✓' : ''}</div>
                    ${mcq.optionsOdia && mcq.optionsOdia[i] ? `<div class="option-odia">${mcq.optionsOdia[i]}</div>` : ''}
                  </li>
                `).join('')}
              </ul>
              <div class="explanation">
                <strong>Explanation:</strong> ${mcq.explanation}
                ${mcq.explanationOdia ? `<div class="explanation-odia">${mcq.explanationOdia}</div>` : ''}
              </div>
            </div>
          `;
        });
      }
    });

    htmlContent += `
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `All_Subjects_MCQs.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeNotes = notesData.find(n => n.subject.includes(activeSubject));

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg text-slate-800">Syllabus Prep</h1>
        </div>
        <button 
          onClick={() => setIsMobileSidebarOpen(true)} 
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden" 
            onClick={() => setIsMobileSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 sm:w-96 bg-white border-r border-slate-200 flex flex-col h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="hidden md:flex p-5 border-b border-slate-200 bg-white items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-xl text-slate-800 tracking-tight">Syllabus Prep</h1>
        </div>

        {/* Mobile Sidebar Close Button */}
        <div className="md:hidden p-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <span className="font-bold text-slate-800">Menu</span>
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Subjects & Questions</h2>
          {SUBJECTS.map(subject => {
            const isActive = activeSubject === subject.id;
            const subjectQuestions = questions.filter(q => q.subject === subject.id);
            
            return (
              <div key={subject.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setActiveSubject(subject.id)}
                  className={`w-full text-left px-4 py-3.5 flex items-center justify-between transition-colors ${
                    isActive ? 'bg-indigo-50/50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{subject.id}</span>
                  {isActive ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-slate-50/80 border-t border-slate-100"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Short Questions
                          </h4>
                          <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                            {subjectQuestions.length}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerate(subject.id, subject.title);
                          }}
                          disabled={generatingSubject === subject.id}
                          className="w-full mb-3 py-2 px-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingSubject === subject.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating 20 Qs...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Generate 20 Questions (AI)
                            </>
                          )}
                        </button>

                        {error && activeSubject === subject.id && (
                          <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                            {error}
                          </div>
                        )}
                        
                        {subjectQuestions.length > 0 ? subjectQuestions.map(q => (
                          <div key={q.id} className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200/60">
                            <p className="text-sm font-bold text-slate-800 mb-1 leading-snug">{q.question}</p>
                            {q.questionOdia && <p className="text-xs font-semibold text-indigo-700 mb-3 leading-snug">{q.questionOdia}</p>}
                            <AnimatePresence mode="wait">
                              {revealedAnswers.has(q.id) ? (
                                <motion.div
                                  key="answer"
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="text-sm text-emerald-800 bg-emerald-50 p-2.5 rounded-md border border-emerald-100"
                                >
                                  <span className="font-bold block text-xs mb-1 text-emerald-600 uppercase tracking-wider">Answer</span>
                                  <p className="font-semibold">{q.answer}</p>
                                  {q.answerOdia && <p className="text-xs font-medium text-indigo-800 mt-1">{q.answerOdia}</p>}
                                </motion.div>
                              ) : (
                                <motion.button
                                  key="button"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onClick={() => toggleAnswer(q.id)}
                                  className="w-full py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <HelpCircle className="w-3.5 h-3.5" /> Show Answer
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </div>
                        )) : (
                          <p className="text-sm text-slate-500 px-1 italic">No questions available.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-10">
        <div className="max-w-3xl mx-auto pb-12">
          
          {/* Tabs */}
          <div className="flex space-x-2 mb-6 bg-slate-200/50 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'notes' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Study Notes
            </button>
            <button
              onClick={() => setActiveTab('mcqs')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'mcqs' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MCQ Practice
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeSubject}-${activeTab}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'notes' ? (
                activeNotes ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-indigo-600 px-6 py-8 sm:px-8 sm:py-10 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                      <h2 className="text-2xl sm:text-3xl font-bold relative z-10">{activeNotes.subject}</h2>
                      <p className="text-indigo-100 mt-2 text-sm sm:text-base relative z-10">Study Notes & Syllabus Breakdown</p>
                    </div>
                    
                    <div className="p-6 sm:p-8 space-y-8">
                      {activeNotes.sections.map((section, idx) => (
                        <div key={idx}>
                          <h3 className="text-lg sm:text-xl font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
                            {section.title}
                          </h3>
                          <ul className="space-y-3 sm:space-y-4">
                            {section.points.map((point, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-3 text-slate-600 leading-relaxed text-sm sm:text-base">
                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <BookOpen className="w-8 h-8 text-slate-300" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">No Study Notes Available</h2>
                    <p className="text-slate-500 max-w-md">
                      There are no detailed study notes for <span className="font-medium text-slate-700">{SUBJECTS.find(s => s.id === activeSubject)?.title}</span>. 
                      Please refer to the short questions in the sidebar.
                    </p>
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-200 gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Multiple Choice Questions</h2>
                      <p className="text-sm text-slate-500 mt-1">Test your knowledge on {SUBJECTS.find(s => s.id === activeSubject)?.title}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowAllAnswers(!showAllAnswers)}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                      >
                        {showAllAnswers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showAllAnswers ? 'Hide Answers' : 'Show Answers'}
                      </button>
                      <button
                        onClick={exportToHTML}
                        className="py-2.5 px-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                      >
                        <Download className="w-4 h-4" />
                        Export HTML
                      </button>
                      <button
                        onClick={handleGenerateMCQs}
                        disabled={generatingMCQs}
                        className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm whitespace-nowrap"
                      >
                        {generatingMCQs ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate 40 MCQs
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {errorMCQ && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
                      {errorMCQ}
                    </div>
                  )}

                  <div className="space-y-4">
                    {mcqs.filter(m => m.subject === activeSubject).length > 0 ? (
                      mcqs.filter(m => m.subject === activeSubject).map(mcq => (
                        <MCQCard key={mcq.id} mcq={mcq} showAnswer={showAllAnswers} />
                      ))
                    ) : (
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                          <CheckCircle2 className="w-8 h-8 text-slate-300" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-700 mb-2">No MCQs Available</h2>
                        <p className="text-slate-500 max-w-md mb-6">
                          Generate AI-powered multiple choice questions to test your knowledge on this subject.
                        </p>
                        <button
                          onClick={handleGenerateMCQs}
                          disabled={generatingMCQs}
                          className="py-2 px-4 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                        >
                          {generatingMCQs ? 'Generating...' : 'Generate Now'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
