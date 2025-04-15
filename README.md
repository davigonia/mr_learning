# Mr Learning - Educational Q&A App for Kids

Mr Learning is a kid-friendly web application designed for children aged 4-12 to ask educational questions and receive answers in a fun, safe way. The application integrates with the Grok API from xAI to provide intelligent, age-appropriate responses to children's questions.

## Features

- **Kid-friendly UI**: Bright colors, large text, and simple interface designed for children.
- **Voice and Text Input**: Children can type or speak their questions.
- **Bilingual Support**: Supports both English and Cantonese.
- **Voice Output**: Reads answers aloud in a child-friendly voice.
- **Parental Controls**: PIN-protected settings for time limits, content filtering, and activity logs.
- **Error Handling**: Kid-friendly error messages and fallbacks.

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- A Grok API key from xAI

### API Key Setup

1. The app comes with a default API key in the `.env` file:
   ```
   REACT_APP_GROK_API_KEY=xai-GIZVljR8NKqZN7VLkXx1H4zTY51VViFLwpeAu1dDCz9BhpRxVPEIGMO5LqH3YVZplkVIlncCW6lqKhbK
   ```

2. **IMPORTANT**: Replace this key with your actual Grok API key before running the application.

3. If you need to verify your API key, visit https://console.x.ai

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

   This command starts both the React frontend and the Express backend server.

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## How It Works

### Grok API Integration

The application securely communicates with the Grok API through a server-side proxy to keep your API key secure. The server handles:

- Sending requests to the Grok API endpoint (https://api.x.ai/v1/chat/completions)
- Error handling for API issues
- Logging errors to a file for troubleshooting

### Voice Recognition and Text-to-Speech

- Uses the Web Speech API for speech recognition and text-to-speech
- Automatically selects appropriate voices based on the selected language

### Parental Controls

- Access the parent controls by clicking the "Parents" button at the bottom of the screen
- Default PIN: 1234
- Features include:
  - Time limits for app usage
  - Question approval toggle
  - Activity log of questions and answers

## Troubleshooting

- **API Key Issues**: If you see "Our key isn't working! Please tell an adult" error, verify your API key at https://console.x.ai
- **Voice Recognition Problems**: Ensure your browser has permission to access your microphone
- **Cantonese Support**: If Cantonese voice recognition isn't working well, try typing instead

## Deployment

To deploy the application to platforms like Netlify or Vercel:

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `build` folder to your hosting platform

3. Set up environment variables on your hosting platform for the Grok API key

4. Configure the server to handle API requests (may require serverless functions)

## Security Notes

- The API key is stored in environment variables to keep it secure
- All API calls are made server-side to prevent exposing the key in client-side code
- Input is sanitized to prevent injection attacks
- The application complies with COPPA regulations by not collecting personal information
