import { redirect } from 'next/navigation';
import { getDayPlanPageData } from '@/lib/plan/get-day-plan-data';
import { DailyPlanView } from '@/components/daily-plan/DailyPlanView';

export default async function DailyPlanPage() {
  const data = await getDayPlanPageData();

  if (!data) {
    redirect('/login');
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      <DailyPlanView initialData={data} />
    </div>
  );
}
