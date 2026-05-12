import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  name: process.env.DB_NAME || 'sge_db',
  user: process.env.DB_USER || 'sge_user',
  password: process.env.DB_PASSWORD,
  poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
  ssl: process.env.DB_SSL === 'true',
}));
