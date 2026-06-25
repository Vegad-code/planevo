import type { UIMessage, UIMessageStreamWriter } from 'ai';
import type { BrunoProgressPayload, BrunoProgressStep } from './bruno-progress';
import {
  activateProgressStep,
  buildInitialProgressSteps,
  buildProgressPayload,
  completeProgressStep,
  upsertProgressStep,
} from './bruno-progress';
import type { BrunoDataParts, BrunoMode } from './types';
import { getBrunoModeLabel } from './bruno-progress';

type BrunoStreamWriter = Pick<
  UIMessageStreamWriter<UIMessage<unknown, BrunoDataParts>>,
  'write'
>;

export class BrunoProgressWriter {
  private steps: BrunoProgressStep[] = buildInitialProgressSteps();
  private phase: BrunoProgressPayload['phase'] = 'working';

  constructor(private readonly writer: BrunoStreamWriter) {
    this.emit();
  }

  private emit() {
    this.writer.write({
      type: 'data-bruno-progress',
      data: buildProgressPayload(this.steps, this.phase),
    });
  }

  markReadDone() {
    this.steps = completeProgressStep(this.steps, 'read', 'safety');
    this.emit();
  }

  markSafetyDone() {
    this.steps = completeProgressStep(this.steps, 'safety', 'route');
    this.emit();
  }

  markRouteDone(mode: BrunoMode, rationale?: string) {
    this.steps = completeProgressStep(this.steps, 'route', 'context');
    this.steps = upsertProgressStep(this.steps, {
      id: 'route',
      label: 'Choosing how to help',
      detail: getBrunoModeLabel(mode),
      status: 'done',
    });
    if (rationale?.trim()) {
      const routeStep = this.steps.find((s) => s.id === 'route');
      if (routeStep) {
        this.steps = upsertProgressStep(this.steps, {
          ...routeStep,
          detail: `${getBrunoModeLabel(mode)} — ${rationale.trim()}`,
        });
      }
    }
    this.emit();
  }

  markContextLoading(detail?: string) {
    this.steps = activateProgressStep(this.steps, 'context');
    if (detail) {
      this.steps = upsertProgressStep(this.steps, {
        id: 'context',
        label: 'Loading your planner context',
        detail,
        status: 'active',
      });
    }
    this.emit();
  }

  markContextDone(detail?: string) {
    this.steps = completeProgressStep(this.steps, 'context');
    if (detail) {
      this.steps = upsertProgressStep(this.steps, {
        id: 'context',
        label: 'Loading your planner context',
        detail,
        status: 'done',
      });
    }
    this.emit();
  }

  markIntegrationsActive(detail?: string) {
    this.steps = upsertProgressStep(this.steps, {
      id: 'integrations',
      label: 'Connecting work tools',
      detail,
      status: 'active',
    });
    this.emit();
  }

  markIntegrationsDone(detail?: string) {
    this.steps = upsertProgressStep(this.steps, {
      id: 'integrations',
      label: 'Connecting work tools',
      detail,
      status: 'done',
    });
    this.emit();
  }

  markGenerating() {
    this.steps = completeProgressStep(
      activateProgressStep(this.steps, 'generate'),
      'generate'
    );
    this.steps = upsertProgressStep(this.steps, {
      id: 'generate',
      label: 'Writing response',
      status: 'active',
    });
    this.emit();
  }

  markComplete() {
    this.steps = this.steps.map((step) =>
      step.status === 'active' || step.status === 'pending'
        ? { ...step, status: 'done' as const }
        : step
    );
    this.phase = 'complete';
    this.emit();
  }

  markError(stepId: string, detail?: string) {
    this.steps = upsertProgressStep(this.steps, {
      id: stepId,
      label:
        this.steps.find((s) => s.id === stepId)?.label ?? 'Something went wrong',
      detail,
      status: 'error',
    });
    this.emit();
  }
}
