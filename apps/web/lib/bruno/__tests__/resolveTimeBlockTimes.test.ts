import { describe, expect, it } from "vitest";
import { inferEventDateTimeFromText } from "@/lib/bruno/inferEventDateTime";
import { resolveTimeBlockTimes } from "@/lib/bruno/resolveTimeBlockTimes";

describe("inferEventDateTimeFromText", () => {
  it("parses '3 pm on july 29' in America/New_York", () => {
    const referenceDate = new Date("2026-06-21T12:00:00.000Z");
    const result = inferEventDateTimeFromText(
      "can you add event to my calender to take my dog to get groomed at 3 pm on july 29",
      "America/New_York",
      referenceDate
    );

    expect(result).not.toBeNull();
    expect(result?.startTime).toContain("2026-07-29T");
    expect(new Date(result!.startTime).getUTCHours()).toBe(19);
  });

  it("parses 'July 29 at 3 PM'", () => {
    const result = inferEventDateTimeFromText(
      "Dog grooming on July 29 at 3 PM",
      "UTC",
      new Date("2026-06-21T12:00:00.000Z")
    );

    expect(result?.startTime).toBe("2026-07-29T15:00:00.000Z");
  });
});

describe("resolveTimeBlockTimes", () => {
  it("uses startTime and endTime when provided", () => {
    const result = resolveTimeBlockTimes({
      startTime: "2026-07-29T15:00:00.000Z",
      endTime: "2026-07-29T16:00:00.000Z",
    });

    expect(result.startTime).toBe("2026-07-29T15:00:00.000Z");
    expect(result.endTime).toBe("2026-07-29T16:00:00.000Z");
  });

  it("infers from user prompt when payload is empty", () => {
    const result = resolveTimeBlockTimes(
      {},
      {
        title: "Dog Grooming Appointment",
        description: "Take my dog to get groomed and trimmed.",
        hintTexts: [
          "add an event to my calendar to take my dog to get groomed at 3 pm on july 29",
        ],
        timeZone: "UTC",
        referenceDate: new Date("2026-06-21T12:00:00.000Z"),
      }
    );

    expect(result.startTime).toBe("2026-07-29T15:00:00.000Z");
  });

  it("throws when no time can be determined", () => {
    expect(() =>
      resolveTimeBlockTimes(
        {},
        {
          title: "Dog Grooming Appointment",
          description: "Take my dog to get groomed and trimmed.",
          timeZone: "UTC",
        }
      )
    ).toThrow("Could not determine the event date and time");
  });
});
