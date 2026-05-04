import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const { allowed, error: limitError } = await checkRateLimit('schedule-agent');
    if (!allowed) {
      return NextResponse.json({ error: limitError }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { currentSchedule, userMessage, userPreferences } = await request.json();

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return NextResponse.json({ error: 'AI key not configured' }, { status: 500 });
    }

    const systemPrompt = `You are Ollie, the AI Life Pilot. You help users manage their daily schedule visually and conversationally.
    
Current Schedule (JSON):
${JSON.stringify(currentSchedule)}

User Preferences/Constraints:
${JSON.stringify(userPreferences)}

Rules:
1. Interpret the user's command to mutate the current schedule.
2. Commands might be: "move X to 4 PM", "clear my afternoon", "make my breaks longer", "I need 2 hours for X at 1 PM".
3. Maintain the JSON structure of the schedule blocks.
4. IMPORTANT: If the user expresses a general preference (e.g. "I hate working before 9 AM", "I want more breaks", "School is until 4 PM now"), extract it into 'learned_preference'.
5. Always return a conversational 'ollie_response' explaining what you did.

Respond ONLY with JSON:
{
  "updated_schedule": [...],
  "ollie_response": "...",
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
    }

    return NextResponse.json({ ...result, learned_preference: result.learned_preference });

  } catch (error) {
    console.error('Schedule Agent Error:', error);
    return NextResponse.json({ error: 'Failed to process command' }, { status: 500 });
  }
}
