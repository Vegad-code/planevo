import { PlanevoLoader } from '@/components/branding/PlanevoLoader';

export function RouteLoading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <PlanevoLoader size={48} mode="loading" />
    </div>
  );
}
