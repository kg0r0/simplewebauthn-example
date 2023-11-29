import express, { Request, Response } from 'express';
import database from './db';

const router = express.Router();

router.get('/login', (req: Request, res: Response) => {
  res.sendFile('login.html', { root: 'src/public' });
});

router.get('/userinfo', (req: Request, res: Response) => {
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

router.get('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.json({
        status: 'failed',
        errorMessage: err.message,
      });
    }
  });
  res.json({
    status: 'ok',
    errorMessage: ''
  });
});

export default router;