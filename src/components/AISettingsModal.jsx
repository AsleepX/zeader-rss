import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Settings } from 'lucide-react';
import { useAIStore } from '../store/useAIStore';

export function AISettingsModal() {
    const { isAISettingsOpen, closeAISettings, apiBase, apiKey, modelName, language, updateSettings } = useAIStore();

    // Local state for form inputs to avoid excessive store updates/re-renders while typing
    const [localSettings, setLocalSettings] = useState({
        apiBase: '',
        apiKey: '',
        modelName: '',
        language: ''
    });

    useEffect(() => {
        if (isAISettingsOpen) {
            setLocalSettings({
                apiBase: apiBase || 'https://api.openai.com/v1',
                apiKey: apiKey || '',
                modelName: modelName || 'gpt-3.5-turbo',
                language: language || 'Chinese'
            });
        }
    }, [isAISettingsOpen, apiBase, apiKey, modelName, language]);

    const handleSave = () => {
        updateSettings(localSettings);
        closeAISettings();
    };

    if (!isAISettingsOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeAISettings}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white">
                    <div className="flex items-center gap-2 text-primary-700">
                        <Settings className="w-5 h-5" />
                        <h2 className="font-semibold text-lg">Z's Soul Settings</h2>
                    </div>
                    <button
                        onClick={closeAISettings}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
                        <input
                            type="text"
                            value={localSettings.apiBase}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, apiBase: e.target.value }))}
                            placeholder="https://api.openai.com/v1"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                        <p className="text-xs text-gray-400 mt-1">The base URL for the OpenAI-compatible API.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                        <input
                            type="password"
                            value={localSettings.apiKey}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                        <p className="text-xs text-gray-400 mt-1">Your secret API key. Stored locally.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                        <input
                            type="text"
                            value={localSettings.modelName}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, modelName: e.target.value }))}
                            placeholder="gpt-3.5-turbo"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                        <p className="text-xs text-gray-400 mt-1">The model ID to use (e.g., gpt-4, claude-3-opus).</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                        <select
                            value={localSettings.language}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, language: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-white"
                        >
                            <option value="Chinese">Chinese</option>
                            <option value="English">English</option>
                            <option value="Japanese">Japanese</option>
                            <option value="Korean">Korean</option>
                            <option value="French">French</option>
                            <option value="Spanish">Spanish</option>
                            <option value="German">German</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-1">The language for AI responses.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={closeAISettings}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
