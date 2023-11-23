import express, { Request, Response } from 'express';
import {
  GenerateAuthenticationOptionsOpts,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import database from './db';
import config from './config';

const router = express.Router();

const rpID = config.rpID;

router.post('/options', async (req: Request, res: Response) => {
  const user = database[req.body.username];
  console.log(user);
  if (!user) {
    res.json({
      status: 'failed',
      errorMessage: `User ${req.body.username} does not exist`,
    });
    return;
  }
  const opts: GenerateAuthenticationOptionsOpts = {
    timeout: 60000,
    allowCredentials: user.authenticators.map(authenticator => ({
      id: authenticator.credentialID,
      type: 'public-key',
      transports: authenticator.transports,
    })),
    userVerification: 'required',
    rpID
  }
  const credentialGetOptions = await generateAuthenticationOptions(opts);
  const successRes = {
    status: 'ok',
    errorMessage: '',
  };
  const options = Object.assign(successRes, credentialGetOptions);
  req.session.currentChallenge = options.challenge;
  res.json(options)
});

router.post('/result', async (req: Request, res: Response) => {
  const result = {
    status: 'ok',
    errorMessage: '',
  }
  res.json(result)
});

export default router;