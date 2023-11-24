import express, { Request, Response } from 'express';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateAuthenticationOptionsOpts,
  VerifiedAuthenticationResponse,
  VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import database from './db';
import config from './config';
import { AuthenticationResponseJSON } from '@simplewebauthn/server/script/deps';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';

const router = express.Router();

const rpID = config.rpID;
const origin = config.origin;

router.post('/options', async (req: Request, res: Response) => {
  const user = database[req.body.username];
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
    userVerification: 'discouraged',
    rpID
  }
  const credentialGetOptions = await generateAuthenticationOptions(opts);
  const successRes = {
    status: 'ok',
    errorMessage: '',
  };
  const options = Object.assign(successRes, credentialGetOptions);
  req.session.username = user.username;
  req.session.currentChallenge = options.challenge;
  res.json(options)
});

router.post('/result', async (req: Request, res: Response) => {
  const body: AuthenticationResponseJSON = req.body;
  const expectedChallenge = req.session.currentChallenge;
  const username = `${req.session.username}`;
  const user = database[username];

  let dbAuthenticator;
  const bodyCredIDBuffer = isoBase64URL.toBuffer(body.rawId)
  for (const authenticator of user.authenticators) {
    if (isoUint8Array.areEqual(authenticator.credentialID, bodyCredIDBuffer)) {
      dbAuthenticator = authenticator;
      break;
    }
  }

  if (!dbAuthenticator) {
    return res.status(400).send({
      status: 'failed',
      errorMessage: 'Authenticator is not registered with this site.',
    });
  }

  let verification: VerifiedAuthenticationResponse;
  try {
    const opts: VerifyAuthenticationResponseOpts = {
      response: body,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: dbAuthenticator,
      requireUserVerification: false
    };
    verification = await verifyAuthenticationResponse(opts);
  } catch (error: any) {
    return res.status(400).send({
      status: 'failed',
      errorMessage: error.message,
    });
  }
  const { verified, authenticationInfo } = verification;
  if (!verified || !authenticationInfo) {
    return res.status(400).send({
      status: 'failed',
      errorMessage: 'Can not authenticate signature.',
    });
  }
  dbAuthenticator.counter = authenticationInfo.newCounter;
  req.session.currentChallenge = undefined;
  req.session.isLoggedIn = true;
  const result = {
    status: 'ok',
    errorMessage: '',
  }
  res.json(result)
});

export default router;