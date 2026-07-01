/**
 * lib/canvas.ts
 * Utility for interacting with the Canvas LMS API.
 */

export interface CanvasAssignment {
  id: number;
  name: string;
  description: string;
  due_at: string;
  course_id: number;
  html_url: string;
}

export async function fetchCanvasUpcoming(url: string, token: string): Promise<CanvasAssignment[]> {
  try {
    // Sanitize URL
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // We use the planner/items endpoint to get a unified list of upcoming work
    // documented at: https://canvas.instructure.com/doc/api/planner.html
    const response = await fetch(`${baseUrl}/api/v1/planner/items?filter=new_activity`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Canvas API error: ${response.statusText}`);
    }

    const items = await response.json();
    
    // Filter for assignments with due dates
    return items
      .filter((item: Record<string, unknown>) => item.plannable_type === 'assignment' && (item.plannable as Record<string, unknown>)?.due_at)
      .map((item: Record<string, unknown>) => {
        const plannable = item.plannable as Record<string, unknown>;
        return {
          id: item.plannable_id as number,
          name: (plannable.title || plannable.name) as string,
          description: (plannable.description as string) || '',
          due_at: plannable.due_at as string,
          course_id: item.course_id as number,
          html_url: item.html_url as string
        };
      });

  } catch (error) {
    console.error('[Canvas] Error fetching planner items:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function validateCanvasConnection(url: string, token: string): Promise<boolean> {
  try {
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const response = await fetch(`${baseUrl}/api/v1/users/self`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    return response.ok;
  } catch (err) {
    console.warn('[Canvas] Connection validation failed:', err instanceof Error ? err.message : err);
    return false;
  }
}
