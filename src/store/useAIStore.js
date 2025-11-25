import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import OpenAI from 'openai';

export const useAIStore = create(
    persist(
        (set, get) => ({
            // Settings
            apiBase: 'https://api.openai.com/v1',
            apiKey: '',

            modelName: 'gpt-4o',
            language: 'Chinese',

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
                set({ isAIModalOpen: true, aiContext: context, aiResult: '', aiStatus: 'loading' });
                get().generateAIResponse(context);
            },

            closeAIModal: () => set({ isAIModalOpen: false, aiStatus: 'idle' }),

            generateAIResponse: async (context) => {
                const { apiBase, apiKey, modelName, language } = get();

                if (!apiKey) {
                    set({ aiStatus: 'error', aiResult: 'Please configure your API Key in Settings -> Z\'s soul.' });
                    return;
                }

                let finalApiBase = apiBase;

                // Use proxy for Moonshot
                if (apiBase.includes('api.moonshot.cn')) {
                    finalApiBase = `${window.location.origin}/api/moonshot/v1`;
                }
                // Use proxy for Gemini
                else if (apiBase.includes('generativelanguage.googleapis.com')) {
                    finalApiBase = `${window.location.origin}/api/gemini/v1beta/openai/`;
                }
                // Use proxy for SiliconFlow
                else if (apiBase.includes('api.siliconflow.cn')) {
                    finalApiBase = `${window.location.origin}/api/siliconflow/v1`;
                }

                try {
                    const openai = new OpenAI({
                        baseURL: finalApiBase,
                        apiKey: apiKey,
                        dangerouslyAllowBrowser: true // Required for client-side usage
                    });

                    const completion = await openai.chat.completions.create({
                        messages: [
                            { role: "system", content: `You are a helpful AI assistant integrated into an RSS reader. Your goal is to help the user understand, summarize, or analyze the content they are reading. Please answer in ${language}. Be concise and insightful.` },
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

            generateText: async (context) => {
                const { apiBase, apiKey, modelName, language } = get();

                if (!apiKey) {
                    throw new Error('Please configure your API Key in Settings -> Z\'s soul.');
                }

                let finalApiBase = apiBase;

                // Use proxy for Moonshot
                if (apiBase.includes('api.moonshot.cn')) {
                    finalApiBase = `${window.location.origin}/api/moonshot/v1`;
                }
                // Use proxy for Gemini
                else if (apiBase.includes('generativelanguage.googleapis.com')) {
                    finalApiBase = `${window.location.origin}/api/gemini/v1beta/openai/`;
                }
                // Use proxy for SiliconFlow
                else if (apiBase.includes('api.siliconflow.cn')) {
                    finalApiBase = `${window.location.origin}/api/siliconflow/v1`;
                }

                const openai = new OpenAI({
                    baseURL: finalApiBase,
                    apiKey: apiKey,
                    dangerouslyAllowBrowser: true
                });

                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: `You are a helpful AI assistant. Please answer in ${language}.` },
                        { role: "user", content: context }
                    ],
                    model: modelName,
                });

                return completion.choices[0]?.message?.content || '';
            },
        }),
        {
            name: 'ai-storage', // unique name
            partialize: (state) => ({
                apiBase: state.apiBase,
                apiKey: state.apiKey,
                modelName: state.modelName,
                language: state.language
            }), // Only persist settings
        }
    )
);
