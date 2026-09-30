import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { ApiError } from "./errors";

/**
 * Every route handler should be wrapped with this so error handling stays
 * consistent: Zod issues -> 400, ApiError -> its status, unknown -> 500
 * (logged, never leaked to the client).
 */
export function apiRoute<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { message: error.message, ...(error.details ? { errors: error.details } : {}) },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { message: "Données invalides", errors: error.flatten() },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Cette valeur existe déjà (contrainte d'unicité)." },
        { status: 409 },
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { message: "Cette ressource est référencée ailleurs et ne peut pas être modifiée." },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Ressource introuvable." }, { status: 404 });
    }
  }

  console.error(error);
  return NextResponse.json({ message: "Une erreur interne est survenue." }, { status: 500 });
}

export function jsonData<T>(data: T, init?: { status?: number }) {
  return NextResponse.json({ data }, { status: init?.status ?? 200 });
}

export function jsonPage<T>(data: T[], pagination: { page: number; limit: number; total: number; totalPages: number }) {
  return NextResponse.json({ data, pagination });
}

export function jsonMessage(message: string, init?: { status?: number }) {
  return NextResponse.json({ message }, { status: init?.status ?? 200 });
}
