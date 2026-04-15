import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  eyebrow,
  title,
  description,
  action,
  communityTitle,
  communityDescription,
  stats,
  communityFooter,
  detailTitle,
  detailDescription,
  detailFields,
  detailFooter,
  extraSection,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  communityTitle: string;
  communityDescription: string;
  stats: ProfileOverviewStat[];
  communityFooter?: ReactNode;
  detailTitle: string;
  detailDescription?: string;
  detailFields: ProfileOverviewField[];
  detailFooter?: ReactNode;
  extraSection?: ReactNode;
}) {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          {eyebrow ? (
            <p className="text-sm text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <div className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>{communityTitle}</CardTitle>
            <CardDescription>{communityDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
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
            {communityFooter ? <div>{communityFooter}</div> : null}
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>{detailTitle}</CardTitle>
            {detailDescription ? (
              <CardDescription>{detailDescription}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            {detailFields.map((field) => (
              <ProfileOverviewFieldBlock
                key={field.label}
                label={field.label}
                value={field.value}
                className={field.className}
              />
            ))}
            {detailFooter ? <div className="sm:col-span-2">{detailFooter}</div> : null}
          </CardContent>
        </Card>
      </div>

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
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm sm:text-base">{value}</div>
    </div>
  );
}
