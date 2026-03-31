import type { EventSource, PrismaClient } from "@prisma/client";

const OSU_EVENTS_URL = "https://content.osu.edu/v2/events";
const TICKETMASTER_EVENTS_URL =
  "https://app.ticketmaster.com/discovery/v2/events.json";
const TICKETMASTER_PAGE_SIZE = "200";

type FetchLike = typeof fetch;

type OsuEventsResponse = {
  data?: {
    events?: OsuEventRecord[];
  };
};

type OsuEventRecord = {
  id: string;
  itemHash: string;
  title: string;
  description?: string | null;
  content?: string | null;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  link?: string | null;
  campus?: string | null;
};

type TicketmasterResponse = {
  _embedded?: {
    events?: TicketmasterEventRecord[];
  };
  page?: {
    totalPages?: number;
    number?: number;
  };
};

type TicketmasterEventRecord = {
  id: string;
  name: string;
  info?: string | null;
  pleaseNote?: string | null;
  url?: string | null;
  dates?: {
    start?: {
      dateTime?: string | null;
    };
    end?: {
      dateTime?: string | null;
    };
  };
  _embedded?: {
    venues?: TicketmasterVenue[];
  };
};

type TicketmasterVenue = {
  name?: string | null;
  city?: {
    name?: string | null;
  };
  state?: {
    stateCode?: string | null;
  };
  country?: {
    countryCode?: string | null;
  };
  location?: {
    latitude?: string | null;
    longitude?: string | null;
  };
};

export type ExternalEventCandidate = {
  source: EventSource;
  externalId: string;
  sourceHash: string;
  title: string;
  description: string;
  ticketUrl: string | null;
  externalUrl: string | null;
  locationName: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  startAt: Date;
  endAt: Date | null;
};

export type ExternalSyncOptions = {
  ticketmasterApiKey: string;
  fetchImpl?: FetchLike;
  now?: Date;
};

export type ExternalSyncSourceSummary = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  completed: number;
};

export type ExternalSyncSummary = {
  startedAt: Date;
  finishedAt: Date;
  sources: {
    osu: ExternalSyncSourceSummary;
    ticketmaster: ExternalSyncSourceSummary;
  };
};
function assertOk(response: Response, detail: string) {
  if (!response.ok) {
    throw new Error(`${detail}: ${response.status} ${response.statusText}`);
  }
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNumber(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}

async function createSourceHash(payload: Record<string, unknown>): Promise<string> {
  const message = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", message);
  const bytes = new Uint8Array(digest);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function dedupeCandidates(candidates: ExternalEventCandidate[]) {
  return Array.from(
    new Map(candidates.map((candidate) => [candidate.externalId, candidate])).values(),
  );
}

export async function fetchOsuEvents(
  fetchImpl: FetchLike = fetch,
): Promise<ExternalEventCandidate[]> {
  const response = await fetchImpl(OSU_EVENTS_URL);
  assertOk(response, "Failed to fetch OSU events");

  const payload = (await response.json()) as OsuEventsResponse;
  const events = payload.data?.events ?? [];

  return events
    .filter((event) => event.campus?.toLowerCase() === "columbus")
    .map((event) => {
      const startAt = parseDate(event.startDate);

      if (!startAt) {
        throw new Error(`Invalid OSU startDate for event ${event.id}`);
      }

      return {
        source: "OSU_API",
        externalId: event.id,
        sourceHash: event.itemHash,
        title: event.title,
        description: normalizeText(event.content, event.description),
        ticketUrl: null,
        externalUrl: event.link?.trim() || null,
        locationName: normalizeText(event.location, event.description, "TBD"),
        locationLatitude: null,
        locationLongitude: null,
        startAt,
        endAt: parseDate(event.endDate),
      } satisfies ExternalEventCandidate;
    });
}

function buildTicketmasterUrl(apiKey: string, page: number) {
  const url = new URL(TICKETMASTER_EVENTS_URL);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("city", "Columbus");
  url.searchParams.set("stateCode", "OH");
  url.searchParams.set("countryCode", "US");
  url.searchParams.set("size", TICKETMASTER_PAGE_SIZE);
  url.searchParams.set("page", String(page));
  return url.toString();
}

export async function fetchTicketmasterEvents(
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): Promise<ExternalEventCandidate[]> {
  if (!apiKey.trim()) {
    throw new Error("TICKETMASTER_API_KEY is required");
  }

  const candidates: ExternalEventCandidate[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const response = await fetchImpl(buildTicketmasterUrl(apiKey, page));
    assertOk(response, "Failed to fetch Ticketmaster events");

    const payload = (await response.json()) as TicketmasterResponse;
    const events = payload._embedded?.events ?? [];

    for (const event of events) {
      const venue = event._embedded?.venues?.[0];
      const startAt = parseDate(event.dates?.start?.dateTime);

      if (!startAt) {
        continue;
      }

      const normalized = {
        source: "TICKETMASTER" as const,
        externalId: event.id,
        title: event.name.trim(),
        description: normalizeText(event.info, event.pleaseNote),
        ticketUrl: event.url?.trim() || null,
        externalUrl: null,
        locationName: normalizeText(venue?.name, "TBD"),
        locationLatitude: parseNumber(venue?.location?.latitude),
        locationLongitude: parseNumber(venue?.location?.longitude),
        startAt,
        endAt: parseDate(event.dates?.end?.dateTime),
      };

      candidates.push({
        ...normalized,
        sourceHash: await createSourceHash({
          externalId: normalized.externalId,
          title: normalized.title,
          description: normalized.description,
          ticketUrl: normalized.ticketUrl,
          locationName: normalized.locationName,
          locationLatitude: normalized.locationLatitude,
          locationLongitude: normalized.locationLongitude,
          startAt: normalized.startAt.toISOString(),
          endAt: normalized.endAt?.toISOString() ?? null,
        }),
      });
    }

    totalPages = payload.page?.totalPages ?? 1;
    page += 1;
  }

  return candidates;
}

function toExternalEventData(candidate: ExternalEventCandidate) {
  return {
    title: candidate.title,
    description: candidate.description,
    type: "EVENT" as const,
    source: candidate.source,
    externalId: candidate.externalId,
    sourceHash: candidate.sourceHash,
    tags: [],
    summary: null,
    category: null,
    imageUrl: null,
    ticketUrl: candidate.ticketUrl,
    externalUrl: candidate.externalUrl,
    locationName: candidate.locationName,
    locationLatitude: candidate.locationLatitude,
    locationLongitude: candidate.locationLongitude,
    startAt: candidate.startAt,
    endAt: candidate.endAt,
    compensationAmount: null,
    compensationCurrency: "USD",
    compensationType: null,
    status: "OPEN" as const,
    creatorId: null,
  };
}

export async function syncExternalSource(
  prisma: PrismaClient,
  source: EventSource,
  candidates: ExternalEventCandidate[],
  now = new Date(),
) {
  const dedupedCandidates = dedupeCandidates(candidates);
  const fetchedIds = new Set(dedupedCandidates.map((candidate) => candidate.externalId));
  const summary: ExternalSyncSourceSummary = {
    fetched: dedupedCandidates.length,
    created: 0,
    updated: 0,
    skipped: 0,
    completed: 0,
  };

  for (const candidate of dedupedCandidates) {
    const existing = await prisma.event.findUnique({
      where: {
        externalId: candidate.externalId,
      },
    });

    if (!existing) {
      await prisma.event.create({
        data: toExternalEventData(candidate),
      });
      summary.created += 1;
      continue;
    }

    if (existing.sourceHash === candidate.sourceHash) {
      summary.skipped += 1;
      continue;
    }

    await prisma.event.update({
      where: {
        id: existing.id,
      },
      data: {
        title: candidate.title,
        description: candidate.description,
        source: candidate.source,
        externalId: candidate.externalId,
        sourceHash: candidate.sourceHash,
        ticketUrl: candidate.ticketUrl,
        externalUrl: candidate.externalUrl,
        locationName: candidate.locationName,
        locationLatitude: candidate.locationLatitude,
        locationLongitude: candidate.locationLongitude,
        startAt: candidate.startAt,
        endAt: candidate.endAt,
      },
    });
    summary.updated += 1;
  }

  const storedEvents = await prisma.event.findMany({
    where: {
      source,
      externalId: {
        not: null,
      },
    },
  });

  const disappearedPastEventIds = storedEvents
    .filter((event) => !fetchedIds.has(event.externalId ?? ""))
    .filter((event) => event.endAt && event.endAt < now)
    .map((event) => event.id);

  if (disappearedPastEventIds.length > 0) {
    const result = await prisma.event.updateMany({
      where: {
        id: {
          in: disappearedPastEventIds,
        },
      },
      data: {
        status: "COMPLETED",
      },
    });
    summary.completed = result.count;
  }

  return summary;
}

export async function syncExternalEvents(
  prisma: PrismaClient,
  { ticketmasterApiKey, fetchImpl = fetch, now = new Date() }: ExternalSyncOptions,
) : Promise<ExternalSyncSummary> {
  const startedAt = new Date();
  const [osuCandidates, ticketmasterCandidates] = await Promise.all([
    fetchOsuEvents(fetchImpl),
    fetchTicketmasterEvents(ticketmasterApiKey, fetchImpl),
  ]);

  const osu = await syncExternalSource(prisma, "OSU_API", osuCandidates, now);
  const ticketmaster = await syncExternalSource(
    prisma,
    "TICKETMASTER",
    ticketmasterCandidates,
    now,
  );

  return {
    startedAt,
    finishedAt: new Date(),
    sources: {
      osu,
      ticketmaster,
    },
  };
}
