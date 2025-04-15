const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const axios = require('axios');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// Error logging
const logError = (error) => {
  const timestamp = new Date().toISOString();
  const errorMessage = `${timestamp}: ${error.message}\n`;
  fs.appendFileSync(path.join(__dirname, 'errors.log'), errorMessage);
};

// API endpoint to handle Grok requests
app.post('/api/ask', async (req, res) => {
  try {
    const { question, language } = req.body;
    
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
        'Authorization': `Bearer ${process.env.REACT_APP_GROK_API_KEY}`
      }
    });
    
    // Extract answer from response
    const answer = response.data.choices[0].message.content;
    
    // Return answer to client
    res.json({ answer });
    
  } catch (error) {
    logError(error);
    
    // Handle specific error codes
    if (error.response) {
      if (error.response.status === 401) {
        return res.status(401).json({ error: "Our key isn't working! Please tell an adult." });
      } else if (error.response.status === 429) {
        return res.status(429).json({ error: "We're too chatty! Wait a bit and try again." });
      }
    }
    
    // Generic error
    res.status(500).json({ error: "Oops, our brain is taking a nap! Try again soon." });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
