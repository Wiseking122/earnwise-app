const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Base connection check
app.use('/api', (req, res, next) => {
  if (req.path === '/' || req.path === '') {
    return res.json({ success: true, status: "Earnwise Production API Engine Operational." });
  }
  next();
});

// 1. Paystack Initialize Endpoint (Matches frontend line 105)
app.post('/api/paystack/initialize-deposit', async (req, res) => {
  try {
    const { amount, email, userId } = req.body;
    
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        amount: Math.round(Number(amount) * 100), // Convert Naira to Kobo safely
        metadata: { userId }
      })
    });
    
    const data = await response.json();
    if (!data.status) throw new Error(data.message);
    
    // Return the response format your frontend expects on line 111
    return res.json({ status: 'success', data: data.data });
  } catch (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
});

// 2. Paystack Verify Endpoint (Matches frontend line 44)
app.post('/api/paystack/verify-deposit', async (req, res) => {
  try {
    const { reference, userId, amount } = req.body;
    
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });
    
    const data = await response.json();
    
    if (data.status && data.data.status === 'success') {
      return res.json({ 
        status: 'success', 
        amount: data.data.amount / 100,
        useClientFallback: true // Safely triggers your Firebase client backup sequence
      });
    } else {
      return res.json({ status: 'failed', message: 'Transaction verification rejected' });
    }
  } catch (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
});

module.exports = serverless(app);
