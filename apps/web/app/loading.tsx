import React from 'react';
import { PlanevoLoader } from '@/components/branding/PlanevoLoader';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-[#111113]">
      <PlanevoLoader size={64} mode="loading" />
    </div>
  );
}
