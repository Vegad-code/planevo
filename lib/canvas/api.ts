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
    console.error('Canvas connection test failed:', error);
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
    console.error('Error fetching Canvas courses:', error);
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
    return events
      .filter((e: any) => e.assignment)
      .map((e: any) => ({
        id: e.assignment.id,
        name: e.assignment.name,
        description: e.assignment.description || '',
        due_at: e.assignment.due_at,
        course_id: e.assignment.course_id,
        html_url: e.assignment.html_url
      }));
  } catch (error) {
    console.error('Error fetching Canvas assignments:', error);
    return [];
  }
}
