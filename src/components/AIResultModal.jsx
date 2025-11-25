import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAIStore } from '../store/useAIStore';

export function AIResultModal() {
    const { isAIModalOpen, aiResult, aiStatus, closeAIModal, aiContext } = useAIStore();
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') closeAIModal();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeAIModal]);

    const handleCopy = () => {
        navigator.clipboard.writeText(aiResult);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isAIModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeAIModal}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white">
                    <div className="flex items-center gap-2 text-primary-700">
                        <Sparkles className="w-5 h-5" />
                        <h2 className="font-semibold text-lg">Z's Insight</h2>
                    </div>
                    <button
                        onClick={closeAIModal}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
                    {aiStatus === 'loading' ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 space-y-4">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
                                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary-500 animate-pulse" />
                            </div>
                            <p className="text-gray-500 font-medium animate-pulse">Consulting the oracle...</p>
                        </div>
                    ) : aiStatus === 'error' ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                            <p className="font-medium">Something went wrong</p>
                            <p className="text-sm mt-1 opacity-90">{aiResult}</p>
                        </div>
                    ) : (
                        <div className="prose prose-slate prose-sm sm:prose-base max-w-none">
                            <ReactMarkdown>{aiResult}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {aiStatus === 'success' && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                        <div className="text-xs text-gray-400 truncate max-w-[60%]">
                            Context: {aiContext.slice(0, 50)}...
                        </div>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-primary-600 transition-all shadow-sm"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied' : 'Copy Result'}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
