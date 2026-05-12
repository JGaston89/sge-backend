import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  otpIssuer: process.env.OTP_ISSUER || 'SistemaGestionEducativa',
  throttleTtl: parseInt(process.env.THROTTLE_TTL || '900000', 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '5', 10),
}));
