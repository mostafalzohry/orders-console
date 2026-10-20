import { Role } from './role.enum';

export interface NewUser {
  email: string;
  passwordHash: string;
  role: Role;
}
