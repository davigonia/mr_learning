import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Basic state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('english');

  // UI text based on language
  const uiText = {
    askButton: language === 'english' ? 'Ask' : '問',
    placeholder: language === 'english' ? 'Ask me anything...' : '問我任何問題...',
    answerPlaceholder: language === 'english' ? 'Your answer will appear here...' : '你的答案會在這裡顯示...',
    loading: language === 'english' ? 'Thinking...' : '思考中...'
  };

  // Function to toggle language
  const toggleLanguage = () => {
    setLanguage(language === 'english' ? 'cantonese' : 'english');
  };

  // Function to handle question submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!question.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Call the Netlify function
      const response = await fetch('/.netlify/functions/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          language
        }),
      });
      
      const data = await response.json();
      setAnswer(data.answer || 'No answer received');
    } catch (error) {
      setAnswer(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Mr Learning</h1>
        <div className="language-toggle">
          <button 
            className={language === 'english' ? 'active' : ''}
            onClick={toggleLanguage}
          >
            English
          </button>
          <button 
            className={language === 'cantonese' ? 'active' : ''}
            onClick={toggleLanguage}
          >
            廣東話
          </button>
        </div>
      </div>
      
      <div className="main-content">
        <div className="question-box">
          <textarea 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={uiText.placeholder}
          />
          
          <div className="button-container">
            <button 
              className="ask-button" 
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {uiText.askButton}
            </button>
          </div>
        </div>
          
        <div className="answer-box">
          {isLoading ? (
            <div className="loading">{uiText.loading}</div>
          ) : (
            <p>{answer || uiText.answerPlaceholder}</p>
          )}
        </div>
      </div>
      
      <div className="footer">
        <p>Mr Learning - Educational AI for Children</p>
        <p>© 2025 David Cheang</p>
      </div>
    </div>
  );
}

export default App;
