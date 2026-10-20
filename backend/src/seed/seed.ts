import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { SEED_USERS, SeedService } from './seed.service';

const DEFAULT_COUNT = 50_000;

function parseCount(args: string[]): number {
  const flag = args.find((arg) => arg.startsWith('--count='));
  if (!flag) {
    return DEFAULT_COUNT;
  }
  const count = Number(flag.slice('--count='.length));
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('--count must be a positive whole number');
  }
  return count;
}

async function main(): Promise<void> {
  const count = parseCount(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const summary = await app.get(SeedService).run({ count });
    console.log('\nSeed finished');
    console.log(`  orders:  ${summary.orders}`);
    console.log(`  users:   ${summary.users}`);
    console.log('  by status:', summary.ordersByStatus);
    console.log('  indexes: ', summary.indexes.join(', '));
    console.log(`  took:    ${(summary.elapsedMs / 1000).toFixed(1)} s`);
    console.log('\nLogins');
    for (const { email, password, role } of SEED_USERS) {
      console.log(`  ${role.padEnd(5)} ${email} / ${password}`);
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
