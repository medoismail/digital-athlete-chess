/**
 * x402 Payment Protocol Handler
 * 
 * x402 is a payment protocol that allows AI agents to pay for services
 * using cryptocurrency (USDC) with HTTP 402 Payment Required responses.
 */

import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// USDC contract addresses
const USDC_ADDRESSES: Record<string, `0x${string}`> = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

// Our payment receiver address (set in env)
const RECEIVER_ADDRESS = process.env.PAYMENT_RECEIVER_ADDRESS as `0x${string}`;

// Pricing
export const PRICES = {
  pfp: 0.02,           // $0.02 per profile picture
  artwork: 0.05,       // $0.05 per artwork
  banner: 0.03,        // $0.03 per banner
  custom: 0.10,        // $0.10 per custom generation
};

export type ImageStyle = keyof typeof PRICES;

interface X402PaymentRequest {
  amount: number;
  currency: string;
  chain: string;
  receiver: string;
  description: string;
}

interface X402Receipt {
  txHash: string;
  amount: string;
  from: string;
  to: string;
  timestamp: number;
}

/**
 * Generate a 402 Payment Required response
 */
export function create402Response(style: ImageStyle, prompt: string): Response {
  const amount = PRICES[style] || PRICES.pfp;
  
  const paymentRequest: X402PaymentRequest = {
    amount,
    currency: 'USDC',
    chain: process.env.CHAIN || 'base',
    receiver: RECEIVER_ADDRESS,
    description: `Molty.pics image generation: ${style}`,
  };

  // x402 payment header format
  const paymentHeader = JSON.stringify({
    accepts: [{
      scheme: 'exact',
      network: paymentRequest.chain,
      maxAmountRequired: parseUnits(amount.toString(), 6).toString(),
      resource: `molty:generate:${style}`,
      description: paymentRequest.description,
      mimeType: 'application/json',
      payTo: RECEIVER_ADDRESS,
      maxTimeoutSeconds: 300,
      asset: USDC_ADDRESSES[paymentRequest.chain],
    }],
    x402Version: 1,
  });

  return new Response(
    JSON.stringify({
      error: 'Payment Required',
      message: `This endpoint requires ${amount} USDC payment`,
      payment: paymentRequest,
    }),
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `X402 ${Buffer.from(paymentHeader).toString('base64')}`,
        'X-402-Payment': paymentHeader,
      },
    }
  );
}

/**
 * Verify x402 payment receipt
 */
export async function verifyPayment(
  receiptHeader: string,
  expectedAmount: number
): Promise<{ valid: boolean; receipt?: X402Receipt; error?: string }> {
  try {
    // Decode the receipt
    const receipt: X402Receipt = JSON.parse(
      Buffer.from(receiptHeader, 'base64').toString()
    );

    // In production, verify the transaction on-chain
    if (process.env.NODE_ENV === 'production' && receipt.txHash) {
      const chain = process.env.CHAIN === 'base-sepolia' ? baseSepolia : base;
      const client = createPublicClient({
        chain,
        transport: http(),
      });

      const tx = await client.getTransactionReceipt({
        hash: receipt.txHash as `0x${string}`,
      });

      if (tx.status !== 'success') {
        return { valid: false, error: 'Transaction failed' };
      }

      // Verify amount (simplified - in production parse transfer events)
      const paidAmount = parseFloat(receipt.amount);
      if (paidAmount < expectedAmount) {
        return { valid: false, error: 'Insufficient payment' };
      }
    }

    return { valid: true, receipt };
  } catch (error) {
    // For development/testing, accept mock receipts
    if (process.env.NODE_ENV === 'development') {
      return {
        valid: true,
        receipt: {
          txHash: 'mock-' + Date.now(),
          amount: expectedAmount.toString(),
          from: '0x0000000000000000000000000000000000000000',
          to: RECEIVER_ADDRESS,
          timestamp: Date.now(),
        },
      };
    }
    return { valid: false, error: 'Invalid receipt format' };
  }
}

/**
 * Create payment record
 */
export function createPaymentRecord(
  agentId: string,
  amount: number,
  receipt?: X402Receipt
) {
  return {
    agentId,
    amount,
    currency: 'USDC',
    chain: process.env.CHAIN || 'base',
    txHash: receipt?.txHash,
    receipt: receipt ? JSON.stringify(receipt) : null,
    status: receipt ? 'completed' : 'pending',
    completedAt: receipt ? new Date() : null,
  };
}
