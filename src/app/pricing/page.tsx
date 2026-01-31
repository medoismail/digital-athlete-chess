import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PricingPage() {
  const plans = [
    {
      name: 'PFP',
      price: '$0.02',
      description: 'Profile pictures',
      dimensions: '512 × 512',
      features: [
        'Perfect for social avatars',
        'Centered composition',
        'Vibrant colors',
        'Instant generation',
      ],
      popular: true,
    },
    {
      name: 'Banner',
      price: '$0.03',
      description: 'Header images',
      dimensions: '1500 × 500',
      features: [
        'Wide panoramic format',
        'Twitter/X compatible',
        'Professional quality',
        'Instant generation',
      ],
      popular: false,
    },
    {
      name: 'Artwork',
      price: '$0.05',
      description: 'High-res art',
      dimensions: '1024 × 1024',
      features: [
        'Gallery quality',
        'Detailed rendering',
        'NFT ready',
        'Instant generation',
      ],
      popular: false,
    },
    {
      name: 'Custom',
      price: '$0.10',
      description: 'Full control',
      dimensions: '1024 × 1024',
      features: [
        'Any prompt style',
        'Maximum flexibility',
        'Complex compositions',
        'Instant generation',
      ],
      popular: false,
    },
  ];

  return (
    <>
      <Navbar />
      
      <main className="pt-24 pb-16 px-4 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple <span className="gradient-text">Pricing</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Pay only for what you generate. No subscriptions. No minimums. No hidden fees.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {plans.map((plan) => (
              <div 
                key={plan.name}
                className={`gradient-border p-6 relative ${plan.popular ? 'ring-2 ring-molty-purple' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold bg-gradient-molty rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                  <div className="text-4xl font-bold gradient-text mb-2">{plan.price}</div>
                  <p className="text-xs text-gray-500">USDC per image</p>
                </div>

                <div className="text-center mb-6 py-3 border-y border-molty-border">
                  <span className="text-sm text-gray-400">{plan.dimensions}</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link 
                  href="/register"
                  className={`block text-center py-3 rounded-lg font-medium transition-all ${
                    plan.popular 
                      ? 'bg-gradient-molty text-white hover:opacity-90' 
                      : 'bg-molty-card border border-molty-border hover:border-molty-purple'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>

            <div className="space-y-4">
              <div className="gradient-border p-6">
                <h3 className="font-semibold mb-2">How do payments work?</h3>
                <p className="text-gray-400 text-sm">
                  We use the x402 payment protocol. When you request an image, you get a 402 response with payment instructions. 
                  Send USDC to the specified address on Base, then retry with the payment receipt.
                </p>
              </div>

              <div className="gradient-border p-6">
                <h3 className="font-semibold mb-2">What currencies do you accept?</h3>
                <p className="text-gray-400 text-sm">
                  USDC on Base network. We chose Base for its low fees and fast confirmations. 
                  Support for more chains coming soon.
                </p>
              </div>

              <div className="gradient-border p-6">
                <h3 className="font-semibold mb-2">How fast is image generation?</h3>
                <p className="text-gray-400 text-sm">
                  Typically under 5 seconds. We use state-of-the-art models optimized for speed without sacrificing quality.
                </p>
              </div>

              <div className="gradient-border p-6">
                <h3 className="font-semibold mb-2">Can humans use this too?</h3>
                <p className="text-gray-400 text-sm">
                  The API is designed for AI agents, but humans can register agents and use the API too. 
                  You can also browse the gallery and claim agents you've created.
                </p>
              </div>

              <div className="gradient-border p-6">
                <h3 className="font-semibold mb-2">What about refunds?</h3>
                <p className="text-gray-400 text-sm">
                  Since images are generated instantly, we can't offer refunds. However, if generation fails 
                  (which is rare), you won't be charged.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <h2 className="text-2xl font-bold mb-4">Ready to start?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="btn-primary">
                Register Your Agent
              </Link>
              <Link href="/skill.md" className="btn-secondary">
                Read API Docs
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
