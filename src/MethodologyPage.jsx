import React, { useState, useEffect, useRef } from "react";
import { Link as RouterLink, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  FileText, 
  BookOpen,
  ArrowUp,
  ExternalLink 
} from "lucide-react";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import Footer from "./components/Footer";

// Methodology content
const methodologyContent = {
  h100: {
    title: "H100 GPU Index Pricing Methodology",
    subtitle: "Comprehensive Benchmark for AI Compute",
    version: "October 2025",
    sections: [
      {
        id: "executive-summary",
        title: "Executive Summary",
        content: `The market for high-performance AI compute has reached a pivotal stage of maturation. Once a niche resource accessible only to large technology firms and research institutions, GPU-accelerated compute is now a fundamental utility powering global economic activity. However, the market remains opaque, characterized by fragmented providers, inconsistent pricing structures, and a lack of standardized, trusted benchmarks.

This document establishes a comprehensive, rigorous, and reproducible methodology for creating a standardized benchmark for H100 GPU compute. The primary output is the **H100 Compute Index Price**, a single, volume-weighted, and performance-normalized value representing the fair market price of one hour of H100-equivalent GPU compute.

Drawing from established methodologies in commodity markets such as Nymex and ICE for crude oil, natural gas, and electricity futures, our approach prioritizes transparency, procedural rigor, and statistical validity.`
      },
      {
        id: "scope-objectives",
        title: "Scope and Objectives",
        content: `### Scope

The scope of this methodology is precisely defined to ensure focus, analytical integrity, and benchmark reliability:

- **Asset Class:** Exclusively GPU-based cloud compute capacity
- **Hardware Specification:** Confined to the NVIDIA H100 Tensor Core GPU and its major commercial variants
- **Service Type:** Covers Infrastructure-as-a-Service (IaaS) offerings where customers rent raw GPU compute hours
- **Provider Universe:** Encompasses a curated list of qualified cloud providers offering public access to H100 GPU infrastructure
- **Geographic Scope:** Data collection encompasses providers operating globally, normalized to USD
- **Time Unit:** Price per GPU-hour ($/GPU-Hour)

### Primary Objectives

- **Establish a Definitive Price Index:** Calculate and publish a single, reliable, and representative index price
- **Ensure Reproducibility and Transparency:** Document a complete, step-by-step procedure
- **Standardize Performance Measurement:** Create a framework for normalizing different H100 variants
- **Support Financial Product Development:** Produce a benchmark for spot exchanges, forwards, and futures
- **Improve Market Efficiency:** Reduce information asymmetry between buyers and sellers`
      },
      {
        id: "provider-classification",
        title: "Provider Classification",
        content: `All qualified providers are classified into two categories:

### Hyperscalers (HS)

Large-scale cloud service providers characterized by:
- Massive global data center infrastructure
- Multi-region availability
- Dominant market share
- Pricing models that bifurcate between public list prices and private enterprise contracts

### Neoclouds

Specialized and regional cloud compute providers including:
- Specialized AI infrastructure providers
- Regional operators
- Smaller cloud platforms

**Rationale:** This separation addresses the profound structural differences between these groups. Hyperscalers command the vast majority of market revenue and operate pricing models with significant gaps between public and negotiated rates.`
      },
      {
        id: "data-collection",
        title: "Data Collection Framework",
        content: `For each qualified provider, a standardized set of data points is collected:

### Company Financials
- Annual revenue estimates
- H100-specific revenue attribution
- Public company disclosed cloud revenue segments
- Private company cross-validated estimates

### Infrastructure Scale
- Estimated H100 GPU count
- Used to validate revenue figures and understand market capacity

### Pricing Data
- Public on-demand hourly prices
- Hardware variant specifications
- Instance configurations
- Currency denomination

### Discounting Structure (Hyperscalers Only)
- Provider-specific discount rates from market intelligence
- Volume share under discounted contracts vs public retail rates
- Continuously updated as additional market data becomes available`
      },
      {
        id: "data-sources",
        title: "Data Sources and Validation",
        content: `Data is sourced from authoritative channels prioritized as follows:

1. **Official Financial Documents:** SEC filings, earnings transcripts, investor presentations, IPO prospectus documents
2. **Official Company Disclosures:** Pricing pages, press releases, official blogs, GPU availability announcements
3. **Business Intelligence Platforms:** Reputable third-party platforms for private company estimates
4. **Industry Research:** Specialized AI infrastructure research and market intelligence
5. **Automated Web Scraping:** Custom Python scrapers using BeautifulSoup4 library

All data points are cross-referenced with multiple independent sources. Official company disclosures are prioritized over third-party estimates. Conservative estimation practices are employed when uncertainty exists.`
      },
      {
        id: "performance-normalization",
        title: "Performance Normalization",
        content: `H100 GPUs are offered in multiple hardware variants with different performance characteristics. To ensure accurate price comparison, all pricing is normalized to a common performance baseline.

### Baseline Model
H100 SXM5 variant designated as the performance baseline

### Normalization Method
Performance ratio calculated using weighted hardware specifications:
- FP16 and FP64 TFLOPS (strongest price correlation)
- CUDA Cores and Tensor Cores (general compute capability)
- VRAM capacity (critical for large model training)
- Memory Bandwidth (data throughput)
- L2 Cache (latency reduction)

### Application
Variant prices divided by performance ratio to yield performance-equivalent baseline pricing

### Weights
Derived from linear regression analysis of hardware-price correlations across NVIDIA GPU product lines`
      },
      {
        id: "weighting-model",
        title: "Weighting Model",
        content: `A two-tiered weighting model ensures the index accurately reflects market structure:

### Tier 1: Categorical Weighting
- **Hyperscalers:** Assigned 65% of total weight, reflecting their dominant market position, infrastructure scale, and revenue concentration
- **Neoclouds:** Assigned 35% of total weight for specialized AI infrastructure providers and regional operators

### Tier 2: Revenue-Proportional Weighting
- Within each category, providers are weighted proportionally by H100-specific revenue
- Ensures the index reflects economic gravity of each market participant
- Prevents distortion from providers with minimal market impact

**Rationale:** Revenue-based weighting reflects that providers with greater market presence have larger impact on true market pricing dynamics.`
      },
      {
        id: "discount-adjustment",
        title: "Hyperscaler Discount Adjustment",
        content: `The final price for hyperscalers is not the public list price, but a blended effective price reflecting the mix of retail and discounted enterprise sales.

### Discount Rate Sources
- Publicly documented committed use discount (CUD) and reserved instance (RI) structures
- Enterprise contract intelligence and procurement term analysis
- Market research and industry surveys
- Provider financial disclosures and revenue per GPU metrics
- Cross-validation with market transaction data

### Volume Split
- Large majority of hyperscaler H100 volume transacted under discounted contracts
- Remaining volume at or near public on-demand rates

### Update Protocol
- Discount rates reviewed quarterly or upon detection of significant market changes
- Updates incorporate new enterprise contract data and market intelligence
- All changes documented with effective dates and rationale`
      },
      {
        id: "calculation-process",
        title: "Index Calculation Process",
        content: `### Step 1: Provider Vetting
Identify candidate providers from market research and industry databases. Vet for confirmed H100 availability, public pricing access, and data collection compliance. Categorize as Hyperscaler or Non-Hyperscaler.

### Step 2: Data Collection
Deploy automated scrapers for pricing data extraction. Manual extraction for revenue data, discount structures, and GPU counts. All raw data logged with source, timestamp, and analyst attribution.

### Step 3: Data Standardization
Convert all pricing to USD using real-time exchange rates. Normalize variant pricing to performance-equivalent baseline. Aggregate multiple prices per provider to single representative value.

### Step 4: Weight Calculation
Calculate categorical weights (Hyperscaler/Non-Hyperscaler allocation). Calculate revenue-proportional weights within categories. Apply discount adjustments to hyperscaler pricing.

### Step 5: Weighted Summation
Multiply each provider's effective price by its weight. Sum all weighted contributions to derive final index.

### Step 6: Validation and Publication
Compare against historical values, median, and simple average. Verify weight sums and calculation integrity. Timestamp and publish to database and blockchain oracle. Archive all calculation artifacts.`
      },
      {
        id: "contingency-protocols",
        title: "Contingency and Fallback Protocols",
        content: `### Provider Data Unavailability

In the event that a provider's pricing data cannot be retrieved due to temporary website downtime, API failure, or other technical issues:

- Weight allocated to unavailable provider is not discarded
- Weight is proportionally redistributed across remaining providers in the same category
- Redistribution maintains category totals (Hyperscaler/Non-Hyperscaler proportions)
- Ensures continuity of index calculation without category-level bias

### Anomaly Detection
- Calculated prices deviating significantly from historical values trigger automatic rejection
- System substitutes anomalous calculations with last validated price
- Secondary validation protocol confirms whether anomaly represents error or genuine market shift

### Data Quality Safeguards
- Invalid or incomplete data excluded from calculation rather than propagated
- Statistical outlier detection using IQR methodology
- Hyperscaler prices protected from outlier filtering to avoid systematic bias`
      },
      {
        id: "quality-assurance",
        title: "Quality Assurance and Control",
        content: `### Automated Validation
- Range checks on all numeric data
- Format validation against defined schemas
- Timestamp consistency verification
- Duplicate detection and removal
- Weight sum verification

### Manual Review
- Dual analyst review of final dataset
- Outlier investigation and documentation
- Random sample verification of scraped data
- Independent calculation verification

### Reproducibility
- All scripts version-controlled and publicly documented
- Discount rates explicitly specified with effective dates
- Parameters versioned and archived for historical reproduction
- Dependencies pinned to specific versions
- Complete audit trail from raw data to final index`
      },
      {
        id: "applications",
        title: "Index Applications",
        content: `The H100 Compute Index is designed to support multiple critical market functions:

### Financial Products
- Spot exchange pricing reference
- Forward contract pricing
- Futures market underlying benchmark
- Options pricing spot reference

### Procurement and Planning
- Vendor quote benchmarking
- Budget planning and forecasting
- Contract negotiation market context
- Build vs. buy financial analysis

### Market Analysis
- Price discovery and transparency
- Market trend monitoring
- Competitive positioning analysis
- Generation-over-generation pricing evolution

### Investment and Financing
- Infrastructure financing revenue projections
- GPU asset valuation
- Market sizing and analysis
- Investment due diligence`
      },
      {
        id: "governance",
        title: "Methodology Governance",
        content: `### Version Control
- All methodology changes versioned and documented
- Effective dates clearly specified
- Rationale for changes provided
- Historical versions maintained for reproducibility

### Update Frequency
- Index calculated on a regular schedule
- Methodology reviewed quarterly
- Discount parameters updated as market data becomes available
- Emergency updates for material market changes

### Transparency
- Complete calculation procedures publicly documented
- All data sources disclosed
- Assumptions clearly stated
- Historical parameters maintained for reproducibility
- Blockchain publication for immutable record`
      }
    ]
  },
  b200: {
    title: "B200 GPU Index Pricing Methodology",
    subtitle: "Next-Generation AI Compute Benchmark",
    version: "December 2024",
    sections: [
      {
        id: "executive-summary",
        title: "Executive Summary",
        content: `The market for next-generation AI compute infrastructure has matured to become a fundamental utility powering global economic activity. However, the market remains characterized by opaque pricing, fragmented providers, and a fundamental absence of standardized, trusted benchmarks.

This document establishes a comprehensive, rigorous, and reproducible methodology for creating a standardized benchmark for B200 GPU compute. The primary output is the **B200 Compute Index Price**, a single, volume-weighted, and revenue-adjusted value representing the fair market price of one hour of B200 GPU compute.

Drawing from established methodologies in commodity markets such as Nymex and ICE for crude oil, natural gas, and electricity futures, our approach prioritizes transparency, procedural rigor, and statistical validity.`
      },
      {
        id: "scope-objectives",
        title: "Scope and Objectives",
        content: `### Scope

The scope of this methodology is precisely defined:

- **Asset Class:** Exclusively GPU-based cloud compute capacity utilizing NVIDIA's Blackwell architecture
- **Hardware Specification:** Confined to the NVIDIA B200 Tensor Core GPU with standard memory configuration
- **Service Type:** Covers Infrastructure-as-a-Service (IaaS) offerings
- **Provider Universe:** Curated list of qualified cloud providers
- **Geographic Scope:** Global providers, normalized to USD
- **Time Unit:** Price per GPU-hour ($/GPU-Hour)

### Primary Objectives

- **Establish a Definitive Price Index:** Calculate a reliable representative index price
- **Ensure Reproducibility and Transparency:** Document complete procedures
- **Support Financial Product Development:** Enable spot exchanges, forwards, and futures
- **Improve Market Efficiency:** Reduce information asymmetry
- **Enable Comparative Analysis:** Provide standardized reference for evaluating B200 pricing`
      },
      {
        id: "provider-classification",
        title: "Provider Classification",
        content: `### Hyperscalers (HS)

Large-scale cloud service providers characterized by:
- Massive global data center infrastructure
- Multi-region availability
- Significant market revenue concentration

### Neoclouds

Specialized and regional cloud compute providers including:
- Specialized AI infrastructure providers
- Regional operators`
      },
      {
        id: "data-collection",
        title: "Data Collection Framework",
        content: `For each qualified provider:

### Company Financials
- Quarterly GPU-specific revenue estimates
- Public company disclosed segments
- Private company cross-validated estimates

### Infrastructure Scale
- Estimated operational GPU count
- Market capacity understanding

### Pricing Data
- Public on-demand hourly prices
- Hardware configuration details
- Currency denomination

### Discounting Structure (Hyperscalers Only)
- Provider-specific discount rates
- Volume share under discounted contracts`
      },
      {
        id: "weighting-model",
        title: "Weighting Model",
        content: `A two-tiered weighting model ensures the index accurately reflects market structure:

### Tier 1: Categorical Weighting
- **Hyperscalers:** Assigned 65% of total weight, reflecting their dominant market position and infrastructure scale
- **Neoclouds:** Assigned 35% of total weight for specialized AI infrastructure providers and regional operators

### Tier 2: Revenue-Proportional Weighting
- Providers weighted proportionally by quarterly GPU-specific revenue
- Reflects economic gravity of each market participant
- Prevents distortion from providers with minimal market impact`
      },
      {
        id: "discount-adjustment",
        title: "Hyperscaler Discount Adjustment",
        content: `The final price for hyperscalers is not the public list price, but a blended effective price reflecting the mix of retail and discounted enterprise sales.

### Discount Rate Sources
- Publicly documented CUD structures
- Enterprise contract intelligence
- Market research and industry surveys
- Provider financial disclosures
- Cross-validation with previous-generation GPU discount patterns`
      },
      {
        id: "calculation-process",
        title: "Index Calculation Process",
        content: `### Step 1: Data Aggregation
Collect verified per-GPU hourly prices from all qualified providers. Validate for format, range, and completeness.

### Step 2: Discount Application
Apply provider-specific discount adjustments to hyperscalers. Non-hyperscalers use public prices without adjustment.

### Step 3: Weight Calculation
Calculate category weights (Hyperscaler/Non-Hyperscaler split). Calculate individual provider weights based on revenue proportions.

### Step 4: Weighted Summation
Multiply each provider's effective price by its weight. Sum all weighted contributions to derive final index.

### Step 5: Validation
Compare against simple average, median, and historical values. Verify weight sums and component ratios.

### Step 6: Publication
Timestamp and publish to database for time-series tracking. Publish to blockchain oracle for transparency.`
      },
      {
        id: "contingency-protocols",
        title: "Contingency and Fallback Protocols",
        content: `### Provider Data Unavailability
- Weight proportionally redistributed across remaining providers
- Maintains category totals
- Ensures index continuity

### Data Quality Issues
- Incomplete data excluded from calculation cycle
- Flagged for investigation
- Re-included once standards met

### Market Disruptions
- Emergency updates for material changes
- Extraordinary events trigger review
- All contingencies documented`
      },
      {
        id: "quality-assurance",
        title: "Quality Assurance",
        content: `### Automated Validation
- Range checks, format validation
- Timestamp consistency verification
- Duplicate detection and removal

### Manual Review
- Dual analyst review
- Outlier investigation
- Independent verification

### Reproducibility
- Version-controlled scripts
- Explicit discount rate documentation
- Containerizable calculation environment`
      },
      {
        id: "applications",
        title: "Index Applications",
        content: `### Financial Products
- Spot exchange pricing reference
- Forward and futures contract pricing
- Options pricing spot reference

### Procurement and Planning
- Vendor quote benchmarking
- Budget planning and forecasting
- Contract negotiation context

### Market Analysis
- Price discovery and transparency
- Market trend monitoring
- Competitive positioning analysis

### Investment and Financing
- Infrastructure financing projections
- GPU asset valuation
- Market sizing and analysis`
      }
    ]
  }
};

const MethodologyPage = () => {
  const { gpu } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const sectionRefs = useRef({});
  const contentRef = useRef(null);

  // Get content based on GPU type
  const content = methodologyContent[gpu] || methodologyContent.h100;
  const otherGpu = gpu === "b200" ? "h100" : "b200";
  const otherGpuLabel = gpu === "b200" ? "H100" : "B200";

  // Track scroll position for ToC highlighting
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);

      // Find active section
      const sections = content.sections;
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = sectionRefs.current[section.id];
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [content.sections]);

  // Scroll to section
  const scrollToSection = (sectionId) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setIsSidebarOpen(false);
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Render markdown-like content
  const renderContent = (text) => {
    // Helper to process bold text
    const processBold = (str) => {
      return str.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-medium">$1</strong>');
    };

    // Split by double newlines but also handle header+bullet combinations
    const paragraphs = text.split("\n\n");
    const elements = [];
    
    paragraphs.forEach((paragraph, i) => {
      // Handle paragraphs that start with header but contain more content
      if (paragraph.startsWith("### ")) {
        const lines = paragraph.split("\n");
        const headerLine = lines[0];
        const remainingLines = lines.slice(1).join("\n");
        
        // Add the header
        elements.push(
          <h4 key={`h-${i}`} className="text-lg font-semibold text-white mt-8 mb-4">
            {headerLine.replace("### ", "")}
          </h4>
        );
        
        // Process remaining content if any
        if (remainingLines.trim()) {
          // Check if remaining is bullets
          if (remainingLines.includes("- ")) {
            const bulletLines = remainingLines.split("\n").filter(l => l.startsWith("- "));
            elements.push(
              <ul key={`ul-${i}`} className="space-y-2">
                {bulletLines.map((bullet, j) => (
                  <li key={j} className="flex items-start gap-3 text-slate-400">
                    <span className="text-indigo-400 flex-shrink-0 leading-relaxed">•</span>
                    <span 
                      className="flex-1"
                      dangerouslySetInnerHTML={{ 
                        __html: processBold(bullet.replace("- ", ""))
                      }} 
                    />
                  </li>
                ))}
              </ul>
            );
          } else {
            // Regular text after header
            elements.push(
              <p 
                key={`p-${i}`}
                className="text-slate-400 leading-relaxed mb-4"
                dangerouslySetInnerHTML={{ __html: processBold(remainingLines) }}
              />
            );
          }
        }
        return;
      }
      
      // Code blocks
      if (paragraph.startsWith("```") || paragraph.startsWith("\\`\\`\\`")) {
        const code = paragraph.replace(/```/g, "").replace(/\\`\\`\\`/g, "").trim();
        elements.push(
          <pre key={i} className="bg-slate-900/80 border border-slate-700 rounded-lg p-4 my-6 overflow-x-auto">
            <code className="text-sm text-indigo-300 font-mono">{code}</code>
          </pre>
        );
        return;
      }
      
      // Numbered lists (1., 2., 3., etc.)
      if (/^\d+\.\s/.test(paragraph) || paragraph.includes("\n1.") || paragraph.includes("\n2.")) {
        const lines = paragraph.split("\n");
        const numberedLines = lines.filter(l => /^\d+\.\s/.test(l.trim()));
        const introLine = lines[0] && !/^\d+\.\s/.test(lines[0].trim()) ? lines[0] : null;
        
        if (numberedLines.length > 0) {
          elements.push(
            <div key={i} className="my-4">
              {introLine && (
                <p 
                  className="text-slate-300 mb-3"
                  dangerouslySetInnerHTML={{ __html: processBold(introLine) }}
                />
              )}
              <ol className="space-y-3">
                {numberedLines.map((line, j) => {
                  const content = line.replace(/^\d+\.\s*/, '').trim();
                  return (
                    <li key={j} className="flex items-start gap-3 text-slate-400">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium flex items-center justify-center mt-0.5">
                        {j + 1}
                      </span>
                      <span 
                        className="flex-1"
                        dangerouslySetInnerHTML={{ __html: processBold(content) }} 
                      />
                    </li>
                  );
                })}
              </ol>
            </div>
          );
          return;
        }
      }
      
      // Bullet points with newlines
      if (paragraph.includes("\n- ") || paragraph.startsWith("- ")) {
        const lines = paragraph.split("\n");
        const title = lines[0] && !lines[0].startsWith("- ") ? lines[0] : null;
        const bullets = lines.filter(l => l.startsWith("- "));
        elements.push(
          <div key={i} className="my-4">
            {title && (
              <p 
                className="text-slate-300 mb-3"
                dangerouslySetInnerHTML={{ __html: processBold(title) }}
              />
            )}
            <ul className="space-y-2">
              {bullets.map((bullet, j) => (
                <li key={j} className="flex items-start gap-3 text-slate-400">
                  <span className="text-indigo-400 flex-shrink-0 leading-relaxed">•</span>
                  <span 
                    className="flex-1"
                    dangerouslySetInnerHTML={{ __html: processBold(bullet.replace("- ", "")) }} 
                  />
                </li>
              ))}
            </ul>
          </div>
        );
        return;
      }

      // Regular paragraph with bold text support
      elements.push(
        <p 
          key={i} 
          className="text-slate-400 leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: processBold(paragraph) }}
        />
      );
    });
    
    return elements;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <RouterLink to="/" className="flex items-center gap-3 group">
              <img
                src={logoImage}
                alt="Byte Strike"
                className="h-7 w-auto transition-transform group-hover:scale-105"
              />
            </RouterLink>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
              <RouterLink to="/" className="hover:text-white transition-colors">Home</RouterLink>
              <ChevronRight size={14} />
              <span className="text-white">Methodology</span>
              <ChevronRight size={14} />
              <span className="text-indigo-400">{gpu?.toUpperCase()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Switch GPU Button */}
            <button
              onClick={() => navigate(`/methodology/${otherGpu}`)}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <FileText size={14} />
              View {otherGpuLabel} Methodology
            </button>
            
            {/* Mobile Menu */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <RouterLink
              to="/trade"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Trade
            </RouterLink>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar / Table of Contents */}
        <AnimatePresence>
          {(isSidebarOpen || typeof window !== 'undefined' && window.innerWidth >= 768) && (
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className={`fixed md:sticky top-16 left-0 w-72 h-[calc(100vh-4rem)] bg-slate-950/95 md:bg-transparent border-r border-white/5 overflow-y-auto z-40 ${
                isSidebarOpen ? "block" : "hidden md:block"
              }`}
            >
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen size={18} className="text-indigo-400" />
                  <span className="text-sm font-semibold text-white">Table of Contents</span>
                </div>
                
                <nav className="space-y-1">
                  {content.sections.map((section, index) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-start gap-3 group ${
                        activeSection === section.id
                          ? "bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500"
                          : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <span className={`text-xs font-mono mt-0.5 ${
                        activeSection === section.id ? "text-indigo-400" : "text-slate-600"
                      }`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-snug">{section.title}</span>
                    </button>
                  ))}
                </nav>

                {/* Mobile: Switch GPU */}
                <div className="md:hidden mt-8 pt-6 border-t border-white/10">
                  <button
                    onClick={() => {
                      navigate(`/methodology/${otherGpu}`);
                      setIsSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300"
                  >
                    <FileText size={14} />
                    View {otherGpuLabel} Methodology
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main ref={contentRef} className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-6 py-12">
            {/* Title Section */}
            <div className="mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
                <FileText size={12} />
                {content.version}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                {content.title}
              </h1>
              <p className="text-xl text-slate-400 leading-relaxed">
                {content.subtitle}
              </p>
            </div>

            {/* Sections */}
            {content.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                ref={(el) => (sectionRefs.current[section.id] = el)}
                className="mb-16 scroll-mt-24"
              >
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                </div>
                <div className="prose prose-invert max-w-none">
                  {renderContent(section.content)}
                </div>
              </section>
            ))}

            {/* Bottom Navigation */}
            <div className="border-t border-white/10 pt-8 mt-16">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <RouterLink
                  to="/"
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={18} />
                  Back to Home
                </RouterLink>
                <div className="flex items-center gap-4">
                  <RouterLink
                    to={`/methodology/${otherGpu}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <FileText size={14} />
                    {otherGpuLabel} Methodology
                  </RouterLink>
                  <RouterLink
                    to="/trade"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
                  >
                    Start Trading
                    <ExternalLink size={14} />
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 transition-colors z-50"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Footer />
    </div>
  );
};

export default MethodologyPage;
