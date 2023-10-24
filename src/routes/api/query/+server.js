import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import path from 'path';
import { LocalIndex } from 'vectra';

const openai = new OpenAI({
	apiKey: import.meta.env.VITE_OPENAI_API_KEY
});

export async function GET({ url }) {
	const query = url.searchParams.get('query');

	const file = path.join(import.meta.url, '../../../../../', 'database');
	const dir = file.replace('file:', '');

	const index = new LocalIndex(dir);

	const embeddings = await openai.embeddings.create({
		input: query,
		model: 'text-embedding-ada-002'
	});
	const vector = embeddings.data[0]?.embedding;

	const results = await index.queryItems(vector, 3);

	return json({ results: results.map((item) => item.item.metadata) });
}
