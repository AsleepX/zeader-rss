import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Settings } from 'lucide-react';
import { useAIStore } from '../store/useAIStore';

export function AISettingsModal() {
    const { isAISettingsOpen, closeAISettings, apiBase, apiKey, voiceApiKey, modelName, audioModel, language, isAIEnabled, updateSettings } = useAIStore();

    // Local state for form inputs to avoid excessive store updates/re-renders while typing
    const [localSettings, setLocalSettings] = useState({
        apiBase: '',
        apiKey: '',
        modelName: '',
        audioModel: '',
        language: '',
        isAIEnabled: true
    });

    useEffect(() => {
        if (isAISettingsOpen) {
            setLocalSettings({
                apiBase: apiBase || 'https://api.openai.com/v1',
                apiKey: apiKey || '',
                modelName: modelName || 'gpt-3.5-turbo',
                voiceApiKey: voiceApiKey || '',
                audioModel: audioModel || 'IndexTeam/IndexTTS-2',
                language: language || 'Chinese',
                isAIEnabled: isAIEnabled !== undefined ? isAIEnabled : true
            });
        }
    }, [isAISettingsOpen, apiBase, apiKey, voiceApiKey, modelName, audioModel, language, isAIEnabled]);

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
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                            <label className="block text-sm font-medium text-gray-900">Enable AI Features</label>
                            <p className="text-xs text-gray-500">Turn off to disable all AI functionality.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={localSettings.isAIEnabled}
                                onChange={(e) => setLocalSettings(prev => ({ ...prev, isAIEnabled: e.target.checked }))}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
                        <input
                            type="text"
                            value={localSettings.apiBase}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, apiBase: e.target.value }))}
                            placeholder="https://api.openai.com/v1"
                            disabled={!localSettings.isAIEnabled}
                            className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${!localSettings.isAIEnabled ? 'bg-gray-100 text-gray-400' : ''}`}
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
                            disabled={!localSettings.isAIEnabled}
                            className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${!localSettings.isAIEnabled ? 'bg-gray-100 text-gray-400' : ''}`}
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
                            disabled={!localSettings.isAIEnabled}
                            className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${!localSettings.isAIEnabled ? 'bg-gray-100 text-gray-400' : ''}`}
                        />
                        <p className="text-xs text-gray-400 mt-1">The model ID to use (e.g., gpt-4, claude-3-opus).</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Voice API Key (SiliconFlow)</label>
                        <input
                            type="password"
                            value={localSettings.voiceApiKey || ''}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, voiceApiKey: e.target.value }))}
                            placeholder="sk-..."
                            disabled={!localSettings.isAIEnabled}
                            className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${!localSettings.isAIEnabled ? 'bg-gray-100 text-gray-400' : ''}`}
                        />
                        <p className="text-xs text-gray-400 mt-1">API Key for SiliconFlow TTS (Index-TTS). Leave empty to use main API Key if applicable.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Audio Model</label>
                        <input
                            type="text"
                            value={localSettings.audioModel}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, audioModel: e.target.value }))}
                            placeholder="IndexTeam/IndexTTS-2"
                            disabled={!localSettings.isAIEnabled}
                            className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${!localSettings.isAIEnabled ? 'bg-gray-100 text-gray-400' : ''}`}
                        />
                        <p className="text-xs text-gray-400 mt-1">The TTS model to use (e.g. IndexTeam/IndexTTS-2, fishaudio/fish-speech-1.5).</p>
                    </div>


                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                        <select
                            value={localSettings.language}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, language: e.target.value }))}
                            disabled={!localSettings.isAIEnabled}
                            className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-white ${!localSettings.isAIEnabled ? 'bg-gray-100 text-gray-400' : ''}`}
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
        </div >
    );
}
