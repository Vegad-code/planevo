import { inferEventDateTimeFromText } from "@/lib/bruno/inferEventDateTime";

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

  if (startRaw) {
    const start = new Date(startRaw);
    if (Number.isNaN(start.getTime())) {
      throw new Error("Invalid start time on proposal");
    }

    let end: Date;
    if (endRaw) {
      end = new Date(endRaw);
      if (Number.isNaN(end.getTime())) {
        throw new Error("Invalid end time on proposal");
      }
    } else {
      end = new Date(start.getTime() + durationMinutes * 60_000);
    }

    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + durationMinutes * 60_000);
    }

    return {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
  }

  const timeZone = options.timeZone ?? "UTC";
  const hintTexts = [
    ...(options.hintTexts ?? []),
    options.title ?? "",
    options.description ?? "",
  ].filter(Boolean);

  const inferred = inferEventDateTimeFromText(
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
