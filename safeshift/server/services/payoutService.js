/**
 * SafeShift — Payout Service
 * UPI instant payouts via Razorpay (with mock mode for demo)
 */
const axios = require('axios');

class PayoutService {
  constructor() {
    this.razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    this.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    this.accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER;
    this.isMock = !this.razorpayKeyId || !this.razorpayKeySecret;
    if (this.isMock) {
      console.log('[PAYOUT] Running in mock mode (no Razorpay keys configured)');
    }
  }

  /**
   * Send UPI payout to a worker
   * Returns payout reference ID
   */
  async sendUPI({ upiId, amount, workerId, claimId }) {
    if (this.isMock) {
      return this._mockPayout({ upiId, amount, workerId, claimId });
    }

    try {
      const response = await axios.post(
        'https://api.razorpay.com/v1/payouts',
        {
          account_number: this.accountNumber,
          fund_account: {
            account_type: 'vpa',
            vpa: { address: upiId },
            contact: {
              name: `Worker ${workerId}`,
              type: 'employee',
              reference_id: workerId,
            },
          },
          amount: amount * 100, // Razorpay uses paise
          currency: 'INR',
          mode: 'UPI',
          purpose: 'payout',
          queue_if_low_balance: true,
          reference_id: claimId,
          narration: `SafeShift claim payout - ${claimId}`,
        },
        {
          auth: {
            username: this.razorpayKeyId,
            password: this.razorpayKeySecret,
          },
          timeout: 10000,
        }
      );

      console.log(`[PAYOUT] ✅ ₹${amount} sent to ${upiId} | Ref: ${response.data.id}`);
      return response.data.id;
    } catch (err) {
      console.error(`[PAYOUT] ❌ Failed: ${err.message}`);
      // Fallback to mock on API error
      return this._mockPayout({ upiId, amount, workerId, claimId });
    }
  }

  _mockPayout({ upiId, amount, workerId, claimId }) {
    const ref = `MOCK_PAY_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    console.log(`[PAYOUT] 🎭 Mock: ₹${amount} → ${upiId} | Ref: ${ref}`);
    return ref;
  }
}

module.exports = PayoutService;
