import { binancePayProvider } from './binancePay';
import { flutterwaveProvider } from './flutterwave';
import { mpesaProvider } from './mpesa';
import { paystackProvider } from './paystack';
import { stripeProvider } from './stripe';
import type { PaymentProviderModule, ProviderCheckResult } from './types';

export const PAYMENT_PROVIDERS: PaymentProviderModule[] = [
  mpesaProvider,
  paystackProvider,
  flutterwaveProvider,
  stripeProvider,
  binancePayProvider,
];

export function getProviderModule(providerId: string): PaymentProviderModule | undefined {
  return PAYMENT_PROVIDERS.find((p) => p.id === providerId);
}

export async function getAllProviderStatuses(verify = false): Promise<ProviderCheckResult[]> {
  return Promise.all(PAYMENT_PROVIDERS.map((p) => p.getStatusSnapshot(verify)));
}
