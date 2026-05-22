'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CalendarEvent } from '@/types/calendar';

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Load events for a given date range
  const loadEvents = useCallback(async (startDate?: Date, endDate?: Date) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
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

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEvents((data || []) as CalendarEvent[]);
      }
    } catch {
      setError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

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
    const { data: { user } } = await supabase.auth.getUser();
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
    }

    return data as CalendarEvent;
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
    }
  }, [supabase, events]);

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
    }
  }, [supabase, events]);

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
    }
  }, [supabase, events]);

  // Clear all events (Start Fresh)
  const clearAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
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

