export type ProviderCategory =
  | 'mobile_money'
  | 'banks'
  | 'digital_wallets'
  | 'payment_gateways'
  | 'cryptocurrency'
  | 'international_transfers';

export interface ProviderCheckResult {
  id: string;
  name: string;
  category: ProviderCategory;
  configured: boolean;
  connected: boolean;
  automatedPayoutSupported: boolean;
  statusLabel: 'CONNECTED' | 'AUTOMATED' | 'MANUAL ONLY' | 'NOT CONFIGURED' | 'CONNECTION ERROR';
  detail: string;
  supportedCountries: string[];
  supportedCurrencies: string[];
  setupRequirements: string[];
  lastCheckedAt: string;
}

export interface ProviderPayoutRequest {
  withdrawalId: string;
  amount: number;
  currency: string;
  destination: string;
  recipientName: string;
  institutionId: string;
  idempotencyKey: string;
  cryptoNetwork?: string;
}

export interface ProviderPayoutResult {
  dispatched: boolean;
  status: 'processing' | 'paid' | 'failed' | 'not_configured' | 'manual_required';
  providerReference?: string;
  message: string;
}

export interface WebhookVerificationResult {
  verified: boolean;
  eventType?: string;
  reason?: string;
}

export interface PaymentProviderModule {
  id: string;
  name: string;
  category: ProviderCategory;
  supportedCountries: string[];
  supportedCurrencies: string[];
  automatedPayoutSupported: boolean;
  getSetupRequirements: () => string[];
  isConfigured: () => boolean;
  verifyConnection: () => Promise<ProviderCheckResult>;
  getStatusSnapshot: (runVerify?: boolean) => Promise<ProviderCheckResult>;
  initiatePayout: (req: ProviderPayoutRequest) => Promise<ProviderPayoutResult>;
  verifyWebhookSignature: (rawBody: Buffer, headers: Record<string, string | string[] | undefined>) => WebhookVerificationResult;
}
