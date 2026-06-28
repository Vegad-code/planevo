export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  tasks: (userId: string) => ['tasks', userId] as const,
  calendarMonth: (userId: string, year: number, month: number) =>
    ['calendar-events', userId, year, month] as const,
};
