// netlify/functions/groq-search.js
//
// Deploy this file at netlify/functions/groq-search.js in your repo, then
// set GROQ_API_KEY in Netlify's dashboard under
// Site settings → Environment variables. The key is only ever read here,
// server-side — it's never sent to the browser.
//
// Once deployed, swap the stub in NerdzEx.AI.fetchSummary() (index.html)
// for a fetch('/.netlify/functions/groq-search', { method:'POST', ... }).

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let query;
  try {
    query = JSON.parse(event.body || '{}').query;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
  if (!query || typeof query !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing "query" string' }) };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GROQ_API_KEY is not configured' }) };
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // Swap the model string here if Groq renames/updates it; keeping
        // the provider swap-out point in one place per the project brief.
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content:
              'You write a concise, neutral, 2-3 sentence summary to preview a web search. No preamble, no markdown.',
          },
          { role: 'user', content: query },
        ],
        max_tokens: 220,
        temperature: 0.3,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Groq request failed', detail: errText }) };
    }

    const data = await groqRes.json();
    const summary = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: summary || 'No summary available.' }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error', detail: String(err) }) };
  }
};
