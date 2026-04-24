export const AI_FORMATS = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
};

export const normalizeAIBaseUrl = (apiBase) => {
    const trimmed = (apiBase || '').trim().replace(/\/+$/, '');
    if (!trimmed) return '';

    try {
        const url = new URL(trimmed);
        if (url.hostname === 'api.minimax.com' || url.hostname === 'api.minimaxi.com') {
            url.hostname = 'api.minimax.io';
        }
        return url.toString().replace(/\/+$/, '');
    } catch {
        return trimmed;
    }
};

export const getAIProxyBaseUrl = (apiFormat) => `${window.location.origin}/api/ai/${apiFormat || AI_FORMATS.OPENAI}`;

export const getAIProxyHeaders = ({ apiBase, token }) => ({
    'X-App-Token': token || '',
    'X-AI-Target-Base': normalizeAIBaseUrl(apiBase),
});

export const extractAnthropicText = (data) => {
    if (!data?.content) return '';

    return data.content
        .filter((part) => part?.type === 'text' && part.text)
        .map((part) => part.text)
        .join('');
};

export const sanitizeAIText = (text) => (text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:yaml|yml|markdown|md)?/gi, '')
    .replace(/```/g, '')
    .trim();

const parseAnthropicError = async (response) => {
    const fallback = `HTTP ${response.status}`;
    try {
        const data = await response.json();
        return data?.error?.message || data?.message || fallback;
    } catch {
        return fallback;
    }
};

export const createAnthropicMessage = async ({
    apiBase,
    apiKey,
    modelName,
    system,
    messages,
    token,
    signal,
    maxTokens = 4096,
}) => {
    const response = await fetch(`${getAIProxyBaseUrl(AI_FORMATS.ANTHROPIC)}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-App-Token': token || '',
            'X-AI-Target-Base': normalizeAIBaseUrl(apiBase),
            'X-API-Key': apiKey,
            'Anthropic-Version': '2023-06-01',
        },
        body: JSON.stringify({
            model: modelName,
            max_tokens: maxTokens,
            system,
            messages,
        }),
        signal,
    });

    if (!response.ok) {
        throw new Error(await parseAnthropicError(response));
    }

    return response.json();
};

export const streamAnthropicMessage = async ({
    apiBase,
    apiKey,
    modelName,
    system,
    messages,
    token,
    signal,
    onText,
    maxTokens = 4096,
}) => {
    const response = await fetch(`${getAIProxyBaseUrl(AI_FORMATS.ANTHROPIC)}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-App-Token': token || '',
            'X-AI-Target-Base': normalizeAIBaseUrl(apiBase),
            'X-API-Key': apiKey,
            'Anthropic-Version': '2023-06-01',
        },
        body: JSON.stringify({
            model: modelName,
            max_tokens: maxTokens,
            system,
            messages,
            stream: true,
        }),
        signal,
    });

    if (!response.ok) {
        throw new Error(await parseAnthropicError(response));
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
            const dataLine = event.split('\n').find((line) => line.startsWith('data: '));
            if (!dataLine) continue;

            const payload = dataLine.slice(6).trim();
            if (!payload || payload === '[DONE]') continue;

            try {
                const data = JSON.parse(payload);
                const text = data?.delta?.type === 'text_delta' ? data.delta.text : '';
                if (text) onText(text);
            } catch {
                // Ignore partial/non-JSON stream frames.
            }
        }
    }
};
