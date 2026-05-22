export interface CanvasSchool {
  name: string;
  domain: string;
  isPopular?: boolean;
}

export const POPULAR_SCHOOLS: CanvasSchool[] = [
  { name: 'Arizona State University', domain: 'asu.instructure.com', isPopular: true },
  { name: 'University of Central Florida', domain: 'webcourses.ucf.edu', isPopular: true },
  { name: 'Harvard University', domain: 'canvas.harvard.edu', isPopular: true },
  { name: 'Stanford University', domain: 'canvas.stanford.edu', isPopular: true },
  { name: 'Ohio State University', domain: 'osu.instructure.com', isPopular: true },
  { name: 'University of Texas at Austin', domain: 'utexas.instructure.com', isPopular: true },
  { name: 'Pennsylvania State University', domain: 'psu.instructure.com', isPopular: true },
  { name: 'University of Michigan', domain: 'umich.instructure.com', isPopular: true },
  { name: 'University of Florida', domain: 'elearning.ufl.edu', isPopular: true },
  { name: 'Texas A&M University', domain: 'canvas.tamu.edu', isPopular: true },
  { name: 'Rutgers University', domain: 'canvas.rutgers.edu', isPopular: true },
  { name: 'University of Washington', domain: 'canvas.uw.edu', isPopular: true },
  { name: 'Purdue University', domain: 'purdue.instructure.com', isPopular: true },
  { name: 'University of Wisconsin-Madison', domain: 'canvas.wisc.edu', isPopular: true },
  { name: 'University of Minnesota', domain: 'canvas.umn.edu', isPopular: true },
  { name: 'Cornell University', domain: 'canvas.cornell.edu', isPopular: true },
  { name: 'Columbia University', domain: 'canvas.columbia.edu', isPopular: true },
  { name: 'University of California, Berkeley', domain: 'bcourses.berkeley.edu', isPopular: true },
  { name: 'University of California, Los Angeles', domain: 'bruinlearn.ucla.edu', isPopular: true },
  { name: 'University of California, San Diego', domain: 'canvas.ucsd.edu', isPopular: true },
  { name: 'Georgia Institute of Technology', domain: 'canvas.gatech.edu', isPopular: true },
  { name: 'North Carolina State University', domain: 'wolfware.ncsu.edu', isPopular: true },
  { name: 'University of North Carolina at Chapel Hill', domain: 'canvas.unc.edu', isPopular: true },
  { name: 'Florida State University', domain: 'canvas.fsu.edu', isPopular: true },
  { name: 'University of Southern California', domain: 'canvas.usc.edu', isPopular: true },
  { name: 'Northeastern University', domain: 'canvas.northeastern.edu', isPopular: true },
  { name: 'Boston University', domain: 'canvas.bu.edu', isPopular: true },
  { name: 'Utah Valley University', domain: 'uvu.instructure.com', isPopular: true },
  { name: 'Brigham Young University', domain: 'byu.instructure.com', isPopular: true },
  { name: 'University of Utah', domain: 'utah.instructure.com', isPopular: true },
];

export function findSchool(query: string): CanvasSchool[] {
  const q = query.toLowerCase();
  return POPULAR_SCHOOLS.filter(s => 
    s.name.toLowerCase().includes(q) || 
    s.domain.toLowerCase().includes(q)
  );
}

export function getSchoolConfig(domain: string): CanvasSchool | undefined {
  const normalizedDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return POPULAR_SCHOOLS.find(s => s.domain === normalizedDomain);
}
