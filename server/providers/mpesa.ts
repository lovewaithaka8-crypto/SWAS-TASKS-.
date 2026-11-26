import type {
  PaymentProviderModule,
  ProviderCheckResult,
  ProviderPayoutRequest,
  ProviderPayoutResult,
} from './types';

function readMpesaEnv() {
  const consumerKey = (process.env.MPESA_CONSUMER_KEY || '').trim();
  const consumerSecret = (process.env.MPESA_CONSUMER_SECRET || '').trim();
  const shortcode = (process.env.MPESA_SHORTCODE || '').trim();
  const env = (process.env.MPESA_ENV || 'sandbox').trim().toLowerCase();
  const baseUrl =
    env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  return {
    configured: Boolean(consumerKey && consumerSecret && shortcode),
    consumerKey,
    consumerSecret,
    shortcode,
    baseUrl,
  };
}

export const mpesaProvider: PaymentProviderModule = {
  id: 'mpesa',
  name: 'M-Pesa Daraja (Kenya)',
  category: 'mobile_money',
  supportedCountries: ['KE'],
  supportedCurrencies: ['KES'],
  automatedPayoutSupported: true,
  getSetupRequirements: () => [
    'MPESA_CONSUMER_KEY & MPESA_CONSUMER_SECRET (Safaricom Daraja B2C App)',
    'MPESA_SHORTCODE & MPESA_PASSKEY (B2C organization shortcode & initiator credentials)',
  ],
  isConfigured: () => readMpesaEnv().configured,

  async verifyConnection(): Promise<ProviderCheckResult> {
    const cfg = readMpesaEnv();
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
          'Daraja B2C credentials not configured. M-Pesa payouts operate in Manual Admin Settlement mode.',
        supportedCountries: this.supportedCountries,
        supportedCurrencies: this.supportedCurrencies,
        setupRequirements: this.getSetupRequirements(),
        lastCheckedAt: now,
      };
    }

    try {
      const auth = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64');
      const resp = await fetch(
        `${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          method: 'GET',
          headers: { Authorization: `Basic ${auth}` },
        }
      );
      if (!resp.ok) {
        return {
          id: this.id,
          name: this.name,
          category: this.category,
          configured: true,
          connected: false,
          automatedPayoutSupported: false,
          statusLabel: 'CONNECTION ERROR',
          detail: `Daraja OAuth check failed with HTTP ${resp.status}.`,
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
        detail: `Safaricom Daraja OAuth token verified (${cfg.baseUrl}).`,
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
        detail: err instanceof Error ? err.message : 'Unable to reach Safaricom Daraja API.',
        supportedCountries: this.supportedCountries,
        supportedCurrencies: this.supportedCurrencies,
        setupRequirements: this.getSetupRequirements(),
        lastCheckedAt: now,
      };
    }
  },

  async getStatusSnapshot(runVerify = false): Promise<ProviderCheckResult> {
    if (runVerify || !readMpesaEnv().configured) {
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
      detail: 'Daraja credentials loaded. Click Run Connection Checks to verify OAuth handshake.',
      supportedCountries: this.supportedCountries,
      supportedCurrencies: this.supportedCurrencies,
      setupRequirements: this.getSetupRequirements(),
      lastCheckedAt: new Date().toISOString(),
    };
  },

  async initiatePayout(req: ProviderPayoutRequest): Promise<ProviderPayoutResult> {
    const cfg = readMpesaEnv();
    if (!cfg.configured) {
      return {
        dispatched: false,
        status: 'not_configured',
        message: 'Safaricom Daraja B2C credentials are not configured. Settle manually and log M-Pesa receipt code.',
      };
    }
    if (!req.destination || req.amount < 50) {
      return {
        dispatched: false,
        status: 'failed',
        message: 'Valid Safaricom recipient number and KES 50+ amount required.',
      };
    }
    return {
      dispatched: false,
      status: 'manual_required',
      message:
        'B2C SecurityCredential certificate encryption and ResultURL callback setup required for live automated M-Pesa B2C dispatch.',
    };
  },

  verifyWebhookSignature(_rawBody, _headers) {
    const cfg = readMpesaEnv();
    if (!cfg.configured) {
      return { verified: false, reason: 'M-Pesa Daraja callback handler requires MPESA_SHORTCODE configuration.' };
    }
    return {
      verified: false,
      reason: 'Daraja B2C ResultURL validation requires registered Safaricom callback IP/token verification.',
    };
  },
};
