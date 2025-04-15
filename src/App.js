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
  const [activeTab, setActiveTab] = useState('banned-words'); // 'banned-words', 'pin', 'voice', 'history'
  
  // Banned words state
  const [bannedWords, setBannedWords] = useState([]);
  const [newBannedWord, setNewBannedWord] = useState('');
  
  // Voice profile state
  const [englishVoice, setEnglishVoice] = useState('Google US English');
  const [cantoneseVoice, setCantoneseVoice] = useState('Google Cantonese (Hong Kong)');
  
  // Question history state
  const [questionHistory, setQuestionHistory] = useState([]);
  
  // PIN change state
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [pinChangeMessage, setPinChangeMessage] = useState('');

  // Effect to initialize speech synthesis and recognition
  useEffect(() => {
    console.log('App component mounted successfully');
    
    // Initialize speech synthesis
    speechSynthesisRef.current = window.speechSynthesis;
    
    // Load voices when they are available
    const loadVoices = () => {
      const voices = speechSynthesisRef.current.getVoices();
      console.log('Available voices loaded:', voices.length);
      
      // Filter for Cantonese voices (zh-HK)
      const cantoneseVoices = voices.filter(voice => 
        voice.lang === 'zh-HK' || 
        voice.name.includes('Cantonese') || 
        voice.name.includes('粵語')
      );
      
      console.log('Cantonese voices:', cantoneseVoices.map(v => `${v.name} (${v.lang})`));
      
      // If no Cantonese voice is selected yet but we found some, select the first one
      if (cantoneseVoices.length > 0 && (!cantoneseVoice || cantoneseVoice === 'Google Cantonese (Hong Kong)')) {
        setCantoneseVoice(cantoneseVoices[0].name);
        console.log('Selected Cantonese voice:', cantoneseVoices[0].name);
      }
    };
    
    // Set up the voices changed event
    speechSynthesisRef.current.onvoiceschanged = loadVoices;
    
    // Try to load voices immediately (works in some browsers)
    loadVoices();
    
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
    
    // Cleanup function
    return () => {
      if (speechRecognition) {
        speechRecognition.onstart = null;
        speechRecognition.onend = null;
        speechRecognition.onresult = null;
        speechRecognition.onerror = null;
      }
      
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
        speechSynthesisRef.current.onvoiceschanged = null;
      }
    };
  }, [language, cantoneseVoice]);

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
    
    // Get available voices
    const voices = speechSynthesisRef.current.getVoices();
    
    // Find the selected voice based on current language
    let selectedVoice;
    let langCode;
    
    if (language === 'english') {
      selectedVoice = voices.find(voice => voice.name === englishVoice);
      langCode = 'en-US';
    } else {
      selectedVoice = voices.find(voice => voice.name === cantoneseVoice);
      langCode = 'zh-HK';
    }
    
    // Set speaking to true at the beginning
    setIsSpeaking(true);
    
    // Break text into sentences for better speech synthesis
    // For Cantonese, split by period, question mark, exclamation mark
    // For English, use shorter segments to prevent cutting off
    let textChunks = [];
    
    if (language === 'english') {
      // For English, split into manageable chunks (around 200 chars)
      const maxChunkLength = 200;
      let remainingText = text;
      
      while (remainingText.length > 0) {
        let chunkEnd = Math.min(remainingText.length, maxChunkLength);
        
        // Try to find a good breaking point (period, question mark, etc.)
        if (chunkEnd < remainingText.length) {
          const lastPeriod = Math.max(
            remainingText.lastIndexOf('.', chunkEnd),
            remainingText.lastIndexOf('?', chunkEnd),
            remainingText.lastIndexOf('!', chunkEnd)
          );
          
          if (lastPeriod > 0) {
            chunkEnd = lastPeriod + 1;
          } else {
            // If no good breaking point, try to break at a space
            const lastSpace = remainingText.lastIndexOf(' ', chunkEnd);
            if (lastSpace > chunkEnd / 2) {
              chunkEnd = lastSpace + 1;
            }
          }
        }
        
        textChunks.push(remainingText.substring(0, chunkEnd));
        remainingText = remainingText.substring(chunkEnd).trim();
      }
    } else {
      // For Cantonese, split by sentence endings (。？！)
      textChunks = text
        .split(/([。！？])/)
        .reduce((chunks, part, i, arr) => {
          if (i % 2 === 0) {
            // This is text before punctuation
            return [...chunks, part + (arr[i + 1] || '')];
          } else {
            // This is punctuation, already added to previous chunk
            return chunks;
          }
        }, [])
        .filter(chunk => chunk.trim().length > 0);
      
      // If no sentence breaks were found, use the whole text
      if (textChunks.length === 0) {
        textChunks = [text];
      }
    }
    
    // Function to speak each chunk sequentially
    const speakChunks = (index) => {
      if (index >= textChunks.length) {
        // All chunks have been spoken
        setIsSpeaking(false);
        return;
      }
      
      const chunk = textChunks[index];
      if (!chunk || chunk.trim() === '') {
        // Skip empty chunks
        speakChunks(index + 1);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(chunk);
      
      // Set voice or fallback to language code
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        utterance.lang = langCode;
      }
      
      utterance.rate = 0.9; // Slightly slower for children
      
      // When this chunk ends, speak the next one
      utterance.onend = () => {
        speakChunks(index + 1);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        // Try to continue with next chunk despite error
        speakChunks(index + 1);
      };
      
      // Speak the current chunk
      speechSynthesisRef.current.speak(utterance);
    };
    
    // Start speaking from the first chunk
    speakChunks(0);
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
      setError('Incorrect PIN');
      setEnteredPIN('');
    }
  };
  
  // Function to close PIN modal
  const closePINModal = () => {
    setShowPINModal(false);
    setEnteredPIN('');
    setError('');
  };
  
  // Function to change tab in parent controls
  const changeTab = (tab) => {
    setActiveTab(tab);
  };
  
  // Function to add banned word
  const addBannedWord = () => {
    if (newBannedWord && !bannedWords.includes(newBannedWord)) {
      setBannedWords([...bannedWords, newBannedWord]);
      setNewBannedWord('');
    }
  };
  
  // Function to remove banned word
  const removeBannedWord = (word) => {
    setBannedWords(bannedWords.filter(w => w !== word));
  };
  
  // Function to change PIN
  const changePIN = () => {
    if (newPIN.length !== 4 || !/^\d+$/.test(newPIN)) {
      setPinChangeMessage('PIN must be 4 digits');
      return;
    }
    
    if (newPIN !== confirmPIN) {
      setPinChangeMessage('PINs do not match');
      return;
    }
    
    setParentalPIN(newPIN);
    setNewPIN('');
    setConfirmPIN('');
    setPinChangeMessage('PIN changed successfully');
  };
  
  // Function to show PIN modal
  const showPINPrompt = () => {
    setShowPINModal(true);
    setEnteredPIN('');
    setError('');
  };
  
  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/.netlify/functions/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          language,
          contentFiltering,
          timeLimit,
          bannedWords
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAnswer(data.answer);
      
      // Add to question history
      setQuestionHistory([
        { question, answer: data.answer, timestamp: new Date().toISOString() },
        ...questionHistory
      ]);
      
      // Speak the answer
      speakText(data.answer);
      
    } catch (error) {
      console.error('Error asking question:', error);
      setError(language === 'english' ? 
        'Error communicating with the AI. Please try again.' : 
        '與AI通信時出錯。請再試一次。');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to clear question history
  const clearHistory = () => {
    setQuestionHistory([]);
  };
  
  return (
    <div className="app-container">
      <header>
        <h1>Mr. Learning</h1>
        <button 
          className="parent-access-button"
          onClick={showPINPrompt}
        >
          Parent Access
        </button>
      </header>
      
      <div className="question-box">
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={uiText.placeholder}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !question.trim()}
          >
            {uiText.askButton}
          </button>
          <button 
            type="button"
            className={`voice-input-button ${isListening ? 'active' : ''}`}
            onClick={toggleSpeechRecognition}
            disabled={isLoading}
            aria-label={language === 'english' ? 'Voice Input' : '語音輸入'}
          >
            🎤
          </button>
        </form>
        
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
            <h2>Parent Access</h2>
            <p>Enter PIN to access parental controls</p>
            
            <input 
              type="password" 
              value={enteredPIN} 
              onChange={handlePINEntry}
              placeholder="PIN"
              maxLength="4"
            />
            
            <div className="modal-buttons">
              <button onClick={verifyPIN}>Submit</button>
              <button onClick={closePINModal}>Cancel</button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      )}
      
      {/* Parental Control Panel */}
      {showParentControls && (
        <div className="parent-control-panel">
          <h2>Parental Controls</h2>
          
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'banned-words' ? 'active' : ''}`}
              onClick={() => changeTab('banned-words')}
            >
              Banned Words
            </button>
            <button 
              className={`tab-button ${activeTab === 'pin' ? 'active' : ''}`}
              onClick={() => changeTab('pin')}
            >
              Change PIN
            </button>
            <button 
              className={`tab-button ${activeTab === 'voice' ? 'active' : ''}`}
              onClick={() => changeTab('voice')}
            >
              Voice Settings
            </button>
            <button 
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => changeTab('history')}
            >
              History
            </button>
          </div>
          
          {/* Banned Words Tab */}
          {activeTab === 'banned-words' && (
            <div className="tab-content">
              <div className="control-section">
                <h3>Content Filtering</h3>
                <div className="radio-group">
                  <label>
                    <input 
                      type="radio" 
                      name="filtering" 
                      value="none" 
                      checked={contentFiltering === 'none'} 
                      onChange={() => setContentFiltering('none')} 
                    />
                    None
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="filtering" 
                      value="moderate" 
                      checked={contentFiltering === 'moderate'} 
                      onChange={() => setContentFiltering('moderate')} 
                    />
                    Moderate
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="filtering" 
                      value="strict" 
                      checked={contentFiltering === 'strict'} 
                      onChange={() => setContentFiltering('strict')} 
                    />
                    Strict
                  </label>
                </div>
              </div>
              

              
              <div className="control-section">
                <h3>Add Banned Words</h3>
                <p className="note">Enter words in English or Cantonese that will be banned in both languages</p>
                <div className="banned-words-input">
                  <input 
                    type="text" 
                    value={newBannedWord}
                    onChange={(e) => setNewBannedWord(e.target.value)}
                    placeholder="Enter word to ban"
                  />
                  <button onClick={addBannedWord}>
                    Add
                  </button>
                </div>
                
                <div className="banned-words-list">
                  {bannedWords.length > 0 ? (
                    <ul>
                      {bannedWords.map((word, index) => (
                        <li key={index}>
                          {word}
                          <button 
                            className="remove-word" 
                            onClick={() => removeBannedWord(word)}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-words">
                      No banned words added yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* PIN Change Tab */}
          {activeTab === 'pin' && (
            <div className="tab-content">
              <div className="password-change-container">
                <div className="password-input-group">
                  <label>New PIN</label>
                  <input 
                    type="password" 
                    value={newPIN}
                    onChange={(e) => setNewPIN(e.target.value)}
                    placeholder="1234"
                    maxLength="4"
                  />
                </div>
                
                <div className="password-input-group">
                  <label>Confirm PIN</label>
                  <input 
                    type="password" 
                    value={confirmPIN}
                    onChange={(e) => setConfirmPIN(e.target.value)}
                    placeholder="1234"
                    maxLength="4"
                  />
                </div>
                
                <button 
                  className="password-change-button"
                  onClick={changePIN}
                >
                  Update PIN
                </button>
                
                {pinChangeMessage && (
                  <div className={pinChangeMessage.includes('success') ? 'password-success' : 'password-error'}>
                    {pinChangeMessage}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Voice Settings Tab */}
          {activeTab === 'voice' && (
            <div className="tab-content">
              <div className="voice-settings">
                <div className="voice-setting-group">
                  <label>English Voice</label>
                  <select 
                    value={englishVoice}
                    onChange={(e) => setEnglishVoice(e.target.value)}
                  >
                    {/* Dynamically generate options from available voices */}
                    {speechSynthesisRef.current && speechSynthesisRef.current.getVoices()
                      .filter(voice => voice.lang.includes('en'))
                      .map(voice => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))
                    }
                    {/* Fallback option if no voices are found */}
                    <option value="Google US English">Google US English</option>
                  </select>
                  <button 
                    className="test-voice-button"
                    onClick={() => speakText('This is a test of the selected voice.')}
                  >
                    Test Voice
                  </button>
                </div>
                
                <div className="voice-setting-group">
                  <label>Cantonese Voice</label>
                  <select 
                    value={cantoneseVoice}
                    onChange={(e) => setCantoneseVoice(e.target.value)}
                  >
                    {/* Dynamically generate options from available voices */}
                    {speechSynthesisRef.current && speechSynthesisRef.current.getVoices()
                      .filter(voice => 
                        voice.lang === 'zh-HK' || 
                        voice.name.includes('Cantonese') || 
                        voice.name.includes('粵語')
                      )
                      .map(voice => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))
                    }
                    {/* Fallback options if no voices are found */}
                    <option value="Google Cantonese (Hong Kong)">Google Cantonese (Hong Kong)</option>
                  </select>
                  <button 
                    className="test-voice-button"
                    onClick={() => speakText('你好，這是粵語語音測試。')}
                  >
                    Test Voice
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="tab-content">
              <div className="history-controls">
                <h3>Question History</h3>
                <button 
                  className="clear-history-button"
                  onClick={clearHistory}
                >
                  Clear History
                </button>
              </div>
              
              <div className="question-history">
                {questionHistory.length > 0 ? (
                  <ul>
                    {questionHistory.map((item, index) => (
                      <li key={index} className="history-item">
                        <div className="history-question">
                          <strong>Q:</strong> {item.question}
                        </div>
                        <div className="history-answer">
                          <strong>A:</strong> {item.answer}
                        </div>
                        <div className="history-timestamp">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-history">
                    No questions asked yet
                  </p>
                )}
              </div>
            </div>
          )}
          
          <button 
            className="close-controls-button"
            onClick={() => setShowParentControls(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
