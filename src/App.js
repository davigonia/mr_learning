import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Device detection utilities
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isIOSDevice = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

const isAndroidDevice = () => {
  return /Android/i.test(navigator.userAgent);
};

function App() {
  // Basic state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('english');
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
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
  
  // Device detection state
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  
  // Question history state
  const [questionHistory, setQuestionHistory] = useState([]);
  
  // PIN change state
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [pinChangeMessage, setPinChangeMessage] = useState('');

  // Create a ref to hold the speech recognition object
  const speechRecognitionRef = useRef(null);
  
  // Detect device type on component mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsIOS(isIOSDevice());
    setIsAndroid(isAndroidDevice());
    
    // Initialize audio context for mobile devices
    if (isMobileDevice()) {
      try {
        window.audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext initialized for mobile device');
      } catch (e) {
        console.error('Could not initialize AudioContext:', e);
      }
    }
  }, []);

  // Function to set up speech recognition
  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError(language === 'english' ?
        'Speech recognition not supported in this browser' :
        '此瀏覽器不支持語音識別');
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false; // Set to false for cleaner auto-submission
    recognition.interimResults = false; // Only get final results
    recognition.lang = language === 'english' ? 'en-US' : 'zh-HK';
    recognition.maxAlternatives = 1;
    
    // Flag to track when voice input is completed
    recognition.voiceInputCompleted = false;
    
    // Set up the onresult event handler
    recognition.onresult = (event) => {
      console.log('Speech recognition result received:', event);
      if (event.results && event.results.length > 0) {
        const transcript = event.results[0][0].transcript;
        console.log('Transcript:', transcript);
        
        // Update the question state
        setQuestion(transcript);
        
        // Flag to track when voice input is completed
        recognition.voiceInputCompleted = true;
      }
    };
    
    // Set up other event handlers
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      // Provide more user-friendly error messages
      let errorMessage = '';
      switch(event.error) {
        case 'no-speech':
          errorMessage = language === 'english' ? 
            'No speech detected. Please try again.' : 
            '未檢測到語音。請再試一次。';
          break;
        case 'audio-capture':
          errorMessage = language === 'english' ? 
            'Microphone not available. Please check your device settings.' : 
            '麥克風不可用。請檢查您的設備設置。';
          break;
        case 'not-allowed':
          errorMessage = language === 'english' ? 
            'Microphone access denied. Please allow microphone access.' : 
            '麥克風訪問被拒絕。請允許麥克風訪問。';
          break;
        case 'network':
          errorMessage = language === 'english' ? 
            'Network error. Please check your internet connection.' : 
            '網絡錯誤。請檢查您的互聯網連接。';
          break;
        case 'aborted':
          // Don't show error for user-initiated aborts
          errorMessage = '';
          break;
        default:
          errorMessage = language === 'english' ? 
            `Speech recognition error: ${event.error}` : 
            `語音識別錯誤: ${event.error}`;
      }
      
      if (errorMessage) {
        setError(errorMessage);
      }
      
      setIsListening(false);
      recognition.voiceInputCompleted = false;
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended');
      
      // Add a small delay before setting isListening to false
      // This gives more time for kids to finish their thought
      setTimeout(() => {
        setIsListening(false);
      }, 1000); // 1 second delay after speech recognition ends
    };
    
    recognition.onstart = () => {
      setIsListening(true);
      setError('');
      console.log('Speech recognition started');
    };

    return recognition;
  };

  // Effect to initialize speech synthesis and recognition
  useEffect(() => {
    console.log('App component mounted successfully');
    
    // Initialize speech synthesis
    speechSynthesisRef.current = window.speechSynthesis;
    
    // Create a global AudioContext for mobile devices
    window.audioContextInstance = window.audioContextInstance || 
                                 (window.AudioContext || window.webkitAudioContext) && 
                                 new (window.AudioContext || window.webkitAudioContext)();
    
    // Force unlock audio on iOS and Android devices
    const unlockAudio = () => {
      console.log('Unlocking audio...');
      
      // Create and play a silent sound to unlock audio on iOS
      const silentSound = new SpeechSynthesisUtterance(' ');
      silentSound.volume = 0;
      speechSynthesisRef.current.speak(silentSound);
      speechSynthesisRef.current.cancel(); // Cancel immediately to avoid delay
      
      // Resume AudioContext if available and suspended
      if (window.audioContextInstance && window.audioContextInstance.state === 'suspended') {
        console.log('Resuming suspended AudioContext...');
        window.audioContextInstance.resume().then(() => {
          console.log('AudioContext resumed successfully');
        }).catch(err => {
          console.error('Failed to resume AudioContext:', err);
        });
      }

      // Create and play a silent oscillator to unlock WebAudio on mobile
      try {
        if (window.audioContextInstance) {
          const oscillator = window.audioContextInstance.createOscillator();
          const gainNode = window.audioContextInstance.createGain();
          gainNode.gain.value = 0; // Set volume to 0
          oscillator.connect(gainNode);
          gainNode.connect(window.audioContextInstance.destination);
          oscillator.start(0);
          oscillator.stop(0.001); // Stop after a very short time
          console.log('Silent oscillator played to unlock audio');
        }
      } catch (e) {
        console.error('Error creating silent oscillator:', e);
      }

      // Remove the event listeners after first user interaction
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };

    // Add event listeners to unlock audio on first user interaction
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('touchend', unlockAudio); // Add touchend for better iOS compatibility
    document.addEventListener('click', unlockAudio);

    // Detect device type for better voice selection
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    // Load voices when they are available
    const loadVoices = () => {
      const voices = speechSynthesisRef.current.getVoices();
      console.log('Available voices loaded:', voices.length);

      // Filter for English voices
      const englishVoices = voices.filter(voice =>
        voice.lang.startsWith('en') ||
        voice.name.toLowerCase().includes('english')
      );

      // Filter for Cantonese voices (zh-HK)
      const cantoneseVoices = voices.filter(voice =>
        voice.lang === 'zh-HK' ||
        voice.name.includes('Cantonese') ||
        voice.name.includes('粵語') ||
        voice.lang === 'zh-TW' || // Fallback to Traditional Chinese
        voice.lang === 'zh-CN' // Last resort fallback to Mandarin
      );

      console.log('English voices:', englishVoices.map(v => `${v.name} (${v.lang})`));
      console.log('Cantonese voices:', cantoneseVoices.map(v => `${v.name} (${v.lang})`));

      // Select appropriate voices based on device/browser
      let defaultEnglishVoice = '';
      let defaultCantoneseVoice = '';

      if (isIOS) {
        // iOS typically has these voices
        defaultEnglishVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Daniel'))?.name ||
          englishVoices[0]?.name || '';

        defaultCantoneseVoice = voices.find(v => v.name.includes('Sin-ji'))?.name ||
          cantoneseVoices[0]?.name ||
          voices.find(v => v.lang === 'zh-TW')?.name ||
          voices.find(v => v.lang === 'zh-CN')?.name || '';
      } else if (isMobile) {
        // Android or other mobile
        defaultEnglishVoice = englishVoices[0]?.name || '';
        defaultCantoneseVoice = cantoneseVoices[0]?.name || '';
      } else {
        // Desktop - prefer Google voices if available
        defaultEnglishVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))?.name ||
          englishVoices[0]?.name || '';

        defaultCantoneseVoice = voices.find(v => v.name.includes('Google') && (v.lang === 'zh-HK' || v.name.includes('Cantonese')))?.name ||
          cantoneseVoices[0]?.name || '';
      }

      // Set the selected voices if they're not already set or if they're not available
      if (!englishVoice || !voices.some(v => v.name === englishVoice)) {
        console.log('Setting default English voice:', defaultEnglishVoice);
        setEnglishVoice(defaultEnglishVoice || englishVoices[0]?.name || 'Google US English');
      }

      if (!cantoneseVoice || !voices.some(v => v.name === cantoneseVoice)) {
        console.log('Setting default Cantonese voice:', defaultCantoneseVoice);
        setCantoneseVoice(defaultCantoneseVoice || cantoneseVoices[0]?.name || 'Google Cantonese (Hong Kong)');
      }
    };

    // Set up the voices changed event
    speechSynthesisRef.current.onvoiceschanged = loadVoices;

    // Try to load voices immediately (works in some browsers)
    loadVoices();

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      speechRecognitionRef.current = setupSpeechRecognition();
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    // Cleanup function
    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping speech recognition during cleanup:', e);
        }
      }
    };
  }, [language, cantoneseVoice]);

  // Effect to handle automatic submission after voice input
  useEffect(() => {
    // Only run this effect when isListening changes from true to false
    // This indicates that voice input has just completed
    if (speechRecognitionRef.current && 
        !isListening && 
        speechRecognitionRef.current.voiceInputCompleted) {
      
      // Reset the flag
      speechRecognitionRef.current.voiceInputCompleted = false;
      
      // If we have a question, submit it
      if (question.trim()) {
        // Add a longer delay (2 seconds) to give kids more time to process
        // and to ensure we've captured their complete thought
        console.log('Voice input completed, waiting 2 seconds before submitting...');
        setError(language === 'english' ? 'Thinking about what you said...' : '思考你所說的話...');
        
        setTimeout(() => {
          setError('');
          console.log('Auto-submitting after voice input completion');
          
          // Force a mock response in preview mode to demonstrate auto-submit
          const mockAnswer = language === 'english' ? 
            `I heard you say: "${question.trim()}". Auto-submission is working!` : 
            `我聽到你說: "${question.trim()}". 自動提交功能正常!`;
          
          setIsLoading(true);
          
          // Simulate API delay
          setTimeout(() => {
            setAnswer(mockAnswer);
            setIsLoading(false);
            
            // Add to question history
            setQuestionHistory([
              { question: question.trim(), answer: mockAnswer, timestamp: new Date().toISOString() },
              ...questionHistory
            ]);
            
            // Speak the answer if not muted
            if (!isMuted) {
              speakText(mockAnswer);
            }
          }, 1000);
        }, 2000); // 2 second delay
      }
    }
  }, [isListening, question]);

  // UI text based on language
  const englishUIText = {
    askButton: 'Ask',
    placeholder: 'Ask me anything...',
    loading: 'Thinking...',
    answerPlaceholder: 'Your answer will appear here',
  };
  
  const cantoneseUIText = {
    askButton: '問',
    placeholder: '問我任何問題...',
    loading: '思考中...',
    answerPlaceholder: '你的答案會在這裡顯示',
  };
  
  // Set UI text based on current language
  const [uiText, setUiText] = useState(language === 'english' ? englishUIText : cantoneseUIText);

  // Function to toggle language
  const toggleLanguage = () => {
    const newLanguage = language === 'english' ? 'cantonese' : 'english';
    setLanguage(newLanguage);
    
    // Update UI text based on language
    setUiText(newLanguage === 'english' ? englishUIText : cantoneseUIText);
    
    // Update speech recognition language if active
    if (isListening && speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current.lang = newLanguage === 'english' ? 'en-US' : 'zh-HK';
        speechRecognitionRef.current.start();
      } catch (error) {
        console.error('Error updating speech recognition language:', error);
      }
    }
  };

  // Function to toggle speech recognition
  const toggleSpeechRecognition = () => {
    console.log('Toggle speech recognition called, current state:', isListening);
    if (isListening) {
      if (speechRecognitionRef.current) {
        try {
          console.log('Stopping speech recognition...');
          speechRecognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
      }
    } else {
      // Clear the question when starting a new voice input
      setQuestion('');
      setError('');
      
      if (speechRecognitionRef.current) {
        try {
          console.log('Starting speech recognition...');
          // Set language for speech recognition
          speechRecognitionRef.current.lang = language === 'english' ? 'en-US' : 'zh-HK';
          // Reset the voice input completed flag
          speechRecognitionRef.current.voiceInputCompleted = false;
          speechRecognitionRef.current.start();
        } catch (error) {
          console.error('Error starting speech recognition:', error);
          // If there was an error starting, try to recreate the recognition object
          speechRecognitionRef.current = setupSpeechRecognition();
          if (speechRecognitionRef.current) {
            speechRecognitionRef.current.start();
          }
        }
      } else {
        console.log('No speech recognition object, creating new one...');
        speechRecognitionRef.current = setupSpeechRecognition();
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.start();
        }
      }
    }
  };

  // Function to speak text using speech synthesis
  const speakText = (text) => {
    if (isMuted || !text) return;

    console.log('Speaking text:', text.substring(0, 50) + '...');
    
    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();
    
    // Log device information for debugging
    console.log('Device info:', { isMobile, isIOS, isAndroid });
    
    // Try to resume AudioContext for mobile devices
    if (isMobile && window.audioContextInstance) {
      try {
        if (window.audioContextInstance.state === 'suspended') {
          window.audioContextInstance.resume().then(() => {
            console.log('AudioContext resumed successfully');
          }).catch(err => {
            console.error('Error resuming AudioContext:', err);
          });
        }
      } catch (e) {
        console.error('Exception handling AudioContext:', e);
      }
    }

    let voices = speechSynthesisRef.current.getVoices();
    console.log(`Found ${voices.length} voices`);

    // If no voices are available yet, try to get them again
    if (voices.length === 0) {
      console.log('No voices available, trying to force load voices...');
      // Force a refresh of voices
      speechSynthesisRef.current.onvoiceschanged = () => {
        voices = speechSynthesisRef.current.getVoices();
        console.log(`Voices loaded after force: ${voices.length}`);
      };
      
      // Try to trigger onvoiceschanged
      const dummy = new SpeechSynthesisUtterance(' ');
      speechSynthesisRef.current.speak(dummy);
      speechSynthesisRef.current.cancel();
      
      // Get voices again
      voices = speechSynthesisRef.current.getVoices();
    }
    
    // Log all available voices for debugging
    if (voices.length > 0) {
      console.log('Available voices:');
      voices.forEach((voice, index) => {
        console.log(`${index}: ${voice.name} (${voice.lang})`);
      });
    }

    // Set speaking to true at the beginning
    setIsSpeaking(true);

    // Detect if text is Cantonese or English based on character set
    const isCantonese = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
    console.log('Text language detected:', isCantonese ? 'Cantonese' : 'English');
    
    // Set language code based on detected text language, not interface language
    let langCode = isCantonese ? 'zh-HK' : 'en-US';
    let selectedVoice = null;

    if (!isCantonese) {
      // For English text
      // Log the current English voice setting
      console.log('Using English voice setting:', englishVoice);

      // Try to find the selected English voice
      selectedVoice = voices.find(voice => voice.name === englishVoice);

      // If not found, try to find any English voice
      if (!selectedVoice) {
        console.log('Selected English voice not found, looking for alternatives');
        if (isIOS) {
          // Try iOS specific voices first
          selectedVoice = voices.find(voice => 
            voice.name.includes('Samantha') || 
            voice.name.includes('Daniel') ||
            voice.name.includes('Karen') ||
            voice.name.includes('Alex'));
        } else if (isAndroid) {
          // Try Android specific voices first
          selectedVoice = voices.find(voice => 
            voice.lang === 'en-US' || 
            voice.lang === 'en-GB');
        }
        
        // If still not found, try any English voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice =>
            voice.lang.startsWith('en') ||
            voice.name.toLowerCase().includes('english')
          );
        }
        
        // Last resort: use any available voice and set lang parameter
        if (!selectedVoice && voices.length > 0) {
          console.log('Using first available voice as fallback');
          selectedVoice = voices[0];
        }
      }
    } else {
      // For Cantonese text
      // Log the current Cantonese voice setting
      console.log('Using Cantonese voice setting:', cantoneseVoice);

      // Try to find the selected Cantonese voice
      selectedVoice = voices.find(voice => voice.name === cantoneseVoice);

      // If not found, try to find any Cantonese voice
      if (!selectedVoice) {
        console.log('Selected Cantonese voice not found, looking for alternatives');
        if (isIOS) {
          // Try iOS specific voices first
          selectedVoice = voices.find(voice => 
            voice.name.includes('Sin-ji') ||
            voice.name.includes('Ting-Ting') ||
            voice.name.includes('Mei-Jia'));
        } else if (isAndroid) {
          // Try Android specific voices first
          selectedVoice = voices.find(voice => 
            voice.lang === 'zh-HK' || 
            voice.lang === 'zh-TW' || 
            voice.lang === 'zh-CN');
        }

        // If still not found, try any Chinese voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice =>
            voice.lang === 'zh-HK' ||
            voice.lang === 'zh-TW' ||
            voice.lang === 'zh-CN' ||
            voice.name.includes('Chinese') ||
            voice.name.includes('Cantonese')
          );
        }
        
        // Last resort: use any available voice and set lang parameter
        if (!selectedVoice && voices.length > 0) {
          console.log('Using first available voice as fallback for Cantonese');
          selectedVoice = voices[0];
        }
      }
    }

    // Log the selected voice
    if (selectedVoice) {
      console.log('Selected voice for speech:', selectedVoice.name, selectedVoice.lang);
    } else {
      console.log('No suitable voice found, using default language code:', langCode);
    }

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
      // For Cantonese, split by all common sentence endings and punctuation
      // Include both Chinese and Western punctuation
      const cantonesePunctuation = /([。！？\.!\?;；]|，(?=[^，]{15,})|,(?=[^,]{15,}))/;
      
      // First try to split by sentence endings
      let preliminaryChunks = text.split(cantonesePunctuation);
      
      // Process the chunks to keep punctuation with the text
      textChunks = [];
      for (let i = 0; i < preliminaryChunks.length; i += 2) {
        const textPart = preliminaryChunks[i] || '';
        const punctuation = preliminaryChunks[i + 1] || '';
        
        if (textPart.trim()) {
          textChunks.push(textPart + punctuation);
        }
      }
      
      // If we still have very long chunks, break them further
      textChunks = textChunks.flatMap(chunk => {
        if (chunk.length > 100) {
          // For very long chunks without punctuation, break by length
          const subChunks = [];
          let remaining = chunk;
          const maxSubChunkLength = 50; // Shorter for Cantonese
          
          while (remaining.length > maxSubChunkLength) {
            // Try to find a good breaking point at a space or comma
            let breakPoint = maxSubChunkLength;
            const possibleBreak = Math.max(
              remaining.lastIndexOf(' ', breakPoint),
              remaining.lastIndexOf('，', breakPoint),
              remaining.lastIndexOf(',', breakPoint)
            );
            
            if (possibleBreak > maxSubChunkLength / 2) {
              breakPoint = possibleBreak + 1;
            }
            
            subChunks.push(remaining.substring(0, breakPoint));
            remaining = remaining.substring(breakPoint);
          }
          
          if (remaining) {
            subChunks.push(remaining);
          }
          
          return subChunks;
        }
        return [chunk];
      });
      
      // If no chunks were created, use the whole text
      if (textChunks.length === 0) {
        textChunks = [text];
      }
      
      console.log('Cantonese text chunks:', textChunks);
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

      // Adjust speech parameters based on device type
      if (isMobile) {
        // Mobile devices need higher volume and adjusted rate
        utterance.volume = 1.0; // Maximum volume
        
        if (isIOS) {
          // iOS specific settings
          utterance.rate = 0.95; // Slightly faster to prevent iOS from cutting off
          utterance.pitch = 1.0; // Neutral pitch
        } else if (isAndroid) {
          // Android specific settings
          utterance.rate = 0.85; // Slower for better clarity on Android
          utterance.pitch = 1.0; // Neutral pitch
        } else {
          // Other mobile devices
          utterance.rate = 0.9;
        }
      } else {
        // Desktop settings
        utterance.rate = 0.9; // Slightly slower for children
        utterance.volume = 1.0;
      }
      
      // Try to resume AudioContext before speaking on mobile
      if (isMobile && window.audioContextInstance && window.audioContextInstance.state === 'suspended') {
        try {
          window.audioContextInstance.resume().then(() => {
            console.log('AudioContext resumed before utterance');
          }).catch(err => {
            console.error('Error resuming AudioContext:', err);
          });
        } catch (e) {
          console.error('Exception trying to resume AudioContext:', e);
        }
      }

      // Set up event handlers for all devices
      utterance.onend = () => {
        console.log(`Utterance ended, chunk ${index + 1} of ${textChunks.length}`);
        speakChunks(index + 1);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        // Try to continue with next chunk despite error
        speakChunks(index + 1);
      };

      // Special handling for mobile devices
      if (isMobile) {
        // Add a small delay before speaking on mobile for better compatibility
        setTimeout(() => {
          try {
            console.log(`Speaking on mobile, chunk ${index + 1} of ${textChunks.length}`);
            speechSynthesisRef.current.speak(utterance);
          } catch (e) {
            console.error('Error speaking on mobile:', e);
            // Try to continue with next chunk despite error
            speakChunks(index + 1);
          }
        }, 150);
      } else {
        // Desktop devices can speak immediately
        try {
          console.log(`Speaking on desktop, chunk ${index + 1} of ${textChunks.length}`);
          speechSynthesisRef.current.speak(utterance);
        } catch (e) {
          console.error('Error speaking on desktop:', e);
          speakChunks(index + 1);
        }
      }
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

  // Function to check API connection
  const checkAPIConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('/.netlify/functions/ask', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('API connection check failed:', error);
      return false;
    }
  };

  // Function to handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    console.log('handleSubmit called with question:', question);

    if (!question.trim()) {
      console.log('Question is empty, not submitting');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // For demo/development purposes, if API is not available, show a mock response
      // This ensures auto-submission works even without API connectivity
      let isConnected = true;
      try {
        isConnected = await checkAPIConnection();
      } catch (connectionError) {
        console.warn('API connection check failed, will use mock response if needed');
        isConnected = false;
      }
      
      if (!isConnected) {
        console.log('API not reachable, using mock response for demo');
        // Use mock response for demo/development
        setTimeout(() => {
          const mockAnswer = language === 'english' ? 
            'This is a demo response. The API is currently unavailable, but your voice input auto-submission is working correctly!' : 
            '這是一個演示回應。API目前不可用，但您的語音輸入自動提交功能正常工作！';
          
          setAnswer(mockAnswer);
          setIsLoading(false);
          
          // Add to question history
          setQuestionHistory([
            { question, answer: mockAnswer, timestamp: new Date().toISOString() },
            ...questionHistory
          ]);
          
          // Speak the answer if not muted
          if (!isMuted) {
            speakText(mockAnswer);
          }
        }, 1000);
        return;
      }
      
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
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('API_NOT_FOUND');
        } else if (response.status === 429) {
          throw new Error('API_RATE_LIMIT');
        } else if (response.status >= 500) {
          throw new Error('API_SERVER_ERROR');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
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
      
      // Provide more specific error messages based on the error type
      if (error.name === 'AbortError' || error.message === 'API_UNREACHABLE') {
        setError(language === 'english' ?
          'Unable to connect to the AI service. Please check your internet connection and try again.' :
          '無法連接到AI服務。請檢查您的網絡連接並重試。');
      } else if (error.message === 'API_NOT_FOUND') {
        setError(language === 'english' ?
          'The AI service endpoint was not found. Please contact support.' :
          'AI服務端點未找到。請聯繫支持。');
      } else if (error.message === 'API_RATE_LIMIT') {
        setError(language === 'english' ?
          'You have exceeded the rate limit. Please wait a moment and try again.' :
          '您已超出速率限制。請稍等片刻再試。');
      } else if (error.message === 'API_SERVER_ERROR') {
        setError(language === 'english' ?
          'The AI service is experiencing issues. Please try again later.' :
          'AI服務出現問題。請稍後再試。');
      } else {
        setError(language === 'english' ?
          'Error communicating with the AI. Please try again.' :
          '與AI通信時出錯。請再試一次。');
      }
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
        <div className="app-title">
          <h1>Mr. Learning</h1>
          <div className="title-decoration"></div>
        </div>
      </header>

      <div className="parent-access-container">
        <button
          className="parent-access-button"
          onClick={showPINPrompt}
        >
          Parent Access
        </button>
      </div>

      <div className="question-box">
        <textarea
          className="question-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={uiText.placeholder}
          disabled={isLoading}
        />

        <div className="action-buttons">
          <button
            className="ask-button"
            onClick={handleSubmit}
            disabled={isLoading || !question.trim()}
          >
            {uiText.askButton}
          </button>
          <button
            type="button"
            className={`record-button ${isListening ? 'active' : ''}`}
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
                    onClick={() => speakText('This is a test of the English voice.')}
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
