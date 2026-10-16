import { Loading } from "@/components/ui";

/** Instant route-level fallback for every (app) page while its segment loads. */
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6">
      <span aria-hidden className="skeleton h-7 w-48 rounded-sm" />
      <Loading />
    </div>
  );
}
