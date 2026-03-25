import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";

export const collections = new Hono<AppEnv>()

    // POST /:id/items — add an event to a collection and auto-create SAVE interaction
    .post("/:id/items", async (c) => {
        const { id: userId } = c.get("user");
        const collectionId = c.req.param("id");
        const body = await c.req.json().catch(() => ({}));

        if (typeof body !== "object" || body === null || Array.isArray(body)) {
            return c.json(
                {
                    type: "https://social-osu.app/problems/invalid-body",
                    title: "Invalid request body",
                    status: 400,
                    detail: "Request body must be a JSON object",
                },
                400,
            );
        }

        if (typeof body.eventId !== "string" || body.eventId.trim() === "") {
            return c.json(
                {
                    type: "https://social-osu.app/problems/invalid-body",
                    title: "Invalid request body",
                    status: 400,
                    detail: "eventId must be a non-empty string",
                },
                400,
            );
        }

        const eventId = body.eventId.trim();
        const prisma = getPrisma(c);

        const collection = await prisma.collection.findUnique({
            where: { id: collectionId },
            select: {
                id: true,
                userId: true,
            },
        });

        if (!collection) {
            return c.json(
                {
                    type: "https://social-osu.app/problems/not-found",
                    title: "Resource not found",
                    status: 404,
                    detail: "Collection not found",
                },
                404,
            );
        }

        if (collection.userId !== userId) {
            return c.json(
                {
                    type: "https://social-osu.app/problems/forbidden",
                    title: "Forbidden",
                    status: 403,
                    detail: "Only the collection owner can add items",
                },
                403,
            );
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true },
        });

        if (!event) {
            return c.json(
                {
                    type: "https://social-osu.app/problems/not-found",
                    title: "Resource not found",
                    status: 404,
                    detail: "Event not found",
                },
                404,
            );
        }

        const existing = await prisma.collectionItem.findUnique({
            where: {
                collectionId_eventId: {
                    collectionId,
                    eventId,
                },
            },
        });

        if (existing) {
            return c.json(
                {
                    type: "https://social-osu.app/problems/conflict",
                    title: "Conflict",
                    status: 409,
                    detail: "Event is already in this collection",
                },
                409,
            );
        }

        const [created] = await prisma.$transaction([
            prisma.collectionItem.create({
                data: {
                    collectionId,
                    eventId,
                },
            }),
            prisma.interaction.create({
                data: {
                    userId,
                    eventId,
                    action: "SAVE",
                },
            }),
        ]);

        return c.json(created, 201);
    });