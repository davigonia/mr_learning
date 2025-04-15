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
  const [cantoneseVoice, setCantoneseVoice] = useState('Ting-Ting');
  
  // Question history state
  const [questionHistory, setQuestionHistory] = useState([]);
  
  // PIN change state
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [pinChangeMessage, setPinChangeMessage] = useState('');

  // Effect to initialize speech recognition
  useEffect(() => {
    console.log('App component mounted successfully');
    
    // Initialize speech synthesis
    speechSynthesisRef.current = window.speechSynthesis;
    
    // Initialize speech recognition
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
    
    // Load voices when they are available
    const loadVoices = () => {
      // Log all available voices for debugging
      const voices = speechSynthesisRef.current.getVoices();
      console.log('All available voices:', voices.map(v => ({ 
        name: v.name, 
        lang: v.lang, 
        default: v.default,
        localService: v.localService
      })));
      
      // Log Chinese/Cantonese voices
      const chineseVoices = voices.filter(v => 
        v.lang.includes('zh') || 
        v.name.includes('Chinese') || 
        v.name.includes('Cantonese')
      );
      console.log('Chinese/Cantonese voices:', chineseVoices.map(v => ({ 
        name: v.name, 
        lang: v.lang 
      })));
    };
    
    speechSynthesisRef.current.onvoiceschanged = loadVoices;
    
    // Initial load attempt
    loadVoices();
    
    // Cleanup
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
    
    // Get available voices
    const voices = speechSynthesisRef.current.getVoices();
    console.log('Available voices:', voices.map(v => v.name));
    
    // Set the voice based on the current language
    if (language === 'english') {
      // For English, try to find Google US English
      const selectedVoice = voices.find(voice => 
        voice.name === englishVoice || 
        voice.name.includes('US English')
      );
      
      if (selectedVoice) {
        console.log('Using English voice:', selectedVoice.name);
        utterance.voice = selectedVoice;
      } else {
        console.log('Fallback to en-US language');
        utterance.lang = 'en-US';
      }
    } else {
      // Map the selected voice option to specific voice characteristics to ensure different profiles
      let voiceCharacteristics;
      console.log('Selected Cantonese voice option:', cantoneseVoice);
      
      switch(cantoneseVoice) {
        case 'Google 粵語（香港）':
          // Male Cantonese voice
          voiceCharacteristics = {
            preferredNames: ['Google 粵語（香港）', 'Google Cantonese (Hong Kong)'],
            preferredLangs: ['zh-HK'],
            gender: 'male'
          };
          break;
          
        case 'Google Cantonese (Hong Kong)':
          // Female Cantonese voice
          voiceCharacteristics = {
            preferredNames: ['Google Cantonese Female', 'Google 粵語女聲'],
            preferredLangs: ['zh-HK'],
            gender: 'female'
          };
          break;
          
        case 'Google Chinese (Hong Kong)':
          // Another Cantonese variant
          voiceCharacteristics = {
            preferredNames: ['Google Chinese (Hong Kong)', 'Google 香港'],
            preferredLangs: ['zh-HK', 'yue-HK'],
            gender: 'any'
          };
          break;
          
        case 'Google Chinese':
          // Mandarin voice
          voiceCharacteristics = {
            preferredNames: ['Google Chinese', 'Google 普通话', 'Google Mandarin'],
            preferredLangs: ['zh-CN', 'zh-TW'],
            gender: 'any'
          };
          break;
          
        default:
          // Default fallback
          voiceCharacteristics = {
            preferredNames: ['Google 粵語', 'Google Cantonese', 'Google Chinese'],
            preferredLangs: ['zh-HK', 'zh-CN', 'zh-TW'],
            gender: 'any'
          };
      }
      
      console.log('Looking for voice with characteristics:', voiceCharacteristics);
      
      // Try to find a voice matching the preferred characteristics
      let selectedVoice = null;
      
      // First try exact name match from preferred names
      for (const name of voiceCharacteristics.preferredNames) {
        const match = voices.find(v => v.name === name);
        if (match) {
          selectedVoice = match;
          console.log('Found exact name match:', match.name);
          break;
        }
      }
      
      // If not found, try partial name match
      if (!selectedVoice) {
        for (const name of voiceCharacteristics.preferredNames) {
          const match = voices.find(v => v.name.includes(name));
          if (match) {
            selectedVoice = match;
            console.log('Found partial name match:', match.name);
            break;
          }
        }
      }
      
      // If still not found, try language match
      if (!selectedVoice) {
        for (const lang of voiceCharacteristics.preferredLangs) {
          const match = voices.find(v => v.lang === lang);
          if (match) {
            selectedVoice = match;
            console.log('Found language match:', match.name, match.lang);
            break;
          }
        }
      }
      
      // Last resort: any Chinese voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang.includes('zh') || 
          v.name.includes('Chinese') || 
          v.name.includes('Cantonese')
        );
        if (selectedVoice) {
          console.log('Found fallback Chinese voice:', selectedVoice.name);
        }
      }
      
      if (selectedVoice) {
        console.log('Using Cantonese voice:', selectedVoice.name);
        utterance.voice = selectedVoice;
      } else {
        console.log('Fallback to zh-HK language');
        utterance.lang = 'zh-HK';
      }
    }
    
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
      '你好，我叫天天。我可以幫你學習粵語。'; // Cantonese text: "Hello, my name is Ting-Ting. I can help you learn Cantonese."
    
    const utterance = new SpeechSynthesisUtterance(testText);
    
    // Get available voices
    const voices = speechSynthesisRef.current.getVoices();
    console.log('Testing voice - Available voices:', voices.map(v => v.name));
    
    // Set the voice based on the voice type
    if (voiceType === 'english') {
      // For English, try to find Google US English
      const selectedVoice = voices.find(voice => 
        voice.name === englishVoice || 
        voice.name.includes('US English')
      );
      
      if (selectedVoice) {
        console.log('Testing with English voice:', selectedVoice.name);
        utterance.voice = selectedVoice;
      } else {
        console.log('Testing with fallback to en-US language');
        utterance.lang = 'en-US';
      }
    } else {
      // Map the selected voice option to specific voice characteristics to ensure different profiles
      let voiceCharacteristics;
      console.log('Testing - Selected Cantonese voice option:', cantoneseVoice);
      
      switch(cantoneseVoice) {
        case 'Google 粵語（香港）':
          // Male Cantonese voice
          voiceCharacteristics = {
            preferredNames: ['Google 粵語（香港）', 'Google Cantonese (Hong Kong)'],
            preferredLangs: ['zh-HK'],
            gender: 'male'
          };
          break;
          
        case 'Google Cantonese (Hong Kong)':
          // Female Cantonese voice
          voiceCharacteristics = {
            preferredNames: ['Google Cantonese Female', 'Google 粵語女聲'],
            preferredLangs: ['zh-HK'],
            gender: 'female'
          };
          break;
          
        case 'Google Chinese (Hong Kong)':
          // Another Cantonese variant
          voiceCharacteristics = {
            preferredNames: ['Google Chinese (Hong Kong)', 'Google 香港'],
            preferredLangs: ['zh-HK', 'yue-HK'],
            gender: 'any'
          };
          break;
          
        case 'Google Chinese':
          // Mandarin voice
          voiceCharacteristics = {
            preferredNames: ['Google Chinese', 'Google 普通话', 'Google Mandarin'],
            preferredLangs: ['zh-CN', 'zh-TW'],
            gender: 'any'
          };
          break;
          
        default:
          // Default fallback
          voiceCharacteristics = {
            preferredNames: ['Google 粵語', 'Google Cantonese', 'Google Chinese'],
            preferredLangs: ['zh-HK', 'zh-CN', 'zh-TW'],
            gender: 'any'
          };
      }
      
      console.log('Testing - Looking for voice with characteristics:', voiceCharacteristics);
      
      // Try to find a voice matching the preferred characteristics
      let selectedVoice = null;
      
      // First try exact name match from preferred names
      for (const name of voiceCharacteristics.preferredNames) {
        const match = voices.find(v => v.name === name);
        if (match) {
          selectedVoice = match;
          console.log('Testing - Found exact name match:', match.name);
          break;
        }
      }
      
      // If not found, try partial name match
      if (!selectedVoice) {
        for (const name of voiceCharacteristics.preferredNames) {
          const match = voices.find(v => v.name.includes(name));
          if (match) {
            selectedVoice = match;
            console.log('Testing - Found partial name match:', match.name);
            break;
          }
        }
      }
      
      // If still not found, try language match
      if (!selectedVoice) {
        for (const lang of voiceCharacteristics.preferredLangs) {
          const match = voices.find(v => v.lang === lang);
          if (match) {
            selectedVoice = match;
            console.log('Testing - Found language match:', match.name, match.lang);
            break;
          }
        }
      }
      
      // Last resort: any Chinese voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang.includes('zh') || 
          v.name.includes('Chinese') || 
          v.name.includes('Cantonese')
        );
        if (selectedVoice) {
          console.log('Testing - Found fallback Chinese voice:', selectedVoice.name);
        }
      }
      
      if (selectedVoice) {
        console.log('Testing with Cantonese voice:', selectedVoice.name);
        utterance.voice = selectedVoice;
      } else {
        console.log('Testing with fallback to zh-HK language');
        utterance.lang = 'zh-HK';
      }
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
                    <option value="Google 粵語（香港）">Google 粵語（香港） - 男聲</option>
                    <option value="Google Cantonese (Hong Kong)">Google Cantonese (Hong Kong) - Female</option>
                    <option value="Google Chinese (Hong Kong)">Google Chinese (Hong Kong) - 粵語</option>
                    <option value="Google Chinese">Google Chinese (Mandarin) - 普通話</option>
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
