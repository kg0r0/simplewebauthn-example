import type { AuthenticatorDevice } from '@simplewebauthn/typescript-types';

interface LoggedInUser {
  id: string;
  username: string;
  authenticators: AuthenticatorDevice[];
  rpID: string
}

let database: { [key: string]: LoggedInUser } = {};
export default database;