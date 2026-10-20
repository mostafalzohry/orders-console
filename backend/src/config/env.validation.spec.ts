import { envValidationSchema } from './env.validation';

const validEnv = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/orders',
  JWT_SECRET: 'a'.repeat(32),
};

describe('envValidationSchema', () => {
  it('accepts a valid environment and applies defaults', () => {
    const result = envValidationSchema.validate(validEnv);

    expect(result.error).toBeUndefined();
    expect(result.value as Record<string, unknown>).toMatchObject({
      PORT: 3001,
      NODE_ENV: 'development',
    });
  });

  it('rejects a missing JWT_SECRET', () => {
    const { error } = envValidationSchema.validate({
      MONGODB_URI: validEnv.MONGODB_URI,
    });

    expect(error?.message).toContain('"JWT_SECRET" is required');
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      JWT_SECRET: 'too-short',
    });

    expect(error?.message).toContain('"JWT_SECRET" length must be at least 32');
  });

  it('rejects a missing MONGODB_URI', () => {
    const { error } = envValidationSchema.validate({
      JWT_SECRET: validEnv.JWT_SECRET,
    });

    expect(error?.message).toContain('"MONGODB_URI" is required');
  });

  it('rejects the example placeholder secret in production', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'change-me-dev-only-change-me-dev-only-0000',
    });

    expect(error).toBeDefined();
  });
});
