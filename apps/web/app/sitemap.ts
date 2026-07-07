import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://planevo.ai';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/features', '/pricing', '/about', '/login', '/signup', '/privacy', '/terms', '/cookies'];

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/features' || route === '/pricing' ? 0.9 : 0.7,
  }));
}
