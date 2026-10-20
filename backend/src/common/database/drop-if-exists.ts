import { Collection } from 'mongoose';

const NAMESPACE_NOT_FOUND = 26;

export async function dropIfExists(collection: Collection): Promise<void> {
  try {
    await collection.drop();
  } catch (error) {
    if ((error as { code?: number }).code !== NAMESPACE_NOT_FOUND) {
      throw error;
    }
  }
}
