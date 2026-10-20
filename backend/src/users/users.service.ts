import { Injectable } from '@nestjs/common';
import { normalizeText } from '../common/utils/normalize-text';
import { NewUser } from './new-user.type';
import { UserDocument } from './user.schema';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.users.findByEmail(normalizeText(email));
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.users.findById(id);
  }

  create(data: NewUser): Promise<UserDocument> {
    return this.users.create(data);
  }

  incrementTokenVersion(id: string): Promise<void> {
    return this.users.incrementTokenVersion(id);
  }
}
