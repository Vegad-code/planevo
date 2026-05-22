'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  GraduationCap, 
  Calendar, 
  Link as LinkIcon, 
  Sparkle, 
  Clock,
  CaretRight,
  Info
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { CanvasAssignment } from '@/lib/canvas/api';
import { Button } from '@/components/ui/button';

interface AssignmentDetailOverlayProps {
  assignment: CanvasAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onAskBruno: (assignment: CanvasAssignment) => void;
  onSchedule: (assignment: CanvasAssignment) => void;
}

export default function AssignmentDetailOverlay({
  assignment,
  isOpen,
  onClose,
  onAskBruno,
  onSchedule
}: AssignmentDetailOverlayProps) {
  if (!assignment) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-surface-900/60 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white border-4 border-surface-900 rounded-[2.5rem] shadow-[20px_20px_0_0_var(--surface-900)] overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-6 border-b-2 border-surface-900 bg-surface-50 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success border-2 border-surface-900 rounded-2xl flex items-center justify-center text-surface-900 shadow-[4px_4px_0_0_var(--surface-900)]">
                  <GraduationCap weight="bold" className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-surface-900 leading-tight">
                    {assignment.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-meta">
                      Canvas Assignment
                    </span>
                    {assignment.due_at && (
                      <span className="text-meta text-accent-600 bg-accent-50 px-2 py-0.5 rounded border border-accent-200 flex items-center gap-1">
                        <Clock weight="bold" className="w-3 h-3" />
                        Due {format(new Date(assignment.due_at), 'MMM do, h:mm a')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-surface-400 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-all"
              >
                <X weight="bold" className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
              {/* Description Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-surface-900">
                  <Info weight="bold" className="w-5 h-5 text-brand-500" />
                  <h3 className="text-meta">Assignment Details</h3>
                </div>
                
                {assignment.description ? (
                  <div 
                    className="prose prose-sm max-w-none prose-p:text-surface-600 prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tighter prose-a:text-brand-600 prose-strong:text-surface-900 bg-surface-50 p-6 rounded-2xl border-2 border-surface-100"
                    dangerouslySetInnerHTML={{ __html: assignment.description }}
                  />
                ) : (
                  <div className="bg-surface-50 p-10 rounded-2xl border-2 border-dashed border-surface-200 text-center">
                    <p className="text-xs font-bold text-surface-400 uppercase">No description provided in Canvas.</p>
                  </div>
                )}
              </section>

              {/* Stats/Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border-2 border-surface-900 p-4 rounded-2xl shadow-[4px_4px_0_0_var(--surface-900)]">
                  <p className="text-meta opacity-50 mb-1">Status</p>
                  <p className="font-display font-bold text-surface-900 uppercase text-xs">Synced & Ready</p>
                </div>
                <div className="bg-white border-2 border-surface-900 p-4 rounded-2xl shadow-[4px_4px_0_0_var(--surface-900)]">
                  <p className="text-meta opacity-50 mb-1">Deep Link</p>
                  <a 
                    href={assignment.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-display font-bold text-brand-600 hover:text-brand-500 flex items-center gap-1 uppercase truncate"
                  >
                    View in Canvas
                    <CaretRight weight="bold" className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-surface-50 border-t-2 border-surface-900 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => onAskBruno(assignment)}
                className="flex-1 bg-surface-900 text-white font-black uppercase tracking-widest py-6 rounded-2xl shadow-lg hover:bg-surface-800 transition-all active:scale-[0.98] gap-2"
              >
                <Sparkle weight="bold" className="w-5 h-5 text-brand-400" />
                Ask Bruno for Help
              </Button>
              <Button
                onClick={() => onSchedule(assignment)}
                variant="outline"
                className="flex-1 border-2 border-surface-900 text-surface-900 font-black uppercase tracking-widest py-6 rounded-2xl hover:bg-surface-100 transition-all active:scale-[0.98] gap-2"
              >
                <Calendar weight="bold" className="w-5 h-5 text-accent-500" />
                Schedule Block
              </Button>
              <a 
                href={assignment.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:w-16 h-12 sm:h-auto bg-white border-2 border-surface-900 rounded-2xl flex items-center justify-center text-surface-900 hover:bg-surface-100 transition-all shadow-[4px_4px_0_0_var(--surface-900)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                title="Open in Canvas"
              >
                <LinkIcon weight="bold" className="w-5 h-5" />
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
