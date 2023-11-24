import express, { Request, Response } from 'express';
import database from './db';

const router = express.Router();

router.get('/isLoggedIn', (req: Request, res: Response) => {
  if (!req.session.isLoggedIn || !req.session.username) {
    return res.json({
      status: 'failed',
      errorMessage: 'Not logged in.',
    });
  }
  const user = database[req.session.username];
  res.json({
    status: 'ok',
    errorMessage: '',
    username: user.username
  })
});

export default router;