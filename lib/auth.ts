import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export type JwtPayload = {
  userId: string;
  email: string;
  name?: string | null;
};

function getSecret(): Uint8Array {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return new TextEncoder().encode(JWT_SECRET);
}

export async function createToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("token");
}

export async function getCurrentUser(req?: NextRequest): Promise<JwtPayload | null> {
  let token: string | undefined;
  if (req) {
    token = req.cookies.get("token")?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get("token")?.value;
  }
  if (!token) return null;
  return verifyToken(token);
}
