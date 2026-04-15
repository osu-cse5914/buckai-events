import { Badge } from "@/components/ui/badge";

const COLLECTION_VISIBILITY_STYLES: Record<"PRIVATE" | "PUBLIC", string> = {
  PRIVATE: "bg-slate-100 text-slate-700",
  PUBLIC: "bg-emerald-100 text-emerald-700",
};

export function CollectionVisibilityBadge({
  visibility,
}: {
  visibility: "PRIVATE" | "PUBLIC";
}) {
  return (
    <Badge
      variant="secondary"
      className={COLLECTION_VISIBILITY_STYLES[visibility]}
    >
      {visibility === "PUBLIC" ? "Public" : "Private"}
    </Badge>
  );
}
