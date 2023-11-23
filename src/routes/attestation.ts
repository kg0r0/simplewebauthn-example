import express, { Request, Response } from 'express';
import {
  VerifyRegistrationResponseOpts,
  generateRegistrationOptions,
  verifyRegistrationResponse
} from '@simplewebauthn/server';
import crypto from 'crypto';
import config from './config';
import database from './db';
import { AuthenticatorDevice, RegistrationResponseJSON } from '@simplewebauthn/typescript-types';
import { isoUint8Array } from '@simplewebauthn/server/helpers';

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
  const optionsForCredentialCreation = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.username,
    attestationType: 'none',
    excludeCredentials: user.authenticators.map(authenticator => ({
      id: authenticator.credentialID,
      type: 'public-key',
      transports: authenticator.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });
  const successRes = {
    status: 'ok',
    errorMessage: '',
  }
  const options = Object.assign(successRes, optionsForCredentialCreation)
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
    requireUserVerification: true,
  };
  const verification = await verifyRegistrationResponse(opts);
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