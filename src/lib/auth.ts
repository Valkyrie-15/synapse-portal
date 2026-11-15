import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);
const COOKIE_NAME = "synapse_token";

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  name: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };

// ── Role-based access ─────────────────────────────────────────────────────────
// SUPER_ADMIN: sees and manages every hospital. USER: sees only their own hospital.

export const SUPER_ADMIN = "SUPER_ADMIN";

export function isSuperAdmin(role: string | undefined): boolean {
  return role === SUPER_ADMIN;
}

export interface AuthContext {
  userId: string;
  role: string;
  hospitalId: string | null;
}

/** Current user, re-read from the database so role or hospital changes apply immediately. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, hospitalId: true },
  });
  if (!user) return null;
  return { userId: user.id, role: user.role, hospitalId: user.hospitalId };
}

/**
 * The hospital whose data this request may read. A super admin may pick any hospital
 * (falling back to their own); everyone else is pinned to their own hospital, and asking
 * for another one is refused. Returns null when access must be denied.
 */
export function resolveHospitalId(ctx: AuthContext, requested?: string | null): string | null {
  if (isSuperAdmin(ctx.role)) return requested || ctx.hospitalId;
  if (requested && requested !== ctx.hospitalId) return null;
  return ctx.hospitalId;
}
