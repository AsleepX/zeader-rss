import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import OpenAI from 'openai';
import { useAuthStore } from './useAuthStore';
import { AI_FORMATS, createAnthropicMessage, extractAnthropicText, getAIProxyBaseUrl, getAIProxyHeaders } from '../utils/ai';

export const useAIStore = create(
    persist(
        (set, get) => ({
            // Settings
            apiBase: 'https://api.openai.com/v1',
            apiKey: '',
            voiceApiKey: '', // Separate key for TTS
            apiFormat: AI_FORMATS.OPENAI,

            modelName: 'gpt-4o',
            audioModel: 'IndexTeam/IndexTTS-2', // Default TTS model
            language: 'Chinese',
            isAIEnabled: true,

            // UI State
            isAIModalOpen: false,
            isAISettingsOpen: false,
            aiResult: '',
            aiStatus: 'idle', // 'idle', 'loading', 'success', 'error'
            aiContext: '',

            // Actions
            updateSettings: (settings) => set((state) => ({ ...state, ...settings })),

            openAISettings: () => set({ isAISettingsOpen: true }),
            closeAISettings: () => set({ isAISettingsOpen: false }),

            openAIModal: (context) => {
                if (!get().isAIEnabled) return;
                set({ isAIModalOpen: true, aiContext: context, aiResult: '', aiStatus: 'loading' });
                get().generateAIResponse(context);
            },

            closeAIModal: () => set({ isAIModalOpen: false, aiStatus: 'idle' }),

            generateAIResponse: async (context) => {
                const { apiBase, apiKey, apiFormat, modelName, language, isAIEnabled } = get();
                const { token } = useAuthStore.getState();

                if (!isAIEnabled) return;

                if (!apiKey) {
                    set({ aiStatus: 'error', aiResult: 'Please configure your API Key in Settings -> Z\'s soul.' });
                    return;
                }

                try {
                    const system = `You are a helpful AI assistant integrated into an RSS reader. Your goal is to help the user understand, summarize, or analyze the content they are reading. Please answer in ${language}. Be concise and insightful.`;

                    if (apiFormat === AI_FORMATS.ANTHROPIC) {
                        const response = await createAnthropicMessage({
                            apiBase,
                            apiKey,
                            modelName,
                            system,
                            messages: [{ role: 'user', content: context }],
                            token,
                        });

                        set({ aiStatus: 'success', aiResult: extractAnthropicText(response) || 'No response from AI.' });
                        return;
                    }

                    const openai = new OpenAI({
                        baseURL: getAIProxyBaseUrl(AI_FORMATS.OPENAI),
                        apiKey: apiKey,
                        dangerouslyAllowBrowser: true, // Required for client-side usage
                        defaultHeaders: getAIProxyHeaders({ apiBase, token }),
                    });

                    const completion = await openai.chat.completions.create({
                        messages: [
                            { role: "system", content: system },
                            { role: "user", content: context }
                        ],
                        model: modelName,
                    });

                    const result = completion.choices[0]?.message?.content || 'No response from AI.';
                    set({ aiStatus: 'success', aiResult: result });
                } catch (error) {
                    console.error('AI Generation Error:', error);
                    let errorMessage = error.message;

                    if (errorMessage.includes('404')) {
                        errorMessage = '404 Not Found. Please check your API Base URL and Model Name.';
                    } else if (errorMessage.includes('401')) {
                        errorMessage = '401 Unauthorized. Please check your API Key.';
                    } else if (errorMessage.includes('Network Error') || errorMessage.includes('Connection error')) {
                        errorMessage = 'Connection Error. This is likely a CORS issue. Please ensure you are using the correct API Base URL and that the proxy is configured correctly.';
                    }

                    set({ aiStatus: 'error', aiResult: `Error: ${errorMessage}` });
                }
            },

            generateText: async (context, options = {}) => {
                const { apiBase, apiKey, apiFormat, modelName, language, isAIEnabled } = get();
                const { token } = useAuthStore.getState();

                if (!isAIEnabled) {
                    throw new Error('AI features are disabled.');
                }

                if (!apiKey) {
                    throw new Error('Please configure your API Key in Settings -> Z\'s soul.');
                }

                const system = `You are a helpful AI assistant. Please answer in ${language}.`;

                if (apiFormat === AI_FORMATS.ANTHROPIC) {
                    const response = await createAnthropicMessage({
                        apiBase,
                        apiKey,
                        modelName,
                        system,
                        messages: [{ role: 'user', content: context }],
                        token,
                    });

                    return extractAnthropicText(response);
                }

                const openai = new OpenAI({
                    baseURL: getAIProxyBaseUrl(AI_FORMATS.OPENAI),
                    apiKey: apiKey,
                    dangerouslyAllowBrowser: true,
                    defaultHeaders: getAIProxyHeaders({ apiBase, token }),
                });

                const completionOptions = {
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: context }
                    ],
                    model: modelName,
                };

                // Add optional parameters
                if (options.temperature !== undefined) {
                    completionOptions.temperature = options.temperature;
                }

                const completion = await openai.chat.completions.create(completionOptions);

                return completion.choices[0]?.message?.content || '';
            },
        }),
        {
            name: 'ai-storage', // unique name
            partialize: (state) => ({
                apiBase: state.apiBase,
                apiKey: state.apiKey,
                voiceApiKey: state.voiceApiKey, // Persist voiceApiKey
                apiFormat: state.apiFormat,
                modelName: state.modelName,
                audioModel: state.audioModel,
                language: state.language,
                isAIEnabled: state.isAIEnabled
            }), // Only persist settings
        }
    )
);
