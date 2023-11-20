import express, { Request, Response } from 'express';

const router = express.Router();

router.get('/isLoggedIn', (req: Request, res: Response) => {
  res.json({
    'status': 'ok'
  })
});

export default router;