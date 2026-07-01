/**
 * Canvas LMS API Utility
 * Handles fetching assignments and courses from a user's Canvas instance.
 */

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description: string;
  due_at: string;
  course_id: number | string;
  html_url: string;
  type?: 'assignment' | 'milestone' | 'event';
  context_type?: string;
}

/**
 * Tests the connection to Canvas by fetching the user's profile or courses.
 */
export async function testCanvasConnection(url: string, token: string): Promise<boolean> {
  try {
    const cleanUrl = url.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/v1/users/self`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.ok;
  } catch (error) {
    console.warn('[Canvas] Connection test failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Fetches active courses for the user.
 */
export async function fetchCanvasCourses(url: string, token: string): Promise<CanvasCourse[]> {
  try {
    const cleanUrl = url.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/v1/courses?enrollment_state=active`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch courses');
    return await response.json();
  } catch (error) {
    console.error('[Canvas] Error fetching courses:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Fetches upcoming assignments for the user.
 */
export async function fetchCanvasUpcoming(url: string, token: string): Promise<CanvasAssignment[]> {
  try {
    const cleanUrl = url.replace(/\/$/, '');
    // Fetch upcoming events
    const response = await fetch(`${cleanUrl}/api/v1/users/self/upcoming_events`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch assignments');
    const events = await response.json();
    
    // Filter for assignment types and transform
    return (events as Record<string, unknown>[])
      .filter((e) => !!e.assignment)
      .map((e) => {
        const a = e.assignment as Record<string, unknown>;
        return {
          id: a.id as number,
          name: a.name as string,
          description: (a.description as string) || '',
          due_at: a.due_at as string,
          course_id: a.course_id as number | string,
          html_url: a.html_url as string
        };
      });
  } catch (error) {
    console.error('[Canvas] Error fetching assignments:', error instanceof Error ? error.message : error);
    return [];
  }
}
