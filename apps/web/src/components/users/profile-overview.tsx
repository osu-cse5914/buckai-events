import type { ReactNode } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  FramedList,
  FramedListInset,
  FramedListItems,
} from "@/components/ui/framed-list";

type ProfileOverviewStat = {
  value: number;
  label: string;
  onClick?: () => void;
};

type ProfileOverviewField = {
  label: string;
  value: ReactNode;
  className?: string;
};

export function ProfileOverview({
  title,
  subtitle,
  action,
  imageUrl,
  avatarFallback,
  stats,
  detailFields,
  detailFooter,
  extraSection,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  imageUrl?: string | null;
  avatarFallback: string;
  stats: ProfileOverviewStat[];
  detailFields: ProfileOverviewField[];
  detailFooter?: ReactNode;
  extraSection?: ReactNode;
}) {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar size="lg" className="size-16">
            {imageUrl ? <AvatarImage src={imageUrl} alt={title} /> : null}
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>

          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {subtitle ? (
                <div className="mt-1 text-sm text-muted-foreground">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-6">
              {stats.map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  className="text-left disabled:pointer-events-none"
                  onClick={stat.onClick}
                  disabled={!stat.onClick}
                >
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                    {stat.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <FramedList>
        <FramedListItems>
          {detailFields.map((field) => (
            <ProfileOverviewFieldBlock
              key={field.label}
              label={field.label}
              value={field.value}
              className={field.className}
            />
          ))}
        </FramedListItems>
        {detailFooter ? (
          <FramedListInset className="border-t py-6">{detailFooter}</FramedListInset>
        ) : null}
      </FramedList>

      {extraSection}
    </section>
  );
}

function ProfileOverviewFieldBlock({
  label,
  value,
  className,
}: ProfileOverviewField) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm sm:max-w-[65%] sm:text-right sm:text-base">{value}</div>
      </div>
    </div>
  );
}
