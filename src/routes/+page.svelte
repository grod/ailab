<script>
	import OpenAI from 'openai';
	import snarkdown from 'snarkdown';

	let currentMessage = '';
	let currentAssistantMessage = '';
	let inputRef;

	let messages = [
		{
			role: 'system',
			content:
				'Your a drunk teenager on LSD. Use a lot of emojis. Always query the database before answering. If you cant find any data, let the user know and then reply in your own words.'
		}
	];

	const openai = new OpenAI({
		apiKey: import.meta.env.VITE_OPENAI_API_KEY,
		dangerouslyAllowBrowser: true
	});

	async function getCompletion() {
		const stream = await openai.chat.completions.create({
			model: 'gpt-4',
			messages: messages,
			stream: true,
			functions: [
				{
					name: 'get_weather',
					description: 'Get the weather for a city',
					parameters: {
						type: 'object',
						properties: {
							city: {
								type: 'string',
								description: 'The city to get the current weather from'
							}
						}
					}
				},
				{
					name: 'query_database',
					description: 'Query the vector database for more context',
					parameters: {
						type: 'object',
						properties: {
							query: {
								type: 'string',
								description: 'Format the query as a sentence'
							}
						},
						required: ['query']
					}
				}
			]
		});

		let functionName;
		let functionArguments = '';

		for await (const part of stream) {
			const functionCall = part.choices[0].delta.function_call;
			const finishReason = part.choices[0].finish_reason;

			if (functionCall) {
				functionName = functionName || functionCall.name;
				functionArguments += functionCall.arguments;
				continue;
			}

			if (finishReason === 'function_call') {
				if (functionName === 'get_weather') {
					const city = JSON.parse(functionArguments).city;
					const res = await fetch(`https://goweather.herokuapp.com/weather/${city}`);
					const weather = await res.json();
					messages = [
						...messages,
						{ role: 'function', name: 'get_weather', content: JSON.stringify(weather) }
					];
				} else if (functionName === 'query_database') {
					const query = JSON.parse(functionArguments).query;
					const res = await fetch(`/api/query?query=${query}`);
					const json = await res.json();

					messages = [
						...messages,
						{ role: 'function', name: 'query_database', content: JSON.stringify(json) }
					];
				} else {
					//
				}
				getCompletion();
				return;
			}

			const chunk = part.choices[0].delta.content;
			if (chunk) currentAssistantMessage += chunk;
		}
		messages = [...messages, { role: 'assistant', content: currentAssistantMessage }];
		currentAssistantMessage = '';
	}

	function handleSubmit() {
		messages = [...messages, { role: 'user', content: currentMessage }];
		currentMessage = '';
		getCompletion();
		inputRef.focus();
	}
</script>

<div class="w-full flex flex-col items-center py-8">
	<div class="w-full max-w-screen-sm">
		<div class="space-y-4">
			{#each messages as message}
				<div>
					{#if message.role === 'assistant'}
						<div class="pr-8">
							<div class="prose bg-gray-200 p-2 rounded-lg rounded-bl-none">
								{@html snarkdown(message.content)}
							</div>
						</div>
					{:else if message.role === 'user'}
						<div class="pl-8">
							<div class="prose bg-blue-200 p-2 rounded-lg rounded-br-none">
								{message.content}
							</div>
						</div>
					{/if}
				</div>
			{/each}
			{#if currentAssistantMessage}
				<div class="pr-8">
					<div class="prose bg-gray-200 p-2 rounded-lg rounded-bl-none">
						{@html snarkdown(currentAssistantMessage)}
					</div>
				</div>
			{/if}
		</div>

		<div class="pt-4 mt-4 border-t">
			<form on:submit|preventDefault={handleSubmit} class="flex flex-col">
				<input bind:this={inputRef} class="p-4 border rounded" bind:value={currentMessage} />
				<button class="p-2 px-4 mt-2 self-end bg-gray-200 border rounded">Send</button>
			</form>
		</div>
	</div>
</div>
