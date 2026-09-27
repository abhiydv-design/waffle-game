# Waffle Morning

A web-based waffle-making game controlled by hand gestures, voice commands, mouse, or touch.

## How to play

Each round a customer places an order. Complete four stages to serve it:

1. **Ingredients:** add all 7 ingredients to the bowl (tap or drag, pinch and gesture, or say the name).
2. **Mixing:** stir in circles with your index finger, or drag circles inside the bowl.
3. **Cooking:** pour the batter, close the lid, and open it while the needle is in the golden zone. Open too early and it's pale; too late and it burns.
4. **Toppings:** add exactly what's on the order ticket, then serve.

You're scored out of 3 stars based on how well the waffle is cooked, how many batches you burnt, and wrong toppings. Your best score is saved in the browser.

## Features

- Seven customer orders, each matching a finished-waffle illustration
- Illustrated ingredient, mixing, cooking and topping stages
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
