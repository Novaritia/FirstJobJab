import { busy } from "@/lib/busy";

// The App Router writes history (push or replace) when a navigation commits: that is "done" for TopLoader.
for (const k of ["pushState", "replaceState"] as const) {
  const original = window.history[k];
  window.history[k] = function (this: History, ...args: Parameters<History["pushState"]>) {
    original.apply(this, args);
    busy.nav(false);
  };
}

export function onRouterTransitionStart(_url: string, type: "push" | "replace" | "traverse") {
  if (type !== "traverse") busy.nav(true); // back/forward is served from the router cache
}
