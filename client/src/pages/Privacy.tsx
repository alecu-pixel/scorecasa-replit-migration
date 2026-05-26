import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaFacebook, FaInstagram, FaXTwitter, FaTiktok } from 'react-icons/fa6';
import { useLocation } from 'wouter';
import Logo from '@/components/Logo';

export default function Privacy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen hero-glow">
      {/* Header */}
      <header className="sticky top-0 z-50 nav-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation('/')} data-testid="button-logo">
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-white">Privacy <span className="text-gradient-cyan">Policy</span></h1>
          <p className="text-gray-400">Last Updated: January 2026</p>
        </div>

        <Card className="glass-card border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">Your Privacy Matters</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-8 prose-headings:text-white prose-p:text-gray-400 prose-li:text-gray-400 prose-strong:text-gray-300">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground">
                ScoreCasa ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our real estate analysis platform at scorecasa.com. By using our service, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
              <h3 className="text-lg font-semibold mb-2">2.1 Personal Information</h3>
              <p className="text-muted-foreground mb-4">
                When you create an account using Replit Auth, we collect:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Email address</li>
                <li>First and last name</li>
                <li>Profile image URL (if provided through authentication)</li>
                <li>Account authentication tokens</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">2.2 Payment Information</h3>
              <p className="text-muted-foreground mb-4">
                When you purchase credits, we collect:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Payment card details (processed securely by Stripe; we never store complete card numbers)</li>
                <li>Billing address</li>
                <li>Transaction history and purchase records</li>
                <li>Stripe Customer ID for managing your payment methods</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">2.3 Usage Data</h3>
              <p className="text-muted-foreground mb-4">
                We automatically collect:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Property addresses you search and analyze</li>
                <li>Analysis results and scores generated</li>
                <li>Credit balance and usage history</li>
                <li>Login timestamps and session data</li>
                <li>Device information, browser type, and IP address</li>
                <li>Pages visited and features used within our platform</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">2.4 Mortgage Calculator Data</h3>
              <p className="text-muted-foreground mb-4">
                When you use our mortgage calculator tool:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Calculations are performed locally in your browser—we do not store the values you enter (home price, down payment, etc.)</li>
                <li>Current mortgage rates are fetched from third-party sources but are not linked to your personal account</li>
                <li>No financial information from the calculator is transmitted to our servers or shared with third parties</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">We use collected information to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Provide Services:</strong> Generate property analyses, manage your credit balance, and deliver search results</li>
                <li><strong>Process Payments:</strong> Handle credit purchases and refund requests securely through Stripe</li>
                <li><strong>Improve Platform:</strong> Analyze usage patterns to enhance features, fix bugs, and optimize performance</li>
                <li><strong>Customer Support:</strong> Respond to your inquiries and troubleshoot issues</li>
                <li><strong>Security:</strong> Detect fraud, prevent abuse, and protect user accounts</li>
                <li><strong>Communications:</strong> Send transactional emails about purchases, account changes, and service updates</li>
                <li><strong>Compliance:</strong> Meet legal obligations and enforce our Terms of Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Third-Party Data Sources and Integrations</h2>
              <p className="text-muted-foreground mb-4">
                ScoreCasa integrates with multiple third-party services to provide comprehensive property analysis. Each has its own privacy policy:
              </p>

              <h3 className="text-lg font-semibold mb-2">4.1 Government and Public Data Sources</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>U.S. Census Bureau:</strong> We retrieve demographic and economic data from the American Community Survey (ACS). This data is publicly available and anonymized.</li>
                <li><strong>Census Building Permits API:</strong> We retrieve new construction activity data including single-family and multi-family permit trends. This is publicly available construction data.</li>
                <li><strong>OpenStreetMap (Nominatim & Overpass API):</strong> We use OSM to geocode addresses and identify nearby amenities. No personal information is shared with OSM.</li>
                <li><strong>Urban Institute Education Data API:</strong> We fetch school quality data. This is public educational data with no personal identifiers.</li>
                <li><strong>FBI Crime Data API:</strong> We retrieve state-level crime statistics from the FBI's Uniform Crime Reporting (UCR) program. This is publicly available crime data with no personal identifiers.</li>
                <li><strong>NIBRS (National Incident-Based Reporting System):</strong> We access national crime benchmarks and crime type breakdowns for contextual comparisons. This data is publicly available from the FBI.</li>
                <li><strong>Federal Reserve Economic Data (FRED):</strong> We retrieve 30-year fixed mortgage rate trends and historical data from the Federal Reserve Bank of St. Louis. This is publicly available economic data.</li>
                <li><strong>HUD Fair Market Rent API:</strong> We retrieve Section 8 rent limits by bedroom count and county from the U.S. Department of Housing and Urban Development. This is publicly available housing data.</li>
                <li><strong>Bureau of Labor Statistics (BLS):</strong> We retrieve state-level unemployment rates, labor force participation, and employment data. This is publicly available economic data with no personal identifiers.</li>
                <li><strong>Zillow Research Data:</strong> We download and cache publicly available CSV files from Zillow Research containing home value forecasts, rent forecasts, and market velocity metrics (days on market, sale-to-list ratios). This is publicly available aggregate market data with no personal identifiers.</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">4.2 Commercial Data Providers</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Zillow API (via RapidAPI):</strong> We retrieve real-time property listings and market statistics. Property addresses you search are sent to Zillow's API to generate analysis results.</li>
                <li><strong>RentCast API:</strong> We retrieve property-specific rental estimates and rent comparables. Property addresses are sent to RentCast for processing. All responses are cached locally to minimize data transmission.</li>
                <li><strong>Crime Data by ZipCode API (via RapidAPI):</strong> We retrieve ZIP code-level crime grades and statistics. Only the ZIP code portion of your searched address is sent to this API—no personal information is shared.</li>
                <li><strong>Perplexity API:</strong> We use AI to generate investment analysis summaries. Property data and analysis results are sent to Perplexity's servers for processing. Perplexity's privacy policy applies.</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">4.3 Payment Processing</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Stripe:</strong> All payment processing is handled by Stripe. Your payment card details are transmitted directly to Stripe and never stored on our servers. We receive only tokenized payment information and transaction confirmations. Stripe's privacy policy governs how they handle your payment data.</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">4.4 Authentication</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Replit Auth:</strong> User authentication is managed through Replit's authentication service. Your login credentials and session management are handled securely by Replit.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground mb-4">
                We do not sell your personal information. We share data only in these circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Service Providers:</strong> With third-party APIs listed above to deliver property analysis results</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (users will be notified)</li>
                <li><strong>Protection of Rights:</strong> To enforce our Terms of Service, protect user safety, or prevent fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Your Rights Under CCPA (California Residents)</h2>
              <p className="text-muted-foreground mb-4">
                If you are a California resident, the California Consumer Privacy Act (CCPA) provides you with specific rights:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Right to Know:</strong> Request what personal information we collect, use, and disclose about you</li>
                <li><strong>Right to Delete:</strong> Request deletion of your personal information (subject to legal exceptions)</li>
                <li><strong>Right to Opt-Out:</strong> We do not sell personal information, so opt-out is not applicable</li>
                <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                To exercise these rights, please contact us through our <a href="/contact" className="text-primary hover:underline">Contact Us</a> page. We will respond within 45 days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Data Security</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>Encryption of data in transit using HTTPS/TLS</li>
                <li>Secure password hashing and session management</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls limiting employee access to personal data</li>
                <li>Secure database hosting with Neon PostgreSQL</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your information for as long as your account is active or as needed to provide services. Specifically:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li><strong>Account Data:</strong> Retained until you request account deletion</li>
                <li><strong>Transaction History:</strong> Retained for 7 years for tax and accounting purposes</li>
                <li><strong>Analysis Results:</strong> Stored indefinitely to maintain historical records</li>
                <li><strong>Session Logs:</strong> Retained for 90 days for security and debugging</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Cookies and Tracking Technologies</h2>
              <p className="text-muted-foreground mb-4">
                We use essential cookies to:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Maintain your logged-in session</li>
                <li>Remember your preferences</li>
                <li>Ensure platform security</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                We do not use third-party advertising cookies or tracking pixels.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
              <p className="text-muted-foreground">
                ScoreCasa is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have inadvertently collected data from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. International Data Transfers</h2>
              <p className="text-muted-foreground">
                Your information may be transferred to and processed in the United States or other countries where our service providers operate. By using ScoreCasa, you consent to the transfer of your information to countries outside your residence, which may have different data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy periodically. Changes will be posted on this page with an updated "Last Updated" date. Continued use of our service after changes constitutes acceptance of the revised policy. For material changes, we will notify you via email.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. Contact Us</h2>
              <p className="text-muted-foreground">
                For questions about this Privacy Policy, to exercise your CCPA rights, or to request data deletion, please visit our <a href="/contact" className="text-primary hover:underline">Contact Us</a> page.
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
