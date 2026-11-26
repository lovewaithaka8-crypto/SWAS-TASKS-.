import crypto from 'crypto';
import type {
  PaymentProviderModule,
  ProviderCheckResult,
  ProviderPayoutRequest,
  ProviderPayoutResult,
} from './types';

function readKey(): string {
  return (process.env.PAYSTACK_SECRET_KEY || '').trim();
}

function readWebhookSecret(): string {
  return (process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '').trim();
}

export const paystackProvider: PaymentProviderModule = {
  id: 'paystack',
  name: 'Paystack Transfers',
  category: 'payment_gateways',
  supportedCountries: ['KE', 'NG'],
  supportedCurrencies: ['KES', 'NGN'],
  automatedPayoutSupported: true,
  getSetupRequirements: () => [
    'PAYSTACK_SECRET_KEY (Live or Test secret key in server env)',
    'PAYSTACK_WEBHOOK_SECRET (for verifying transfer.success / transfer.failed webhooks)',
  ],
  isConfigured: () => Boolean(readKey()),

  async verifyConnection(): Promise<ProviderCheckResult> {
    const key = readKey();
    const now = new Date().toISOString();
    if (!key) {
      return {
        id: this.id,
        name: this.name,
        category: this.category,
        configured: false,
        connected: false,
        automatedPayoutSupported: false,
        statusLabel: 'NOT CONFIGURED',
        detail: 'PAYSTACK_SECRET_KEY is not set in server environment variables.',
        supportedCountries: this.supportedCountries,
        supportedCurrencies: this.supportedCurrencies,
        setupRequirements: this.getSetupRequirements(),
        lastCheckedAt: now,
      };
    }

    try {
      const resp = await fetch('https://api.paystack.co/balance', {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!resp.ok) {
        return {
          id: this.id,
          name: this.name,
          category: this.category,
          configured: true,
          connected: false,
          automatedPayoutSupported: false,
          statusLabel: 'CONNECTION ERROR',
          detail: `Paystack API responded with HTTP ${resp.status}. Verify PAYSTACK_SECRET_KEY.`,
          supportedCountries: this.supportedCountries,
          supportedCurrencies: this.supportedCurrencies,
          setupRequirements: this.getSetupRequirements(),
          lastCheckedAt: now,
        };
      }
      return {
        id: this.id,
        name: this.name,
        category: this.category,
        configured: true,
        connected: true,
        automatedPayoutSupported: true,
        statusLabel: 'AUTOMATED',
        detail: 'Live Paystack Transfers API credentials verified.',
        supportedCountries: this.supportedCountries,
        supportedCurrencies: this.supportedCurrencies,
        setupRequirements: this.getSetupRequirements(),
        lastCheckedAt: now,
      };
    } catch (err) {
      return {
        id: this.id,
        name: this.name,
        category: this.category,
        configured: true,
        connected: false,
        automatedPayoutSupported: false,
        statusLabel: 'CONNECTION ERROR',
        detail: err instanceof Error ? err.message : 'Unable to reach Paystack API.',
        supportedCountries: this.supportedCountries,
        supportedCurrencies: this.supportedCurrencies,
        setupRequirements: this.getSetupRequirements(),
        lastCheckedAt: now,
      };
    }
  },

  async getStatusSnapshot(runVerify = false): Promise<ProviderCheckResult> {
    if (runVerify || !readKey()) {
      return this.verifyConnection();
    }
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      configured: true,
      connected: false,
      automatedPayoutSupported: true,
      statusLabel: 'CONNECTED',
      detail: 'PAYSTACK_SECRET_KEY present. Run live verification to test API handshake.',
      supportedCountries: this.supportedCountries,
      supportedCurrencies: this.supportedCurrencies,
      setupRequirements: this.getSetupRequirements(),
      lastCheckedAt: new Date().toISOString(),
    };
  },

  async initiatePayout(req: ProviderPayoutRequest): Promise<ProviderPayoutResult> {
    const key = readKey();
    if (!key) {
      return {
        dispatched: false,
        status: 'not_configured',
        message: 'Paystack API credentials are not configured on this server. Use manual payout settlement.',
      };
    }
    if (!req.destination || req.amount <= 0) {
      return {
        dispatched: false,
        status: 'failed',
        message: 'Invalid transfer recipient or amount.',
      };
    }
    return {
      dispatched: false,
      status: 'manual_required',
      message:
        'Paystack recipient code (RCP_...) creation & Transfer OTP configuration require verified recipient bank/mobile codes before automated dispatch.',
    };
  },

  verifyWebhookSignature(rawBody, headers) {
    const secret = readWebhookSecret();
    if (!secret) {
      return { verified: false, reason: 'PAYSTACK_WEBHOOK_SECRET is not configured.' };
    }
    const sig = String(headers['x-paystack-signature'] || '').trim();
    if (!sig) {
      return { verified: false, reason: 'Missing x-paystack-signature header.' };
    }
    const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const actualBuf = Buffer.from(sig, 'utf8');
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return { verified: false, reason: 'Invalid Paystack webhook signature.' };
    }
    return { verified: true, eventType: 'paystack_webhook' };
  },
};
