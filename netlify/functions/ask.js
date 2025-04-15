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
    const { question, language } = JSON.parse(event.body);
    console.log(`Received question in ${language}: ${question}`);
    
    // For debugging, return a simple answer without calling the API
    // This helps us test if the function is working at all
    const debugMode = false;
    if (debugMode) {
      console.log('Debug mode active, returning test response');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          answer: language === 'english' 
            ? 'This is a test answer from the Netlify function.' 
            : '這是來自Netlify函數的測試答案。' 
        })
      };
    }
    
    // System prompt based on language
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

你的目標是使用事實正確、邏輯完善的信息培養年輕的頭腦。`;
    
    // Check if API key exists
    if (!process.env.GROK_API_KEY) {
      console.error('GROK_API_KEY environment variable is not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API key is missing. Please check the environment variables." })
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
    
    // Handle specific error codes
    if (error.response) {
      console.error('API response error:', error.response.status, error.response.data);
      if (error.response.status === 401) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: "Our key isn't working! Please tell an adult." })
        };
      } else if (error.response.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ error: "We're too chatty! Wait a bit and try again." })
        };
      }
    }
    
    // Generic error
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Oops, our brain is taking a nap! Try again soon." })
    };
  }
};
