/**
 * Mobile Compatibility Helper for Mr. Learning
 * This script helps improve voice recognition on mobile devices
 */

// Check if the device is mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Additional mobile-specific initialization
function initMobileSupport() {
    if (isMobile) {
        console.log('Mobile device detected, applying mobile-specific optimizations');
        
        // Fix for iOS Safari which requires user interaction before audio can start
        document.addEventListener('touchstart', function() {
            // Create and immediately stop an audio context to unlock audio on iOS
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const audioContext = new AudioContext();
                // Create and immediately stop a silent oscillator
                const oscillator = audioContext.createOscillator();
                oscillator.connect(audioContext.destination);
                oscillator.start();
                oscillator.stop();
                
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
            }
        }, { once: true });
        
        // Add a visible indicator for microphone permissions
        const permissionIndicator = document.createElement('div');
        permissionIndicator.className = 'permission-indicator';
        permissionIndicator.style.position = 'fixed';
        permissionIndicator.style.bottom = '10px';
        permissionIndicator.style.left = '10px';
        permissionIndicator.style.padding = '5px 10px';
        permissionIndicator.style.backgroundColor = 'rgba(0,0,0,0.5)';
        permissionIndicator.style.color = 'white';
        permissionIndicator.style.borderRadius = '15px';
        permissionIndicator.style.fontSize = '12px';
        permissionIndicator.style.zIndex = '1000';
        permissionIndicator.textContent = 'Mic: Not granted';
        document.body.appendChild(permissionIndicator);
        
        // Update the indicator when permission is granted
        navigator.permissions?.query({ name: 'microphone' })
            .then(permissionStatus => {
                updatePermissionIndicator(permissionStatus.state);
                
                permissionStatus.onchange = () => {
                    updatePermissionIndicator(permissionStatus.state);
                };
            })
            .catch(error => {
                console.log('Permission API not supported:', error);
            });
    }
}

// Update the permission indicator
function updatePermissionIndicator(state) {
    const indicator = document.querySelector('.permission-indicator');
    if (!indicator) return;
    
    if (state === 'granted') {
        indicator.textContent = 'Mic: Granted';
        indicator.style.backgroundColor = 'rgba(0,200,0,0.5)';
    } else if (state === 'denied') {
        indicator.textContent = 'Mic: Denied';
        indicator.style.backgroundColor = 'rgba(200,0,0,0.5)';
    } else {
        indicator.textContent = 'Mic: Not granted';
        indicator.style.backgroundColor = 'rgba(0,0,0,0.5)';
    }
}

// Fix for Safari's SpeechRecognition issues
function fixSafariSpeechRecognition() {
    if (!window.SpeechRecognition && window.webkitSpeechRecognition) {
        // Safari needs special handling for speech recognition
        const originalInitFunction = window.initializeSpeechRecognition;
        
        if (originalInitFunction) {
            window.initializeSpeechRecognition = function() {
                const result = originalInitFunction();
                
                if (result && recognition) {
                    // Add additional Safari-specific settings
                    recognition.continuous = false;
                    recognition.interimResults = false;
                    
                    // Add a backup timeout in case onend doesn't fire (happens in Safari)
                    const originalStart = recognition.start;
                    recognition.start = function() {
                        originalStart.apply(this);
                        
                        // Set a timeout to stop recognition if it gets stuck
                        setTimeout(() => {
                            if (isListening) {
                                console.log('Safari timeout: forcing recognition to stop');
                                recognition.stop();
                            }
                        }, 10000); // 10 second timeout
                    };
                }
                
                return result;
            };
        }
    }
}

// Initialize when the page loads
window.addEventListener('DOMContentLoaded', function() {
    initMobileSupport();
    fixSafariSpeechRecognition();
    
    // Add a message about HTTPS requirement
    if (window.location.protocol !== 'https:' && 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1') {
        
        const httpsWarning = document.createElement('div');
        httpsWarning.style.position = 'fixed';
        httpsWarning.style.top = '0';
        httpsWarning.style.left = '0';
        httpsWarning.style.right = '0';
        httpsWarning.style.padding = '5px';
        httpsWarning.style.backgroundColor = '#ffcc00';
        httpsWarning.style.color = '#333';
        httpsWarning.style.textAlign = 'center';
        httpsWarning.style.fontSize = '12px';
        httpsWarning.style.zIndex = '9999';
        httpsWarning.textContent = 'Voice recognition requires HTTPS. Some features may not work.';
        document.body.appendChild(httpsWarning);
    }
});
