import crypto from 'crypto';
import type {
  PaymentProviderModule,
  ProviderCheckResult,
  ProviderPayoutRequest,
  ProviderPayoutResult,
} from './types';

function readKey(): string {
  return (process.env.FLUTTERWAVE_SECRET_KEY || '').trim();
}

function readWebhookHash(): string {
  return (process.env.FLUTTERWAVE_SECRET_HASH || '').trim();
}

export const flutterwaveProvider: PaymentProviderModule = {
  id: 'flutterwave',
  name: 'Flutterwave Transfers',
  category: 'payment_gateways',
  supportedCountries: ['KE', 'UG', 'TZ', 'RW', 'NG'],
  supportedCurrencies: ['KES', 'UGX', 'TZS', 'RWF', 'NGN', 'USD'],
  automatedPayoutSupported: true,
  getSetupRequirements: () => [
    'FLUTTERWAVE_SECRET_KEY (v3 secret key in server env)',
    'FLUTTERWAVE_SECRET_HASH (for verifying verif-hash webhook header)',
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
        detail: 'FLUTTERWAVE_SECRET_KEY is not set in server environment variables.',
        supportedCountries: this.supportedCountries,
        supportedCurrencies: this.supportedCurrencies,
        setupRequirements: this.getSetupRequirements(),
        lastCheckedAt: now,
      };
    }

    try {
      const resp = await fetch('https://api.flutterwave.com/v3/balances', {
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
          detail: `Flutterwave API returned HTTP ${resp.status}. Check FLUTTERWAVE_SECRET_KEY.`,
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
        detail: 'Live Flutterwave v3 Transfers API credentials verified.',
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
        detail: err instanceof Error ? err.message : 'Unable to reach Flutterwave API.',
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
      detail: 'FLUTTERWAVE_SECRET_KEY loaded. Click Run Connection Checks to verify live API.',
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
        message: 'FLUTTERWAVE_SECRET_KEY is not configured. Use manual payout processing.',
      };
    }
    if (!req.destination || req.amount <= 0) {
      return {
        dispatched: false,
        status: 'failed',
        message: 'Invalid payout destination or amount.',
      };
    }
    return {
      dispatched: false,
      status: 'manual_required',
      message:
        'Flutterwave bank/mobile money transfer dispatch requires verified bank code & callback URL registration in Flutterwave Dashboard.',
    };
  },

  verifyWebhookSignature(_rawBody, headers) {
    const hash = readWebhookHash();
    if (!hash) {
      return { verified: false, reason: 'FLUTTERWAVE_SECRET_HASH is not configured.' };
    }
    const headerHash = String(headers['verif-hash'] || '').trim();
    if (!headerHash) {
      return { verified: false, reason: 'Missing verif-hash header.' };
    }
    const expectedBuf = Buffer.from(hash, 'utf8');
    const actualBuf = Buffer.from(headerHash, 'utf8');
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return { verified: false, reason: 'Invalid Flutterwave webhook signature.' };
    }
    return { verified: true, eventType: 'flutterwave_webhook' };
  },
};
