import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ReactDOM from "react-dom";
import { X, ChevronRight, ChevronLeft, Wallet, Droplets, Coins, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WelcomeModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const steps = [
    {
      title: "Connect to ByteStrike",
      subtitle: "Link Your Wallet",
      icon: <Wallet className="w-8 h-8 text-blue-400" />,
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">1</div>
              <div>
                <h4 className="font-bold text-white mb-1">Connect Your Wallet</h4>
                <p className="text-sm text-slate-400">Click the <span className="text-blue-400 font-semibold">"Connect Wallet"</span> button in the top-right corner.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">2</div>
              <div>
                <h4 className="font-bold text-white mb-1">Select Your Wallet</h4>
                <p className="text-sm text-slate-400">Choose your preferred wallet (MetaMask, Rainbow, etc.) and approve the connection.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">3</div>
              <div>
                <h4 className="font-bold text-white mb-1">Switch to Sepolia</h4>
                <p className="text-sm text-slate-400">If prompted, switch your network to <span className="text-blue-400 font-semibold">Sepolia Testnet</span>.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-sm text-green-200">
              <strong>Verification:</strong> Your wallet address will appear in the top right with a green indicator.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Get Sepolia ETH",
      subtitle: "Gas Fees for Transactions",
      icon: <Droplets className="w-8 h-8 text-purple-400" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 text-sm leading-relaxed">
            You need Sepolia ETH to pay for transaction gas fees. We've made it easy for you!
          </p>

          <div className="p-5 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-2xl border border-indigo-500/30">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              Get Test ETH (Recommended)
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">1</span>
                <span>Find <strong>"Need Test ETH?"</strong> in the Collateral panel</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">2</span>
                <span>Click <strong>"Get Test ETH"</strong> button</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">3</span>
                <span>Receive <strong>0.04 ETH</strong> automatically!</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-sm text-blue-200">
              <strong>No external faucets needed!</strong> Request once every 24 hours if your balance is low.
            </p>
          </div>

          <details className="group">
            <summary className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
              Alternative: External Faucets
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-600 transition-colors group/link">
                <div className="text-xs font-bold text-slate-300 mb-1">Alchemy Faucet</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 group-hover/link:text-blue-400">
                  Get 0.5 ETH <ExternalLink size={10} />
                </div>
              </a>
              <a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-600 transition-colors group/link">
                <div className="text-xs font-bold text-slate-300 mb-1">Google Cloud</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 group-hover/link:text-blue-400">
                  Get 0.05 ETH <ExternalLink size={10} />
                </div>
              </a>
            </div>
          </details>
        </div>
      ),
    },
    {
      title: "Get Test USDC",
      subtitle: "Your Trading Capital",
      icon: <Coins className="w-8 h-8 text-yellow-400" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 text-sm leading-relaxed">
            ByteStrike uses mock USDC for trading. Get started with free test tokens!
          </p>

          <div className="p-5 bg-gradient-to-br from-yellow-900/20 to-orange-900/20 rounded-2xl border border-yellow-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Coins className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="font-bold text-white">Mint 10,000 USDC</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">1</span>
                <span>Click <strong>"Mint 10,000 USDC"</strong> in the trading panel</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">2</span>
                <span>Confirm transaction & wait ~15s</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Next Steps</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                <span className="text-sm text-slate-300"><strong>Approve USDC</strong> for trading</span>
              </div>
              <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                <span className="text-sm text-slate-300"><strong>Deposit Collateral</strong> (1k-5k USDC)</span>
              </div>
              <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                <span className="text-sm text-slate-300"><strong>Start Trading!</strong></span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
            <p className="text-xs text-yellow-200 leading-relaxed">
              <strong>Testnet Only:</strong> All tokens and trades are for practice. No real funds are involved.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 shadow-inner">
                  {steps[currentStep].icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{steps[currentStep].title}</h2>
                  <p className="text-sm text-slate-400">{steps[currentStep].subtitle}</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-900 w-full flex">
              {steps.map((_, index) => (
                <div 
                  key={index}
                  className={`h-full flex-1 transition-all duration-300 ${
                    index <= currentStep ? "bg-blue-500" : "bg-transparent"
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {steps[currentStep].content}
              </motion.div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                {steps.map((_, index) => (
                  <div 
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentStep ? "bg-blue-500" : "bg-slate-800"
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentStep === 0 
                      ? "text-slate-600 cursor-not-allowed" 
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all hover:scale-105 flex items-center gap-2"
                >
                  {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                  {currentStep < steps.length - 1 && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default WelcomeModal;
