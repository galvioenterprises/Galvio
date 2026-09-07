import { site } from "@/config/site";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
        {site.shortName}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {site.name}
      </h1>
      <p className="max-w-md text-balance text-neutral-600 dark:text-neutral-400">
        {site.description} Our catalogue goes live shortly.
      </p>
    </main>
  );
}
