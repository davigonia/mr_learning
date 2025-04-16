# Mr. Learning - Kids Voice Learning App

A web application for kids aged 5+ to ask questions via voice input in Cantonese and receive answers from the xAI Grok API with voice output in Cantonese.

## Features

- **Voice Input in Cantonese**: Kids can ask questions by speaking Cantonese
- **Voice Output in Cantonese**: Answers are provided in spoken Cantonese
- **Child-Friendly UI**: Simple, colorful, and toy-like design
- **Parental Controls**: PIN-protected dashboard with banned words, history, and settings
- **Responsive Design**: Works on all devices (PC, Mac, iPhones, Android phones, tablets)

## Setup Instructions

### Local Setup

1. Clone or download this repository to your local machine
2. Open `index.html` in a modern web browser (Chrome recommended for best voice support)
3. Replace the API key placeholder in the JavaScript code:
   - Find the line: `const apiKey = '[USER_PROVIDED_API_KEY]';`
   - Replace with your xAI Grok API key

### Deployment

For production deployment:

1. Host the files on a secure server (e.g., Netlify, Vercel, GitHub Pages)
2. Set up environment variables for the API key instead of hardcoding it
3. Ensure the hosting service uses HTTPS (required for Web Speech API)

## Browser Compatibility

- **Best experience**: Chrome (desktop and mobile)
- **Good support**: Edge, Safari (iOS)
- **Limited support**: Firefox (voice recognition may require permissions)

## Technical Notes

- Uses Web Speech API for voice recognition and synthesis
- Cantonese language code: `yue-Hant-HK`
- Default PIN: `1234` (can be changed in parent dashboard)
- Data stored in browser's localStorage:
  - PIN
  - Banned words list
  - Question history (limited to 50 entries)

## API Integration

The application is configured to use the xAI Grok API. In the current demo version, API calls are simulated. To enable real API integration:

1. Uncomment the actual API call code in the `callGrokAPI()` function
2. Replace the API key placeholder with your actual key
3. Adjust API parameters as needed

## Security Considerations

- API key should not be hardcoded in production
- Consider implementing rate limiting for API calls
- All user data is stored locally in the browser

## License

This project is provided as-is for educational purposes.
