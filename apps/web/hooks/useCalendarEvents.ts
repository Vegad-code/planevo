'use client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { CalendarEvent } from '@/types/calendar';
import { pushEventToGoogle, deleteEventFromGoogle } from '@/lib/integrations/google-calendar';

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Helper to check for conflicts
  const hasConflict = useCallback((start: Date, end: Date, excludeEventId?: string) => {
    return events.some(e => {
      if (excludeEventId && e.id === excludeEventId) return false;
      if (e.is_all_day) return false;
      const eStart = new Date(e.start_time);
      const eEnd = new Date(e.end_time);
      // overlap condition: (StartA < EndB) and (EndA > StartB)
      return start < eEnd && end > eStart;
    });
  }, [events]);

  // Load events for a given date range
  const loadEvents = useCallback(async (startDate?: Date, endDate?: Date, silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Default to showing the current month
      const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

      const { data, error: fetchError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      let loadedEvents: CalendarEvent[] = [];
      if (fetchError) {
        setError(fetchError.message);
      } else {
        loadedEvents = (data || []) as CalendarEvent[];
      }

      const { data: sourceItems } = await supabase
        .from('source_items')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .not('due_date', 'is', null)
        .gte('due_date', start.toISOString())
        .lte('due_date', end.toISOString());

      if (sourceItems) {
        const sourceEvents = sourceItems.map(item => {
          let color = 'bg-ink';
          if (item.provider === 'canvas') color = 'bg-[var(--color-rose)]';
          if (item.provider === 'notion') color = 'bg-settings-card text-black border border-gray-200';
          if (item.provider === 'linear') color = 'bg-[#5E6AD2] text-white';
          if (item.provider === 'slack') color = 'bg-[#4A154B] text-white';

          return {
            id: `source_${item.id}`,
            user_id: item.user_id,
            title: `Deadline: ${item.title || 'Task'}`,
            start_time: item.due_date,
            end_time: new Date(new Date(item.due_date).getTime() + 60 * 60 * 1000).toISOString(),
            is_all_day: true, // Make them show as all day deadlines
            source: item.provider,
            color: color,
            is_completed: false,
            linked_task_id: item.external_id,
            is_deleted: false,
          } as CalendarEvent;
        });
        loadedEvents = [...loadedEvents, ...sourceEvents];
      }

      setEvents(loadedEvents);

    } catch {
      if (!silent) setError('Failed to load calendar events');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [supabase]);

  // Removed background polling interval to respect user sync frequency preferences

  // Complete an event
  const completeEvent = useCallback(async (eventId: string) => {
    const now = new Date().toISOString();

    // Optimistic update
    setEvents(prev =>
      prev.map(e =>
        e.id === eventId
          ? { ...e, is_completed: !e.is_completed, completed_at: e.is_completed ? undefined : now }
          : e
      )
    );

    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const { error } = await supabase
      .from('calendar_events')
      .update({
        is_completed: !event.is_completed,
        completed_at: event.is_completed ? null : now,
        updated_at: now,
      })
      .eq('id', eventId);

    if (error) {
      // Revert on error
      setEvents(prev =>
        prev.map(e =>
          e.id === eventId
            ? { ...e, is_completed: event.is_completed, completed_at: event.completed_at }
            : e
        )
      );
    }
  }, [supabase, events]);

  // Create event
  const createEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const now = new Date().toISOString();
    const newEvent = {
      user_id: user.id,
      title: eventData.title || 'New Event',
      description: eventData.description || null,
      start_time: eventData.start_time || now,
      end_time: eventData.end_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      is_all_day: eventData.is_all_day || false,
      source: eventData.source || 'manual',
      icon: eventData.icon || null,
      color: eventData.color || null,
      energy_level: eventData.energy_level || null,
      is_completed: false,
      location: eventData.location || null,
      linked_task_id: eventData.linked_task_id || null,
      bruno_notes: eventData.bruno_notes || null,
      is_deleted: false,
      recurrence_rule: eventData.recurrence_rule || null,
    };

    const { data, error } = await supabase
      .from('calendar_events')
      .insert(newEvent)
      .select()
      .single();

    if (error) {
      console.error('Failed to create event:', error);
      return null;
    }

    if (data) {
      setEvents(prev => [...prev, data as CalendarEvent]);

      const eventStart = new Date(data.start_time as string);
      const eventEnd = new Date(data.end_time as string);
      if (!data.is_all_day && hasConflict(eventStart, eventEnd, data.id)) {
        toast.warning('This event overlaps with an existing scheduled block.');
      }

      // Fire-and-forget push to Google (silently skips if read-only scope)
      pushEventToGoogle(user.id, data).then((res) => {
        if (res && !res.success) {
          // Silently skip if user only has read-only scope — not an error
          if (res.error?.includes('Write scope not granted')) return;
          if (res.error?.includes('403') || res.error?.includes('insufficient')) {
            toast.error('Failed to sync to Google: Please reconnect your Google Calendar to grant write permissions.');
          } else {
            toast.error('Failed to sync event to Google Calendar');
          }
        } else if (res && res.success && res.googleEventId) {
          // Update the local state with the new google_event_id so it can be deleted later
          setEvents(prev => prev.map(e => e.id === data.id ? { ...e, metadata: { ...(e.metadata || {}), google_event_id: res.googleEventId } } : e));
        }
      }).catch(err => console.error('Background Google sync failed', err));
    }

    return data as CalendarEvent;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Reschedule an event (drag-to-move)
  const rescheduleEvent = useCallback(async (eventId: string, newStart: Date, newEnd: Date) => {
    const now = new Date().toISOString();
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Optimistic update
    setEvents(prev =>
      prev.map(e =>
        e.id === eventId
          ? { ...e, start_time: newStart.toISOString(), end_time: newEnd.toISOString(), updated_at: now }
          : e
      )
    );

    const { error } = await supabase
      .from('calendar_events')
      .update({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        updated_at: now,
      })
      .eq('id', eventId);

    if (error) {
      // Revert on error
      setEvents(prev =>
        prev.map(e =>
          e.id === eventId
            ? { ...e, start_time: event.start_time, end_time: event.end_time, updated_at: event.updated_at }
            : e
        )
      );
      toast.error('Failed to reschedule event');
    } else {
      if (hasConflict(newStart, newEnd, eventId)) {
        toast.warning('This event overlaps with an existing scheduled block.', {
          action: {
            label: 'Undo',
            onClick: async () => {
              // revert visually
              setEvents(prev => prev.map(e => e.id === eventId ? { ...e, start_time: event.start_time, end_time: event.end_time } : e));
              await supabase.from('calendar_events').update({ start_time: event.start_time, end_time: event.end_time }).eq('id', eventId);
            }
          }
        });
      } else {
        toast.success('Event rescheduled', {
          action: {
            label: 'Undo',
            onClick: async () => {
              setEvents(prev => prev.map(e => e.id === eventId ? { ...e, start_time: event.start_time, end_time: event.end_time } : e));
              await supabase.from('calendar_events').update({ start_time: event.start_time, end_time: event.end_time }).eq('id', eventId);
            }
          }
        });
      }

      // Fire-and-forget push to Google
      pushEventToGoogle(event.user_id, { ...event, start_time: newStart.toISOString(), end_time: newEnd.toISOString() })
        .catch(err => console.error('Background Google sync failed', err));
    }
  }, [supabase, events, hasConflict]);

  // Resize an event (drag bottom edge)
  const resizeEvent = useCallback(async (eventId: string, newEnd: Date) => {
    const now = new Date().toISOString();
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Optimistic update
    setEvents(prev =>
      prev.map(e =>
        e.id === eventId
          ? { ...e, end_time: newEnd.toISOString(), updated_at: now }
          : e
      )
    );

    const { error } = await supabase
      .from('calendar_events')
      .update({
        end_time: newEnd.toISOString(),
        updated_at: now,
      })
      .eq('id', eventId);

    if (error) {
      // Revert on error
      setEvents(prev =>
        prev.map(e =>
          e.id === eventId
            ? { ...e, end_time: event.end_time, updated_at: event.updated_at }
            : e
        )
      );
      toast.error('Failed to resize event');
    } else {
      if (hasConflict(new Date(event.start_time), newEnd, eventId)) {
        toast.warning('This event overlaps with an existing scheduled block.', {
          action: {
            label: 'Undo',
            onClick: async () => {
              setEvents(prev => prev.map(e => e.id === eventId ? { ...e, end_time: event.end_time } : e));
              await supabase.from('calendar_events').update({ end_time: event.end_time }).eq('id', eventId);
            }
          }
        });
      } else {
        toast.success('Event updated', {
          action: {
            label: 'Undo',
            onClick: async () => {
              setEvents(prev => prev.map(e => e.id === eventId ? { ...e, end_time: event.end_time } : e));
              await supabase.from('calendar_events').update({ end_time: event.end_time }).eq('id', eventId);
            }
          }
        });
      }

      // Fire-and-forget push to Google
      pushEventToGoogle(event.user_id, { ...event, end_time: newEnd.toISOString() })
        .catch(err => console.error('Background Google sync failed', err));
    }
  }, [supabase, events, hasConflict]);

  // Update arbitrary fields of an event
  const updateEvent = useCallback(async (eventId: string, updates: Partial<CalendarEvent>) => {
    const now = new Date().toISOString();
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Optimistic update
    setEvents(prev =>
      prev.map(e =>
        e.id === eventId
          ? { ...e, ...updates, updated_at: now }
          : e
      )
    );

    const { error } = await supabase
      .from('calendar_events')
      .update({
        ...updates,
        updated_at: now,
      })
      .eq('id', eventId);

    if (error) {
      // Revert on error
      setEvents(prev =>
        prev.map(e =>
          e.id === eventId
            ? event
            : e
        )
      );
    } else {
      pushEventToGoogle(event.user_id, { ...event, ...updates })
        .catch(err => console.error('Background Google sync failed', err));
    }
  }, [supabase, events]);

  // Delete a specific event
  const deleteEvent = useCallback(async (eventId: string) => {
    // Optimistic update
    const previousEvents = [...events];
    setEvents(prev => prev.filter(e => e.id !== eventId));

    const { error } = await supabase
      .from('calendar_events')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', eventId);

    if (error) {
      console.error('Failed to delete event:', error);
      setEvents(previousEvents); // Revert on error
      toast.error('Failed to delete event');
    } else {
      // Fire-and-forget delete from Google
      const deletedEvent = previousEvents.find(e => e.id === eventId);
      if (deletedEvent) {
        // Fire-and-forget delete from Google Calendar
        if (deletedEvent.source === 'google_calendar' || deletedEvent.metadata?.google_event_id) {
          const externalId = deletedEvent.metadata?.google_event_id || deletedEvent.external_id;
          if (externalId) {
            deleteEventFromGoogle(deletedEvent.user_id, externalId, deletedEvent.metadata?.google_calendar_id).then((res) => {
              if (res && !res.success) {
                // Silently skip if user only has read-only scope — not an error
                if (res.error?.includes('Write scope not granted')) return;
                if (res.error?.includes('403') || res.error?.includes('insufficient')) {
                  toast.error('Failed to sync to Google: Please reconnect your Google Calendar to grant write permissions.');
                } else {
                  toast.error('Failed to sync event deletion to Google Calendar');
                }
              }
            }).catch(err => console.error('Background Google delete sync failed', err));
          }
        }
      }
      toast.success('Event deleted', {
        action: {
          label: 'Undo',
          onClick: async () => {
            setEvents(previousEvents);
            await supabase.from('calendar_events').update({ is_deleted: false, updated_at: new Date().toISOString() }).eq('id', eventId);
          }
        }
      });
    }
  }, [supabase, events]);

  // Clear all events (Start Fresh)
  const clearAll = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    // Optimistic clear
    const previousEvents = [...events];
    setEvents([]);

    const { error } = await supabase
      .from('calendar_events')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_deleted', false);

    if (error) {
      console.error('Failed to clear events:', error);
      setEvents(previousEvents); // Revert on error
    }
  }, [supabase, events]);


  return {
    events,
    loading,
    error,
    loadEvents,
    completeEvent,
    createEvent,
    rescheduleEvent,
    resizeEvent,
    updateEvent,
    deleteEvent,
    clearAll,
  };
}

