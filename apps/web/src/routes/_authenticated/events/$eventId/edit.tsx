import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/events/$eventId/edit")({
  component: EventEditPage,
});

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function useEvent(eventId: string) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const res = await api.api.v1.events[":id"].$get({
        param: { id: eventId },
      });
      if (!res.ok) throw new Error("Failed to load event");
      return res.json();
    },
  });
}

function useCurrentUser() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.api.v1.users.me.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });
}

function EventEditPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [compAmount, setCompAmount] = useState("");
  const [compType, setCompType] = useState("FIXED");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (event && !initialized) {
      setTitle(event.title);
      setDescription(event.description);
      setLocationName(event.locationName);
      setStartAt(toLocalDatetime(event.startAt));
      setEndAt(event.endAt ? toLocalDatetime(event.endAt) : "");
      setCompAmount(
        event.compensationAmount != null
          ? String(event.compensationAmount)
          : "",
      );
      setCompType(event.compensationType ?? "FIXED");
      setInitialized(true);
    }
  }, [event, initialized]);

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.api.v1.events[":id"].$patch({
        param: { id: eventId },
        json: data,
      });
      if (!res.ok) throw new Error("Failed to update event");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate({
        to: "/events/$eventId",
        params: { eventId },
      });
    },
  });

  if (eventLoading || userLoading) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-muted-foreground">Loading...</p>
      </section>
    );
  }

  if (!event) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-10 text-center">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <Button asChild className="mt-4">
          <Link to="/events">Back to Events</Link>
        </Button>
      </section>
    );
  }

  if (event.source !== "USER") {
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

  if (!currentUser || currentUser.id !== event.creatorId) {
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      location: { name: locationName.trim() },
      startAt: new Date(startAt).toISOString(),
    };

    if (endAt) {
      body.endAt = new Date(endAt).toISOString();
    }

    if (event!.type === "GIG" && compAmount) {
      body.compensation = {
        amount: parseFloat(compAmount),
        currency: "USD",
        type: compType,
      };
    }

    mutation.mutate(body);
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <Link
        to="/events/$eventId"
        params={{ eventId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Event
      </Link>

      <h1 className="mt-6 text-2xl font-bold tracking-tight">Edit Event</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={5000}
            rows={4}
            className="border-input bg-background ring-ring/10 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startAt">Start Date</Label>
            <Input
              id="startAt"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endAt">End Date</Label>
            <Input
              id="endAt"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>
        </div>

        {event.type === "GIG" && (
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
                id="compType"
                value={compType}
                onChange={(e) => setCompType(e.target.value)}
              >
                <option value="FIXED">Fixed</option>
                <option value="HOURLY">Hourly</option>
              </Select>
            </div>
          </div>
        )}

        {mutation.error && (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to update event"}
          </p>
        )}

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
      </form>
    </section>
  );
}
