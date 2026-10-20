import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  MONGODB_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  JWT_EXPIRES_IN_SECONDS: Joi.number().integer().min(60).default(3600),
  LOGIN_RATE_LIMIT_PER_ACCOUNT: Joi.number().integer().min(1).default(5),
  LOGIN_RATE_LIMIT_PER_IP: Joi.number().integer().min(1).default(30),
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().pattern(/^change-me/, { invert: true }),
    }),
});
