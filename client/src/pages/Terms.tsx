import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FaFacebook, FaInstagram, FaXTwitter, FaTiktok } from 'react-icons/fa6';
import { useLocation } from 'wouter';
import Logo from '@/components/Logo';

export default function Terms() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen hero-glow">
      {/* Header */}
      <header className="sticky top-0 z-50 nav-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation('/')}>
              <Logo className="h-10 w-auto" />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10" onClick={() => setLocation('/')} data-testid="button-home">
                Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">Terms and <span className="text-gradient-cyan">Conditions</span></h1>
          <p className="text-gray-400">
            Last updated: January 2026
          </p>
        </div>

        <Card className="glass-card border-gray-700/50">
          <CardContent className="prose prose-sm max-w-none p-8 prose-headings:text-white prose-p:text-gray-400 prose-li:text-gray-400 prose-strong:text-gray-300">
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By creating an account or using this application ("App"), you agree to be bound by these Terms and Conditions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">2. Eligibility and Registration</h2>
              <p className="text-muted-foreground">
                To use the App, you must create an account using Replit Auth. You agree that the information provided is accurate and up-to-date. You are responsible for keeping your credentials secure. Authentication is managed by Replit's secure authentication service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">3. Service Description</h2>
              <p className="text-muted-foreground mb-4">
                The App aggregates data from public and commercial sources including the U.S. Census Bureau, OpenStreetMap, Zillow (including Zillow Research Data for market forecasts), RentCast, FBI Crime Data API, Crime Data by ZipCode API, NIBRS (National Incident-Based Reporting System), Federal Reserve Economic Data (FRED), HUD Fair Market Rent API, Bureau of Labor Statistics (BLS), Census Building Permits API, FEMA National Flood Hazard Layer (NFHL), USGS National Seismic Hazard Maps (ASCE 7-22), and EPA EJScreen 2023 to generate comprehensive property analysis scores, home value forecasts, rent forecasts, market velocity metrics, affordability analysis, and environmental/natural hazard risk assessments. These scores help users make informed real estate decisions. The scores, forecasts, and recommendations provided are for informational purposes only and do not constitute financial advice.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Safety Analysis:</strong> Our safety scores combine data from multiple sources including ZIP-level crime grades, state-level FBI crime statistics, and national benchmarks from NIBRS. Crime statistics are historical in nature and may not reflect current conditions. Safety scores are estimates based on available data and should not be the sole factor in making location decisions.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Mortgage Calculator:</strong> The App includes a mortgage calculator tool that provides estimated monthly payment calculations based on user-provided inputs such as home price, down payment, interest rate, and loan term. The calculator also displays current mortgage rates sourced from third-party providers.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Affordability & Value Analysis:</strong> The App provides comprehensive affordability metrics including Investment Grade ratings (A-F), Market Timing signals, Buy vs Rent analysis, Overvaluation percentages, and economic indicators. These metrics are calculated using data from Federal Reserve (FRED), HUD Fair Market Rent, Bureau of Labor Statistics, and Census Building Permits APIs. Investment Grade ratings and Market Timing signals are algorithmic assessments based on multiple economic factors and should be used as one of many inputs in your decision-making process.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Environmental &amp; Natural Hazard Risk:</strong> The App provides flood risk assessments using FEMA's National Flood Hazard Layer (NFHL), seismic risk ratings using USGS National Seismic Hazard Maps (ASCE 7-22 standard), and environmental quality indicators using EPA EJScreen 2023. Flood zone classifications indicate whether a property is located in a Special Flood Hazard Area (SFHA) and whether flood insurance is typically required or recommended. Seismic risk is expressed as Peak Ground Acceleration (PGA) on a five-tier scale from Very Low to Very High. Environmental data covers air quality indicators including PM2.5, ozone, and diesel particulate pollution relative to national averages. These risk assessments are for informational purposes only. They reflect publicly available government data at the time of query and may not capture recent changes, unmapped hazard areas, or site-specific conditions. We strongly recommend consulting with a licensed insurance professional, structural engineer, or environmental consultant before making any purchasing decisions based on this data.
              </p>
              <p className="text-muted-foreground">
                <strong>Important Disclaimer:</strong> The mortgage calculator and affordability metrics are provided for informational and educational purposes only. The estimates generated are not guaranteed, may not reflect actual loan terms available to you, and should not be relied upon as financial advice. Investment Grade ratings, Market Timing signals, and Buy vs Rent recommendations are based on historical data and algorithmic analysis—they do not predict future market conditions or guarantee investment returns. Actual loan terms, interest rates, taxes, insurance costs, and monthly payments may vary based on your credit profile, lender requirements, property location, and other factors. We strongly recommend consulting with a qualified mortgage professional or financial advisor before making any borrowing decisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">4. Payment and Credits</h2>
              <p className="text-muted-foreground">
                Users may purchase credits, which can be redeemed to perform property searches. Credits and fees are subject to the current pricing displayed in the App. All payments are processed securely through Stripe. For detailed information about refunds, credit expiration, and our Early Bird program, please see Section 12 (Credit Policy and Refunds) below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">5. User Conduct</h2>
              <p className="text-muted-foreground">
                You agree to use the App lawfully and not to reverse engineer, duplicate, or misuse the service or any proprietary content. You must not attempt to circumvent the payment or authentication mechanisms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">6. Data Collection, Privacy, and Compliance</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>We collect user data including registration details, property search history, and payment information to provide and improve the service.</li>
                <li>Data is handled as described in our Privacy Policy, and in accordance with applicable US laws, including the California Consumer Privacy Act (CCPA).</li>
                <li>As a California resident, you have the right to request access, deletion, and disclosure of your personal information.</li>
                <li>We do not knowingly collect data from children under the age of 13.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content, scores, software, and trademarks are owned by us or our licensors. You may not copy, distribute, or reverse engineer any part of the App.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                The App and its scores are provided "as is." We do not guarantee the accuracy, completeness, or suitability of the scores for investment decisions. We are not liable for any damages, losses, or decisions made based on App data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">9. Termination</h2>
              <p className="text-muted-foreground">
                We reserve the right to suspend or terminate your account for violations of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">10. Changes to Service and Terms</h2>
              <p className="text-muted-foreground">
                We may update these Terms at any time. Notifications of changes will be provided through the App. Continued use of the App signifies your acceptance of the revised Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">11. Third-Party Services and Data Sources</h2>
              <p className="text-muted-foreground mb-4">
                ScoreCasa integrates with multiple third-party services and data sources to provide comprehensive property analysis. By using our service, you acknowledge and agree that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li><strong>Government Data:</strong> We retrieve public demographic, economic, educational, and hazard data from the U.S. Census Bureau, OpenStreetMap, Urban Institute, FEMA (National Flood Hazard Layer), USGS (National Seismic Hazard Maps), and EPA (EJScreen 2023). This data is publicly available and governed by their respective terms of use.</li>
                <li><strong>Real Estate Data:</strong> We access property listings and market statistics through Zillow's API (via RapidAPI). Property addresses you search are transmitted to these services to generate analysis results.</li>
                <li><strong>AI Processing:</strong> Investment analysis summaries are generated using Perplexity's AI service. Property data and analysis results are sent to Perplexity's servers for processing.</li>
                <li><strong>Payment Processing:</strong> All financial transactions are processed through Stripe. Stripe's terms of service and privacy policy govern payment processing.</li>
                <li><strong>Authentication:</strong> User authentication is managed through Replit Auth, subject to Replit's terms and privacy policy.</li>
              </ul>
              <p className="text-muted-foreground">
                We are not responsible for the availability, accuracy, or policies of these third-party services. Each service maintains its own terms of use and privacy policies, which you are encouraged to review.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">12. Credit Policy and Refunds</h2>
              <p className="text-muted-foreground mb-4">
                <strong>Credit Packages:</strong> Credits are sold in packages at current pricing displayed on our Pricing page. Each property analysis consumes one credit. Credits never expire and can be used at any time.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Early Bird Program:</strong> The first 200 users to create an account receive 2 free credits automatically. This promotion is subject to change without notice.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Refund Policy:</strong> Credits are generally non-refundable. However, we will consider refund requests in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                <li>Technical errors that prevent you from using purchased credits</li>
                <li>Duplicate or unauthorized charges</li>
                <li>Service outages that prevent property analysis for extended periods</li>
                <li>As required by applicable consumer protection laws</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                Refund requests must be submitted within 30 days of purchase through our <a href="/contact" className="text-primary hover:underline">Contact Us</a> page. Approved refunds will be processed promptly to the original payment method.
              </p>
              <p className="text-muted-foreground">
                <strong>Cancellation:</strong> Since we do not offer subscriptions, there are no recurring charges to cancel. You may stop using the service at any time, and your unused credits will remain in your account indefinitely.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">13. Dispute Resolution and Governing Law</h2>
              <p className="text-muted-foreground mb-4">
                <strong>Governing Law:</strong> These Terms and your use of the App are governed by the laws of the State of California, United States, without regard to its conflict of law provisions.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Dispute Resolution:</strong> Any disputes arising from these Terms or your use of the service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association (AAA). The arbitration shall take place in California, and judgment on the arbitration award may be entered in any court having jurisdiction.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Exceptions:</strong> Either party may seek injunctive or equitable relief in a court of competent jurisdiction to prevent infringement of intellectual property rights or confidential information.
              </p>
              <p className="text-muted-foreground">
                <strong>Class Action Waiver:</strong> You agree to resolve disputes on an individual basis only. You waive any right to participate in class actions or class-wide arbitration.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">14. Accessibility and Non-Discrimination</h2>
              <p className="text-muted-foreground mb-4">
                ScoreCasa is committed to ensuring digital accessibility for all users, including those with disabilities. We strive to comply with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Our Commitment:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                <li>Providing alternative text for images and visual content</li>
                <li>Ensuring keyboard navigation throughout the platform</li>
                <li>Maintaining sufficient color contrast for readability</li>
                <li>Using semantic HTML and ARIA labels where appropriate</li>
                <li>Testing with screen readers and assistive technologies</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                <strong>Non-Discrimination:</strong> We provide equal access to our services regardless of race, color, religion, sex, national origin, age, disability, or any other protected characteristic under applicable law.
              </p>
              <p className="text-muted-foreground">
                If you encounter accessibility barriers or have suggestions for improvement, please contact us through our <a href="/contact" className="text-primary hover:underline">Contact Us</a> page. We will work with you to provide the information or service you need in an accessible format.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">15. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these Terms, please visit our <a href="/contact" className="text-primary hover:underline">Contact Us</a> page. For privacy-related inquiries, please see our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 glass mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-6">
              <a href="https://www.facebook.com/profile.php?id=61584350274435" target="_blank" rel="noopener noreferrer" aria-label="Visit our Facebook page" className="text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-md" data-testid="link-facebook">
                <FaFacebook className="w-5 h-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Visit our Instagram page" className="text-gray-500 hover:text-purple-400 transition-colors p-2 rounded-md" data-testid="link-instagram">
                <FaInstagram className="w-5 h-5" />
              </a>
              <a href="https://x.com/ScoreCasa" target="_blank" rel="noopener noreferrer" aria-label="Visit our X (Twitter) page" className="text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-md" data-testid="link-x">
                <FaXTwitter className="w-5 h-5" />
              </a>
              <a href="https://www.tiktok.com/@scorecasa" target="_blank" rel="noopener noreferrer" aria-label="Visit our TikTok page" className="text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-md" data-testid="link-tiktok">
                <FaTiktok className="w-5 h-5" />
              </a>
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href="/privacy" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-privacy">
                Privacy Policy
              </a>
              <span className="text-gray-700">•</span>
              <a href="/terms" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-terms">
                Terms and Conditions
              </a>
              <span className="text-gray-700">•</span>
              <a href="/contact" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-contact">
                Contact Us
              </a>
            </div>
            <p className="text-xs text-gray-600">
              This tool provides data-driven insights to support your decisions, not financial advice.
            </p>
            <p className="text-sm text-gray-500">
              &copy; 2025 ScoreCasa
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
