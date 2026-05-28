import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  HiOutlineBookOpen, 
  HiOutlineWallet, 
  HiOutlineCurrencyDollar, 
  HiOutlineArrowDownTray, 
  HiOutlineChartBar,
  HiCheckCircle,
  HiExclamationTriangle,
  HiOutlineArrowRight
} from "react-icons/hi2";
import "./guidepage.css";

const GuidePage = () => {
  const [activeSection, setActiveSection] = useState("setup");

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetPosition =
        element.getBoundingClientRect().top + window.pageYOffset - 100;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      // Update active section based on scroll position
      const sections = ["setup", "connect", "eth", "usdc", "deposit", "trade"];
      const scrollPosition = window.pageYOffset + 150;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const SidebarItem = ({ id, number, label, icon }) => (
    <button
      onClick={() => scrollToSection(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
        activeSection === id 
          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5" 
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
      }`}
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 ${
        activeSection === id
          ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
          : "bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-300"
      }`}>
        {number}
      </div>
      <span className="font-medium text-sm">{label}</span>
      {activeSection === id && (
        <HiOutlineArrowRight className="ml-auto w-4 h-4 text-blue-500 opacity-50" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 font-sans selection:bg-blue-500/30">
      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#050505]/50 to-[#050505] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-6 backdrop-blur-sm">
            <HiOutlineBookOpen className="w-4 h-4" />
            COMPLETE TRADING GUIDE
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">ByteStrike</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Your comprehensive guide to trading perpetual futures on the Sepolia Testnet. 
            Learn to deposit, trade, and manage positions in minutes.
          </p>
          
          <div className="flex flex-wrap justify-center gap-8 mt-10 text-sm font-medium text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Duration: ~10 mins
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Cost: Free (Testnet)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Level: Beginner
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-24 flex flex-col lg:flex-row gap-12">
        {/* Sidebar Navigation */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-28 space-y-2">
            <div className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Table of Contents
            </div>
            <SidebarItem id="setup" number="1" label="Prerequisites" />
            <div className="h-4 border-l border-zinc-800 ml-8 my-1" />
            <SidebarItem id="connect" number="2" label="Connect Wallet" />
            <div className="h-4 border-l border-zinc-800 ml-8 my-1" />
            <SidebarItem id="eth" number="3" label="Get Test ETH" />
            <div className="h-4 border-l border-zinc-800 ml-8 my-1" />
            <SidebarItem id="usdc" number="4" label="Get Test USDC" />
            <div className="h-4 border-l border-zinc-800 ml-8 my-1" />
            <SidebarItem id="deposit" number="5" label="Deposit Collateral" />
            <div className="h-4 border-l border-zinc-800 ml-8 my-1" />
            <SidebarItem id="trade" number="6" label="Start Trading" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-3xl space-y-20">
          
          {/* Prerequisites */}
          <section id="setup" className="scroll-mt-28">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 font-bold text-xl">1</div>
              <h2 className="text-3xl font-bold text-white">Prerequisites</h2>
            </div>
            
            <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm hover:border-zinc-700 transition-colors">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <HiOutlineWallet className="text-blue-400" />
                Wallet Setup
              </h3>
              <p className="text-zinc-400 mb-6 leading-relaxed">
                You'll need a Web3 wallet to interact with ByteStrike. We recommend <strong>MetaMask</strong> or <strong>Rainbow</strong>.
              </p>
              
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <HiOutlineArrowDownTray className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Download MetaMask</h4>
                    <p className="text-sm text-zinc-400 mb-3">Available for Chrome, Firefox, iOS, and Android.</p>
                    <a 
                      href="https://metamask.io" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Visit metamask.io →
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex items-center gap-2 text-sm text-amber-400/80 bg-amber-500/5 px-4 py-2 rounded-lg border border-amber-500/10">
                <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Always securely backup your seed phrase and never share it!</span>
              </div>
            </div>
          </section>

          {/* Connect */}
          <section id="connect" className="scroll-mt-28">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 font-bold text-xl">2</div>
              <h2 className="text-3xl font-bold text-white">Connect to ByteStrike</h2>
            </div>

            <div className="space-y-4">
              {[
                { title: "Connect Wallet", desc: "Click the 'Connect Wallet' button in the top-right corner." },
                { title: "Select Wallet", desc: "Choose your preferred wallet from the list and approve the connection." },
                { title: "Switch Network", desc: "If prompted, approve the switch to Sepolia Testnet." }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 bg-[#0A0A0A]/30 border border-zinc-800/50 p-6 rounded-xl">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{step.title}</h4>
                    <p className="text-zinc-400 text-sm">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-green-500/5 border border-green-500/10 rounded-xl p-4 flex items-center gap-3">
              <HiCheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-400/90 font-medium">
                You'll see your wallet address in the header when connected successfully.
              </span>
            </div>
          </section>

          {/* Get ETH */}
          <section id="eth" className="scroll-mt-28">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 font-bold text-xl">3</div>
              <h2 className="text-3xl font-bold text-white">Get Sepolia ETH</h2>
            </div>
            
            <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
              You need Sepolia ETH to pay for gas fees. We've built a faucet directly into the app for your convenience.
            </p>

            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <HiOutlineCurrencyDollar className="w-32 h-32 text-blue-400" />
              </div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-bold mb-4 shadow-lg shadow-blue-500/20">
                  RECOMMENDED
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Use Built-in Faucet</h3>
                <p className="text-zinc-300 mb-6 max-w-lg">
                  Get 0.04 ETH instantly without leaving the app. Just look for the "Get ETH" button in the Collateral Manager.
                </p>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</div>
                    Find "Collateral Manager" panel on the Trade page
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">2</div>
                    Click the "Get ETH" button
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">3</div>
                    Receive 0.04 ETH automatically
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Alternative External Faucets</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="bg-[#0A0A0A]/50 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-all group">
                  <h5 className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">Alchemy Faucet</h5>
                  <p className="text-xs text-zinc-500">Requires free account • 0.5 ETH/day</p>
                </a>
                <a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noopener noreferrer" className="bg-[#0A0A0A]/50 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-all group">
                  <h5 className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">Google Cloud Faucet</h5>
                  <p className="text-xs text-zinc-500">Requires Google account • 0.05 ETH/day</p>
                </a>
              </div>
            </div>
          </section>

          {/* Get USDC */}
          <section id="usdc" className="scroll-mt-28">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 font-bold text-xl">4</div>
              <h2 className="text-3xl font-bold text-white">Get Test USDC</h2>
            </div>

            <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
              <p className="text-zinc-400 mb-6">
                ByteStrike uses mock USDC for trading. You can mint 10,000 USDC for free to start testing.
              </p>
              
              <div className="bg-[#050505] border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-white mb-2">Mint 10,000 USDC</h4>
                  <p className="text-sm text-zinc-400">
                    Click the "Mint USDC" button in the Collateral Manager panel and confirm the transaction in your wallet.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="px-4 py-2 bg-zinc-800 rounded text-xs font-mono text-zinc-300 border border-zinc-700">
                    Wait ~15s for confirmation
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Deposit */}
          <section id="deposit" className="scroll-mt-28">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 font-bold text-xl">5</div>
              <h2 className="text-3xl font-bold text-white">Deposit Collateral</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 font-bold">A</div>
                <h3 className="text-lg font-bold text-white mb-2">Approve USDC</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  First, you must approve the smart contract to spend your USDC. This is a one-time action per token.
                </p>
              </div>
              <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 font-bold">B</div>
                <h3 className="text-lg font-bold text-white mb-2">Deposit Funds</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Enter an amount (e.g., 5,000 USDC) and click "Deposit". These funds will be used as margin for your trades.
                </p>
              </div>
            </div>
          </section>

          {/* Trade */}
          <section id="trade" className="scroll-mt-28">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 font-bold text-xl">6</div>
              <h2 className="text-3xl font-bold text-white">Start Trading</h2>
            </div>

            <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-4">Opening a Position</h3>
                  <ul className="space-y-4">
                    <li className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                      <p className="text-sm text-zinc-300">Select a market (e.g., ETH-PERP)</p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                      <p className="text-sm text-zinc-300">Choose <strong>Long</strong> (Buy) or <strong>Short</strong> (Sell)</p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                      <p className="text-sm text-zinc-300">Enter position size and leverage</p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                      <p className="text-sm text-zinc-300">Confirm the trade</p>
                    </li>
                  </ul>
                </div>
                
                <div className="w-full md:w-64 flex flex-col gap-4">
                  <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <HiOutlineChartBar className="text-green-400" />
                      <span className="font-bold text-green-400 text-sm">Long Position</span>
                    </div>
                    <p className="text-xs text-zinc-400">Profit when price goes <strong>UP</strong></p>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <HiOutlineChartBar className="text-red-400" />
                      <span className="font-bold text-red-400 text-sm">Short Position</span>
                    </div>
                    <p className="text-xs text-zinc-400">Profit when price goes <strong>DOWN</strong></p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="pt-12 pb-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Start?</h2>
            <p className="text-zinc-400 mb-8">You have all the tools you need. Join the future of trading.</p>
            <Link 
              to="/trade" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40 hover:-translate-y-1"
            >
              Launch Trading Platform
              <HiOutlineArrowRight />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GuidePage;
