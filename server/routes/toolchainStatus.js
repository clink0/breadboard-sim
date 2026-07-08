import { Router } from 'express';
import { getToolchainStatus } from '../lib/arduinoCli.js';

export const toolchainStatusRouter = Router();

toolchainStatusRouter.get('/toolchain-status', async (_req, res) => {
  const status = await getToolchainStatus();
  res.status(200).json(status);
});
