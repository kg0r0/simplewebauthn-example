import express, { Request, Response } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse
} from '@simplewebauthn/server';
import crypto from 'crypto';
import config from './config';
import database from './db';

const router = express.Router();

const rpName = config.rpName;
const rpID = config.rpID;

router.post('/options', async (req: Request, res: Response) => {
  const user = database[req.body.username] || {
    username: req.body.username,
    id: crypto.randomBytes(32).toString('hex'),
    authenticators: [],
  }
  const optionsForCredentialCreation = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.username,
    // Don't prompt users for additional information about the authenticator
    // (Recommended for smoother UX)
    attestationType: 'none',
    // Prevent users from re-registering existing authenticators
    excludeCredentials: user.authenticators.map(authenticator => ({
      id: authenticator.credentialID,
      type: 'public-key',
      // Optional
      transports: authenticator.transports,
    })),
    // See "Guiding use of authenticators via authenticatorSelection" below
    authenticatorSelection: {
      // Defaults
      residentKey: 'preferred',
      userVerification: 'preferred',
      // Optional
      authenticatorAttachment: 'platform',
    },
  });
  const successRes = {
    status: 'ok',
    errorMessage: '',
  }
  const options = Object.assign(successRes, optionsForCredentialCreation)
  req.session.currentChallenge = options.challenge;
  res.json(options)
});

router.post('/result', async (req: Express.Request, res: Express.Response) => {
});

export default router;