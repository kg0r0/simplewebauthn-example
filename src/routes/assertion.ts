import express, { Request, Response} from 'express';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import database from './db';

const router = express.Router();

router.post('/options', async (req: Request, res: Response) => {
  const user = database[req.body.username];
  const result = {
    status: 'ok',
    errorMessage: '',
  }
  res.json(result)
});

router.post('/result', async (req: Request, res: Response) => {
  const result = {
    status: 'ok',
    errorMessage: '',
  }
  res.json(result)
});

export default router;