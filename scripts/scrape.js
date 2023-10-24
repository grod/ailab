import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { LocalIndex } from 'vectra';

const openai = new OpenAI({
	apiKey: process.env.VITE_OPENAI_API_KEY
});

async function init() {
	const index = new LocalIndex(import.meta.dir + '/..' + '/database');

	if (!(await index.isIndexCreated())) {
		await index.createIndex();
	}

	const urls = [
		'https://nyheter.sh/nyheter/traffic-accident-on-e6-highway-causes-delays',
		'https://nyheter.sh/nyheter/fewer-companies-apply-for-bankruptcy-protection',
		'https://nyheter.sh/nyheter/new-postal-law-unawareness-among-postal-agencies',
		'https://nyheter.sh/nyheter/social-insurance-costs-to-surge-by-30-billion',
		'https://nyheter.sh/nyheter/college-exams-return-with-tightened-security',
		'https://nyheter.sh/nyheter/ferry-runs-aground-off-blekinge-coast',
		'https://nyheter.sh/nyheter/ski-race-allowed-despite-swine-fever-restrictions'
	];

	for await (const url of urls) {
		const res = await fetch(url);
		const html = await res.text();
		const $ = cheerio.load(html);
		const article = $(html).find('.prose').text();

		const embeddings = await openai.embeddings.create({
			input: article,
			model: 'text-embedding-ada-002'
		});

		const vector = embeddings.data[0]?.embedding;

		if (!vector) {
			console.error('Embedding failed');
			return;
		}

		await index.insertItem({
			vector,
			metadata: { text: article, source: url }
		});
		console.log('Inserted item: ', url);
	}

	// console.log(vector);
	// const content = soup.select('.prose');
	// console.log(content);
}

init();
