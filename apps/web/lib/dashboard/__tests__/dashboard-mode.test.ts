import { describe, expect, it } from 'vitest';
import { getDashboardMode, getPriorityAlerts, getSetupSteps } from '@/lib/dashboard/dashboard-mode';

describe('getDashboardMode', () => {
  const connections = {
    canvasConnected: false,
    canvasDueCount: 0,
    googleConnected: false,
    googleLastSyncedAt: null,
    googleSyncFrequency: 'hourly',
  };

  it('returns active_day when today has blocks', () => {
    expect(
      getDashboardMode({
        hasTodayBlocks: true,
        openTaskCount: 0,
        canvasDueCount: 0,
        weekAgendaCount: 0,
        connections,
      })
    ).toBe('active_day');
  });

  it('returns needs_plan when tasks exist but no blocks', () => {
    expect(
      getDashboardMode({
        hasTodayBlocks: false,
        openTaskCount: 3,
        canvasDueCount: 0,
        weekAgendaCount: 0,
        connections,
      })
    ).toBe('needs_plan');
  });

  it('returns onboarding for empty new user', () => {
    expect(
      getDashboardMode({
        hasTodayBlocks: false,
        openTaskCount: 0,
        canvasDueCount: 0,
        weekAgendaCount: 0,
        connections,
      })
    ).toBe('onboarding');
  });

  it('returns caught_up when integrated but nothing pending', () => {
    expect(
      getDashboardMode({
        hasTodayBlocks: false,
        openTaskCount: 0,
        canvasDueCount: 0,
        weekAgendaCount: 0,
        connections: { ...connections, googleConnected: true },
      })
    ).toBe('caught_up');
  });
});

describe('getSetupSteps', () => {
  it('marks canvas step complete when connected', () => {
    const steps = getSetupSteps(
      {
        canvasConnected: true,
        canvasDueCount: 0,
        googleConnected: false,
        googleLastSyncedAt: null,
        googleSyncFrequency: 'hourly',
      },
      false
    );
    expect(steps.find((s) => s.id === 'canvas')?.completed).toBe(true);
  });
});

describe('getPriorityAlerts', () => {
  it('includes canvas due alert', () => {
    const alerts = getPriorityAlerts([], {
      canvasConnected: true,
      canvasDueCount: 2,
      googleConnected: true,
      googleLastSyncedAt: new Date().toISOString(),
      googleSyncFrequency: 'hourly',
    });
    expect(alerts.some((a) => a.kind === 'canvas_due')).toBe(true);
  });
});
