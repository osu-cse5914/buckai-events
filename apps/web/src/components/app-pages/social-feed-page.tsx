import { SocialFeedPageContent } from "@/components/app-pages/social-feed-section";

export function SocialFeedPage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Social
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Social Feed</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Track what people you follow are creating and saving across Social OSU.
          </p>
        </div>
      </header>

      <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
        <SocialFeedPageContent />
      </div>
    </section>
  );
}
