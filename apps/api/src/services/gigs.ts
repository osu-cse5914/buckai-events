import type { AppStatus, PrismaClient } from "@prisma/client";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../lib/problem-details";

export const APPLICANT_SELECT = {
  id: true,
  displayName: true,
  email: true,
} as const;

export type GigApplicationInput = {
  message: string | null;
};

export type GigApplicationsListInput = {
  where: { gigId: string; applicantId?: string };
  limit: number;
  offset: number;
};

export type ApplyInteractionDescriptor = {
  userId: string;
  eventId: string;
  action: "APPLY";
};

type GigRecord = {
  id: string;
  type: string;
  status?: string;
  creatorId: string | null;
};

function ensureGigRecord<TGig extends { type: string }>(
  gig: TGig | null,
  {
    missingDetail = "Gig not found",
    invalidDetail = "Event is not a gig",
  }: {
    missingDetail?: string;
    invalidDetail?: string;
  } = {},
): TGig {
  if (!gig) {
    throw new NotFoundError(missingDetail);
  }

  if (gig.type !== "GIG") {
    throw new BadRequestError(invalidDetail);
  }

  return gig;
}

async function getGigOrThrow(
  prisma: PrismaClient,
  gigId: string,
): Promise<GigRecord> {
  const gig = await prisma.event.findUnique({
    where: { id: gigId },
    select: {
      id: true,
      type: true,
      status: true,
      creatorId: true,
    },
  });

  return ensureGigRecord(gig);
}

export async function createApplication(
  prisma: PrismaClient,
  gigId: string,
  applicantId: string,
  input: GigApplicationInput,
) {
  return prisma.application.create({
    data: {
      gigId,
      applicantId,
      message: input.message,
      status: "PENDING",
    },
  });
}

export async function listApplications(
  prisma: PrismaClient,
  input: GigApplicationsListInput,
) {
  const [data, total] = await Promise.all([
    prisma.application.findMany({
      where: input.where,
      include: {
        applicant: {
          select: APPLICANT_SELECT,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: input.limit,
      skip: input.offset,
    }),
    prisma.application.count({ where: input.where }),
  ]);

  return {
    data,
    total,
    limit: input.limit,
    offset: input.offset,
  };
}

export async function applyToGig(
  prisma: PrismaClient,
  input: {
    gigId: string;
    applicantId: string;
    application: GigApplicationInput;
  },
) {
  const gig = await getGigOrThrow(prisma, input.gigId);

  if (gig.status !== "OPEN") {
    throw new BadRequestError("Cannot apply to a gig that is not open");
  }

  if (gig.creatorId === input.applicantId) {
    throw new ForbiddenError("Cannot apply to your own gig");
  }

  const existing = await prisma.application.findUnique({
    where: {
      gigId_applicantId: {
        gigId: input.gigId,
        applicantId: input.applicantId,
      },
    },
  });
  if (existing) {
    throw new ConflictError("You have already applied to this gig");
  }

  const application = await createApplication(
    prisma,
    input.gigId,
    input.applicantId,
    input.application,
  );

  return {
    application,
    interaction: {
      userId: input.applicantId,
      eventId: input.gigId,
      action: "APPLY",
    } satisfies ApplyInteractionDescriptor,
  };
}

export async function listVisibleApplications(
  prisma: PrismaClient,
  input: {
    gigId: string;
    userId: string;
    limit: number;
    offset: number;
  },
) {
  const gig = await getGigOrThrow(prisma, input.gigId);

  const where =
    gig.creatorId === input.userId
      ? { gigId: input.gigId }
      : await (async () => {
          const application = await prisma.application.findUnique({
            where: {
              gigId_applicantId: {
                gigId: input.gigId,
                applicantId: input.userId,
              },
            },
          });

          if (!application) {
            throw new ForbiddenError(
              "Only the gig owner or an applicant can view applications",
            );
          }

          return { gigId: input.gigId, applicantId: input.userId };
        })();

  return listApplications(prisma, {
    where,
    limit: input.limit,
    offset: input.offset,
  });
}

export async function updateApplicationStatus(
  prisma: PrismaClient,
  input: {
    gigId: string;
    appId: string;
    ownerId: string;
    status: "ACCEPTED" | "REJECTED";
  },
) {
  const gig = await getGigOrThrow(prisma, input.gigId);

  if (gig.creatorId !== input.ownerId) {
    throw new ForbiddenError("Only the gig owner can update application status");
  }

  const application = await prisma.application.findUnique({
    where: { id: input.appId },
  });
  if (!application || application.gigId !== input.gigId) {
    throw new NotFoundError("Application not found");
  }

  if (application.status !== "PENDING") {
    throw new BadRequestError("Only PENDING applications can be updated");
  }

  const count = await prisma.application.updateMany({
    where: { id: input.appId, status: "PENDING" },
    data: { status: input.status as AppStatus },
  });
  if (count.count === 0) {
    throw new BadRequestError("Only PENDING applications can be updated");
  }

  return prisma.application.findUniqueOrThrow({
    where: { id: input.appId },
  });
}
