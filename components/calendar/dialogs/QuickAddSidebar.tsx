'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, RotateCcw, Plus, ListTodo, Palette, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface QuickAddSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  defaultDate?: Date;
}

export default function QuickAddSidebar({
  isOpen,
  onOpenChange,
  onSave,
  defaultDate = new Date()
}: QuickAddSidebarProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [repeat, setRepeat] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!title) return;

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    onSave({
      title,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      description,
      is_all_day: false,
      is_completed: false,
      source: 'manual',
      metadata: {
        subtasks: subtasks.map(t => ({ title: t, completed: false }))
      }
    });
    
    // Reset and close
    setTitle('');
    setSubtasks([]);
    onOpenChange(false);
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()]);
      setNewSubtask('');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-[#121212] border-none flex flex-col h-full shadow-2xl">
        <SheetHeader className="p-8 pb-4">
          <SheetTitle className="text-3xl font-black text-white uppercase tracking-tighter">New Mission</SheetTitle>
          <SheetDescription className="text-white/40 font-medium">Configure your deployment details below.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-4 space-y-8">
          {/* Mission Name Section */}
          <section className="space-y-4">
             <div className="flex items-center gap-3 text-white/40 mb-2">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                   <Plus className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Mission Name</span>
             </div>
             <Input
                placeholder="What are we focusing on?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-xl h-14 rounded-2xl focus:ring-brand-500/50 placeholder:text-white/20 font-bold color-scheme-dark"
                autoFocus
             />
          </section>

          {/* Schedule Section */}
          <section className="space-y-4">
             <div className="flex items-center gap-3 text-white/40 mb-2">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                   <Calendar className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Deployment Schedule</span>
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 group focus-within:border-brand-500/50 transition-colors">
                   <Calendar className="w-5 h-5 text-brand-500" />
                   <div className="flex-1">
                      <Label className="text-[10px] uppercase text-white/40 font-black block mb-0.5">Deployment Date</Label>
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-transparent border-none text-white focus:ring-0 w-full p-0 color-scheme-dark font-bold text-sm"
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 group focus-within:border-brand-500/50 transition-colors">
                     <Clock className="w-5 h-5 text-brand-500" />
                     <div className="flex-1">
                        <Label className="text-[10px] uppercase text-white/40 font-black block mb-0.5">Start</Label>
                        <input 
                          type="time" 
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="bg-transparent border-none text-white focus:ring-0 w-full p-0 color-scheme-dark font-bold text-sm"
                        />
                     </div>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 group focus-within:border-brand-500/50 transition-colors">
                     <Clock className="w-5 h-5 text-brand-500" />
                     <div className="flex-1">
                        <Label className="text-[10px] uppercase text-white/40 font-black block mb-0.5">End</Label>
                        <input 
                          type="time" 
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="bg-transparent border-none text-white focus:ring-0 w-full p-0 color-scheme-dark font-bold text-sm"
                        />
                     </div>
                  </div>
                </div>
             </div>
          </section>

          {/* Repeat Section */}
          <section className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
             <div className="flex items-center gap-4">
                <RotateCcw className="w-5 h-5 text-white/40" />
                <span className="text-sm text-white/80 font-bold uppercase tracking-wide">Repeat Mission</span>
             </div>
             <Checkbox 
                checked={repeat} 
                onCheckedChange={(checked) => setRepeat(!!checked)}
                className="border-white/20 w-6 h-6 rounded-lg data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500"
             />
          </section>

          {/* Subtasks Section */}
          <section className="space-y-4">
             <div className="flex items-center gap-3 text-white/40 mb-2">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                   <ListTodo className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Tactical Steps</span>
             </div>
             
             <div className="space-y-2">
                {subtasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                    <span className="text-sm text-white/80 flex-1 font-medium">{task}</span>
                    <button onClick={() => setSubtasks(subtasks.filter((_, idx) => idx !== i))}>
                       <X className="w-4 h-4 text-white/20 hover:text-red-400" />
                    </button>
                  </div>
                ))}
                
                <div className="flex gap-2">
                   <Input 
                      placeholder="Add a step..."
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                      className="bg-white/5 border-white/10 rounded-xl text-white font-medium placeholder:text-white/20 color-scheme-dark"
                   />
                   <Button onClick={addSubtask} size="icon" className="rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0">
                      <Plus className="w-4 h-4" />
                   </Button>
                </div>
             </div>
          </section>

          {/* Notes Section */}
          <section className="space-y-4">
             <div className="flex items-center gap-3 text-white/40 mb-2">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                   <Palette className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Notes</span>
             </div>
             <Textarea 
                placeholder="Any additional context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 rounded-2xl min-h-[120px] text-white font-medium placeholder:text-white/20 resize-none color-scheme-dark leading-relaxed"
             />
          </section>
        </div>

        <div className="p-8 bg-[#121212] border-t border-white/5">
           <Button 
              onClick={handleSave}
              disabled={!title}
              className="w-full h-16 bg-brand-500 hover:bg-brand-600 text-white text-lg font-black uppercase tracking-widest rounded-[20px] shadow-2xl shadow-brand-500/20 active:scale-[0.98] transition-all"
           >
              Launch Mission
           </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
