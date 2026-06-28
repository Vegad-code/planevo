import {
  inferEventDateTimeFromText,
  parseIsoDateTimeToUtcIso,
} from "@/lib/bruno/inferEventDateTime";

type ProposalArgs = Record<string, unknown>;

export function enrichTimeBlockProposal(
  args: ProposalArgs,
  context: {
    texts: string[];
    timeZone: string;
    referenceDate?: Date;
  }
): ProposalArgs {
  if (args.type !== "CREATE_TIME_BLOCK") return args;

  const payload =
    typeof args.payload === "object" && args.payload !== null
      ? (args.payload as Record<string, unknown>)
      : {};

  const existingStart = payload.startTime ?? payload.start_time;
  if (parseIsoDateTimeToUtcIso(existingStart, context.timeZone)) {
    return args; // only skip inference if startTime is a strict ISO datetime
  }

  const combinedText = [
    typeof existingStart === "string" ? existingStart : "",
    ...context.texts,
    typeof args.title === "string" ? args.title : "",
    typeof args.description === "string" ? args.description : "",
  ]
    .filter(Boolean)
    .join(" ");

  const inferred = inferEventDateTimeFromText(
    combinedText,
    context.timeZone,
    context.referenceDate
  );
  if (!inferred) return args;

  return {
    ...args,
    payload: {
      ...payload,
      startTime: inferred.startTime,
      endTime: inferred.endTime,
      durationMinutes: payload.durationMinutes ?? inferred.durationMinutes,
      source: "bruno",
    },
  };
}

export function extractLastUserMessageText(
  messages: Array<{ role?: string; parts?: Array<{ type?: string; text?: string }>; content?: unknown }>
): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    const textPart = message.parts?.find((part) => part.type === "text")?.text;
    if (textPart) return textPart;
    if (typeof message.content === "string") return message.content;
  }
  return "";
}
