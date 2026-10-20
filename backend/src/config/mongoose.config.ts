import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export function mongooseOptions(config: ConfigService): MongooseModuleOptions {
  return {
    uri: config.getOrThrow<string>('MONGODB_URI'),
    serverSelectionTimeoutMS: 5000,
  };
}
