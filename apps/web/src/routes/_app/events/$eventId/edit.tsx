import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { useApiClient } from "@/lib/api";
import { requireSignedInBeforeLoad } from "@/lib/route-access";
import { loadOwnedEventRouteData } from "@/lib/route-loaders";
import { browsePathForEventType } from "@/lib/event-utils";
import { queryKeys, type EventRecord } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";

export const Route = createFileRoute("/_app/events/$eventId/edit")({
  beforeLoad: requireSignedInBeforeLoad,
  loader: ({ context, params }) =>
    loadOwnedEventRouteData({
      api: context.api,
      queryClient: context.queryClient,
      eventId: params.eventId,
    }),
  component: EventEditPage,
});

function EventEditPage() {
  const { eventId } = Route.useParams();
  const { access, event } = Route.useLoaderData();

  if (access === "not-found" || !event) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-10 text-center">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <Button asChild className="mt-4">
          <Link to={browsePathForEventType(event?.type)}>Back to Events</Link>
        </Button>
      </section>
    );
  }

  if (access === "external") {
    return (
      <section className="mx-auto max-w-2xl px-6 py-10 text-center">
        <h1 className="text-2xl font-bold">Cannot be edited</h1>
        <p className="mt-2 text-muted-foreground">
          External events cannot be edited.
        </p>
        <Button asChild className="mt-4">
          <Link to="/events/$eventId" params={{ eventId }}>
            Back to Event
          </Link>
        </Button>
      </section>
    );
  }

  if (access !== "ok") {
    return (
      <section className="mx-auto max-w-2xl px-6 py-10 text-center">
        <h1 className="text-2xl font-bold">Not authorized</h1>
        <p className="mt-2 text-muted-foreground">
          Only the event creator can edit this event.
        </p>
        <Button asChild className="mt-4">
          <Link to="/events/$eventId" params={{ eventId }}>
            Back to Event
          </Link>
        </Button>
      </section>
    );
  }

  return <EditForm event={event} eventId={eventId} />;
}

function EditForm({
  event,
  eventId,
}: {
  event: EventRecord;
  eventId: string;
}) {
  const api = useApiClient();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [locationName, setLocationName] = useState(event.locationName);
  const [startAt, setStartAt] = useState<Date | undefined>(
    new Date(event.startAt),
  );
  const [endAt, setEndAt] = useState<Date | undefined>(
    event.endAt ? new Date(event.endAt) : undefined,
  );
  const [compAmount, setCompAmount] = useState(
    event.compensationAmount != null ? String(event.compensationAmount) : "",
  );
  const [compType, setCompType] = useState(
    event.compensationType ?? "FIXED",
  );

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const arg = { param: { id: eventId }, json: data };
      const res = await api.api.v1.events[":id"].$patch(arg);
      if (!res.ok) throw new Error("Failed to update event");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate({
        to: "/events/$eventId",
        params: { eventId },
      });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      location: { name: locationName.trim() },
      startAt: startAt ? startAt.toISOString() : undefined,
    };

    if (endAt) {
      body.endAt = endAt.toISOString();
    }

    if (event.type === "GIG" && compAmount) {
      body.compensation = {
        amount: parseFloat(compAmount),
        currency: "USD",
        type: compType,
      };
    }

    mutation.mutate(body);
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <Link
        to="/events/$eventId"
        params={{ eventId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Event
      </Link>

      <div className="space-y-2">
        <Badge variant="outline" className="w-fit">
          {event.type === "GIG" ? "Gig" : "Event"}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">Edit {event.type === "GIG" ? "Gig" : "Event"}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Update the key details for this listing so the timing, location, and compensation stay accurate for people viewing it.
        </p>
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl border bg-background py-0">
        <CardHeader className="border-b px-6 py-6 sm:px-8">
          <CardTitle>Listing details</CardTitle>
          <CardDescription>
            Edit the basics here, then adjust schedule details and compensation if this is a gig.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 py-0">
          <form onSubmit={handleSubmit} className="space-y-0">
            <div className="space-y-5 px-6 py-6 sm:px-8">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  maxLength={5000}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  required
                  maxLength={500}
                />
              </div>
            </div>

            <div className="border-t px-6 py-6 sm:px-8">
              <div className="mb-5 space-y-1">
                <h2 className="text-base font-semibold">Schedule</h2>
                <p className="text-sm text-muted-foreground">
                  Keep the start and end times current so attendees know when to show up.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startAt">Start Date</Label>
                  <DateTimePicker
                    id="startAt"
                    value={startAt}
                    onChange={setStartAt}
                    placeholder="Pick start date & time"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endAt">End Date</Label>
                  <DateTimePicker
                    id="endAt"
                    value={endAt}
                    onChange={setEndAt}
                    placeholder="Pick end date & time"
                  />
                </div>
              </div>
            </div>

            {event.type === "GIG" ? (
              <div className="border-t px-6 py-6 sm:px-8">
                <div className="mb-5 space-y-1">
                  <h2 className="text-base font-semibold">Compensation</h2>
                  <p className="text-sm text-muted-foreground">
                    Update pay details if this gig includes a fixed amount or hourly rate.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="compAmount">Amount ($)</Label>
                    <Input
                      id="compAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={compAmount}
                      onChange={(e) => setCompAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="compType">Compensation Type</Label>
                    <Select
                      value={compType}
                      onValueChange={(v) => setCompType(v)}
                    >
                      <SelectTrigger id="compType" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                        <SelectItem value="HOURLY">Hourly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-4 border-t px-6 py-6 sm:px-8">
              {mutation.error ? (
                <p className="text-sm text-destructive">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : "Failed to update event"}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to="/events/$eventId" params={{ eventId }}>
                    Cancel
                  </Link>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
