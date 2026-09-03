const { GoogleGenAI } = require("@google/genai");

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function translateText(text, from, to) {
    const prompt = `
You are CallBridge, a real-time interpreter.

Translate between Egyptian Arabic and Italian.

Rules:
- Egyptian Arabic means natural Egyptian spoken Arabic, not Modern Standard Arabic.
- Italian should sound natural and conversational.
- Preserve the original meaning and tone.
- Do not explain anything.
- Do not add quotation marks.
- Return ONLY the translation.

Translate from ${from} to ${to}:

${text}
`;

    const response = await client.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt
    });

    return response.text.trim();
}

module.exports = {
    translateText
};