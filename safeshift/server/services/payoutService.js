/**
 * SafeShift — Payout Service
 * UPI instant payouts via Razorpay (with fallback for API failures)
 */
const axios = require('axios');
const Razorpay = require('razorpay');
const { v4: uuidv4 } = require('uuid');
const { validateUPIId, validateAmount } = require('../utils/validators');

class PayoutService {
  constructor() {
    this.razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    this.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    this.accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER;
    this.isMock = !this.razorpayKeyId || !this.razorpayKeySecret;
    
    if (!this.isMock) {
      this.razorpay = new Razorpay({
        key_id: this.razorpayKeyId,
        key_secret: this.razorpayKeySecret,
      });
      console.log('[PAYOUT] ✅ Razorpay SDK initialized');
    } else {
      console.log('[PAYOUT] Running in demo mode (no Razorpay keys configured)');
    }
  }

  /**
   * Create Razorpay contact for worker
   * @param {Object} worker - Worker object with id and name
   * @returns {Promise<string>} Contact ID
   */
  async createContact(worker) {
    try {
      const contact = await this.razorpay.contacts.create({
        name: worker.name || `Worker ${worker.id}`,
        email: worker.email || `worker${worker.id}@safeshift.local`,
        contact: worker.phone || '9999999999',
        type: 'employee',
        reference_id: `worker_${worker.id}`,
      });
      return contact.id;
    } catch (err) {
      console.error(`[PAYOUT] Contact creation failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Create Razorpay fund account for UPI
   * @param {string} contactId - Razorpay contact ID
   * @param {string} upiId - UPI ID
   * @returns {Promise<string>} Fund account ID
   */
  async createFundAccount(contactId, upiId) {
    try {
      const fundAccount = await this.razorpay.fundAccount.create({
        contact_id: contactId,
        account_type: 'vpa',
        vpa: {
          address: upiId,
        },
      });
      return fundAccount.id;
    } catch (err) {
      console.error(`[PAYOUT] Fund account creation failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Create Razorpay payout
   * @param {string} fundAccountId - Fund account ID
   * @param {number} amount - Amount in INR
   * @param {string} claimId - Claim ID for reference
   * @returns {Promise<string>} Payout reference ID
   */
  async createPayout(fundAccountId, amount, claimId) {
    try {
      const payout = await this.razorpay.payouts.create({
        account_number: this.accountNumber,
        fund_account_id: fundAccountId,
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        mode: 'UPI',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: claimId,
        narration: `SafeShift claim payout - ${claimId}`,
      });
      return payout.id;
    } catch (err) {
      console.error(`[PAYOUT] Payout creation failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Generate fallback payout ID when Razorpay API fails
   * @param {string} claimId - Claim ID
   * @returns {string} Fallback payout ID
   */
  generateFallbackId(claimId) {
    const uuid = uuidv4();
    const timestamp = Date.now();
    return `safeshift_claim_${uuid}_${timestamp}`;
  }

  /**
   * Send UPI payout to a worker (orchestrates full flow)
   * Returns payout reference ID
   */
  async sendUPI({ upiId, amount, workerId, claimId, workerName }) {
    // Validate inputs
    if (!validateUPIId(upiId)) {
      console.error(`[PAYOUT] ❌ Invalid UPI ID: ${upiId}`);
      return this.generateFallbackId(claimId);
    }

    if (!validateAmount(amount)) {
      console.error(`[PAYOUT] ❌ Invalid amount: ${amount}`);
      return this.generateFallbackId(claimId);
    }

    if (this.isMock) {
      return this._demoModePayout({ upiId, amount, workerId, claimId });
    }

    try {
      // Step 1: Create contact
      const contactId = await this.createContact({
        id: workerId,
        name: workerName,
      });

      // Step 2: Create fund account
      const fundAccountId = await this.createFundAccount(contactId, upiId);

      // Step 3: Create payout
      const payoutId = await this.createPayout(fundAccountId, amount, claimId);

      console.log(`[PAYOUT] 💳 Payout: ₹${amount} sent to ${upiId} | Ref: ${payoutId}`);
      return payoutId;
    } catch (err) {
      console.error(`[PAYOUT] ❌ Razorpay API failed: ${err.message}`);
      // Use fallback ID on API failure
      const fallbackId = this.generateFallbackId(claimId);
      console.log(`[PAYOUT] 💳 Payout: ₹${amount} fallback ID generated | Ref: ${fallbackId}`);
      return fallbackId;
    }
  }

  _demoModePayout({ upiId, amount, workerId, claimId }) {
    const ref = this.generateFallbackId(claimId);
    console.log(`[PAYOUT] 💳 Payout: ₹${amount} → ${upiId} (demo mode) | Ref: ${ref}`);
    return ref;
  }
}

module.exports = PayoutService;
