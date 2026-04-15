export function CollectionMetaText({
  visibility,
  countLabel,
}: {
  visibility: "PRIVATE" | "PUBLIC";
  countLabel: string;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {visibility === "PUBLIC" ? "Public" : "Private"} · {countLabel}
    </p>
  );
}
