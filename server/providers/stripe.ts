import crypto from 'crypto';
import type {
  PaymentProviderModule,
  ProviderCheckResult,
  ProviderPayoutRequest,
  ProviderPayoutResult,
} from './types';

function readKey(): string {
  return (process.env.STRIPE_SECRET_KEY || '').trim();
}

function readWebhookSecret(): string {
  return (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
}

export const stripeProvider: PaymentProviderModule = {
  id: 'stripe',
  name: 'Stripe Connect',
  category: 'payment_gateways',
  supportedCountries: ['GLOBAL'],
  supportedCurrencies: ['USD'],
  automatedPayoutSupported: true,
  getSetupRequirements: () => [
    'STRIPE_SECRET_KEY (Stripe secret API key)',
    'STRIPE_WEBHOOK_SECRET (whsec_... for Stripe-Signature verification)',
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
        detail: 'STRIPE_SECRET_KEY is not set in server environment variables.',
        supportedCountries: this.supportedCountries,
        supportedCurrencies: this.supportedCurrencies,
        setupRequirements: this.getSetupRequirements(),
        lastCheckedAt: now,
      };
    }

    try {
      const resp = await fetch('https://api.stripe.com/v1/balance', {
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
          detail: `Stripe API responded with HTTP ${resp.status}. Verify STRIPE_SECRET_KEY.`,
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
        detail: 'Live Stripe API connection verified.',
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
        detail: err instanceof Error ? err.message : 'Unable to reach Stripe API.',
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
      detail: 'STRIPE_SECRET_KEY loaded. Run connection check to verify live Stripe API.',
      supportedCountries: this.supportedCountries,
      supportedCurrencies: this.supportedCurrencies,
      setupRequirements: this.getSetupRequirements(),
      lastCheckedAt: new Date().toISOString(),
    };
  },

  async initiatePayout(req: ProviderPayoutRequest): Promise<ProviderPayoutResult> {
    if (!readKey()) {
      return {
        dispatched: false,
        status: 'not_configured',
        message: 'STRIPE_SECRET_KEY is not configured. Cannot dispatch automated Stripe Connect payout.',
      };
    }
    if (!req.destination.startsWith('acct_')) {
      return {
        dispatched: false,
        status: 'manual_required',
        message: 'Automated Stripe Connect transfer requires a verified Connected Account ID (acct_...).',
      };
    }
    return {
      dispatched: false,
      status: 'manual_required',
      message: 'Connected account verification & KYC onboarding check required prior to transfer.',
    };
  },

  verifyWebhookSignature(rawBody, headers) {
    const secret = readWebhookSecret();
    if (!secret) {
      return { verified: false, reason: 'STRIPE_WEBHOOK_SECRET is not configured.' };
    }
    const header = String(headers['stripe-signature'] || '').trim();
    if (!header) {
      return { verified: false, reason: 'Missing stripe-signature header.' };
    }
    const parts = Object.fromEntries(
      header.split(',').map((kv) => {
        const idx = kv.indexOf('=');
        return idx > 0 ? [kv.slice(0, idx), kv.slice(idx + 1)] : [kv, ''];
      })
    );
    if (!parts.t || !parts.v1) {
      return { verified: false, reason: 'Malformed stripe-signature header.' };
    }
    const payloadToSign = `${parts.t}.${rawBody.toString('utf8')}`;
    const expected = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const actualBuf = Buffer.from(parts.v1, 'utf8');
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return { verified: false, reason: 'Invalid Stripe webhook signature.' };
    }
    return { verified: true, eventType: 'stripe_webhook' };
  },
};
