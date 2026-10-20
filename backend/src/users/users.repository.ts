import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { dropIfExists } from '../common/database/drop-if-exists';
import { NewUser } from './new-user.type';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.users.findOne({ email }).exec();
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

  count(): Promise<number> {
    return this.users.countDocuments().exec();
  }

  async reset(): Promise<void> {
    await this.users.init();
    await dropIfExists(this.users.collection);
  }

  async ensureIndexes(): Promise<void> {
    await this.users.createIndexes();
  }
}
