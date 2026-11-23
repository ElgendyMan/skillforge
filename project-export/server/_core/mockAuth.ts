import type { User } from "../../drizzle/schema";
import { getUserByOpenId } from "../db";

export const MOCK_ROLES = ["candidate", "company", "supervisor"] as const;
export type MockRole = (typeof MOCK_ROLES)[number];

export function parseMockRoleHeader(value: string | string[] | undefined): MockRole | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return MOCK_ROLES.includes(candidate as MockRole) ? (candidate as MockRole) : null;
}

export async function getDevelopmentMockUser(requestedRole: string | string[] | undefined): Promise<User | null> {
  if (process.env.NODE_ENV === "production") return null;
  const role = parseMockRoleHeader(requestedRole);
  if (!role) return null;
  return (await getUserByOpenId(`sf-mock-${role}`)) ?? null;
}
