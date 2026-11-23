// src/lib/utils.ts
function toISO(d) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4);
  return z.toISOString().slice(0, 10);
}
function addDays(iso, n) {
  const d = /* @__PURE__ */ new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function weekStart(iso) {
  const d = /* @__PURE__ */ new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - d.getDay());
  return toISO(d);
}

// src/lib/schedule.ts
var DAY_MS = 864e5;
var daysBetween = (from, to) => Math.round(((/* @__PURE__ */ new Date(to + "T12:00:00")).getTime() - (/* @__PURE__ */ new Date(from + "T12:00:00")).getTime()) / DAY_MS);
var weekday = (iso) => (/* @__PURE__ */ new Date(iso + "T12:00:00")).getDay();
function scheduleOf(p) {
  if (p.schedule) return p.schedule;
  if (/מתחילים|כל הגוף/.test(p.name) && p.days.length <= 3) return { kind: "weekly", weekdays: [0, 2, 4] };
  return { kind: "cycle", pattern: [...p.days.map((_, i) => i), "rest"] };
}
function lastProgramWorkout(p, workouts) {
  let best = null;
  for (const w of workouts) {
    let dayIndex = -1;
    if (w.program_id === p.id && w.program_day != null && w.program_day < p.days.length) dayIndex = w.program_day;
    else if (!w.program_id) dayIndex = p.days.findIndex((d) => d.name === w.name);
    if (dayIndex < 0) continue;
    const created = w.created_at ?? "";
    if (!best || w.date > best.date || w.date === best.date && created > best.created) best = { date: w.date, created, dayIndex };
  }
  return best && { date: best.date, dayIndex: best.dayIndex };
}
function planFor(p, s, date, last) {
  if (s.kind === "weekly") {
    if (!s.weekdays.includes(weekday(date))) return { train: false };
    return { train: true, dayIndex: last ? (last.dayIndex + 1) % p.days.length : 0 };
  }
  const pat = s.pattern;
  const firstWorkout = pat.find((x) => x !== "rest");
  if (firstWorkout === void 0) return { train: false };
  if (!last) return { train: true, dayIndex: firstWorkout };
  let pos = Math.max(0, pat.indexOf(last.dayIndex));
  let rest = 0, next = firstWorkout;
  for (let k = 1; k <= pat.length; k++) {
    const slot = pat[(pos + k) % pat.length];
    if (slot === "rest") rest++;
    else {
      next = slot;
      break;
    }
  }
  return daysBetween(last.date, date) <= rest ? { train: false } : { train: true, dayIndex: next };
}
function planToday(p, workouts, today) {
  if (!p.days.length) return null;
  const s = scheduleOf(p);
  const last = lastProgramWorkout(p, workouts);
  const nextAfter = (from, l) => {
    for (let k = 1; k <= 14; k++) {
      const date = addDays(from, k);
      const r2 = planFor(p, s, date, l);
      if (r2.train) return { dayIndex: r2.dayIndex, date };
    }
    return void 0;
  };
  if (last && last.date === today) return { kind: "done", dayIndex: last.dayIndex, next: nextAfter(today, last) };
  const r = planFor(p, s, today, last);
  return r.train ? { kind: "train", dayIndex: r.dayIndex } : { kind: "rest", next: nextAfter(today, last) };
}
function activeProgram(programs, workouts, profile) {
  if (!programs.length) return null;
  const chosen = programs.find((p) => p.id === profile.active_program_id);
  if (chosen) return chosen;
  const recent = [...workouts].filter((w) => w.program_id).sort((a, b) => b.date.localeCompare(a.date))[0];
  return programs.find((p) => p.id === recent?.program_id) ?? programs[programs.length - 1];
}

// src/lib/reminders.ts
var DEFAULT_REMINDER_TIME = "18:00";
var CHECK_EVERY_MIN = 15;
var NO_WORKOUT_FROM_WEEKDAY = 2;
function localNow(now, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).map((p) => [p.type, p.value])
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: (/* @__PURE__ */ new Date(date + "T12:00:00Z")).getUTCDay() };
}
function isDue(profile, now) {
  if (!profile.reminder_enabled) return false;
  const local = localNow(now, profile.reminder_tz || "Asia/Jerusalem");
  const [h, m] = (profile.reminder_time || DEFAULT_REMINDER_TIME).split(":").map(Number);
  const late = local.minutes - (h * 60 + m);
  return late >= 0 && late < CHECK_EVERY_MIN && profile.last_reminded_on !== local.date;
}
var HISTORY_DAYS = 60;
function decideReminder(profile, workouts, programs, now) {
  if (!isDue(profile, now)) return null;
  const local = localNow(now, profile.reminder_tz || "Asia/Jerusalem");
  if (workouts.some((w) => w.date === local.date)) return null;
  const program = activeProgram(programs, workouts, profile);
  if (program && profile.remind_training_day !== false) {
    const plan = planToday(program, workouts, local.date);
    if (plan?.kind === "train") {
      const day = program.days[plan.dayIndex];
      return {
        kind: "training_day",
        title: `\u{1F4AA} \u05D4\u05D9\u05D5\u05DD \u05D9\u05E9 \u05DC\u05DA \u05D0\u05D9\u05DE\u05D5\u05DF: ${day.name}`,
        body: `${day.exercises.length} \u05EA\u05E8\u05D2\u05D9\u05DC\u05D9\u05DD \u05DE\u05D7\u05DB\u05D9\u05DD \u05DC\u05DA. \u05DC\u05D7\u05E5 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC.`,
        url: `/#/workouts/new?program=${program.id}&day=${plan.dayIndex}`
      };
    }
  }
  if (profile.remind_no_workout !== false && local.weekday >= NO_WORKOUT_FROM_WEEKDAY) {
    const start = weekStart(local.date);
    const end = addDays(start, 6);
    if (!workouts.some((w) => w.date >= start && w.date <= end)) {
      return {
        kind: "no_workout",
        title: "\u05E2\u05D5\u05D3 \u05DC\u05D0 \u05D4\u05EA\u05D0\u05DE\u05E0\u05EA \u05D4\u05E9\u05D1\u05D5\u05E2 \u{1F3C3}",
        body: "\u05D2\u05DD \u05D0\u05D9\u05DE\u05D5\u05DF \u05E7\u05E6\u05E8 \u05E9\u05DC 20 \u05D3\u05E7\u05D5\u05EA \u05E2\u05D3\u05D9\u05E3 \u05E2\u05DC \u05DB\u05DC\u05D5\u05DD. \u05D1\u05D5\u05D0 \u05E0\u05EA\u05D7\u05D9\u05DC!",
        url: "/#/"
      };
    }
  }
  return null;
}
export {
  CHECK_EVERY_MIN,
  DEFAULT_REMINDER_TIME,
  HISTORY_DAYS,
  decideReminder,
  isDue,
  localNow
};
