import { YouSubpageHeader } from "@/components/you/you-subpage-header";

export function YouCollectionsPage() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <YouSubpageHeader
        title="Collections"
        description="Manage the collections that organize your saved listings."
      />
      <p className="text-sm text-muted-foreground">Placeholder.</p>
    </section>
  );
}
