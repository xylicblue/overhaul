// ─────────────────────────────────────────────────────────────────────────────
// Shared Privacy Policy content.
// Single source of truth for both the /privacy page (PrivacyPolicy.jsx) and the
// first-trade consent modal (FirstTradeConsentModal.jsx), so the terms shown in
// the modal are always identical to the published policy.
// ─────────────────────────────────────────────────────────────────────────────
export const PRIVACY_EFFECTIVE_DATE = "Jan 1, 2026";
export const PRIVACY_LAST_UPDATED = "March 3, 2026";

export const PRIVACY_SECTIONS = [
  {
    id: "commitment",
    number: "01",
    title: "Our Commitment to Your Privacy",
    content: `ByteStrike follows "Privacy by Design" principles, ensuring that data protection is integrated into our software from the start. As a developer in the compute infrastructure ecosystem, we prioritize private and local-first usage wherever possible. We do not have access to your local data or activity unless specifically authorized by you for a feature that requires cloud processing.`,
  },
  {
    id: "information",
    number: "02",
    title: "Information We Collect",
    items: [
      {
        label: "Information You Provide",
        text: "This includes account registration details (email, username), billing information for paid products, and correspondence from support requests.",
      },
      {
        label: "Automatically Collected Data",
        text: "When you visit our site, our servers log standard data provided by your web browser, such as your IP address, browser type, and the pages you visit.",
      },
      {
        label: "Cookies",
        text: "We use cookies to maintain your session identity and remember your preferences. You can disable cookies in your browser settings, though some site functionality may be affected.",
      },
      {
        label: "Usage Data",
        text: "Our platform does not collect client-side telemetry without your explicit opt-in. If enabled, we may collect anonymized usage metrics or error logs to improve performance.",
      },
    ],
  },
  {
    id: "legal-bases",
    number: "03",
    title: "Legal Bases for Processing",
    content: "We only process your personal data when we have a valid legal basis:",
    items: [
      {
        label: "Consent",
        text: "Where you have given clear consent for a specific purpose (e.g., newsletter signup).",
      },
      {
        label: "Contract",
        text: "When processing is necessary to fulfill a contract with you (e.g., providing a software license or platform access).",
      },
      {
        label: "Legitimate Interest",
        text: "To protect our services from fraud and to improve our products, provided these interests are not overridden by your rights.",
      },
    ],
  },
  {
    id: "sharing",
    number: "04",
    title: "Sharing and International Transfers",
    content: `We do not sell your personal data. We may share data with service providers who assist our operations, such as cloud hosting (AWS/Google) and payment processors. Data may be stored or processed in countries outside of your residence.`,
  },
  {
    id: "kyc",
    number: "05",
    title: "Identity Verification (KYC)",
    content: "To comply with applicable regulations and prevent financial crime, ByteStrike requires identity verification for certain platform features. We use Sumsub, a third-party KYC/AML provider, to conduct these checks.",
    items: [
      {
        label: "Data Collected",
        text: "During verification, Sumsub may collect your full legal name, date of birth, government-issued ID documents (e.g., passport or national ID), a selfie or liveness check, and proof of address.",
      },
      {
        label: "How It's Used",
        text: "This information is used solely to verify your identity and comply with anti-money laundering (AML) and know-your-customer (KYC) obligations. It is not used for marketing or sold to third parties.",
      },
      {
        label: "Data Handling by Sumsub",
        text: "Sumsub processes your verification data under their own privacy policy and security infrastructure. They are contractually bound to process your data only for KYC/AML purposes on our behalf. You can review Sumsub's privacy policy at sumsub.com.",
      },
      {
        label: "Retention",
        text: "KYC records are retained for the period required by applicable law (typically 5–7 years from the end of the business relationship), after which they are securely deleted.",
      },
    ],
  },
  {
    id: "trade-wallet",
    number: "06",
    title: "Trade & Wallet Data",
    content: "When you connect a wallet and interact with the ByteStrike platform, we collect and store certain trading and wallet-related data in our database to operate the platform and provide you with your account history.",
    items: [
      {
        label: "Wallet Address",
        text: "Your public wallet address is recorded when you connect to the platform. This is a public blockchain identifier and does not constitute personally identifiable information on its own.",
      },
      {
        label: "Trading Activity",
        text: "We store records of your positions, orders, trade history, margin activity, and PnL data. This data is necessary to display your portfolio, calculate funding payments, and maintain an accurate ledger of your activity on the platform.",
      },
      {
        label: "On-Chain Events",
        text: "Swap events, liquidation events, and collateral deposits/withdrawals that originate from your wallet address are indexed from the blockchain and stored for performance and display purposes.",
      },
      {
        label: "Storage & Hosting",
        text: "All trade and wallet data is stored in a Supabase-hosted PostgreSQL database. Supabase operates under SOC 2 Type II compliance and encrypts data at rest. We do not share your trade history with third parties except as required by law.",
      },
    ],
  },
  {
    id: "security",
    number: "07",
    title: "Data Security and Retention",
    content: `We use industry-standard security measures, including AES-256 encryption and TLS, to protect your data in transit and at rest. We retain your information only as long as necessary for the purposes outlined in this policy or to comply with applicable legal obligations.`,
  },
  {
    id: "changes",
    number: "08",
    title: "Changes to This Policy",
    content: `We may update this policy periodically to reflect changes in our practices or applicable law. We will notify you of any significant changes by posting a prominent notice on our website or contacting you via the email address associated with your account.`,
  },
  {
    id: "contact",
    number: "09",
    title: "Contact Us",
    content: `For any privacy-related inquiries, to exercise your rights, or to submit a data subject access request, please contact our team. We will respond to all legitimate requests within the timeframe required by applicable law.`,
    contact: true,
  },
];
