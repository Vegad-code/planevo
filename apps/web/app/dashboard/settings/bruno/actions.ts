'use server';

import { createClient } from '@/lib/supabase/server';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { updateUserAIMemory, getUserAIMemory, UserAiMemoryPatch, UserAiMemory } from '@/lib/ai/memory';
import { generateObject, jsonSchema } from 'ai';
import { openai } from '@ai-sdk/openai';
import { revalidatePath } from 'next/cache';

export async function updateBrunoMemoryAction(patch: UserAiMemoryPatch) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    await updateUserAIMemory(supabase, user.id, patch);
    
    revalidatePath('/dashboard/settings/bruno');
    return { success: true };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('[updateBrunoMemoryAction] error:', err);
    return { success: false, error: err.message || 'Failed to update preferences.' };
  }
}

export async function resetBrunoMemoryAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const { error } = await supabase
      .from('user_ai_memory')
      .update({
        learned_rules: [],
        disliked_patterns: [],
        accepted_patterns: [],
        task_duration_preferences: [],
        task_time_preferences: [],
        task_grouping_preferences: []
      })
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Failed to reset memory row:', error);
      return { success: false, error: 'Failed to reset memory' };
    }
    
    revalidatePath('/dashboard/settings/bruno');
    return { success: true };
  } catch (error) {
    console.error('Failed to reset Bruno memory:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function deleteMemoryRuleAction(ruleId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const memory = await getUserAIMemory(supabase, user.id);
    await updateUserAIMemory(supabase, user.id, {
      learned_rules: memory.learned_rules.filter(rule => rule.id !== ruleId)
    });
    
    revalidatePath('/dashboard/settings/bruno');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete rule:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function updateMemoryLearningSettingsAction(learningEnabled: boolean) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const memory = await getUserAIMemory(supabase, user.id);
    await updateUserAIMemory(supabase, user.id, {
      memory_learning_settings: {
        ...memory.memory_learning_settings,
        learning_enabled: learningEnabled
      }
    });
    
    revalidatePath('/dashboard/settings/bruno');
    return { success: true };
  } catch (error) {
    console.error('Failed to update learning settings:', error);
    return { success: false, error: 'Internal server error' };
  }
}

const llmImportSchema = jsonSchema<{
  tone_preference?: { style?: 'direct' | 'warm' | 'coach' | null; response_length?: 'brief' | 'standard' | 'detailed' | null; emoji_level?: 'none' | 'low' | 'medium' | null; avoid_phrases?: string[] | null } | null;
  task_detail_preference?: { detail_level?: 'brief' | 'standard' | 'high' | null; require_success_condition?: boolean | null; require_materials?: boolean | null; require_why_now?: boolean | null } | null;
  planning_style?: { mode?: 'strict' | 'balanced' | 'flexible' | null; proactivity?: 'silent' | 'light' | 'active' | 'high' | null } | null;
  explicit_rules?: string[] | null;
  disliked_things?: string[] | null;
  accepted_things?: string[] | null;
}>({
  type: 'object',
  additionalProperties: false,
  required: ['tone_preference', 'task_detail_preference', 'planning_style', 'explicit_rules', 'disliked_things', 'accepted_things'],
  properties: {
    explicit_rules: { type: ['array', 'null'], items: { type: 'string' } },
    disliked_things: { type: ['array', 'null'], items: { type: 'string' } },
    accepted_things: { type: ['array', 'null'], items: { type: 'string' } },
    tone_preference: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['style', 'response_length', 'emoji_level', 'avoid_phrases'],
      properties: {
        style: { type: ['string', 'null'], enum: ['direct', 'warm', 'coach', null] },
        response_length: { type: ['string', 'null'], enum: ['brief', 'standard', 'detailed', null] },
        emoji_level: { type: ['string', 'null'], enum: ['none', 'low', 'medium', null] },
        avoid_phrases: { type: ['array', 'null'], items: { type: 'string' } },
      },
    },
    task_detail_preference: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['detail_level', 'require_success_condition', 'require_materials', 'require_why_now'],
      properties: {
        detail_level: { type: ['string', 'null'], enum: ['brief', 'standard', 'high', null] },
        require_success_condition: { type: ['boolean', 'null'] },
        require_materials: { type: ['boolean', 'null'] },
        require_why_now: { type: ['boolean', 'null'] },
      },
    },
    planning_style: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['mode', 'proactivity'],
      properties: {
        mode: { type: ['string', 'null'], enum: ['strict', 'balanced', 'flexible', null] },
        proactivity: { type: ['string', 'null'], enum: ['silent', 'light', 'active', 'high', null] },
      },
    },
  },
});

export async function parseLLMImportAction(rawText: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!rawText.trim()) {
      return { success: false, error: 'No text provided.' };
    }

    const { object } = await generateObject({
      model: openai('gpt-5.4-nano'),
      schema: llmImportSchema,
      prompt: `Extract settings and preferences from the user's raw pasted instructions and map them to the schema.
      
If they say things like "no emojis", set emoji_level to none.
If they say "be concise", set detail_level to brief.
If they mention words/phrases to avoid (e.g. "don't say 'As an AI'"), add them to avoid_phrases.
If they have explicit rules like "Always break down tasks into 30m chunks" or "I am a student at X", add those verbatim to explicit_rules.
If they mention things they hate or dislike doing, add to disliked_things.
If they mention things they love or prefer doing, add to accepted_things.
If they don't explicitly mention something, omit it from the response.

Raw pasted instructions:
"""
${rawText}
"""
`,
    });

    return { success: true, data: object };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('[parseLLMImportAction] error:', err);
    return { success: false, error: err.message || 'Failed to parse instructions.' };
  }
}

export async function updateBrunoDataAccessAction(
  key: 'bruno_access_tasks' | 'bruno_access_calendar' | 'bruno_access_canvas' | 'bruno_access_integrations',
  value: boolean
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
      .from('users')
      .select('scheduling_preferences')
      .eq('id', user.id)
      .single();

    const existingPrefs = (profile?.scheduling_preferences as Record<string, any>) || {};
    const newPrefs = {
      ...existingPrefs,
      [key]: value,
    };

    const { error: updateError } = await supabase
      .from('users')
      .update({ scheduling_preferences: newPrefs })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update scheduling preferences:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath('/dashboard/settings/bruno');
    return { success: true };
  } catch (err: any) {
    console.error('[updateBrunoDataAccessAction] error:', err);
    return { success: false, error: err.message || 'Failed to save settings.' };
  }
}

