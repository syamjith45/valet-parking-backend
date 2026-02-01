import { Router } from 'express';

const router = Router();

router.post('/whatsapp', (req, res) => {
    console.log('WhatsApp Webhook:', req.body);
    res.status(200).send('OK');
});

export default router;
