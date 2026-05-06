'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  Trash2, 
  Calendar as CalendarIcon, 
  Clock, 
  X, 
  Check, 
  Palette,
  ListTodo
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { getSourceColor } from '@/lib/calendar/layoutEngine';

interface EventDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onSave: (id: string, updates: Partial<CalendarEvent>) => void;
  onDelete: (id: string) => void;
}

interface Subtask {
  title: string;
  completed: boolean;
}

export default function EventDialog({ isOpen, onOpenChange, event, onSave, onDelete }: EventDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  useEffect(() => {
    if (event) {
      requestAnimationFrame(() => {
        setTitle(event.title);
        setDescription(event.description || '');
        setIsAllDay(event.is_all_day || false);
        setIsCompleted(event.is_completed || false);
        setSubtasks(event.metadata?.subtasks || []);
      });
    }
  }, [event]);

  if (!event) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(event.id, { 
      title: title.trim(),
      description: description.trim(),
      is_all_day: isAllDay,
      is_completed: isCompleted,
      metadata: {
        ...event.metadata,
        subtasks
      }
    });
    onOpenChange(false);
  };

  const toggleSubtask = (index: number) => {
    const newSubtasks = [...subtasks];
    newSubtasks[index].completed = !newSubtasks[index].completed;
    setSubtasks(newSubtasks);
  };

  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);
  const duration = differenceInMinutes(endTime, startTime);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden w-[95vw] sm:max-w-[520px] bg-[#1A1A1A] border-none shadow-2xl rounded-[24px] sm:rounded-[32px] max-h-[90vh] flex flex-col">
        {/* Accessibility labels */}
        <DialogHeader className="sr-only">
          <DialogTitle>{title || 'Edit Task'}</DialogTitle>
          <DialogDescription>Modify your task details</DialogDescription>
        </DialogHeader>

        {/* Banner Section */}
        <div 
          className="relative p-6 sm:p-8 pt-10 sm:pt-12 text-white transition-colors duration-500 shrink-0"
          style={{ backgroundColor: getSourceColor(event.source) }}
        >
          {/* Top Controls */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
            <button 
              onClick={() => onOpenChange(false)}
              className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex gap-4 sm:gap-6 items-end">
            {/* Structured-style Icon Capsule - Scaled for mobile */}
            <div className="relative shrink-0 hidden xs:block">
              <div className="w-16 h-28 sm:w-24 sm:h-40 bg-[#2A2A2A]/40 backdrop-blur-md border border-white/20 rounded-full flex flex-col items-center justify-center gap-2 sm:gap-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="w-0.5 sm:w-1 h-6 sm:h-8 bg-white/20 rounded-full absolute -top-3 sm:-top-4" />
                <div className="w-0.5 sm:w-1 h-6 sm:h-8 bg-white/20 rounded-full absolute -bottom-3 sm:-bottom-4" />
                <div className="w-10 h-16 sm:w-14 sm:h-24 bg-white/10 rounded-full border border-white/20 flex items-center justify-center relative shadow-inner">
                   <div className="flex flex-col gap-1 sm:gap-1.5 items-center">
                     <div className="w-4 sm:w-6 h-0.5 sm:h-1 bg-white/80 rounded-full" />
                     <div className="w-4 sm:w-6 h-0.5 sm:h-1 bg-white/40 rounded-full" />
                     <div className="w-3 sm:w-4 h-0.5 sm:h-1 bg-white/20 rounded-full" />
                   </div>
                   <div className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-6 h-6 sm:w-8 sm:h-8 bg-[#3A3A3A] border border-white/20 rounded-full flex items-center justify-center shadow-lg">
                      <Palette className="w-3 h-3 sm:w-4 sm:h-4 text-white/60" />
                   </div>
                </div>
              </div>
            </div>

            <div className="flex-1 pb-2 sm:pb-4 min-w-0">
              <div className="flex items-center gap-2 text-white/70 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2 truncate">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                {format(startTime, 'p')} – {format(endTime, 'p')}
                <span className="opacity-60">({duration}m)</span>
              </div>
              
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task Title"
                className="bg-transparent border-none text-white text-2xl sm:text-4xl font-black p-0 h-auto focus-visible:ring-0 placeholder:text-white/40 caret-white selection:bg-white/30 color-scheme-dark truncate"
                autoFocus
              />

              <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
                  <div 
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: getSourceColor(event.source) }}
                  >
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                  </div>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/10 rounded-full flex items-center justify-center -ml-2 sm:-ml-3 border border-white/20">
                    <span className="text-[7px] sm:text-[8px] font-black text-white">
                      {event.source === 'google_calendar' ? 'G' : event.source === 'canvas' ? 'C' : 'P'}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsCompleted(!isCompleted)}
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex items-center justify-center",
                    isCompleted 
                      ? "bg-white border-white text-[#1A1A1A] scale-110" 
                      : "border-white/30 hover:border-white/60"
                  )}
                >
                  {isCompleted && <Check className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {/* Date Info */}
          <div className="bg-[#2A2A2A] rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500/20 text-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="font-bold text-white/90 text-sm sm:text-base">
                {format(startTime, 'EEEE, d. MMMM yyyy')}
              </div>
            </div>
            <Checkbox 
              checked={isAllDay} 
              onCheckedChange={(val) => setIsAllDay(!!val)}
              className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
            />
          </div>

          {/* Subtasks Section */}
          {subtasks.length > 0 && (
            <div className="bg-[#2A2A2A] rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2 sm:space-y-3 border border-white/5">
              <div className="flex items-center gap-2 sm:gap-3 text-white/40 mb-1">
                <ListTodo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Steps</span>
              </div>
              {subtasks.map((task, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <Checkbox 
                    checked={task.completed} 
                    onCheckedChange={() => toggleSubtask(i)}
                    className="border-white/20 rounded-md data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500 h-4 w-4 sm:h-5 sm:w-5"
                  />
                  <span className={cn(
                    "text-xs sm:text-sm font-medium transition-all",
                    task.completed ? "text-white/20 line-through" : "text-white/80"
                  )}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Notes Section */}
          <div className="bg-[#2A2A2A] rounded-xl sm:rounded-2xl overflow-hidden border border-white/5">
             <div className="p-3 sm:p-4 flex items-center gap-3 border-b border-white/5 text-white/30">
               <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Notes</span>
             </div>
             <Textarea 
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               placeholder="Add context..."
               className="bg-transparent border-none min-h-[100px] sm:min-h-[120px] focus-visible:ring-0 p-3 sm:p-4 text-white font-medium placeholder:text-white/20 resize-none text-sm sm:text-base leading-relaxed color-scheme-dark"
             />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-[#1A1A1A] border-t border-white/5 flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            className="text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-full h-10 sm:h-12 px-4 sm:px-6"
            onClick={() => {
              onDelete(event.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Delete</span>
          </Button>

          <Button 
            onClick={handleSave} 
            className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white h-10 sm:h-12 px-6 sm:px-8 rounded-full border border-white/10 transition-all active:scale-95"
          >
            <span className="font-bold uppercase tracking-widest text-[10px] sm:text-xs">Save Changes</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
