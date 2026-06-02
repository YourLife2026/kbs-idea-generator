exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { suki, dare, ageLabel, guidance } = body;

  const prompt = `あなたはキッズビジネススクール（KBS）のアシスタントです。以下の情報をもとに、実際にできそうなビジネスアイデアを3つ提案してください。

好き（動詞）：${suki}
誰のために：${dare}
年齢・学年：${ageLabel}
年齢に合わせた指針：${guidance}

条件：
1. ${ageLabel}が実際に始められる現実的なアイデア
2. どうやってお金にするかを具体的に含める
3. 分かりやすい言葉で書く
4. 各アイデアは「タイトル（15文字以内）」と「説明（80文字程度）」

必ずJSON形式のみで返してください。他の文章は不要です。
{"ideas":[{"title":"タイトル","description":"説明"},{"title":"","description":""},{"title":"","description":""}]}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || 'API Error' })
      };
    }

    const text = data.content.map(i => i.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };

  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
