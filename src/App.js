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
      setError(language === 'english' ? 'Incorrect PIN' : '密碼錯誤');
      setEnteredPIN('');
    }
  };
  
  // Function to change PIN
  const changePIN = () => {
    if (newPIN.length < 4 || newPIN !== confirmPIN) {
      setPinChangeMessage(language === 'english' ? 
        'PIN must be at least 4 digits and match confirmation' : 
        'PIN碼必須至少4位數字且與確認碼相符');
      return;
    }
    
    setParentalPIN(newPIN);
    setPinChangeMessage(language === 'english' ? 
      'PIN changed successfully!' : 
      'PIN碼已成功更改！');
    setNewPIN('');
    setConfirmPIN('');
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setPinChangeMessage('');
    }, 3000);
  };
  
  // Function to add banned word
  const addBannedWord = () => {
    if (!newBannedWord.trim()) return;
    
    if (!bannedWords.includes(newBannedWord.trim().toLowerCase())) {
      setBannedWords([...bannedWords, newBannedWord.trim().toLowerCase()]);
    }
    
    setNewBannedWord('');
  };
  
  // Function to remove banned word
  const removeBannedWord = (word) => {
    setBannedWords(bannedWords.filter(w => w !== word));
  };
  
  // Function to test voice
  const testVoice = (voiceType) => {
    // Use English text for English voices, and Cantonese text for Cantonese voices
    const testText = voiceType === 'english' ? 
      'This is a test of the selected voice.' : 
      '你好，這是粵語語音測試。'; // Cantonese text: "Hello, this is a Cantonese voice test."
    
    const utterance = new SpeechSynthesisUtterance(testText);
    
    // Find the selected voice
    const voices = speechSynthesisRef.current.getVoices();
    const selectedVoice = voiceType === 'english' ? 
      voices.find(voice => voice.name === englishVoice) : 
      voices.find(voice => voice.name === cantoneseVoice);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else {
      // Fallback to language setting if voice not found
      utterance.lang = voiceType === 'english' ? 'en-US' : 'zh-HK';
    }
    
    speechSynthesisRef.current.speak(utterance);
  };
  
  // Function to toggle parental controls
  const toggleParentControls = () => {
    if (showParentControls) {
      setShowParentControls(false);
      setIsPINCorrect(false);
      setActiveTab('banned-words');
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
  
  // Function to change active tab
  const changeTab = (tab) => {
    setActiveTab(tab);
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
          timeLimit,
          bannedWords
        }),
      });
      
      const data = await response.json();
      console.log('Response received:', data);
      const answerText = data.answer || 'No answer received';
      setAnswer(answerText);
      
      // Record question and answer in history
      const timestamp = new Date().toLocaleTimeString();
      const historyItem = {
        question,
        answer: answerText,
        timestamp,
        language
      };
      setQuestionHistory([historyItem, ...questionHistory]);
      
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
      
      <div className="parent-access-container">
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
          
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'banned-words' ? 'active' : ''}`}
              onClick={() => changeTab('banned-words')}
            >
              {language === 'english' ? 'Banned Words' : '禁用詞彙'}
            </button>
            <button 
              className={`tab-button ${activeTab === 'pin' ? 'active' : ''}`}
              onClick={() => changeTab('pin')}
            >
              {language === 'english' ? 'Change PIN' : '更改PIN'}
            </button>
            <button 
              className={`tab-button ${activeTab === 'voice' ? 'active' : ''}`}
              onClick={() => changeTab('voice')}
            >
              {language === 'english' ? 'Voice Settings' : '語音設置'}
            </button>
            <button 
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => changeTab('history')}
            >
              {language === 'english' ? 'History' : '歷史記錄'}
            </button>
          </div>
          
          {/* Banned Words Tab */}
          {activeTab === 'banned-words' && (
            <div className="tab-content">
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
                <h3>{language === 'english' ? 'Add Banned Words' : '添加禁用詞'}</h3>
                <div className="banned-words-input">
                  <input 
                    type="text" 
                    value={newBannedWord}
                    onChange={(e) => setNewBannedWord(e.target.value)}
                    placeholder={language === 'english' ? 'Enter word to ban' : '輸入要禁用的詞'}
                  />
                  <button onClick={addBannedWord}>
                    {language === 'english' ? 'Add' : '添加'}
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
                      {language === 'english' ? 'No banned words added yet' : '尚未添加禁用詞'}
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
                  <label>{language === 'english' ? 'New PIN' : '新PIN碼'}</label>
                  <input 
                    type="password" 
                    value={newPIN}
                    onChange={(e) => setNewPIN(e.target.value)}
                    placeholder="1234"
                    maxLength="4"
                  />
                </div>
                
                <div className="password-input-group">
                  <label>{language === 'english' ? 'Confirm PIN' : '確認PIN碼'}</label>
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
                  {language === 'english' ? 'Update PIN' : '更新PIN碼'}
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
              <div className="voice-profile-selector">
                <div className="voice-language-section">
                  <h4>{language === 'english' ? 'English Voice' : '英語語音'}</h4>
                  <select 
                    value={englishVoice}
                    onChange={(e) => setEnglishVoice(e.target.value)}
                  >
                    <option value="Google US English">Google US English</option>
                    <option value="Google UK English Female">Google UK English Female</option>
                    <option value="Google UK English Male">Google UK English Male</option>
                  </select>
                  <button 
                    className="test-voice-button"
                    onClick={() => testVoice('english')}
                  >
                    {language === 'english' ? 'Test Voice' : '測試語音'}
                  </button>
                </div>
                
                <div className="voice-language-section">
                  <h4>{language === 'english' ? 'Cantonese Voice' : '粵語語音'}</h4>
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
                    onClick={() => testVoice('cantonese')}
                  >
                    {language === 'english' ? 'Test Voice' : '測試語音'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="tab-content">
              <div className="activity-log">
                {questionHistory.length > 0 ? (
                  questionHistory.map((item, index) => (
                    <div key={index} className="activity-item">
                      <div className="timestamp">{item.timestamp}</div>
                      <strong>{language === 'english' ? 'Question' : '問題'} ({item.language}):</strong>
                      <p>{item.question}</p>
                      <strong>{language === 'english' ? 'Answer' : '答案'}:</strong>
                      <p>{item.answer}</p>
                    </div>
                  ))
                ) : (
                  <p className="no-words">
                    {language === 'english' ? 'No questions asked yet' : '尚未提出問題'}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <button 
            className="exit-button" 
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
