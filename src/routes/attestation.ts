import express, { Request, Response } from 'express';
import {
  VerifyRegistrationResponseOpts,
  generateRegistrationOptions,
  verifyRegistrationResponse
} from '@simplewebauthn/server';
import { AuthenticatorDevice, RegistrationResponseJSON } from '@simplewebauthn/typescript-types';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import crypto from 'crypto';
import config from './config';
import database from './db';

const router = express.Router();

const rpName = config.rpName;
const rpID = config.rpID;
const origin = config.origin;

router.post('/options', async (req: Request, res: Response) => {
  if (!database[req.body.username]) {
    database[req.body.username] = {
      username: req.body.username,
      id: crypto.randomBytes(32).toString('hex'),
      authenticators: [],
    }
  }
  const user = database[req.body.username];
  const credentialCreationOptions = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.username,
    attestationType: 'direct',
    excludeCredentials: user.authenticators.map(authenticator => ({
      id: authenticator.credentialID,
      type: 'public-key',
      transports: authenticator.transports,
    })),
    authenticatorSelection: {
      residentKey: 'discouraged',
      userVerification: 'discouraged',
      authenticatorAttachment: 'cross-platform',
    },
  });
  const successRes = {
    status: 'ok',
    errorMessage: '',
  }
  const options = Object.assign(successRes, credentialCreationOptions);
  req.session.username = user.username;
  req.session.currentChallenge = options.challenge;
  res.json(options)
});

router.post('/result', async (req: Request, res: Response) => {
  const body: RegistrationResponseJSON = req.body;
  const expectedChallenge = req.session.currentChallenge;
  const username = `${req.session.username}`;
  const opts: VerifyRegistrationResponseOpts = {
    response: body,
    expectedChallenge: `${expectedChallenge}`,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  };
  let verification;
  try {
    verification = await verifyRegistrationResponse(opts);
  } catch (error) {
    res.json({
      status: 'failed',
      errorMessage: (error as Error).message
    });
    return
  }
  const { verified, registrationInfo } = verification;
  if (!verified || !registrationInfo) {
    res.json({
      status: 'failed',
      errorMessage: 'Can not validate response signature.'
    })
    return;
  }
  const { credentialPublicKey, credentialID, counter } = registrationInfo;
  const user = database[username];
  const existingAuthenticator = user.authenticators.find(authenticator =>
    isoUint8Array.areEqual(authenticator.credentialID, credentialID)
  );
  if (!existingAuthenticator) {
    const newDevice: AuthenticatorDevice = {
      credentialID,
      credentialPublicKey,
      counter,
      transports: body.response.transports,
    }
    user.authenticators.push(newDevice);
  }
  req.session.currentChallenge = undefined;
  const result = {
    status: 'ok',
    errorMessage: '',
  }
  res.json(result)
});

export default router;