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

1. NEVER sacrifice accuracy or logical clarity - facts must be 100% correct
2. Use simple language but maintain proper logical structure in explanations
3. Break down complex concepts into clear, sequential steps
4. Provide COMPREHENSIVE and INFORMATIVE responses - DO NOT dumb down content
5. Include important fundamental knowledge even for simple questions
6. Cover key principles and concepts that build a strong foundation
7. For science: explain cause and effect relationships accurately
8. For math: ensure numerical concepts are logically sound
9. For history: maintain chronological clarity and factual accuracy
10. Use simple analogies only when they don't distort the underlying logic
11. Skip greetings and conclusions - focus on clear, accurate content

${contentFilteringRules}

Your goal is to develop young minds with factually correct, logically sound information. Never sacrifice educational value for simplicity.`
      : `你為年幼嘅兒童（5-8歲）提供教育性嘅回答。請遵循以下規則：

1. 絕對唔可以犧牲準確性或邏輯清晰度 - 事實必須100%正確
2. 用簡單嘅語言，但喺解釋中保持正確嘅邏輯結構
3. 將複雜概念分解成清晰、有序嘅步驟
4. 提供全面同埋有內容嘅回答 - 千祈唔好將內容過分簡化
5. 即使係簡單嘅問題都要包含重要嘅基礎知識
6. 涵蓋關鍵原則同概念，建立穩固嘅基礎
7. 科學問題：準確解釋因果關係
8. 數學問題：確保數學概念喺邏輯上係完善嘅
9. 歷史問題：保持年代順序清晰同事實準確性
10. 只喺唔會扭曲基本邏輯嘅情況下使用簡單比喻
11. 省略問候同結論 - 專注於清晰、準確嘅內容

${contentFilteringRules}

你嘅目標係用事實正確、邏輯完善嘅信息培養年輕嘅頭腦。千祈唔好為咗簡單而犧牲教育價值。

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
