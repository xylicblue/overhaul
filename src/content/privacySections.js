// Shared Privacy Policy content.
// This is the single source of truth for the public policy page and the
// first-trade privacy notice.
export const PRIVACY_EFFECTIVE_DATE = "September 10, 2026";
export const PRIVACY_LAST_UPDATED = "September 10, 2026";

export const PRIVACY_SECTIONS = [
  {
    id: "scope",
    number: "01",
    title: "Scope and Who We Are",
    content:
      'This Privacy Policy explains how ByteStrike Group ("ByteStrike," "we," "us," or "our") handles personal information when you visit byte-strike.com, create an account, complete business onboarding or identity verification, connect a wallet, use our markets, or communicate with us. The ByteStrike Group member that provides the relevant service is responsible for that processing unless a service-specific notice identifies another entity.',
  },
  {
    id: "information",
    number: "02",
    title: "Information We Collect",
    items: [
      {
        label: "Account and contact information",
        text: "Your name, email address, phone number, username, authentication details, communication preferences, and support correspondence.",
      },
      {
        label: "Business onboarding information",
        text: "Entity names, registration and tax identifiers, incorporation details, addresses, business activities, source-of-funds information, ownership and control information, financial-institution details, and supporting records.",
      },
      {
        label: "Identity and compliance information",
        text: "Government identification, date of birth, residential address, proof of address, verification images or liveness information, screening results, risk indicators, and information about directors, officers, beneficial owners, controllers, and other connected persons.",
      },
      {
        label: "Wallet and transaction information",
        text: "Public wallet addresses, network and transaction identifiers, deposits, withdrawals, orders, positions, margin activity, liquidations, fees, funding, profit and loss, and related on-chain activity.",
      },
      {
        label: "Device and usage information",
        text: "IP address, browser and device type, operating system, timestamps, pages and features used, session and security events, referral information, diagnostic logs, and cookie or similar-technology identifiers.",
      },
    ],
  },
  {
    id: "sources",
    number: "03",
    title: "Where Information Comes From",
    content: "We collect information from several sources, depending on how you interact with ByteStrike.",
    bullets: [
      "Directly from you when you register, submit an application, upload documents, connect a wallet, trade, or contact us.",
      "From an entity applicant or authorized representative who provides information about its directors, officers, beneficial owners, controllers, or other connected persons.",
      "From identity-verification, sanctions, politically exposed person, adverse-media, fraud-prevention, wallet-screening, and other compliance providers.",
      "From public blockchains, public registers, government or regulatory sources, and other lawfully available records.",
      "Automatically from your browser, device, and interactions with our services.",
    ],
  },
  {
    id: "uses",
    number: "04",
    title: "How We Use Information",
    bullets: [
      "Create and secure accounts, authenticate users, provide platform features, process transactions, and maintain account and trading records.",
      "Review entity applications, verify identities and ownership, assess risk, screen wallets and connected persons, and meet anti-money laundering, sanctions, fraud-prevention, and other legal or regulatory obligations.",
      "Operate, monitor, troubleshoot, audit, and improve our services, systems, smart-contract interfaces, and customer support.",
      "Protect users, ByteStrike, and third parties; investigate suspected misuse; enforce platform controls; and respond to security or market-integrity incidents.",
      "Send service, security, onboarding, verification, compliance, and other transactional communications. We send marketing communications only where permitted and provide applicable opt-out choices.",
      "Establish, exercise, or defend legal claims and respond to lawful requests from courts, regulators, law-enforcement authorities, or other competent bodies.",
    ],
  },
  {
    id: "legal-bases",
    number: "05",
    title: "Legal Bases for Processing",
    content: "Where applicable law requires a legal basis, we rely on one or more of the following:",
    items: [
      {
        label: "Contract and requested steps",
        text: "To provide services you request, administer your account, and take steps connected with onboarding or a prospective business relationship.",
      },
      {
        label: "Legal obligations",
        text: "To comply with financial-crime prevention, sanctions, recordkeeping, tax, regulatory, security, and other applicable requirements.",
      },
      {
        label: "Legitimate interests",
        text: "To operate and improve our business, secure the platform, prevent fraud, manage risk, support users, and protect legal rights, provided those interests are not overridden by applicable data-protection rights.",
      },
      {
        label: "Consent",
        text: "Where we ask for consent for a specific purpose. You may withdraw consent at any time, but withdrawal does not affect processing already carried out lawfully or processing supported by another legal basis.",
      },
    ],
  },
  {
    id: "verification",
    number: "06",
    title: "Identity Verification and Financial-Crime Compliance",
    content:
      "ByteStrike uses Sumsub and may use other specialist providers to support identity verification, liveness checks, document validation, sanctions and politically exposed person screening, adverse-media review, fraud detection, and ongoing monitoring. These providers may collect information directly through their interfaces and process it under their own notices as well as on our behalf. We may receive verification results, applicant references, risk signals, and supporting evidence needed to make and document compliance decisions.",
  },
  {
    id: "risk-decisions",
    number: "07",
    title: "Risk Scoring and Decisions",
    content:
      "We may use rules-based and automated tools to classify risk, identify possible matches, restrict access, or route an application or transaction for further review. Inputs may include business activity, source of funds, ownership structure, geography, identity-screening results, wallet activity, and sanctions indicators. Automated results support our compliance controls and may be reviewed by authorized personnel where required by law or our procedures. You may contact us if you believe a result is inaccurate or wish to request an available review.",
  },
  {
    id: "sharing",
    number: "08",
    title: "How We Share Information",
    content: "We do not sell personal information. We may disclose information only as reasonably necessary to:",
    bullets: [
      "Service providers that support cloud hosting, databases, identity verification, wallet screening, analytics, communications, customer support, cybersecurity, audit, legal services, and other operations performed for us.",
      "Other ByteStrike Group members for operations, security, risk management, compliance, support, and corporate administration.",
      "Banks, payment providers, blockchain infrastructure providers, counterparties, or other participants needed to provide a requested service or complete a transaction.",
      "Regulators, courts, law-enforcement authorities, tax authorities, sanctions bodies, or other parties when disclosure is legally required or reasonably necessary to protect rights, safety, security, or market integrity.",
      "A buyer, investor, lender, adviser, or successor in connection with a financing, reorganization, merger, acquisition, sale, or similar corporate transaction, subject to appropriate safeguards.",
    ],
  },
  {
    id: "transfers",
    number: "09",
    title: "International Data Transfers",
    content:
      "ByteStrike Group and its providers may process information in countries other than the country where you live. Where required, we use recognized safeguards for international transfers, such as adequacy decisions, contractual protections, or another lawful transfer mechanism. You may contact us for more information about safeguards relevant to your information.",
  },
  {
    id: "retention",
    number: "10",
    title: "Data Retention",
    content:
      "We retain personal information for as long as needed for the purposes described in this Policy, including to provide services, maintain security and audit trails, resolve disputes, enforce agreements, and satisfy anti-money laundering, sanctions, tax, accounting, regulatory, and other recordkeeping obligations. Retention periods vary by information type, relationship, jurisdiction, and legal requirement. When information is no longer required, we delete or anonymize it unless continued retention is permitted or required by law.",
  },
  {
    id: "security",
    number: "11",
    title: "Security",
    content:
      "We use administrative, technical, and organizational measures designed to protect personal information, including access controls, authentication safeguards, encryption in transit, restricted document storage, monitoring, and incident-response procedures. No method of transmission, storage, or processing is completely secure, and we cannot guarantee absolute security. You are responsible for protecting your credentials, authentication factors, devices, and wallet keys and for notifying us promptly of suspected unauthorized access.",
  },
  {
    id: "rights",
    number: "12",
    title: "Your Rights and Choices",
    content:
      "Depending on your location and subject to legal exceptions, you may have rights to access, correct, delete, restrict, or object to processing of your personal information; receive certain information in a portable form; withdraw consent; or request review of certain automated decisions. You may also have the right to complain to a data-protection authority. We may verify your identity before acting on a request, and we may retain information where the law permits or requires us to do so.",
  },
  {
    id: "cookies",
    number: "13",
    title: "Cookies and Similar Technologies",
    content:
      "We use cookies, local storage, and similar technologies to keep you signed in, remember preferences, protect accounts, prevent fraud, understand service performance, and support essential functionality. Browser controls may allow you to block or delete these technologies, but doing so can prevent parts of the platform from working correctly. Where required, we request consent before using non-essential technologies.",
  },
  {
    id: "blockchain",
    number: "14",
    title: "Public Blockchain Information",
    content:
      "Public blockchains are transparent and generally immutable. Wallet addresses and transaction details submitted to a blockchain may remain publicly visible and may be copied or analyzed by third parties outside our control. We cannot delete or change information recorded on a public blockchain. Avoid placing personal information in public transaction fields.",
  },
  {
    id: "children",
    number: "15",
    title: "Children",
    content:
      "ByteStrike services are not directed to children or persons who are not legally permitted to use them. We do not knowingly collect personal information from children through the platform. If you believe a child has provided personal information to us, contact us so we can review and take appropriate action.",
  },
  {
    id: "changes",
    number: "16",
    title: "Changes to This Policy",
    content:
      "We may update this Policy to reflect changes to our services, processing practices, corporate structure, or legal obligations. We will post the updated version with a revised date and provide additional notice where required by law. Material changes apply from the date stated in the updated Policy.",
  },
  {
    id: "contact",
    number: "17",
    title: "Contact Us",
    content:
      "For privacy questions, requests, or complaints, contact ByteStrike Group at support@byte-strike.com. Please do not send identity documents or other sensitive information by ordinary email unless we specifically ask you to use an approved secure channel.",
    contact: true,
  },
];
