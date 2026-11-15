// Substitua os blocos `plan` e `call` do seu api/chat.js por estes:
const OPENAI_PROVS = {
  groq:       { url: 'https://api.groq.com/openai/v1/chat/completions', key: () => process.env.GROQ_API_KEY, chat: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'], fast: ['llama-3.1-8b-instant'] },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', key: () => process.env.OPENROUTER_API_KEY, chat: ['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free'], fast: ['openrouter/free'] },
  sambanova:  { url: 'https://api.sambanova.ai/v1/chat/completions', key: () => process.env.SAMBANOVA_API_KEY, chat: ['Meta-Llama-3.3-70B-Instruct'], fast: ['Meta-Llama-3.1-8B-Instruct'] },
  mistral:    { url: 'https://api.mistral.ai/v1/chat/completions', key: () => process.env.MISTRAL_API_KEY, chat: ['mistral-small-latest'], fast: ['mistral-small-latest'] },
  nvidia:     { url: 'https://integrate.api.nvidia.com/v1/chat/completions', key: () => process.env.NVIDIA_API_KEY, chat: ['meta/llama-3.3-70b-instruct'], fast: ['meta/llama-3.1-8b-instruct'] },
  hf:         { url: 'https://router.huggingface.co/v1/chat/completions', key: () => process.env.HF_TOKEN, chat: ['Qwen/Qwen2.5-72B-Instruct'], fast: ['meta-llama/Llama-3.1-8B-Instruct'] },
  cloudflare: { url: () => `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/v1/chat/completions`, key: () => (process.env.CF_ACCOUNT_ID ? process.env.CF_API_TOKEN : ''), chat: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast'], fast: ['@cf/meta/llama-3.1-8b-instruct'] }
};
