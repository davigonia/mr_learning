import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // Basic state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('english');
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthesisRef = useRef(window.speechSynthesis);
  
  // Parental control state
  const [showParentControls, setShowParentControls] = useState(false);
  const [parentalPIN, setParentalPIN] = useState('1234'); // Default PIN
  const [enteredPIN, setEnteredPIN] = useState('');
  const [isPINCorrect, setIsPINCorrect] = useState(false);
  const [contentFiltering, setContentFiltering] = useState('moderate'); // 'none', 'moderate', 'strict'
  const [timeLimit, setTimeLimit] = useState(30); // Time limit in minutes
  const [showPINModal, setShowPINModal] = useState(false);

  // Effect to initialize speech recognition
  useEffect(() => {
    console.log('App component mounted successfully');
    
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech recognized:', transcript);
        setQuestion(transcript);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError(language === 'english' ? 
          `Speech recognition error: ${event.error}` : 
          `語音識別錯誤: ${event.error}`);
      };
      
      setSpeechRecognition(recognition);
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }, [language]);

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
    
    // Update speech recognition language if active
    if (speechRecognition) {
      speechRecognition.lang = language === 'english' ? 'zh-HK' : 'en-US';
    }
  };
  
  // Function to toggle speech recognition
  const toggleSpeechRecognition = () => {
    if (!speechRecognition) {
      setError(language === 'english' ? 
        'Speech recognition not supported in this browser' : 
        '此瀏覽器不支持語音識別');
      return;
    }
    
    if (isListening) {
      speechRecognition.stop();
    } else {
      setError('');
      // Set language for speech recognition
      speechRecognition.lang = language === 'english' ? 'en-US' : 'zh-HK';
      try {
        speechRecognition.start();
      } catch (error) {
        console.error('Speech recognition error:', error);
      }
    }
  };

  // Function to speak text using speech synthesis
  const speakText = (text) => {
    if (isMuted) return;
    
    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();
    
    // Create a new speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set the language based on the current app language
    utterance.lang = language === 'english' ? 'en-US' : 'zh-HK';
    utterance.rate = 0.9; // Slightly slower for children
    
    // Set event handlers
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };
    
    // Speak the text
    speechSynthesisRef.current.speak(utterance);
  };
  
  // Function to toggle mute state
  const toggleMute = () => {
    // If currently speaking and toggling to muted, stop speech
    if (isSpeaking && !isMuted) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
    setIsMuted(!isMuted);
  };
  
  // Function to handle PIN entry
  const handlePINEntry = (e) => {
    setEnteredPIN(e.target.value);
  };
  
  // Function to verify PIN
  const verifyPIN = () => {
    if (enteredPIN === parentalPIN) {
      setIsPINCorrect(true);
      setShowPINModal(false);
      setShowParentControls(true);
    } else {
      setError(language === 'english' ? 'Incorrect PIN' : '密碼錯誤');
      setEnteredPIN('');
    }
  };
  
  // Function to change PIN
  const changePIN = (newPIN) => {
    setParentalPIN(newPIN);
  };
  
  // Function to toggle parental controls
  const toggleParentControls = () => {
    if (showParentControls) {
      setShowParentControls(false);
      setIsPINCorrect(false);
    } else {
      setShowPINModal(true);
      setEnteredPIN('');
    }
  };
  
  // Function to close PIN modal
  const closePINModal = () => {
    setShowPINModal(false);
    setEnteredPIN('');
  };

  // Function to handle question submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!question.trim()) {
      setError(language === 'english' ? 'Please ask a question first!' : '請先提出問題！');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Calling Netlify function');
      // Call the Netlify function
      const response = await fetch('/.netlify/functions/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          language,
          contentFiltering,
          timeLimit
        }),
      });
      
      const data = await response.json();
      console.log('Response received:', data);
      const answerText = data.answer || 'No answer received';
      setAnswer(answerText);
      
      // Speak the answer if not muted
      if (!isMuted) {
        speakText(answerText);
      }
    } catch (error) {
      console.error('Error calling function:', error);
      setError(language === 'english' ? `Error: ${error.message}` : `錯誤: ${error.message}`);
      setAnswer('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="app-title">
        <h1>Mr Learning</h1>
        <div className="title-decoration"></div>
      </div>
      
      <div className="controls-container">
        <div className="language-toggles">
          <button 
            className={`language-toggle ${language === 'english' ? 'active' : ''}`}
            onClick={toggleLanguage}
          >
            English
          </button>
          <button 
            className={`language-toggle ${language === 'cantonese' ? 'active' : ''}`}
            onClick={toggleLanguage}
          >
            廣東話
          </button>
        </div>
        
        <button 
          className="parent-access-button"
          onClick={toggleParentControls}
        >
          {language === 'english' ? 'Parent Access' : '家長存取'}
        </button>
      </div>
      
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
          <button 
            className={`mic-button ${isListening ? 'active' : ''}`}
            onClick={toggleSpeechRecognition}
            disabled={isLoading}
            aria-label={language === 'english' ? 'Voice Input' : '語音輸入'}
          >
            🎤
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </div>
        
      <div className="answer-box">
        <button 
          className={`mute-button ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          aria-label={language === 'english' ? 'Toggle voice output' : '切換語音輸出'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        {isLoading ? (
          <div className="loading">{uiText.loading}</div>
        ) : (
          <p>{answer || uiText.answerPlaceholder}</p>
        )}
      </div>
      
      {/* PIN Modal */}
      {showPINModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{language === 'english' ? 'Parent Access' : '家長存取'}</h2>
            <p>{language === 'english' ? 'Enter PIN to access parental controls' : '輸入PIN碼以存取家長控制'}</p>
            
            <input 
              type="password" 
              value={enteredPIN} 
              onChange={handlePINEntry}
              placeholder="PIN"
              maxLength="4"
            />
            
            <div className="modal-buttons">
              <button onClick={verifyPIN}>
                {language === 'english' ? 'Submit' : '提交'}
              </button>
              <button onClick={closePINModal}>
                {language === 'english' ? 'Cancel' : '取消'}
              </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      )}
      
      {/* Parental Control Panel */}
      {showParentControls && (
        <div className="parent-control-panel">
          <h2>{language === 'english' ? 'Parental Controls' : '家長控制'}</h2>
          
          <div className="control-section">
            <h3>{language === 'english' ? 'Content Filtering' : '內容過濾'}</h3>
            <div className="radio-group">
              <label>
                <input 
                  type="radio" 
                  name="filtering" 
                  value="none" 
                  checked={contentFiltering === 'none'} 
                  onChange={() => setContentFiltering('none')} 
                />
                {language === 'english' ? 'None' : '無'}
              </label>
              <label>
                <input 
                  type="radio" 
                  name="filtering" 
                  value="moderate" 
                  checked={contentFiltering === 'moderate'} 
                  onChange={() => setContentFiltering('moderate')} 
                />
                {language === 'english' ? 'Moderate' : '中等'}
              </label>
              <label>
                <input 
                  type="radio" 
                  name="filtering" 
                  value="strict" 
                  checked={contentFiltering === 'strict'} 
                  onChange={() => setContentFiltering('strict')} 
                />
                {language === 'english' ? 'Strict' : '嚴格'}
              </label>
            </div>
          </div>
          
          <div className="control-section">
            <h3>{language === 'english' ? 'Time Limit (minutes)' : '時限 (分鐘)'}</h3>
            <input 
              type="range" 
              min="5" 
              max="60" 
              step="5" 
              value={timeLimit} 
              onChange={(e) => setTimeLimit(parseInt(e.target.value))} 
            />
            <span>{timeLimit}</span>
          </div>
          
          <div className="control-section">
            <h3>{language === 'english' ? 'Change PIN' : '更改PIN碼'}</h3>
            <input 
              type="password" 
              placeholder={language === 'english' ? 'New PIN' : '新PIN碼'} 
              maxLength="4" 
              onChange={(e) => changePIN(e.target.value)} 
            />
          </div>
          
          <button 
            className="close-button" 
            onClick={toggleParentControls}
          >
            {language === 'english' ? 'Close' : '關閉'}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
