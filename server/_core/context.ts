import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// FinBrief is deployed as a public demo. Authentication is intentionally
// disabled so the app does not depend on the original Manus OAuth service.
const GUEST_USER: User = {
  id: 0,
  openId: "guest",
  name: "Guest",
  email: null,
  loginMethod: "guest",
  role: "user",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  lastSignedIn: new Date(),
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    user: GUEST_USER,
  };
}
