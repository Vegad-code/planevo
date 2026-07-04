import { redirect } from 'next/navigation';
import { getDayPlanPageData } from '@/lib/plan/get-day-plan-data';
import { DailyPlanView } from '@/components/daily-plan/DailyPlanView';

export default async function DailyPlanPage() {
  const data = await getDayPlanPageData();

  if (!data) {
    redirect('/login');
  }

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <DailyPlanView initialData={data} />
    </div>
  );
}
