export type Role = "admin" | "agent";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
