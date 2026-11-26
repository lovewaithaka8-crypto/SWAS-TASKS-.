import crypto from 'crypto';
import type {
  PaymentProviderModule,
  ProviderCheckResult,
  ProviderPayoutRequest,
  ProviderPayoutResult,
} from './types';

function readBinanceEnv() {
  const apiKey = (process.env.BINANCE_PAY_API_KEY || '').trim();
  const secretKey = (process.env.BINANCE_PAY_SECRET_KEY || '').trim();
  return {
    configured: Boolean(apiKey && secretKey),
    apiKey,
    secretKey,
  };
}

export const binancePayProvider: PaymentProviderModule = {
  id: 'binance_pay',
  name: 'Binance Pay Merchant',
  category: 'cryptocurrency',
  supportedCountries: ['KE', 'UG', 'TZ', 'RW', 'NG', 'GLOBAL'],
  supportedCurrencies: ['USDT', 'USD'],
  automatedPayoutSupported: false,
  getSetupRequirements: () => [
    'Approved Binance Pay Merchant account',
    'BINANCE_PAY_API_KEY & BINANCE_PAY_SECRET_KEY',
  ],
  isConfigured: () => readBinanceEnv().configured,

  async verifyConnection(): Promise<ProviderCheckResult> {
    const cfg = readBinanceEnv();
    const now = new Date().toISOString();
    if (!cfg.configured) {
      return {
        id: this.id,
        name: this.name,
        category: this.category,
        configured: false,
        connected: false,
        automatedPayoutSupported: false,
        statusLabel: 'NOT CONFIGURED',
        detail:
          'BINANCE_PAY_API_KEY / BINANCE_PAY_SECRET_KEY not set. Binance Pay requires approved merchant integration.',
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
      connected: false,
      automatedPayoutSupported: false,
      statusLabel: 'MANUAL ONLY',
      detail:
        'Binance Pay keys present; payouts require signed merchant batch payout authorization & legal territory compliance.',
      supportedCountries: this.supportedCountries,
      supportedCurrencies: this.supportedCurrencies,
      setupRequirements: this.getSetupRequirements(),
      lastCheckedAt: now,
    };
  },

  async getStatusSnapshot(runVerify = false): Promise<ProviderCheckResult> {
    if (runVerify || !readBinanceEnv().configured) {
      return this.verifyConnection();
    }
    return this.verifyConnection();
  },

  async initiatePayout(_req: ProviderPayoutRequest): Promise<ProviderPayoutResult> {
    const cfg = readBinanceEnv();
    if (!cfg.configured) {
      return {
        dispatched: false,
        status: 'not_configured',
        message: 'Binance Pay merchant API keys are not configured.',
      };
    }
    return {
      dispatched: false,
      status: 'manual_required',
      message: 'Binance Pay merchant payout requires manual finance sign-off and verified tx reference.',
    };
  },

  verifyWebhookSignature(rawBody, headers) {
    const cfg = readBinanceEnv();
    if (!cfg.configured) {
      return { verified: false, reason: 'Binance Pay merchant credentials are not configured.' };
    }
    const timestamp = String(headers['binancepay-timestamp'] || '').trim();
    const nonce = String(headers['binancepay-nonce'] || '').trim();
    const signature = String(headers['binancepay-signature'] || '').trim();
    if (!timestamp || !nonce || !signature) {
      return { verified: false, reason: 'Missing Binance Pay signature headers.' };
    }
    const payload = `${timestamp}\n${nonce}\n${rawBody.toString('utf8')}\n`;
    const expected = crypto
      .createHmac('sha512', cfg.secretKey)
      .update(payload)
      .digest('hex')
      .toUpperCase();
    const expectedBuf = Buffer.from(expected, 'utf8');
    const actualBuf = Buffer.from(signature.toUpperCase(), 'utf8');
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return { verified: false, reason: 'Invalid Binance Pay webhook signature.' };
    }
    return { verified: true, eventType: 'binance_pay_webhook' };
  },
};
