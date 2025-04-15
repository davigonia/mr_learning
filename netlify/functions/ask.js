const axios = require('axios');

exports.handler = async function(event, context) {
  console.log('Netlify function called');
  
  // Add CORS headers to allow requests from any origin
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle OPTIONS request (preflight CORS check)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse the request body
    const { question, language, contentFiltering, timeLimit, bannedWords = [] } = JSON.parse(event.body);
    console.log(`Received question in ${language}: ${question}`);
    console.log(`Content filtering level: ${contentFiltering}, Time limit: ${timeLimit} minutes`);
    console.log(`Banned words: ${bannedWords.join(', ')}`);
    
    // Check for banned words in the question
    const containsBannedWord = bannedWords.some(word => 
      question.toLowerCase().includes(word.toLowerCase())
    );
    
    if (containsBannedWord) {
      console.log('Question contains banned word, returning warning');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          answer: language === 'english' 
            ? 'I cannot answer this question because it contains words that have been banned by your parents.' 
            : '我無法回答這個問題，因為它包含了被您父母禁止的詞語。' 
        })
      };
    }
    
    // TEMPORARY DEBUG MODE - Return a test response without calling the API
    // This helps us test if the function is being called correctly
    const debugMode = false;
    if (debugMode) {
      console.log('Debug mode active - returning test response');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          answer: language === 'english' 
            ? 'This is a test answer from the Netlify function. If you can see this, the function is working!' 
            : '這是來自Netlify函數的測試答案。如果您能看到這個，該函數正在工作！' 
        })
      };
    }
    
    // Get content filtering rules based on level
    let contentFilteringRules = '';
    
    if (contentFiltering === 'strict') {
      contentFilteringRules = language === 'english'
        ? `CONTENT FILTERING (STRICT):
- NEVER discuss topics related to violence, weapons, or dangerous activities
- NEVER mention mature themes like dating, romance, or adult relationships
- NEVER use slang or informal language
- NEVER discuss scary or potentially frightening topics
- ALWAYS redirect inappropriate questions to educational topics
- ALWAYS maintain a positive, encouraging tone`
        : `內容過濾（嚴格）：
- 絕不討論與暴力、武器或危險活動相關的主題
- 絕不提及約會、浪漫或成人關係等成熟主題
- 絕不使用俚語或非正式語言
- 絕不討論可怕或潛在令人恐懼的主題
- 始終將不適當的問題重定向到教育主題
- 始終保持積極、鼓勵的語調`;
    } else if (contentFiltering === 'moderate') {
      contentFilteringRules = language === 'english'
        ? `CONTENT FILTERING (MODERATE):
- Avoid discussing violent or dangerous activities
- Avoid mature themes unless presented in an age-appropriate way
- Redirect inappropriate questions to educational topics
- Maintain a positive, encouraging tone`
        : `內容過濾（中等）：
- 避免討論暴力或危險活動
- 避免成熟主題，除非以適合年齡的方式呈現
- 將不適當的問題重定向到教育主題
- 保持積極、鼓勵的語調`;
    } else {
      contentFilteringRules = language === 'english'
        ? `CONTENT FILTERING (MINIMAL):
- Ensure all content is age-appropriate for children 5-8 years old
- Redirect clearly inappropriate questions to educational topics`
        : `內容過濾（最小）：
- 確保所有內容都適合5-8歲兒童的年齡
- 將明顯不適當的問題重定向到教育主題`;
    }
    
    // System prompt based on language and content filtering
    const systemPrompt = language === 'english' 
      ? `You provide educational responses to young children (5-8 years old). Follow these rules:

1. NEVER sacrifice accuracy or logical clarity - facts must be 100% correct
2. Use simple language but maintain proper logical structure in explanations
3. Break down complex concepts into clear, sequential steps
4. Keep responses concise - 2-3 short sentences maximum
5. Avoid jargon but DO use correct terminology with brief definitions
6. For science: explain cause and effect relationships accurately
7. For math: ensure numerical concepts are logically sound
8. For history: maintain chronological clarity and factual accuracy
9. Use simple analogies only when they don't distort the underlying logic
10. Skip greetings and conclusions - focus on clear, accurate content

${contentFilteringRules}

Your goal is to develop young minds with factually correct, logically sound information.`
      : `你為年幕小的兒童（5-8歲）提供教育性的回答。請遵循以下規則：

1. 絕不犧牲準確性或邏輯清晰度 - 事實必須100%正確
2. 使用簡單語言，但在解釋中保持正確的邏輯結構
3. 將複雜概念分解為清晰、有序的步驟
4. 保持回答簡潔 - 最多2-3個短句
5. 避免專業行話，但要使用正確的術語並簡要解釋
6. 科學問題：準確解釋因果關係
7. 數學問題：確保數學概念在邏輯上是完善的
8. 歷史問題：保持年代順序清晰和事實準確性
9. 只在不歧曲基本邏輯的情況下使用簡單比喻
10. 省略問候和結論 - 專注於清晰、準確的內容

${contentFilteringRules}

你的目標是使用事實正確、邏輯完善的信息培養年輕的頭腦。`;
    
    // Check if API key exists
    if (!process.env.GROK_API_KEY) {
      console.error('GROK_API_KEY environment variable is not set');
      return {
        statusCode: 200, // Return 200 even for errors during debugging
        headers,
        body: JSON.stringify({ answer: "API key is missing. Please check the environment variables." })
      };
    }
    
    console.log('Making request to Grok API');
    // Make request to Grok API
    const response = await axios.post('https://api.x.ai/v1/chat/completions', {
      model: 'grok-3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.5,  // Lower temperature for more factual, logical responses
      max_tokens: 100,   // Allow space for clear explanations
      top_p: 0.85,       // Focus more on likely tokens for accuracy
      frequency_penalty: 0.2,  // Light penalty for repetition
      presence_penalty: 0.1    // Slight encouragement for diverse content
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`
      }
    });
    
    // Extract answer from response
    const answer = response.data.choices[0].message.content;
    console.log('Received answer from Grok API:', answer);
    
    // Return answer to client
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ answer })
    };
    
  } catch (error) {
    console.error('Error in Netlify function:', error);
    
    // During debug mode, return a more helpful error message
    return {
      statusCode: 200, // Return 200 even for errors during debugging
      headers,
      body: JSON.stringify({ 
        answer: `Error in Netlify function: ${error.message}. Please check the Netlify logs for more details.` 
      })
    };
  }
};
