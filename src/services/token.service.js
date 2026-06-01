import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

export const tokenService = {
  generateTokens: (userPayload) => {
    // Payload contains: userId, name, email, phone, walletId
    const accessToken = jwt.sign(userPayload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpires
    });

    const refreshToken = jwt.sign(
      { userId: userPayload.userId },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpires }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.accessExpires
    };
  }
};
