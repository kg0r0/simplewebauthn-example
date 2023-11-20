import express from 'express';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const router = express.Router();

router.post('/options', async (req: Express.Request, res: Express.Response) => {
});

router.post('/result', async (req: Express.Request, res: Express.Response) => {
});

export default router;