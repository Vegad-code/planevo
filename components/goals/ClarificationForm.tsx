'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OllieAvatar from '@/components/ollie/OllieAvatar';

interface Question {
  id: string;
  question: string;
  placeholder: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

interface ClarificationFormProps {
  questions: Question[];
  ollieMessage: string;
  onComplete: (answers: { question: string; answer: string }[]) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ClarificationForm({ questions, ollieMessage, onComplete, onCancel, isSubmitting }: ClarificationFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);

  const currentQuestion = questions[currentStep];

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      const finalAnswers = questions.map(q => ({
        question: q.question,
        answer: answers[q.id] || 'Not specified'
      }));
      onComplete(finalAnswers);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    } else {
      onCancel();
    }
  };

  const updateAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
  };

  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Ollie Intro */}
      <div className="flex items-start gap-4 mb-10">
        <OllieAvatar mood={isSubmitting ? 'happy' : 'thinking'} size="md" />
        <div className="bg-white border-3 border-surface-900 p-5 rounded-[2rem] rounded-tl-none shadow-[8px_8px_0_0_rgba(0,0,0,0.1)] relative">
          <div className="absolute -left-[10px] top-0 w-0 h-0 border-t-[10px] border-t-surface-900 border-r-[10px] border-r-transparent" />
          <p className="text-sm font-bold text-surface-900 leading-relaxed italic">
            {currentStep === 0 ? ollieMessage : "Got it! And what about this?"}
          </p>
        </div>
      </div>

      {/* Question Area */}
      <div className="flex-1 relative overflow-hidden px-2">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ x: direction * 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -50, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-600">
                Question {currentStep + 1} of {questions.length}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-surface-900 uppercase tracking-tight leading-tight italic">
                {currentQuestion.question}
              </h3>
            </div>

            <div className="pt-4">
              {currentQuestion.type === 'select' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options?.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        updateAnswer(opt);
                        setTimeout(handleNext, 300);
                      }}
                      className={`p-4 text-left border-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${
                        answers[currentQuestion.id] === opt
                          ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-[4px_4px_0_0_var(--brand-900)] -translate-y-1'
                          : 'border-surface-200 bg-white text-surface-400 hover:border-surface-900 hover:text-surface-900'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type={currentQuestion.type === 'number' ? 'number' : 'text'}
                  autoFocus
                  placeholder={currentQuestion.placeholder}
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => updateAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && answers[currentQuestion.id] && handleNext()}
                  className="w-full bg-white border-4 border-surface-900 p-6 rounded-2xl text-lg font-black text-surface-900 placeholder:text-surface-300 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all shadow-[12px_12px_0_0_rgba(0,0,0,0.05)]"
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="pt-10 flex items-center justify-between gap-4">
        <button
          onClick={handleBack}
          className="px-6 py-4 bg-surface-100 hover:bg-surface-200 text-surface-900 font-black uppercase text-xs tracking-widest rounded-xl transition-all border-b-4 border-surface-300 active:border-b-0 active:translate-y-1"
        >
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </button>

        <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-brand-500"
          />
        </div>

        <button
          onClick={handleNext}
          disabled={!answers[currentQuestion.id] || isSubmitting}
          className="px-10 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-[0_4px_0_0_var(--brand-900)] active:shadow-none active:translate-y-1 disabled:opacity-50 disabled:grayscale flex items-center gap-3"
        >
          {isSubmitting ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Perfecting...</span>
            </>
          ) : (
            <span>{currentStep === questions.length - 1 ? 'Generate Plan' : 'Continue'}</span>
          )}
        </button>
      </div>
    </div>
  );
}
