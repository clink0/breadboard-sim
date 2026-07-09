import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyIdTokenMock = vi.fn();

vi.mock('firebase-admin', () => ({
  default: {
    initializeApp: vi.fn(),
    credential: { cert: vi.fn() },
    auth: () => ({ verifyIdToken: verifyIdTokenMock }),
  },
}));

process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(JSON.stringify({ project_id: 'test' })).toString('base64');

const { requireAuth } = await import('./requireAuth.js');

function mockReqRes(authHeader) {
  const req = { get: (name) => (name.toLowerCase() === 'authorization' ? authHeader : undefined) };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  return { req, res, next };
}

describe('requireAuth', () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset();
  });

  it('calls next() and attaches req.user on a valid token', async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: 'abc123', email: 'student@example.com' });
    const { req, res, next } = mockReqRes('Bearer good-token');

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ uid: 'abc123', email: 'student@example.com' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 401 when the Authorization header is missing', async () => {
    const { req, res, next } = mockReqRes(undefined);

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  it('responds 401 when the header is not a Bearer token', async () => {
    const { req, res, next } = mockReqRes('Basic dXNlcjpwYXNz');

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 when verifyIdToken rejects (invalid/expired token)', async () => {
    verifyIdTokenMock.mockRejectedValue(new Error('Firebase ID token has expired'));
    const { req, res, next } = mockReqRes('Bearer expired-token');

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
