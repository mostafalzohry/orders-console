import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Role } from './role.enum';
import { User, UserDocument } from './user.schema';

export interface NewUser {
  email: string;
  passwordHash: string;
  role: Role;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.users.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    if (!isValidObjectId(id)) {
      return Promise.resolve(null);
    }
    return this.users.findById(id).exec();
  }

  create(data: NewUser): Promise<UserDocument> {
    return this.users.create(data);
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await this.users
      .updateOne({ _id: id }, { $inc: { tokenVersion: 1 } })
      .exec();
  }
}
