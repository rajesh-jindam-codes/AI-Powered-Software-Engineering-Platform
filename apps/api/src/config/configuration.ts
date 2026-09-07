import { configSchema, AppConfig } from './config.schema';

export default (): AppConfig => {
  const parsed = configSchema.safeParse(process.env);

  if (!parsed.success) {
    const errorDetails = JSON.stringify(parsed.error.format(), null, 2);
    throw new Error(`[Configuration Error] Invalid environment variables:\n${errorDetails}`);
  }

  return parsed.data;
};
