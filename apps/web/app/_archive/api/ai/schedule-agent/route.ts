import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { buildMemoryContext, getUserAIMemory, updateUserAIMemory } from '@/lib/ai/memory';

export async function POST(request: NextRequest) {
  try {
    const { allowed, error: limitError } = await checkRateLimit('schedule-agent');
    if (!allowed) {
      return NextResponse.json({ error: limitError }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { currentSchedule, userMessage, userPreferences, assignmentId } = await request.json();
    const memory = await getUserAIMemory(supabase, user.id);
    const memoryContext = buildMemoryContext(memory);

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return NextResponse.json({ error: 'AI key not configured' }, { status: 500 });
    }

    const systemPrompt = `You are Bruno, the AI Planning Instrument. You help users manage their daily schedule visually and conversationally.
    
Current Schedule (JSON):
${JSON.stringify(currentSchedule)}

User Preferences/Constraints:
${JSON.stringify(userPreferences)}

User AI Memory:
${memoryContext}

${assignmentId ? await (async () => {
  const { data: assignment } = await (await createClient())
    .from('canvas_assignments')
    .select('*')
    .eq('id', assignmentId)
    .eq('user_id', user.id)
    .single();
  
  if (assignment) {
    return `
ASSIGNMENT CONTEXT:
Title: ${assignment.name}
Details: ${assignment.description || 'No details provided.'}
Due: ${assignment.due_at ? new Date(assignment.due_at).toLocaleString() : 'N/A'}
`;
  }
  return '';
})() : ''}

Rules:
1. Interpret the user's command to mutate the current schedule.
2. Commands might be: "move X to 4 PM", "clear my afternoon", "make my breaks longer", "I need 2 hours for X at 1 PM".
3. Maintain the JSON structure of the schedule blocks, including specific_action, success_condition, why_now, fallback_if_stuck, materials_needed, and break_reason.
4. IMPORTANT: If the user expresses a general preference (e.g. "I hate working before 9 AM", "I want more breaks", "School is until 4 PM now"), extract it into 'learned_preference'.
5. Apply User AI Memory unless the user's new command overrides it.
6. Always return a conversational 'bruno_response' explaining what you did.

Respond ONLY with JSON:
{
  "updated_schedule": [...],
  "bruno_response": "...",
  "learned_preference": { 
    "rule": "Short label", 
    "value": "Value", 
    "type": "constraint|preference|setting",
    "start": "HH:mm (if constraint)", 
    "end": "HH:mm (if constraint)" 
  }
}`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
      }),
    });

    if (!aiResponse.ok) throw new Error('AI API failure');

    const data = await aiResponse.json();
    const result = JSON.parse(data.choices[0].message.content);

    // --- PROACTIVE PREFERENCE LEARNING ---
    if (result.learned_preference) {
      const updatedPrefs = { ...userPreferences };
      
      // Merge learned preference into actual settings
      if (result.learned_preference.type === 'constraint') {
        const newBlock = {
          label: result.learned_preference.rule,
          start: result.learned_preference.start || '09:00',
          end: result.learned_preference.end || '10:00',
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        };
        updatedPrefs.unavailable_blocks = [...(updatedPrefs.unavailable_blocks || []), newBlock];
      } else if (result.learned_preference.type === 'preference') {
        if (result.learned_preference.rule.includes('focus')) {
          updatedPrefs.preferred_focus_time = result.learned_preference.value;
        }
      }

      await supabase
        .from('users')
        .update({ scheduling_preferences: updatedPrefs })
        .eq('id', user.id);

      await updateUserAIMemory(supabase, user.id, {
        learned_rules: [
          ...memory.learned_rules,
          {
            id: `schedule-agent-${Date.now()}`,
            text: `${result.learned_preference.rule}: ${result.learned_preference.value}`,
            feature: 'schedule_agent',
            confidence: 0.7,
            evidence_count: 1,
            last_seen_at: new Date().toISOString(),
          },
        ].slice(-30),
        source_counters: {
          ...memory.source_counters,
          schedule_agent_learned_preference: (memory.source_counters.schedule_agent_learned_preference || 0) + 1,
        },
      });
    }

    return NextResponse.json({ ...result, learned_preference: result.learned_preference });

  } catch (error) {
    console.error('Schedule Agent Error:', error);
    return NextResponse.json({ error: 'Failed to process command' }, { status: 500 });
  }
}
