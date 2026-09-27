# Waffle Morning

A web-based waffle-making game controlled by hand gestures, voice commands, mouse, or touch.

## Features

- Illustrated ingredient-selection and batter-mixing stages
- MediaPipe hand and index-finger gesture tracking
- Multilingual ingredient voice recognition
- Mouse and touch fallback controls
- Responsive desktop and tablet layout
- Data-driven bowl and mixing states

## Run

```bash
npm install
npm run dev
```

Camera hand tracking uses MediaPipe Gesture Recognizer. Voice commands use the browser Web Speech API; Chrome or Edge is recommended. Camera and microphone access require HTTPS in production (localhost is allowed during development).

## Production build

```bash
npm run build
```

The generated site is written to `dist/` and can be deployed to Vercel as a Vite application.
