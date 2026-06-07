import axios from 'axios';

async function test() {
  try {
    const initRes = await axios.post('http://localhost:3000/api/paystack/initialize-deposit', {
      userId: 'test-user',
      amount: 500
    });
    console.log('Init Response:', initRes.data);
    
    if (initRes.data.data?.reference) {
      const verifyRes = await axios.post('http://localhost:3000/api/paystack/verify-deposit', {
        userId: 'test-user',
        reference: initRes.data.data.reference
      });
      console.log('Verify Response:', verifyRes.data);
    }
  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}

test();
