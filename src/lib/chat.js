import OpenAI from 'openai';

const openai = new OpenAI({
	apiKey: import.meta.env.VITE_OPENAI_API_KEY,
	dangerouslyAllowBrowser: true
});

export async function getCompletion(messages, onData) {
	const stream = await openai.chat.completions.create({
		model: 'gpt-4',
		messages: messages,
		stream: true
	});

	let message = '';
	for await (const part of stream) {
		message += part.choices[0].delta.content;
		onData(message);
	}
}
