ByteStrike Market Rules, Risk Disclosure and User Acknowledgement
For review and acknowledgement before a user places their first trade | Version 1.0 | 16 June 2026
Important Notice: This document summarizes key market rules and risks for ByteStrike perpetual futures markets referencing GPU compute pricing. It is a user acknowledgement and risk disclosure, not a substitute for the deployed smart contracts, protocol parameters, full Terms of Use, market notices, or legal/regulatory disclosures.
1. PLATFORM ROLE AND MARKET STRUCTURE
ByteStrike operates settlement-layer infrastructure for supported perpetual futures markets that reference GPU compute prices, hourly rental rates, and related compute benchmarks. ByteStrike markets are derivative markets; they are not spot markets for GPU hardware, physical compute capacity, or cloud-service contracts. Deposited assets are held by smart contracts. ByteStrike does not hold user wallet private keys, and users authorize transactions through their own wallets or custodians.
•	Users trade long or short exposure through a virtual automated market maker, not a traditional matched order book.
•	A trade may execute even where no equal and opposite user position exists at that time.
•	Positions are perpetual and do not have a fixed expiry unless a market is paused, migrated, settled, or closed under applicable rules.
2. KEY TRADING AND SETTLEMENT RISKS
•	One-sided markets: Open interest may become concentrated on one side, including a market with only long or only short exposure. This can create funding, liquidity, collateral, and settlement pressure.
•	Funding risk: Funding may be positive, negative, delayed, limited, or different from estimates where opposite-side exposure or available settlement resources are insufficient.
•	Thin liquidity and price impact: A single trade or liquidation may materially move the virtual AMM mark price, especially in new or thin markets.
•	Different prices: Oracle price, mark price, execution price, liquidation price, margin valuation, and displayed frontend estimates may differ.
•	Liquidation and leverage: Leveraged positions can lose value rapidly and may be liquidated if collateral falls below required thresholds.
•	Smart-contract, oracle, network, and frontend risk: Contracts may contain bugs, oracle inputs may be delayed or incorrect, transactions may fail or be reordered, and frontend/indexer data may lag on-chain state.
•	Insurance-fund limits: Any insurance fund or backstop mechanism may be limited and is not a guarantee against loss, bad debt, oracle issues, funding imbalance, or market dislocation.
3. PROTOCOL RULES AND OPERATIONAL CONTROLS
Settlement is governed by deployed smart-contract code, configured market parameters, oracle data, collateral rules, funding rules, margin rules, liquidation rules, transaction timing, and applicable market controls. Off-chain systems such as frontends, indexers, monitoring tools, alerts, and reconciliation systems support the platform but do not independently override valid on-chain contract state.
•	ByteStrike may seed markets, monitor imbalances, restrict market availability, limit position sizes, update permitted parameters, pause trading, delay launch or unpause, coordinate keeper/oracle operations, migrate or retire a market, or use incident-response procedures.
•	Operational intervention may affect the user’s ability to open, close, liquidate, add margin, remove margin, or withdraw at a particular time.
4. USER RESPONSIBILITIES
•	Read all market notices, displayed warnings, protocol rules, and transaction details before signing.
•	Maintain sufficient collateral and monitor open positions, funding, margin health, liquidation thresholds, and slippage settings.
•	Understand that displayed values are estimates and may change before execution or settlement.
•	Use ByteStrike only if the user understands and accepts the risks of perpetual futures trading, smart contracts, virtual AMMs, and on-chain settlement.
5. USER ACKNOWLEDGEMENT
By clicking “I Acknowledge”, connecting a wallet, or placing a first trade on ByteStrike, the user confirms that:
1.	the user has read and understood this disclosure and accepts the market-structure and settlement-layer risks described above;
2.	ByteStrike markets use a virtual AMM and do not require a matched counterparty for each trade;
3.	markets may become one-sided and may create funding, liquidity, collateral, price-impact, liquidation, and settlement risks;
4.	funding, PnL, fees, penalties, withdrawals, liquidations, and other settlement flows are subject to actual smart-contract rules and available settlement resources;
5.	ByteStrike may take operational actions to protect market integrity, manage risk, or respond to incidents, and those actions may affect user activity;
6.	perpetual futures trading involves material risk, including liquidation risk and possible loss of deposited collateral.
Acknowledgement checkbox text: I have read and understand the ByteStrike Market Rules, Risk Disclosure and User Acknowledgement, and I accept these risks before placing my first trade.

