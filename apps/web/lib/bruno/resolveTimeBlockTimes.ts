import { parseIsoDateTimeToUtcIso } from "@/lib/bruno/inferEventDateTime";
import { inferFlexibleEventDateTime } from "@/lib/bruno/dates";

type TimeBlockPayload = {
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  estimatedMinutes?: number;
  dueDate?: string;
};

type ResolveTimeBlockOptions = {
  title?: string;
  description?: string;
  hintTexts?: string[];
  timeZone?: string;
  referenceDate?: Date;
};

export function resolveTimeBlockTimes(
  payload: TimeBlockPayload,
  options: ResolveTimeBlockOptions = {}
): {
  startTime: string;
  endTime: string;
} {
  const startRaw =
    payload.startTime ?? payload.start_time ?? payload.dueDate ?? null;
  const endRaw = payload.endTime ?? payload.end_time ?? null;
  const durationMinutes =
    payload.durationMinutes ??
    payload.duration_minutes ??
    payload.estimatedMinutes ??
    60;
  const timeZone = options.timeZone ?? "UTC";

  if (startRaw) {
    const startIso = parseIsoDateTimeToUtcIso(startRaw, timeZone);

    if (startIso) {
      const start = new Date(startIso);
      let endIso: string | null = null;
      if (endRaw) {
        endIso = parseIsoDateTimeToUtcIso(endRaw, timeZone);
        if (!endIso) {
          throw new Error("Invalid end time on proposal");
        }
      }

      let end = endIso
        ? new Date(endIso)
        : new Date(start.getTime() + durationMinutes * 60_000);
      if (end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + durationMinutes * 60_000);
      }
      return {
        startTime: startIso,
        endTime: end.toISOString(),
      };
    }

    // startRaw exists but is not strict ISO (e.g. "July 28 at 9 AM").
    // Fall through to text inference using it as an additional hint.
    const hintTexts = [
      startRaw,
      ...(options.hintTexts ?? []),
      options.title ?? "",
      options.description ?? "",
    ].filter(Boolean);

    const inferred = inferFlexibleEventDateTime(
      hintTexts.join(" "),
      timeZone,
      options.referenceDate ?? new Date(),
      durationMinutes
    );

    if (!inferred) {
      throw new Error(
        "Could not determine the event date and time. Ask Bruno to regenerate the proposal with a specific date and time."
      );
    }

    return {
      startTime: inferred.startTime,
      endTime: inferred.endTime,
    };
  }

  const hintTexts = [
    ...(options.hintTexts ?? []),
    options.title ?? "",
    options.description ?? "",
  ].filter(Boolean);

  const inferred = inferFlexibleEventDateTime(
    hintTexts.join(" "),
    timeZone,
    options.referenceDate ?? new Date(),
    durationMinutes
  );

  if (!inferred) {
    throw new Error(
      "Could not determine the event date and time. Ask Bruno to regenerate the proposal with a specific date and time."
    );
  }

  return {
    startTime: inferred.startTime,
    endTime: inferred.endTime,
  };
}
