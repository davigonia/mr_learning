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
          language
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
    </div>
  );
}

export default App;
