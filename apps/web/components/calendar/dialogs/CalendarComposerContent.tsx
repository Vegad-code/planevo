'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Trash,
  CalendarBlank,
  Clock,
  X,
  Check,
  ListChecks,
  Notebook,
  CaretDown,
  CaretUp,
  Plus,
  ArrowRight,
} from '@phosphor-icons/react';
import { format, differenceInMinutes, addMinutes, parseISO, isValid } from 'date-fns';
import type { CalendarEvent, CalendarComposerDraft, ComposerState } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { getSourceColor } from '@/lib/calendar/layoutEngine';
import {
  EVENT_COLOR_PALETTE,
  DEFAULT_EVENT_COLOR,
  getEventColor,
  getContrastText,
} from '@/lib/calendar/eventColors';
import { ParseChips } from '@/components/nlp/ParseChips';
import { parseEventInput } from '@/lib/calendar/parseEventInput';
import { useLiveEventParse } from '@/hooks/useLiveEventParse';
import { MOTION } from '@/lib/calendar/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Subtask {
  title: string;
  completed: boolean;
}

const DURATION_PRESETS = [30, 60, 120] as const;

/** Nested pickers must sit above the composer shell (z-[100]). */
const COMPOSER_PICKER_Z = 'z-[150]';

const composerCheckboxClass =
  '!size-[18px] !rounded-[6px] !border !border-[var(--color-line-strong)] !bg-[var(--color-paper)] !shadow-none transition-colors hover:!border-[var(--color-honey)]/60 data-[state=checked]:!bg-[var(--color-honey)] data-[state=checked]:!border-[var(--color-honey)] data-[state=checked]:!text-white focus-visible:!ring-2 focus-visible:!ring-[var(--color-honey)]/30 focus-visible:!ring-offset-1 [&_svg]:!size-3';

export interface CalendarComposerContentProps {
  state: ComposerState;
  onClose: () => void;
  onSaveSchedule: (draft: CalendarComposerDraft) => void | Promise<void>;
  onSaveBacklog: (draft: CalendarComposerDraft) => void | Promise<void>;
  onSaveEdit: (id: string, updates: Partial<CalendarEvent>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onSaveToNotion?: (event: CalendarEvent) => void;
  timeFormat?: '12h' | '24h';
}

function parseIsoSafe(iso: string): Date {
  const parsed = parseISO(iso);
  return isValid(parsed) ? parsed : new Date();
}

function toDateInputValue(iso: string): string {
  return format(parseIsoSafe(iso), 'yyyy-MM-dd');
}

function toTimeInputValue(iso: string): string {
  return format(parseIsoSafe(iso), 'HH:mm');
}

function combineDateAndTime(dateStr: string, timeStr: string): Date {
  if (!dateStr) return new Date(Number.NaN);
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(`${dateStr}T00:00:00`);
  if (!isValid(d)) return new Date(Number.NaN);
  d.setHours(h, m, 0, 0);
  return d;
}

function getDefaultsFromState(state: ComposerState) {
  if (state.mode === 'edit') {
    const { event } = state;
    return {
      title: event.title,
      description: event.description || '',
      isAllDay: event.is_all_day || false,
      isCompleted: event.is_completed || false,
      dateStr: toDateInputValue(event.start_time),
      startTimeStr: toTimeInputValue(event.start_time),
      endTimeStr: toTimeInputValue(event.end_time),
      subtasks: (event.metadata?.subtasks || []) as Subtask[],
      showMore: !!event.description || (event.metadata?.subtasks?.length ?? 0) > 0,
    };
  }
  if (state.mode === 'create') {
    const { draft } = state;
    return {
      title: draft.title || '',
      description: draft.description || '',
      isAllDay: draft.is_all_day || false,
      isCompleted: false,
      dateStr: toDateInputValue(draft.start_time),
      startTimeStr: toTimeInputValue(draft.start_time),
      endTimeStr: toTimeInputValue(draft.end_time),
      subtasks: (draft.metadata?.subtasks || []) as Subtask[],
      showMore: false,
    };
  }
  return null;
}

function buildTimeOptions(use12h: boolean) {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const d = new Date(2000, 0, 1, h, m);
      options.push({
        value,
        label: use12h ? format(d, 'h:mm a') : format(d, 'HH:mm'),
      });
    }
  }
  return options;
}

function formatTimeLabel(timeStr: string, use12h: boolean): string {
  const d = combineDateAndTime('2000-01-01', timeStr);
  if (!isValid(d)) return timeStr;
  return use12h ? format(d, 'h:mm a') : format(d, 'HH:mm');
}

export default function CalendarComposerContent({
  state,
  onClose,
  onSaveSchedule,
  onSaveBacklog,
  onSaveEdit,
  onDelete,
  onSaveToNotion,
  timeFormat = '12h',
}: CalendarComposerContentProps) {
  const isOpen = state.mode !== 'closed';
  const isCreate = state.mode === 'create';
  const isEdit = state.mode === 'edit';
  const event = isEdit ? state.event : null;
  const initialDraft = isCreate ? state.draft : null;
  const use12h = timeFormat === '12h';
  const timeOptions = useMemo(() => buildTimeOptions(use12h), [use12h]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [backlogOnly, setBacklogOnly] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('10:00');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [parseRefDate, setParseRefDate] = useState(() => new Date());
  const [eventColor, setEventColor] = useState(DEFAULT_EVENT_COLOR);

  const draftStartTime =
    isCreate && initialDraft ? initialDraft.start_time : null;

  useEffect(() => {
    if (!isOpen) return;
    if (draftStartTime) {
      setParseRefDate(parseIsoSafe(draftStartTime));
    } else if (isEdit && event) {
      setParseRefDate(parseIsoSafe(event.start_time));
    }
  }, [isOpen, draftStartTime, isEdit, event?.start_time]);

  const dateStrRef = useRef(dateStr);
  const startTimeStrRef = useRef(startTimeStr);

  useEffect(() => {
    dateStrRef.current = dateStr;
    startTimeStrRef.current = startTimeStr;
  }, [dateStr, startTimeStr]);

  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setIsAllDay(event.is_all_day || false);
      setIsCompleted(event.is_completed || false);
      setBacklogOnly(false);
      setDateStr(toDateInputValue(event.start_time));
      setStartTimeStr(toTimeInputValue(event.start_time));
      setEndTimeStr(toTimeInputValue(event.end_time));
      setSubtasks(event.metadata?.subtasks || []);
      setShowMore(!!event.description || (event.metadata?.subtasks?.length ?? 0) > 0);
      setEventColor(event.color || getEventColor(event).bg);
    } else if (isCreate && initialDraft) {
      setTitle(initialDraft.title || '');
      setDescription(initialDraft.description || '');
      setIsAllDay(initialDraft.is_all_day || false);
      setIsCompleted(false);
      setBacklogOnly(false);
      setDateStr(toDateInputValue(initialDraft.start_time));
      setStartTimeStr(toTimeInputValue(initialDraft.start_time));
      setEndTimeStr(toTimeInputValue(initialDraft.end_time));
      setSubtasks(initialDraft.metadata?.subtasks || []);
      setShowMore(false);
      setEventColor(initialDraft.color || DEFAULT_EVENT_COLOR);
    }
  }, [isOpen, isEdit, isCreate, event, initialDraft]);

  const defaults = getDefaultsFromState(state);
  const effectiveDateStr =
    dateStr || defaults?.dateStr || format(new Date(), 'yyyy-MM-dd');
  const effectiveStartTime = startTimeStr || defaults?.startTimeStr || '09:00';
  const effectiveEndTime = endTimeStr || defaults?.endTimeStr || '10:00';

  const source = event?.source ?? 'manual';
  const accentColor = getSourceColor(source);

  const startDate = combineDateAndTime(effectiveDateStr, effectiveStartTime);
  const endDate = combineDateAndTime(effectiveDateStr, effectiveEndTime);
  const datesValid = isValid(startDate) && isValid(endDate);
  const duration = datesValid
    ? Math.max(differenceInMinutes(endDate, startDate), 0)
    : 0;

  const selectedDateObj = useMemo(() => {
    const d = parseISO(`${effectiveDateStr}T12:00:00`);
    return isValid(d) ? d : new Date();
  }, [effectiveDateStr]);

  const parseCallbacks = useMemo(
    () => ({
      setDateStr,
      setStartTimeStr,
      setEndTimeStr,
      getStartDate: () =>
        combineDateAndTime(
          dateStrRef.current || effectiveDateStr,
          startTimeStrRef.current || effectiveStartTime
        ),
    }),
    [effectiveDateStr, effectiveStartTime]
  );

  const { chips, markManualFieldEdit } = useLiveEventParse({
    rawTitle: title,
    refDate: parseRefDate,
    enabled: isCreate && !backlogOnly,
    callbacks: parseCallbacks,
  });

  const handleSave = async () => {
    const parsed = parseEventInput(title, parseRefDate);
    const finalTitle = (parsed.title || title).trim();
    if (!finalTitle) return;

    const start = combineDateAndTime(
      dateStr || effectiveDateStr,
      startTimeStr || effectiveStartTime
    );
    const end = combineDateAndTime(
      dateStr || effectiveDateStr,
      endTimeStr || effectiveEndTime
    );
    const draft: CalendarComposerDraft = {
      title: finalTitle,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      description: description.trim() || undefined,
      is_all_day: isAllDay,
      color: eventColor,
      metadata: { subtasks },
    };

    setSaving(true);
    try {
      if (isCreate) {
        if (backlogOnly) {
          await onSaveBacklog(draft);
        } else {
          await onSaveSchedule(draft);
        }
        onClose();
      } else if (isEdit && event) {
        await onSaveEdit(event.id, {
          title: draft.title,
          description: draft.description,
          is_all_day: isAllDay,
          is_completed: isCompleted,
          start_time: draft.start_time,
          end_time: draft.end_time,
          color: eventColor,
          metadata: { ...event.metadata, subtasks },
        });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const setDurationPreset = useCallback(
    (minutes: number) => {
      markManualFieldEdit();
      const start = combineDateAndTime(
        dateStr || effectiveDateStr,
        startTimeStr || effectiveStartTime
      );
      const end = addMinutes(start, minutes);
      setEndTimeStr(toTimeInputValue(end.toISOString()));
    },
    [
      markManualFieldEdit,
      dateStr,
      effectiveDateStr,
      startTimeStr,
      effectiveStartTime,
    ]
  );

  const addSubtask = () => {
    const trimmed = newSubtask.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [...prev, { title: trimmed, completed: false }]);
    setNewSubtask('');
  };

  const toggleSubtask = (index: number) => {
    setSubtasks((prev) =>
      prev.map((s, i) => (i === index ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      if (title.trim()) void handleSave();
    }
  };

  if (!isOpen) return null;

  const saveLabel = saving
    ? 'Saving…'
    : isCreate
      ? backlogOnly
        ? 'Add to backlog'
        : 'Add to calendar'
      : 'Save';

  return (
    <motion.div
      {...MOTION.overlay}
      className="flex flex-col max-h-[min(85vh,640px)] overflow-hidden rounded-2xl"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2 shrink-0">
        {isCreate ? (
          <div className="flex p-0.5 rounded-full bg-[var(--color-cream-2)] border border-[var(--color-line)]">
            <button
              type="button"
              onClick={() => setBacklogOnly(false)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                !backlogOnly
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm'
                  : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]'
              )}
            >
              Schedule
            </button>
            <button
              type="button"
              onClick={() => setBacklogOnly(true)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                backlogOnly
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm'
                  : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]'
              )}
            >
              Backlog
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            <span className="text-xs text-[var(--color-ink-faint)]">Edit event</span>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-2)] transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Title */}
      <div className="px-5 pb-3 shrink-0">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isCreate ? 'What are you planning?' : 'Event title'}
          data-calendar-shortcuts-ignore
          className="w-full bg-transparent border-none text-xl font-semibold tracking-tight text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)]/40 placeholder:font-normal focus:outline-none caret-[var(--color-honey)]"
          autoFocus
        />
        {isCreate && chips.length > 0 && (
          <ParseChips chips={chips} className="mt-2" />
        )}
        {isCreate && (
          <p className="mt-1.5 text-xs text-[var(--color-ink-faint)]">
            Try &ldquo;Study session tomorrow at 2pm for 90 minutes&rdquo;
          </p>
        )}
        {isEdit && (
          <button
            type="button"
            onClick={() => setIsCompleted(!isCompleted)}
            className="mt-2 flex items-center gap-2 text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
          >
            <span
              className={cn(
                'size-5 rounded-full border-2 flex items-center justify-center transition-colors',
                isCompleted
                  ? 'bg-[var(--color-sage)] border-[var(--color-sage)] text-white'
                  : 'border-[var(--color-line-strong)]'
              )}
            >
              {isCompleted && <Check className="size-3" weight="bold" />}
            </span>
            {isCompleted ? 'Completed' : 'Mark done'}
          </button>
        )}
      </div>

      <Separator className="bg-[var(--color-line)]" />

      {/* When section */}
      <div className="flex flex-col gap-0.5 px-3 py-2 overflow-y-auto flex-1 min-h-0 transition-colors duration-200">
        {!backlogOnly && (
          <>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen} modal>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 w-full px-2 py-2.5 rounded-xl hover:bg-[var(--color-cream-2)]/60 transition-colors text-left"
                >
                  <CalendarBlank className="size-4 text-[var(--color-ink-faint)] shrink-0" />
                  <span className="flex-1 text-sm text-[var(--color-ink)]">
                    {format(selectedDateObj, 'EEE, MMM d, yyyy')}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className={cn(
                  COMPOSER_PICKER_Z,
                  'w-auto p-0 border-[var(--color-line)] bg-[var(--color-paper)] shadow-lg'
                )}
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Calendar
                  mode="single"
                  selected={selectedDateObj}
                  onSelect={(day) => {
                    if (day) {
                      markManualFieldEdit();
                      setDateStr(format(day, 'yyyy-MM-dd'));
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {!isAllDay && datesValid && (
              <div className="flex items-center gap-2 px-2 py-2.5">
                <Clock className="size-4 text-[var(--color-ink-faint)] shrink-0" />
                <Select
                  value={startTimeStr || effectiveStartTime}
                  onValueChange={(v) => {
                    markManualFieldEdit();
                    setStartTimeStr(v);
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 !border !border-[var(--color-line)] !bg-transparent !shadow-none font-normal text-sm rounded-lg">
                    <SelectValue>
                      {formatTimeLabel(startTimeStr || effectiveStartTime, use12h)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className={cn(COMPOSER_PICKER_Z, 'max-h-56 bg-[var(--color-paper)] border-[var(--color-line)]')}>
                    {timeOptions.map((opt) => (
                      <SelectItem key={`start-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ArrowRight className="size-3.5 text-[var(--color-ink-faint)] shrink-0" />
                <Select
                  value={endTimeStr || effectiveEndTime}
                  onValueChange={(v) => {
                    markManualFieldEdit();
                    setEndTimeStr(v);
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 !border !border-[var(--color-line)] !bg-transparent !shadow-none font-normal text-sm rounded-lg">
                    <SelectValue>
                      {formatTimeLabel(endTimeStr || effectiveEndTime, use12h)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className={cn(COMPOSER_PICKER_Z, 'max-h-56 bg-[var(--color-paper)] border-[var(--color-line)]')}>
                    {timeOptions.map((opt) => (
                      <SelectItem key={`end-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-[var(--color-ink-faint)] shrink-0 tabular-nums">
                  {duration}m
                </span>
              </div>
            )}

            {!isAllDay && (
              <div className="flex items-center gap-2 px-2 py-1.5 flex-wrap">
                <span className="text-xs text-[var(--color-ink-faint)] pl-7">Duration</span>
                {DURATION_PRESETS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationPreset(mins)}
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
                      duration === mins
                        ? 'bg-[var(--color-honey-soft)] text-[var(--color-honey-deep)] border-[var(--color-honey)]'
                        : 'bg-transparent text-[var(--color-ink-faint)] border-[var(--color-line)] hover:border-[var(--color-line-strong)]'
                    )}
                  >
                    {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                  </button>
                ))}
              </div>
            )}

            <label className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[var(--color-cream-2)]/60 transition-colors cursor-pointer">
              <span className="size-4 shrink-0" />
              <span className="flex-1 text-sm text-[var(--color-ink-faint)]">All day</span>
              <Checkbox
                checked={isAllDay}
                onCheckedChange={(v) => setIsAllDay(!!v)}
                className={composerCheckboxClass}
              />
            </label>

            <div className="flex items-start gap-3 px-2 py-2.5">
              <div
                className="size-4 shrink-0 rounded-full mt-0.5 border border-[var(--color-line)]"
                style={{ backgroundColor: eventColor }}
              />
              <div className="flex flex-wrap gap-1.5">
                {EVENT_COLOR_PALETTE.map((c) => {
                  const selected = eventColor.toLowerCase() === c.hex.toLowerCase();
                  const checkColor = getContrastText(c.hex);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEventColor(c.hex)}
                      className={cn(
                        'size-6 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110',
                        selected
                          ? 'border-[var(--color-ink)] scale-110'
                          : 'border-transparent'
                      )}
                      style={{ backgroundColor: c.hex }}
                      aria-label={`Event color ${c.id}`}
                      aria-pressed={selected}
                    >
                      {selected && (
                        <Check className="size-3" weight="bold" style={{ color: checkColor }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {backlogOnly && (
          <p className="px-2 py-3 text-sm text-[var(--color-ink-faint)]">
            Saved to your backlog — schedule it later from the task panel.
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 px-2 py-2 text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
        >
          {showMore ? <CaretUp className="size-3.5" /> : <CaretDown className="size-3.5" />}
          Notes & steps
        </button>

        {showMore && (
          <div className="flex flex-col gap-3 px-2 pb-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context…"
              className="min-h-[72px] resize-none border border-[var(--color-line)] bg-[var(--color-cream-2)]/30 text-sm focus-visible:ring-[var(--color-honey)]"
            />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ListChecks className="size-4 text-[var(--color-ink-faint)]" />
                <span className="text-xs text-[var(--color-ink-faint)]">Steps</span>
              </div>
              {subtasks.map((st, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={st.completed}
                    onCheckedChange={() => toggleSubtask(i)}
                    className={composerCheckboxClass}
                  />
                  <span
                    className={cn(
                      'text-sm',
                      st.completed
                        ? 'line-through text-[var(--color-ink-faint)]'
                        : 'text-[var(--color-ink)]'
                    )}
                  >
                    {st.title}
                  </span>
                </div>
              ))}
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Add a step…"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                  className="h-8 text-sm border-[var(--color-line)]"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={addSubtask}
                  className="shrink-0 size-8"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Separator className="bg-[var(--color-line)]" />

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 shrink-0">
        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[var(--color-ink-faint)] hover:text-red-600 hover:bg-red-50/50 px-2"
            onClick={() => {
              if (event) {
                void onDelete(event.id);
                onClose();
              }
            }}
          >
            <Trash className="size-4 mr-1.5" />
            Delete
          </Button>
        ) : (
          <span className="text-xs text-[var(--color-ink-faint)]">↵ to save</span>
        )}

        <div className="flex items-center gap-2">
          {isEdit && onSaveToNotion && event && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSaveToNotion(event)}
              className="text-[var(--color-ink-faint)] hidden sm:inline-flex"
            >
              <Notebook className="size-4 mr-1" />
              Notion
            </Button>
          )}
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!title.trim() || saving}
            className="rounded-full bg-[var(--color-honey)] hover:bg-[var(--color-honey-deep)] text-white px-5 h-9 text-sm font-medium shadow-sm disabled:opacity-50"
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
