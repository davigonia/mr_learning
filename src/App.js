import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';

// Dictionary for typo correction
const typoDictionary = {
  'blu': 'blue',
  'watr': 'water',
  'doggy': 'dog',
  'kitty': 'cat',
  'skool': 'school',
  'wut': 'what',
  'y': 'why',
  'cuz': 'because'
};

// Dictionary for vague question interpretation
const vagueQuestionMap = {
  'dog loud': 'Why do dogs bark?',
  'sky blue': 'Why is the sky blue?',
  'rain': 'Why does it rain?',
  'stars shine': 'Why do stars shine?',
  'moon night': 'Why can we see the moon at night?'
};

// Inappropriate content filter words
const inappropriateWords = ['violence', 'kill', 'hate', 'gun', 'weapon', 'blood', 'death'];

// Cache for common answers
const answerCache = {};

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [language, setLanguage] = useState('english'); // 'english' or 'cantonese'
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showParentControls, setShowParentControls] = useState(false);
  const [pin, setPin] = useState('');
  const [timeLimit, setTimeLimit] = useState(30); // Default 30 minutes
  const [bannedWords, setBannedWords] = useState([]);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [activityLog, setActivityLog] = useState([]);
  const [pinError, setPinError] = useState('');
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [parentPin, setParentPin] = useState('1234'); // Default PIN
  
  // Voice profile states
  const [englishVoiceProfiles, setEnglishVoiceProfiles] = useState([]);
  const [cantoneseVoiceProfiles, setCantoneseVoiceProfiles] = useState([]);
  const [selectedEnglishVoice, setSelectedEnglishVoice] = useState('');
  const [selectedCantoneseVoice, setSelectedCantoneseVoice] = useState('');
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const speechRecognition = useRef(null);
  const textToSpeech = useRef(null);

  // Initialize speech recognition and get available voices
  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      speechRecognition.current = new SpeechRecognition();
      speechRecognition.current.continuous = false;
      speechRecognition.current.interimResults = false;
      speechRecognition.current.maxAlternatives = 1;
      
      // Set up the onresult event handler
      speechRecognition.current.onresult = (event) => {
        console.log('Speech recognition result received:', event);
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          console.log('Transcript:', transcript);
          
          // Update the question state
          setQuestion(transcript);
          
          // We'll handle the automatic submission in a separate effect
          // This avoids issues with function closures and state updates
          speechRecognition.current.voiceInputCompleted = true;
        }
      };
      
      // Flag to track when voice input is completed
      speechRecognition.current.voiceInputCompleted = false;
      
      // Set up other event handlers
      speechRecognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`I didn't hear you! Error: ${event.error}`);
        setIsListening(false);
        speechRecognition.current.voiceInputCompleted = false;
      };
      
      speechRecognition.current.onend = () => {
        console.log('Speech recognition ended');
        
        // Add a small delay before setting isListening to false
        // This gives more time for kids to finish their thought
        setTimeout(() => {
          setIsListening(false);
        }, 1000); // 1 second delay after speech recognition ends
      };
      
      speechRecognition.current.onnomatch = () => {
        console.log('Speech not recognized');
        setError("I couldn't understand what you said. Please try again.");
        setIsListening(false);
        speechRecognition.current.voiceInputCompleted = false;
      };
    }
    
    // Get available voice profiles
    if ('speechSynthesis' in window) {
      // Chrome loads voices asynchronously
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('Available voices:', voices);
        
        if (voices.length > 0) {
          // Filter English voices - keep only the 3 Google ones
          const englishVoices = voices.filter(voice => 
            voice.name.includes('Google') && voice.lang.startsWith('en')
          );
          
          // Filter Chinese/Cantonese voices - keep only Google (zh-HK)
          const chineseVoices = voices.filter(voice => 
            voice.name.includes('Google') && voice.lang === 'zh-HK'
          );
          
          console.log('Filtered English voices:', englishVoices);
          console.log('Filtered Chinese/Cantonese voices:', chineseVoices);
          
          setEnglishVoiceProfiles(englishVoices);
          setCantoneseVoiceProfiles(chineseVoices);
          setVoicesLoaded(true);
          
          // Set default voices if available
          if (englishVoices.length > 0) {
            setSelectedEnglishVoice(englishVoices[0].name);
          }
          
          if (chineseVoices.length > 0) {
            setSelectedCantoneseVoice(chineseVoices[0].name);
          }
        }
      };
      
      // Chrome loads voices asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      // Initial load attempt (for Firefox and others that load synchronously)
      loadVoices();
    }
  }, []);

  // Load activity log from local storage
  useEffect(() => {
    const savedLog = localStorage.getItem('activityLog');
    if (savedLog) {
      setActivityLog(JSON.parse(savedLog));
    }
  }, []);
  
  // Effect to handle automatic submission after voice input
  useEffect(() => {
    // Only run this effect when isListening changes from true to false
    // This indicates that voice input has just completed
    if (speechRecognition.current && 
        !isListening && 
        speechRecognition.current.voiceInputCompleted) {
      
      // Reset the flag
      speechRecognition.current.voiceInputCompleted = false;
      
      // If we have a question, submit it
      if (question.trim()) {
        // Add a longer delay (2 seconds) to give kids more time to process
        // and to ensure we've captured their complete thought
        console.log('Voice input completed, waiting 2 seconds before submitting...');
        setError('Thinking about what you said...');
        
        setTimeout(() => {
          setError('');
          askGrok();
        }, 2000); // 2 second delay
      }
    }
  }, [isListening, question, askGrok]);

  // Save activity log, banned words, and parent PIN to local storage when they change
  useEffect(() => {
    localStorage.setItem('activityLog', JSON.stringify(activityLog));
  }, [activityLog]);
  
  useEffect(() => {
    localStorage.setItem('bannedWords', JSON.stringify(bannedWords));
  }, [bannedWords]);
  
  useEffect(() => {
    localStorage.setItem('parentPin', parentPin);
  }, [parentPin]);
  
  // Load saved data from local storage
  useEffect(() => {
    const savedBannedWords = localStorage.getItem('bannedWords');
    if (savedBannedWords) {
      setBannedWords(JSON.parse(savedBannedWords));
    }
    
    const savedPin = localStorage.getItem('parentPin');
    if (savedPin) {
      setParentPin(savedPin);
    }
  }, []);

  // Function to correct typos in the question
  const correctTypos = (text) => {
    let correctedText = text.toLowerCase();
    
    Object.keys(typoDictionary).forEach(typo => {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      correctedText = correctedText.replace(regex, typoDictionary[typo]);
    });
    
    return correctedText;
  };

  // Function to interpret vague questions
  const interpretVagueQuestion = (text) => {
    let interpretedQuestion = text;
    
    Object.keys(vagueQuestionMap).forEach(vague => {
      if (text.toLowerCase().includes(vague)) {
        interpretedQuestion = vagueQuestionMap[vague];
      }
    });
    
    return interpretedQuestion;
  };

  // Function to check for inappropriate content
  const containsInappropriateContent = (text) => {
    // Check against hardcoded inappropriate words
    if (inappropriateWords.some(word => text.toLowerCase().includes(word))) {
      return true;
    }
    
    // Check against parent-defined banned words
    if (bannedWords.some(word => text.toLowerCase().includes(word.toLowerCase()))) {
      return true;
    }
    
    return false;
  };

  // Function to start voice recognition
  const startListening = () => {
    if (speechRecognition.current) {
      try {
        // Cancel any ongoing speech synthesis
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
        
        // Reset any previous errors
        setError('');
        
        // Set the language based on current selection
        speechRecognition.current.lang = language === 'english' ? 'en-US' : 'zh-HK';
        console.log(`Starting speech recognition with language: ${speechRecognition.current.lang}`);
        
        // Configure for children's speech patterns
        // Increase recognition time to accommodate slower speech
        if (speechRecognition.current.maxSpeechTime !== undefined) {
          speechRecognition.current.maxSpeechTime = 10; // 10 seconds max
        }
        
        // Reset the flag - we'll set it to true when we get a result
        speechRecognition.current.voiceInputCompleted = false;
        
        // Start listening
        speechRecognition.current.start();
        setIsListening(true);
        setError('I\'m listening...');
      } catch (error) {
        console.error('Speech recognition error:', error);
        setError("I couldn't start listening. Please try again.");
        setIsListening(false);
      }
    } else {
      setError("Voice input isn't available on your device.");
    }
  };

  // Function to speak the answer
  const speakAnswer = (text, forcedLanguage = null) => {
    if (isMuted) return;
    
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      
      // Determine which language to use (either forced or from app state)
      const currentLanguage = forcedLanguage || language;
      const langCode = currentLanguage === 'english' ? 'en-US' : 'zh-HK';
      
      console.log(`Speaking in ${currentLanguage} language with lang code: ${langCode}`);
      console.log('Text to speak:', text);
      
      // Get the appropriate voice based on language
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;
      
      if (voices.length > 0) {
        if (currentLanguage === 'english' && selectedEnglishVoice) {
          // Use selected English voice profile
          selectedVoice = voices.find(voice => voice.name === selectedEnglishVoice);
          if (selectedVoice) {
            console.log('Using English voice:', selectedVoice.name);
          } else {
            console.log('Selected English voice not found, using default');
          }
        } else if (currentLanguage === 'cantonese' && selectedCantoneseVoice) {
          // Use selected Cantonese voice profile
          selectedVoice = voices.find(voice => voice.name === selectedCantoneseVoice);
          if (selectedVoice) {
            console.log('Using Cantonese voice:', selectedVoice.name);
          } else {
            console.log('Selected Cantonese voice not found, using default');
          }
        }
      }
      
      // Break text into smaller chunks to prevent cutting off
      // Different chunking strategies for different languages
      const chunks = [];
      
      if (currentLanguage === 'english') {
        // For English, split by sentences (periods, question marks, exclamation points)
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        
        // Group sentences into chunks of reasonable size
        let currentChunk = '';
        sentences.forEach(sentence => {
          if (currentChunk.length + sentence.length < 100) {
            currentChunk += sentence;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
          }
        });
        if (currentChunk) chunks.push(currentChunk);
      } else {
        // Simplified approach: first try the entire text as one chunk
        // Only split if the text is very long (over 200 characters)
        if (text.length <= 200) {
          chunks.push(text);
        } else {
          // For longer text, split by common sentence-ending punctuation
          // Chinese full stops (。), exclamation marks (！), question marks (？), semicolons (；)
          const sentenceRegex = /[^。！？；]+[。！？；]+/g;
          const sentences = text.match(sentenceRegex) || [];
          
          if (sentences.length > 0) {
            // If we found sentences with proper punctuation, use those
            let currentChunk = '';
            sentences.forEach(sentence => {
              if (currentChunk.length + sentence.length < 150) {
                currentChunk += sentence;
              } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = sentence;
              }
            });
            if (currentChunk) chunks.push(currentChunk);
            
            // If there's text after the last punctuation, add it as a final chunk
            const lastPunctuationIndex = text.lastIndexOf('。');
            const lastExclamationIndex = text.lastIndexOf('！');
            const lastQuestionIndex = text.lastIndexOf('？');
            const lastSemicolonIndex = text.lastIndexOf('；');
            
            const lastIndex = Math.max(
              lastPunctuationIndex, 
              lastExclamationIndex, 
              lastQuestionIndex, 
              lastSemicolonIndex
            );
            
            if (lastIndex > -1 && lastIndex < text.length - 1) {
              chunks.push(text.substring(lastIndex + 1));
            }
          } else {
            // If no sentence punctuation, just use the whole text
            chunks.push(text);
          }
        }
      }
      
      console.log('Speech chunks:', chunks);
      
      // Speak each chunk sequentially
      let chunkIndex = 0;
      
      const speakNextChunk = () => {
        if (chunkIndex < chunks.length) {
          const chunk = chunks[chunkIndex];
          
          // Skip empty chunks
          if (!chunk || chunk.trim() === '') {
            chunkIndex++;
            speakNextChunk();
            return;
          }
          
          console.log(`Speaking chunk ${chunkIndex + 1}/${chunks.length}: ${chunk}`);
          
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.lang = langCode;
          
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
          
          // When this chunk finishes, speak the next one
          utterance.onend = () => {
            console.log(`Finished speaking chunk ${chunkIndex + 1}/${chunks.length}`);
            chunkIndex++;
            // Add a small pause between chunks for more natural speech
            setTimeout(speakNextChunk, 100);
          };
          
          // If there's an error, try to continue with the next chunk
          utterance.onerror = (event) => {
            console.error(`Speech synthesis error on chunk ${chunkIndex + 1}:`, event);
            chunkIndex++;
            speakNextChunk();
          };
          
          // Store reference to current utterance
          textToSpeech.current = utterance;
          
          // Speak the current chunk
          window.speechSynthesis.speak(utterance);
        } else {
          console.log('Finished speaking all chunks');
        }
      };
      
      // If no chunks were created, use the whole text
      if (chunks.length === 0) {
        chunks.push(text);
      }
      
      // Start speaking the first chunk
      speakNextChunk();
    }
  };

  // Function to handle API call to Grok
  const askGrok = async () => {
    // Use the current question from state
    if (!question.trim()) {
      setError('Please ask a question first!');
      return;
    }
    
    // Check question length
    if (question.length > 100) {
      setError('Your question is too long! Please keep it under 100 characters.');
      return;
    }
    
    // Check for inappropriate content
    if (containsInappropriateContent(question)) {
      setError("Let's ask something nicer!");
      return;
    }
    
    // Process the question
    let processedQuestion = question;
    processedQuestion = correctTypos(processedQuestion);
    processedQuestion = interpretVagueQuestion(processedQuestion);
    
    // Check cache first
    const cacheKey = `${processedQuestion}_${language}`;
    if (answerCache[cacheKey]) {
      setAnswer(answerCache[cacheKey]);
      speakAnswer(answerCache[cacheKey]);
      
      // Add to activity log
      const newActivity = { question: processedQuestion, answer: answerCache[cacheKey], timestamp: new Date().toISOString() };
      setActivityLog(prev => [newActivity, ...prev.slice(0, 19)]);
      
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Call the Netlify serverless function
      const response = await fetch('/.netlify/functions/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: processedQuestion,
          language: language
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong');
      }

      const data = await response.json();
      const grokAnswer = data.answer;
      
      // Cache the answer
      answerCache[cacheKey] = grokAnswer;
      
      setAnswer(grokAnswer);
      speakAnswer(grokAnswer);
      
      // Add to activity log
      const newActivity = { question: processedQuestion, answer: grokAnswer, timestamp: new Date().toISOString() };
      setActivityLog(prev => [newActivity, ...prev.slice(0, 19)]);
      
    } catch (error) {
      console.error('Error calling Grok API:', error);
      setError(error.message || 'Oops, our brain is taking a nap! Try again soon.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted && textToSpeech.current) {
      window.speechSynthesis.cancel();
    }
  };

  // Function to handle PIN entry for parent controls
  const handlePinSubmit = () => {
    if (pin === parentPin) {
      setShowParentControls(true);
      setPinError('');
    } else {
      setPinError('Incorrect PIN. Please try again.');
    }
  };
  
  // Function to handle password change
  const handlePasswordChange = () => {
    // Reset states
    setPasswordError('');
    setPasswordSuccess(false);
    
    // Validate current password
    if (currentPassword !== parentPin) {
      setPasswordError('Current PIN is incorrect');
      return;
    }
    
    // Validate new password
    if (newPassword.length < 4) {
      setPasswordError('New PIN must be at least 4 characters');
      return;
    }
    
    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      setPasswordError('New PINs do not match');
      return;
    }
    
    // Update password
    setParentPin(newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setPasswordSuccess(false);
    }, 3000);
  };

  // Function to exit parent controls
  const exitParentControls = () => {
    setShowParentControls(false);
    setPin('');
  };

  // Window size hook for responsive design
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Update window width when resized
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate responsive title size and icon sizes
  const titleStyles = useMemo(() => {
    let fontSize = 72; // Default size
    let iconSize = 36; // Default icon size
    let iconMargin = '0 10px';
    
    if (windowWidth < 480) {
      fontSize = 32; // Smaller font on very small screens
      iconSize = 24;
      iconMargin = '0 5px';
    } else if (windowWidth < 768) {
      fontSize = 48;
      iconSize = 30;
      iconMargin = '0 8px';
    }
    
    return {
      title: { 
        fontSize: `${fontSize}px`,
        whiteSpace: 'nowrap' // Prevent line breaks
      },
      icon: {
        fontSize: `${iconSize}px`,
        margin: iconMargin,
        verticalAlign: 'middle'
      }
    };
  }, [windowWidth]);

  // Translate UI elements based on language
  const uiText = {
    askButton: language === 'english' ? 'Ask' : '問',
    placeholder: language === 'english' ? 'What do you want to know?' : '你想知咩？',
    answerLabel: language === 'english' ? 'Answer' : '答案',
    loading: language === 'english' ? 'Thinking...' : '思考中...',
    answerPlaceholder: language === 'english' ? 'Your answer will appear here...' : '你的答案將會在這裡顯示...'
  };

  return (
    <div className="App">
      <div className="app-title">
        <h1 style={titleStyles.title}>
          <span style={titleStyles.icon}>🧠</span>
          Mr Learning
          <span style={titleStyles.icon}>✨</span>
        </h1>
        <div className="title-decoration"></div>
      </div>
      
      {!showParentControls ? (
        <>
          <div className="question-box">
            <textarea 
              placeholder={uiText.placeholder}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={100}
            />
            <div className="button-container">
              <button className="ask-button" onClick={askGrok} disabled={isLoading}>
                {uiText.askButton}
              </button>
              <button 
                className={`mic-button ${isListening ? 'active' : ''}`} 
                onClick={startListening}
                disabled={isLoading}
                title="Click to speak your question"
              >
                {isListening ? '🔴' : '🎤'}
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>
          
          <div className="answer-box">
            {isLoading ? (
              <div className="loading">{uiText.loading}</div>
            ) : (
              <>
                <p>{answer || uiText.answerPlaceholder}</p>
                <button className={`mute-button ${isMuted ? 'active' : ''}`} onClick={toggleMute}>
                  {isMuted ? '🔇' : '🔊'}
                </button>
              </>
            )}
          </div>
          
          <div className="language-toggles">
            <button 
              className={`language-toggle ${language === 'english' ? 'active' : ''}`}
              onClick={() => setLanguage('english')}
            >
              English
            </button>
            <button 
              className={`language-toggle ${language === 'cantonese' ? 'active' : ''}`}
              onClick={() => setLanguage('cantonese')}
            >
              中文
            </button>
          </div>
          
          <div className="parent-access">
            <button onClick={() => setShowParentControls(true)}>Parents</button>
          </div>

          <div className="footer">
            Made with love by David Cheang <a href="https://instagram.com/dadnotehk" target="_blank" rel="noopener noreferrer">@dadnotehk</a>
          </div>
        </>
      ) : (
        <div className="parent-controls">
          <h2>Parent Controls</h2>
          
          {pin !== '1234' ? (
            <div className="pin-entry">
              <p>Enter PIN to access parent controls:</p>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
              />
              <button onClick={handlePinSubmit}>Submit</button>
              {pinError && <p className="error-message">{pinError}</p>}
            </div>
          ) : (
            <>
              <div className="control-section">
                <h3>Time Limit</h3>
                <div className="slider-container">
                  <input 
                    type="range" 
                    min="10" 
                    max="60" 
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  />
                  <span>{timeLimit} minutes</span>
                </div>
              </div>
              
              <div className="control-section">
                <h3>Banned Words</h3>
                <p className="control-description">Add words that should be filtered from children's questions</p>
                
                <div className="banned-words-container">
                  <div className="banned-words-input">
                    <input 
                      type="text" 
                      value={newBannedWord}
                      onChange={(e) => setNewBannedWord(e.target.value)}
                      placeholder="Enter word to ban"
                    />
                    <button 
                      onClick={() => {
                        if (newBannedWord.trim()) {
                          setBannedWords([...bannedWords, newBannedWord.trim()]);
                          setNewBannedWord('');
                        }
                      }}
                      disabled={!newBannedWord.trim()}
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="banned-words-list">
                    {bannedWords.length === 0 ? (
                      <p className="no-words">No banned words added yet</p>
                    ) : (
                      <ul>
                        {bannedWords.map((word, index) => (
                          <li key={index}>
                            <span>{word}</span>
                            <button 
                              onClick={() => {
                                const newList = [...bannedWords];
                                newList.splice(index, 1);
                                setBannedWords(newList);
                              }}
                              className="remove-word"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="control-section">
                <h3>Change PIN</h3>
                <p className="control-description">Update your parent access PIN</p>
                
                <div className="password-change-container">
                  <div className="password-input-group">
                    <label>Current PIN</label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      maxLength={8}
                      placeholder="Enter current PIN"
                    />
                  </div>
                  
                  <div className="password-input-group">
                    <label>New PIN</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      maxLength={8}
                      placeholder="Enter new PIN"
                    />
                  </div>
                  
                  <div className="password-input-group">
                    <label>Confirm New PIN</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      maxLength={8}
                      placeholder="Confirm new PIN"
                    />
                  </div>
                  
                  <button 
                    className="password-change-button"
                    onClick={handlePasswordChange}
                    disabled={!currentPassword || !newPassword || !confirmPassword}
                  >
                    Update PIN
                  </button>
                  
                  {passwordError && (
                    <div className="password-error">{passwordError}</div>
                  )}
                  
                  {passwordSuccess && (
                    <div className="password-success">PIN updated successfully!</div>
                  )}
                </div>
              </div>
              
              <div className="control-section">
                <h3>Voice Profiles</h3>
                <div className="voice-profile-selector">
                  <div className="voice-language-section">
                    <h4>English Voice</h4>
                    <select 
                      value={selectedEnglishVoice}
                      onChange={(e) => setSelectedEnglishVoice(e.target.value)}
                    >
                      {englishVoiceProfiles.length === 0 ? (
                        <option value="">No English voices available</option>
                      ) : (
                        englishVoiceProfiles.map((voice, index) => (
                          <option key={index} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))
                      )}
                    </select>
                    <button 
                      className="test-voice-button"
                      onClick={() => speakAnswer('Hello! This is a test of the English voice profile.', 'english')}
                    >
                      Test Voice
                    </button>
                  </div>
                  
                  <div className="voice-language-section">
                    <h4>Cantonese Voice</h4>
                    <select 
                      value={selectedCantoneseVoice}
                      onChange={(e) => setSelectedCantoneseVoice(e.target.value)}
                    >
                      {!voicesLoaded ? (
                        <option value="">Loading voices...</option>
                      ) : cantoneseVoiceProfiles.length === 0 ? (
                        <option value="">No Cantonese voices available</option>
                      ) : (
                        cantoneseVoiceProfiles.map((voice, index) => (
                          <option key={index} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))
                      )}
                    </select>
                    <button 
                      className="test-voice-button"
                      onClick={() => speakAnswer('你好！這是廣東話語音測試。', 'cantonese')}
                    >
                      Test Voice
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="control-section">
                <h3>Activity Log</h3>
                <div className="activity-log">
                  {activityLog.length > 0 ? (
                    activityLog.map((activity, index) => (
                      <div key={index} className="activity-item">
                        <p><strong>Q:</strong> {activity.question}</p>
                        <p><strong>A:</strong> {activity.answer}</p>
                        <p className="timestamp">{new Date(activity.timestamp).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p>No activity yet</p>
                  )}
                </div>
              </div>
              
              <button className="exit-button" onClick={exitParentControls}>
                Exit Parent Controls
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
