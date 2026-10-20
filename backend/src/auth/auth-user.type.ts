import { Role } from '../users/role.enum';
import { UserDocument } from '../users/user.schema';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export function toAuthUser(user: UserDocument): AuthUser {
  return { id: String(user.id), email: user.email, role: user.role };
}
