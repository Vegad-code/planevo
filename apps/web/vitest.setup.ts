import '@testing-library/jest-dom/vitest';

process.env.STRIPE_SECRET_KEY = 'test-stripe-secret-key';
process.env.STRIPE_PRICE_STUDENT = 'test-stripe-student';
process.env.STRIPE_PRICE_MONTHLY = 'test-stripe-monthly';
process.env.STRIPE_PRICE_ANNUAL = 'test-stripe-annual';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.RESEND_API_KEY = 'test-resend-api-key';
