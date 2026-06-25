/**
 * Zod API contracts aligned with docs/openapi.yaml.
 * JSON Schema generation is maintained manually in openapi.yaml to avoid
 * zod-to-json-schema version drift; this module is the runtime source of truth.
 */
import {
  authChangePasswordBodySchema,
  authPasswordResetBodySchema,
  authSignInBodySchema,
  authSignUpBodySchema,
  composioConnectBodySchema,
  googleCalendarsSaveBodySchema,
  metricsTrackBodySchema,
  scheduleBodySchema,
} from './schemas';

export const apiContractSchemas = {
  AuthSignInBody: authSignInBodySchema,
  AuthSignUpBody: authSignUpBodySchema,
  AuthPasswordResetBody: authPasswordResetBodySchema,
  AuthChangePasswordBody: authChangePasswordBodySchema,
  MetricsTrackBody: metricsTrackBodySchema,
  GoogleCalendarsSaveBody: googleCalendarsSaveBodySchema,
  ComposioConnectBody: composioConnectBodySchema,
  ScheduleBody: scheduleBodySchema,
} as const;

export type ApiContractName = keyof typeof apiContractSchemas;
