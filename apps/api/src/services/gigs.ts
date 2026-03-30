import type { PrismaClient } from "@prisma/client";

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
