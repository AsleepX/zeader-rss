import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Upload, Download, Trash2, Sparkles } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

export const MobileSettingsSheet = ({ isOpen, onClose, onAddFeed, onImportOpml, onExportOpml, onCleanup, onConfigureAI }) => {
    const { themeColor, setThemeColor } = useThemeStore();

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[70] flex flex-col shadow-xl pb-safe"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="font-semibold text-lg">Settings</h3>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-2">
                            <button onClick={() => { onAddFeed(); onClose(); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left font-medium text-gray-700">
                                <Plus className="w-5 h-5" /> Add New Feed
                            </button>
                            <button onClick={() => { onImportOpml(); onClose(); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left font-medium text-gray-700">
                                <Download className="w-5 h-5" /> Import OPML
                            </button>
                            <button onClick={() => { onExportOpml(); onClose(); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left font-medium text-gray-700">
                                <Upload className="w-5 h-5" /> Export OPML
                            </button>
                            <button onClick={() => { onCleanup(); onClose(); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left font-medium text-gray-700">
                                <Trash2 className="w-5 h-5" /> Clean Up
                            </button>
                            <button onClick={() => { onConfigureAI(); onClose(); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left font-medium text-gray-700">
                                <Sparkles className="w-5 h-5" /> Configure Z's Soul
                            </button>

                            <div className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl">
                                <span className="flex items-center gap-3 font-medium text-gray-700">
                                    <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: themeColor }}></div>
                                    Theme Color
                                </span>
                                <input
                                    type="color"
                                    value={themeColor}
                                    onChange={(e) => setThemeColor(e.target.value)}
                                    className="w-8 h-8 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                                />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
