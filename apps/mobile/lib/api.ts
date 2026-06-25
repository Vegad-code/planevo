export function getApiUrl(): string {
  let apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    if (__DEV__) apiUrl = 'http://localhost:3000';
    else throw new Error('EXPO_PUBLIC_API_URL is required in production builds.');
  }
  return apiUrl.replace(/\/$/, '');
}
