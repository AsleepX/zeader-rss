import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Folder, Rss, CheckSquare, Square } from 'lucide-react';
import { useFeedStore } from '../store/useFeedStore';
import { parseOpml, flattenFeeds } from '../utils/opml';
import { motion, AnimatePresence } from 'framer-motion';

export function ImportOpmlModal({ isOpen, onClose }) {
    const [step, setStep] = useState('upload'); // 'upload', 'analyzing', 'select'
    const [parsedNodes, setParsedNodes] = useState([]);
    const [selectedIndices, setSelectedIndices] = useState({}); // { index: true/false }
    const fileInputRef = useRef(null);
    const { importOpml, isLoading, feeds: currentFeeds } = useFeedStore();

    // Removed: if (!isOpen) return null;

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setStep('analyzing');
            const nodes = await parseOpml(file);

            // Filter duplicates? 
            // It's harder with a tree. We can just mark them as existing or let the user decide.
            // For now, let's keep the logic simple: show everything, but maybe warn or pre-deselect duplicates?
            // The previous logic filtered duplicates completely.
            // Let's filter out root feeds that are duplicates.
            // For folders, we might want to merge? The store logic handles merging folders.
            // But if a folder contains ONLY duplicate feeds, maybe we shouldn't import it?

            // Let's just load everything and let the store handle duplicates (it checks URL).
            // But we might want to give feedback.

            const allFeeds = flattenFeeds(nodes);
            const existingUrls = new Set(currentFeeds.map(f => f.url));
            const newFeedsCount = allFeeds.filter(f => !existingUrls.has(f.url)).length;

            if (newFeedsCount === 0 && allFeeds.length > 0) {
                alert("All feeds in the OPML file are already subscribed.");
                setStep('upload');
                return;
            }

            setParsedNodes(nodes);

            // Default select all
            const initialSelected = {};
            nodes.forEach((_, index) => initialSelected[index] = true);
            setSelectedIndices(initialSelected);

            setStep('select');
        } catch (error) {
            console.error("Failed to parse OPML:", error);
            alert("Failed to parse OPML file");
            setStep('upload');
        }
    };

    const handleImport = async () => {
        const nodesToImport = parsedNodes.filter((_, index) => selectedIndices[index]);
        await importOpml(nodesToImport);
        onClose();
        setStep('upload');
    };

    const toggleSelection = (index) => {
        setSelectedIndices(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const toggleAll = () => {
        const allSelected = Object.values(selectedIndices).every(Boolean);
        const newSelected = {};
        parsedNodes.forEach((_, index) => newSelected[index] = !allSelected);
        setSelectedIndices(newSelected);
    };

    // Helper to separate for display
    const folders = parsedNodes.map((node, index) => ({ node, index })).filter(item => item.node.type === 'folder');
    const ungrouped = parsedNodes.map((node, index) => ({ node, index })).filter(item => item.node.type === 'feed');

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col relative z-10"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Import OPML</h2>
                            <p className="text-sm text-gray-500 mt-1">Import feeds from another RSS reader</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {step === 'upload' && (
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">Click to upload OPML file</h3>
                                    <p className="text-sm text-gray-500 mt-2">Supports .opml or .xml files</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".opml,.xml"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            )}

                            {step === 'analyzing' && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-4" />
                                    <p className="text-gray-600">Analyzing feeds...</p>
                                </div>
                            )}

                            {step === 'select' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900">Select items to import</h3>
                                        <button
                                            onClick={toggleAll}
                                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                        >
                                            Toggle All
                                        </button>
                                    </div>

                                    {folders.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Folders</h4>
                                            {folders.map(({ node, index }) => (
                                                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <div
                                                        className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                                                        onClick={() => toggleSelection(index)}
                                                    >
                                                        {selectedIndices[index] ? (
                                                            <CheckSquare className="w-5 h-5 text-primary-600" />
                                                        ) : (
                                                            <Square className="w-5 h-5 text-gray-400" />
                                                        )}
                                                        <Folder className="w-4 h-4 text-gray-500" />
                                                        <span className="font-medium text-gray-900">{node.name}</span>
                                                        <span className="text-xs text-gray-500 ml-auto">{node.children?.length || 0} feeds</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {ungrouped.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ungrouped Feeds</h4>
                                            <div className="space-y-2">
                                                {ungrouped.map(({ node, index }) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                                        onClick={() => toggleSelection(index)}
                                                    >
                                                        {selectedIndices[index] ? (
                                                            <CheckSquare className="w-5 h-5 text-primary-600" />
                                                        ) : (
                                                            <Square className="w-5 h-5 text-gray-400" />
                                                        )}
                                                        <Rss className="w-4 h-4 text-gray-500" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">{node.title}</p>
                                                            <p className="text-xs text-gray-500 truncate">{node.url}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {step === 'select' && (
                            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                                <button
                                    onClick={() => setStep('upload')}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={isLoading}
                                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import Selected'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
