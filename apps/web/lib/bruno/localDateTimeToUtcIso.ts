/** Convert a wall-clock datetime in `timeZone` to a UTC ISO string. */
export function localDateTimeToUtcIso(
  year: number,
  month: number,
  day: number,
  hour24: number,
  minute: number,
  timeZone: string
): string {
  let guess = Date.UTC(year, month - 1, day, hour24, minute, 0);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(guess));

    const read = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value ?? "0");

    const actual = Date.UTC(
      read("year"),
      read("month") - 1,
      read("day"),
      read("hour"),
      read("minute")
    );
    const desired = Date.UTC(year, month - 1, day, hour24, minute);
    const diff = desired - actual;
    if (diff === 0) break;
    guess += diff;
  }

  return new Date(guess).toISOString();
}
