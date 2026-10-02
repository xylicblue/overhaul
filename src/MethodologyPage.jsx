import React, { useState, useEffect, useRef } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  FileText, 
  BookOpen,
  ArrowUp,
  ExternalLink,
  ArrowRight
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
  },
  a100: {
    title: "A100 GPU Index Pricing Methodology",
    subtitle: "Comprehensive Benchmark for AI Compute",
    version: "January 2025",
    sections: [
      {
        id: "executive-summary",
        title: "Executive Summary",
        content: `The market for high-performance AI compute has reached a pivotal stage of maturation. Once a niche resource accessible only to large technology firms and research institutions, GPU-accelerated compute is now a fundamental utility powering global economic activity. However, the market remains opaque, characterized by fragmented providers, inconsistent pricing structures, and a lack of standardized, trusted benchmarks.

This document establishes a comprehensive, rigorous, and reproducible methodology for creating a standardized benchmark for A100 GPU compute. The primary output is the **A100 Compute Index Price**, a single, volume-weighted, and performance-normalized value representing the fair market price of one hour of A100-equivalent GPU compute.

Drawing from established methodologies in commodity markets such as Nymex and ICE for crude oil, natural gas, and electricity futures, our approach prioritizes transparency, procedural rigor, and statistical validity.`
      },
      {
        id: "scope-objectives",
        title: "Scope and Objectives",
        content: `### Scope

The scope of this methodology is precisely defined to ensure focus, analytical integrity, and benchmark reliability:

- **Asset Class:** Exclusively GPU-based cloud compute capacity
- **Hardware Specification:** Confined to the NVIDIA A100 Tensor Core GPU and its major commercial variants
- **Service Type:** Covers Infrastructure-as-a-Service (IaaS) offerings where customers rent raw GPU compute hours
- **Provider Universe:** Encompasses a curated list of qualified cloud providers offering public access to A100 GPU infrastructure
- **Geographic Scope:** Data collection encompasses providers operating globally, normalized to USD
- **Time Unit:** Price per GPU-hour ($/GPU-Hour)

### Primary Objectives

- **Establish a Definitive Price Index:** Calculate and publish a single, reliable, and representative index price
- **Ensure Reproducibility and Transparency:** Document a complete, step-by-step procedure
- **Standardize Performance Measurement:** Create a framework for normalizing different A100 variants
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
- A100-specific revenue attribution
- Public company disclosed cloud revenue segments
- Private company cross-validated estimates

### Infrastructure Scale
- Estimated A100 GPU count
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
        content: `A100 GPUs are offered in multiple hardware variants with different performance characteristics. To ensure accurate price comparison, all pricing is normalized to a common performance baseline.

### Baseline Model
A100 SXM4 80GB variant designated as the performance baseline

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
- Within each category, providers are weighted proportionally by A100-specific revenue
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
- Large majority of hyperscaler A100 volume transacted under discounted contracts
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
Identify candidate providers from market research and industry databases. Vet for confirmed A100 availability, public pricing access, and data collection compliance. Categorize as Hyperscaler or Non-Hyperscaler.

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
        content: `The A100 Compute Index is designed to support multiple critical market functions:

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
  t4: {
    title: "T4 GPU Index Pricing Methodology",
    subtitle: "Enterprise Inference Compute Benchmark",
    version: "February 2025",
    sections: [
      {
        id: "executive-summary",
        title: "Executive Summary",
        content: `The market for enterprise AI inference compute has evolved significantly as organizations deploy AI models at scale. The NVIDIA T4 GPU, designed specifically for inference workloads, has become a cornerstone of production AI deployments due to its optimal balance of performance, power efficiency, and cost-effectiveness.

This document establishes a comprehensive, rigorous, and reproducible methodology for creating a standardized benchmark for T4 GPU compute. The primary output is the **T4 Compute Index Price**, a single, volume-weighted, and performance-normalized value representing the fair market price of one hour of T4-equivalent GPU compute.

Drawing from established methodologies in commodity markets such as Nymex and ICE for crude oil, natural gas, and electricity futures, our approach prioritizes transparency, procedural rigor, and statistical validity.`
      },
      {
        id: "scope-objectives",
        title: "Scope and Objectives",
        content: `### Scope

The scope of this methodology is precisely defined to ensure focus, analytical integrity, and benchmark reliability:

- **Asset Class:** Exclusively GPU-based cloud compute capacity optimized for inference workloads
- **Hardware Specification:** Confined to the NVIDIA T4 Tensor Core GPU (16GB GDDR6)
- **Service Type:** Covers Infrastructure-as-a-Service (IaaS) offerings where customers rent raw GPU compute hours
- **Provider Universe:** Encompasses a curated list of qualified cloud providers offering public access to T4 GPU infrastructure
- **Geographic Scope:** Data collection encompasses providers operating globally, normalized to USD
- **Time Unit:** Price per GPU-hour ($/GPU-Hour)

### Primary Objectives

- **Establish a Definitive Price Index:** Calculate and publish a single, reliable, and representative index price
- **Ensure Reproducibility and Transparency:** Document a complete, step-by-step procedure
- **Enable Inference Cost Benchmarking:** Provide a standardized reference for evaluating T4 inference costs
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
- Cost-optimized cloud platforms

**Rationale:** This separation addresses the profound structural differences between these groups. Hyperscalers command the vast majority of market revenue and operate pricing models with significant gaps between public and negotiated rates.`
      },
      {
        id: "data-collection",
        title: "Data Collection Framework",
        content: `For each qualified provider, a standardized set of data points is collected:

### Company Financials
- Annual revenue estimates
- T4-specific revenue attribution
- Public company disclosed cloud revenue segments
- Private company cross-validated estimates

### Infrastructure Scale
- Estimated T4 GPU count
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
        id: "t4-specifications",
        title: "T4 GPU Specifications",
        content: `The NVIDIA T4 GPU is designed for inference and light training workloads with specific performance characteristics:

### Hardware Specifications
- **Architecture:** Turing (TU104)
- **CUDA Cores:** 2,560
- **Tensor Cores:** 320
- **Memory:** 16 GB GDDR6
- **Memory Bandwidth:** 320 GB/s
- **FP32 Performance:** 8.1 TFLOPS
- **FP16 Performance:** 65 TFLOPS (with Tensor Cores)
- **INT8 Performance:** 130 TOPS
- **TDP:** 70W

### Primary Use Cases
- **AI Inference:** Production model serving at scale
- **Video Transcoding:** Real-time media processing
- **Light Training:** Small model fine-tuning
- **Virtual Desktop Infrastructure:** GPU-accelerated VDI

### Cost-Efficiency Focus
The T4's lower power consumption and optimized inference performance make it ideal for cost-sensitive production deployments where training performance is secondary to inference throughput.`
      },
      {
        id: "weighting-model",
        title: "Weighting Model",
        content: `A two-tiered weighting model ensures the index accurately reflects market structure:

### Tier 1: Categorical Weighting
- **Hyperscalers:** Assigned 65% of total weight, reflecting their dominant market position, infrastructure scale, and revenue concentration
- **Neoclouds:** Assigned 35% of total weight for specialized AI infrastructure providers and regional operators

### Tier 2: Revenue-Proportional Weighting
- Within each category, providers are weighted proportionally by T4-specific revenue
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
- Large majority of hyperscaler T4 volume transacted under discounted contracts
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
Identify candidate providers from market research and industry databases. Vet for confirmed T4 availability, public pricing access, and data collection compliance. Categorize as Hyperscaler or Non-Hyperscaler.

### Step 2: Data Collection
Deploy automated scrapers for pricing data extraction. Manual extraction for revenue data, discount structures, and GPU counts. All raw data logged with source, timestamp, and analyst attribution.

### Step 3: Data Standardization
Convert all pricing to USD using real-time exchange rates. Aggregate multiple prices per provider to single representative value.

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
        content: `The T4 Compute Index is designed to support multiple critical market functions:

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
- Inference cost optimization

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
  }
};

const MethodologyPage = () => {
  const { gpu } = useParams();
  const [activeSection, setActiveSection] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const sectionRefs = useRef({});
  const contentRef = useRef(null);

  const availableGpus = ["h100", "a100", "b200", "t4"];
  const currentGpu = methodologyContent[gpu] ? gpu : "h100";
  const content = methodologyContent[currentGpu];
  const currentIndex = availableGpus.indexOf(currentGpu);
  const previousIndex = (currentIndex - 1 + availableGpus.length) % availableGpus.length;
  const nextIndex = (currentIndex + 1) % availableGpus.length;
  const previousGpu = availableGpus[previousIndex];
  const nextGpu = availableGpus[nextIndex];

  // Track scroll position for ToC highlighting
  useEffect(() => {
    setActiveSection(content.sections[0]?.id || "");
    setIsSidebarOpen(false);

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
      return str.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-100">$1</strong>');
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
          <h3 key={`h-${i}`} className="mt-9 mb-4 text-lg font-semibold tracking-[-0.01em] text-zinc-100">
            {headerLine.replace("### ", "")}
          </h3>
        );
        
        // Process remaining content if any
        if (remainingLines.trim()) {
          // Check if remaining is bullets
          if (remainingLines.includes("- ")) {
            const bulletLines = remainingLines.split("\n").filter(l => l.startsWith("- "));
            elements.push(
              <ul key={`ul-${i}`} className="space-y-3">
                {bulletLines.map((bullet, j) => (
                  <li key={j} className="flex items-start gap-3.5 text-[15px] leading-7 text-zinc-400">
                    <span className="mt-[11px] h-1 w-1 flex-none rounded-full bg-blue-400" />
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
                className="mb-5 text-[15px] leading-7 text-zinc-400"
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
          <pre key={i} className="my-7 overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#0c0c12] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <code className="font-mono text-[13px] leading-6 text-blue-300">{code}</code>
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
            <div key={i} className="my-6">
              {introLine && (
                <p 
                  className="mb-4 text-[15px] leading-7 text-zinc-300"
                  dangerouslySetInnerHTML={{ __html: processBold(introLine) }}
                />
              )}
              <ol className="space-y-4">
                {numberedLines.map((line, j) => {
                  const content = line.replace(/^\d+\.\s*/, '').trim();
                  return (
                    <li key={j} className="flex items-start gap-4 text-[15px] leading-7 text-zinc-400">
                      <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 font-mono text-[10px] font-medium text-blue-300">
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
          <div key={i} className="my-6">
            {title && (
              <p 
                className="mb-4 text-[15px] leading-7 text-zinc-300"
                dangerouslySetInnerHTML={{ __html: processBold(title) }}
              />
            )}
            <ul className="space-y-3">
              {bullets.map((bullet, j) => (
                <li key={j} className="flex items-start gap-3.5 text-[15px] leading-7 text-zinc-400">
                  <span className="mt-[11px] h-1 w-1 flex-none rounded-full bg-blue-400" />
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
          className="mb-5 text-[15px] leading-7 text-zinc-400"
          dangerouslySetInnerHTML={{ __html: processBold(paragraph) }}
        />
      );
    });
    
    return elements;
  };

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050505] text-zinc-200 selection:bg-blue-500/30 selection:text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_-10%,rgba(10,132,255,0.12),transparent_58%)]" />

      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-white/[0.07] bg-[#050505]/88 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#050505]/78">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <RouterLink to="/" className="group flex shrink-0 items-center" aria-label="ByteStrike home">
              <img src={logoImage} alt="ByteStrike" className="h-7 w-auto opacity-95 transition-opacity group-hover:opacity-100" />
            </RouterLink>
            <div className="hidden min-w-0 items-center gap-2 text-xs text-zinc-500 sm:flex">
              <span className="h-4 w-px bg-white/10" />
              <span className="truncate text-zinc-300">Index Methodology</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden items-center rounded-xl border border-white/[0.07] bg-white/[0.035] p-1 lg:flex" aria-label="GPU index methodologies">
              {availableGpus.map((gpuName) => (
                <RouterLink
                  key={gpuName}
                  to={`/methodology/${gpuName}`}
                  aria-current={gpuName === currentGpu ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    gpuName === currentGpu
                      ? "bg-white/[0.1] text-white shadow-[0_1px_8px_rgba(0,0,0,0.25)]"
                      : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
                  }`}
                >
                  {gpuName.toUpperCase()}
                </RouterLink>
              ))}
            </nav>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white lg:hidden"
              aria-label={isSidebarOpen ? "Close table of contents" : "Open table of contents"}
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <RouterLink to="/trade" className="inline-flex h-9 items-center rounded-xl bg-[#0a84ff] px-3.5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(10,132,255,0.18)] transition-all hover:bg-[#2997ff] active:scale-[0.98] sm:px-4">
              Trade
            </RouterLink>
          </div>
        </div>
      </header>

      <div className="relative pt-14">
        <section className="border-b border-white/[0.06] px-5 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-20">
          <Motion.div
            key={currentGpu}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-[1120px]"
          >
            <div className="mb-7 flex flex-wrap items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/15 bg-blue-500/[0.08] px-3 py-1.5 text-blue-300">
                <FileText size={12} aria-hidden="true" />
                Published methodology
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>{content.version}</span>
            </div>
            <h1 className="max-w-4xl text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.045em] text-zinc-50 sm:text-5xl lg:text-[3.55rem]">
              {content.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">{content.subtitle}</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/[0.07] pt-5 text-xs text-zinc-500">
              <span><strong className="mr-2 font-medium text-zinc-300">Index</strong>{currentGpu.toUpperCase()}</span>
              <span><strong className="mr-2 font-medium text-zinc-300">Sections</strong>{content.sections.length}</span>
              <span><strong className="mr-2 font-medium text-zinc-300">Format</strong>USD per GPU-hour</span>
            </div>
          </Motion.div>
        </section>

        <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[220px_minmax(0,720px)] lg:gap-16 lg:py-16 xl:gap-20">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="mb-4 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <BookOpen size={13} aria-hidden="true" />
                On this page
              </div>
              <nav className="space-y-0.5" aria-label="Methodology sections">
                {content.sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    aria-current={activeSection === section.id ? "location" : undefined}
                    className={`group flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left text-[12px] leading-[1.35] transition-all ${
                      activeSection === section.id
                        ? "bg-white/[0.055] text-zinc-100"
                        : "text-zinc-600 hover:bg-white/[0.03] hover:text-zinc-300"
                    }`}
                  >
                    <span className={`mt-px font-mono text-[9px] ${activeSection === section.id ? "text-blue-400" : "text-zinc-700 group-hover:text-zinc-500"}`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <main ref={contentRef} className="min-w-0">
            <div className="space-y-16 sm:space-y-20">
              {content.sections.map((section, index) => (
                <Motion.section
                  key={`${currentGpu}-${section.id}`}
                  id={section.id}
                  ref={(el) => {
                    sectionRefs.current[section.id] = el;
                  }}
                  className="scroll-mt-24"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-70px" }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  <div className="mb-7 border-b border-white/[0.07] pb-5">
                    <span className="mb-3 block font-mono text-[10px] font-medium tracking-[0.12em] text-blue-400">{String(index + 1).padStart(2, "0")}</span>
                    <h2 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] text-zinc-100 sm:text-3xl">{section.title}</h2>
                  </div>
                  <div>{renderContent(section.content)}</div>
                </Motion.section>
              ))}
            </div>

            <div className="mt-20 border-t border-white/[0.08] pt-8">
              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Continue reading</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <RouterLink to={`/methodology/${previousGpu}`} className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.045]">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-600"><ChevronLeft size={13} /> Previous index</span>
                  <span className="mt-2 block text-sm font-medium text-zinc-200">{previousGpu.toUpperCase()} methodology</span>
                </RouterLink>
                <RouterLink to={`/methodology/${nextGpu}`} className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-right transition-all hover:border-white/[0.12] hover:bg-white/[0.045]">
                  <span className="flex items-center justify-end gap-1.5 text-[11px] text-zinc-600">Next index <ChevronRight size={13} /></span>
                  <span className="mt-2 block text-sm font-medium text-zinc-200">{nextGpu.toUpperCase()} methodology</span>
                </RouterLink>
              </div>

              <div className="mt-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <RouterLink to="/" className="inline-flex items-center gap-2 text-xs text-zinc-500 transition-colors hover:text-zinc-200"><ChevronLeft size={15} /> Back to ByteStrike</RouterLink>
                <RouterLink to="/trade" className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300">Open trading platform <ExternalLink size={13} /></RouterLink>
              </div>
            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <Motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-5 right-5 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-[#17171d]/90 text-zinc-300 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-[#202028] hover:text-white sm:bottom-8 sm:right-8"
            aria-label="Scroll to top"
          >
            <ArrowUp size={17} />
          </Motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <Motion.button
              type="button"
              aria-label="Close table of contents"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
            />
            <Motion.aside
              initial={{ opacity: 0, x: 24, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed bottom-3 right-3 top-[4.25rem] z-50 flex w-[min(88vw,360px)] flex-col overflow-hidden rounded-[24px] border border-white/[0.1] bg-[#111116]/96 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">Contents</p>
                  <p className="mt-1 text-sm font-medium text-zinc-200">{currentGpu.toUpperCase()} methodology</p>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400 hover:text-white" aria-label="Close menu">
                  <X size={16} />
                </button>
              </div>

              <div className="border-b border-white/[0.07] p-3">
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-black/25 p-1">
                  {availableGpus.map((gpuName) => (
                    <RouterLink
                      key={gpuName}
                      to={`/methodology/${gpuName}`}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`rounded-lg px-2 py-2 text-center text-[11px] font-medium transition-colors ${gpuName === currentGpu ? "bg-white/[0.1] text-white" : "text-zinc-500 hover:text-zinc-200"}`}
                    >
                      {gpuName.toUpperCase()}
                    </RouterLink>
                  ))}
                </div>
              </div>

              <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Mobile methodology sections">
                {content.sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] leading-snug transition-colors ${activeSection === section.id ? "bg-blue-500/10 text-zinc-100" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"}`}
                  >
                    <span className={`font-mono text-[9px] ${activeSection === section.id ? "text-blue-400" : "text-zinc-700"}`}>{String(index + 1).padStart(2, "0")}</span>
                    <span>{section.title}</span>
                  </button>
                ))}
              </nav>

              <RouterLink to="/trade" onClick={() => setIsSidebarOpen(false)} className="m-3 flex items-center justify-between rounded-xl bg-[#0a84ff] px-4 py-3 text-sm font-semibold text-white">
                Open trading platform <ArrowRight size={15} />
              </RouterLink>
            </Motion.aside>
          </>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default MethodologyPage;
