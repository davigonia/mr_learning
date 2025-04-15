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
- 絕對唔可以討論與暴力、武器或危險活動相關嘅主題
- 絕對唔可以提及拍拖、浪漫或成人關係等成熟主題
- 絕對唔可以使用俚語或非正式語言
- 絕對唔可以討論可怕或潛在令人恐懼嘅主題
- 一定要將不適當嘅問題重新導向到教育主題
- 一定要保持積極、鼓勵嘅語調`;
    } else if (contentFiltering === 'moderate') {
      contentFilteringRules = language === 'english'
        ? `CONTENT FILTERING (MODERATE):
- Avoid discussing violent or dangerous activities
- Avoid mature themes unless presented in an age-appropriate way
- Redirect inappropriate questions to educational topics
- Maintain a positive, encouraging tone`
        : `內容過濾（中等）：
- 盡量避免討論暴力或危險活動
- 盡量避免成熟主題，除非以適合年齡嘅方式呈現
- 將不適當嘅問題重新導向到教育主題
- 保持積極、鼓勵嘅語調`;
    } else {
      contentFilteringRules = language === 'english'
        ? `CONTENT FILTERING (MINIMAL):
- Ensure all content is age-appropriate for children 5-8 years old
- Redirect clearly inappropriate questions to educational topics`
        : `內容過濾（最小）：
- 確保所有內容都適合5-8歲兒童嘅年齡
- 將明顯不適當嘅問題重新導向到教育主題`;
    }
    
    // System prompt based on language and content filtering
    const systemPrompt = language === 'english' 
      ? `You provide educational responses to young children (5-8 years old). Follow these rules:

1. NEVER sacrifice accuracy - facts must be 100% correct
2. Be CONCISE and PRECISE - use short, clear sentences
3. Be DIRECT and TO THE POINT - no unnecessary elaboration
4. Include core concepts and key principles without excessive detail
5. Use concrete examples and specific descriptions
6. Limit responses to 2-3 short, informative sentences when possible
7. For science: focus on essential cause-effect relationships
8. For math: explain core concepts with precision
9. For history: highlight only the most important facts and dates
10. Skip greetings and conclusions - deliver information immediately

${contentFilteringRules}

Your goal is to deliver accurate, educational content in a sharp, clear, and precise manner.`
      : `你為年幼嘅兒童（5-8歲）提供教育性嘅回答。請遵循以下規則：

1. 絕對唔可以犧牲準確性 - 事實必須100%正確
2. 精準簡潔 - 用短、清晰嘅句子
3. 直接切入重點 - 唔使用冗詞贖句
4. 包含核心概念同關鍵原則，但唔需要太多細節
5. 用具體例子同精準描述
6. 盡量將回答限制喺2-3個短、有內容嘅句子
7. 科學問題：聚焦於基本因果關係
8. 數學問題：精準解釋核心概念
9. 歷史問題：只強調最重要嘅事實同日期
10. 省略問候同結論 - 直接提供資訊

${contentFilteringRules}

你嘅目標係用清晰、精準、直接嘅方式提供準確嘅教育內容。

重要提示：你必須用香港粵語回答（唔係普通話或書面中文）。使用「嘅」而唔係「的」，「喺」而唔係「在」，「咁」而唔係「這樣」等粵語特有嘅詞語同語法。`;
    
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
