import { appFactory } from "../factory";
import { getPrismaClient } from "../lib/prisma";
import {
  drainRequestResources,
  resolveConnectionString,
} from "../lib/worker-runtime";

export function createRequestResourcesMiddleware(
  prismaFactory = getPrismaClient,
) {
  return appFactory.createMiddleware(async (c, next) => {
    const prisma = prismaFactory(resolveConnectionString(c.env));
    c.set("prisma", prisma);
    c.set("backgroundTasks", []);

    try {
      await next();
    } finally {
      await drainRequestResources(c, prisma);
    }
  });
}

export const withRequestResources = createRequestResourcesMiddleware();
