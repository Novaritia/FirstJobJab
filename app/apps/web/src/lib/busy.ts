/** Global "work in flight" signal for TopLoader: API requests (counter) + one pending route navigation. */
let requests = 0;
let nav = false;
let navTimer: ReturnType<typeof setTimeout> | undefined;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const busy = {
  active: () => requests > 0 || nav,
  subscribe(f: () => void) {
    subs.add(f);
    return () => { subs.delete(f); };
  },
  track<T>(p: Promise<T>): Promise<T> {
    requests++;
    emit();
    return p.finally(() => { requests--; emit(); });
  },
  /** on=true at transition start; false when Next commits the URL. 10s safety net for aborted navigations. */
  nav(on: boolean) {
    if (nav === on) return;
    nav = on;
    clearTimeout(navTimer);
    if (on) navTimer = setTimeout(() => busy.nav(false), 10_000);
    emit();
  },
};
