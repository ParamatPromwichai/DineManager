import jwt from 'jsonwebtoken';

export type AuthTokenPayload = {
  id: number | string;
  role: string;
  [key: string]: unknown;
};

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '1d',
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!) as AuthTokenPayload;
}
