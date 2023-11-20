import express from 'express';
import defaultrouttes from './routes/default';
import attestation from './routes/attestation';
import assertion from './routes/assertion';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import crypto from 'crypto';

const app: express.Express = express()

declare module 'express-session' {
  interface SessionData {
    currentChallenge?: string;
  }
}

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(expressSession({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: true,
  saveUninitialized: true
}));
app.use(cookieParser());
app.use(express.static('./src/public/'));

const port = 3000;

/**
 * routes
 */
app.use('/', defaultrouttes);
app.use('/attestation', attestation);
app.use('/assertion', assertion);

app.listen(port, () => {
  console.log(`listen port: ${port}`);
});