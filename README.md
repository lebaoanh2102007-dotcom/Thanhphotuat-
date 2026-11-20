# Thành Phố Tuất RP — Alpha 0.1 (prototype)

Prototype multiplayer browser game: third-person primitive avatars, generated city blocks, job selection, live position sync and chat.

## Run locally
1. Install Node.js 18+.
2. In this folder: `npm install`
3. Run: `npm start`
4. Open `http://localhost:3000`.
5. To test multiplayer on the same computer, open multiple browser tabs. For friends on other networks, deploy this folder to a Node hosting provider with WebSocket support (Render/Railway/Fly/etc.) and share the deployed URL.

## Controls
- WASD: move
- Shift: sprint
- Drag mouse: rotate camera
- Enter: focus chat; send with button
- Mobile: joystick + Run button

## Important
This is a prototype, not production-ready: no authentication, persistent database, moderation, anti-cheat, optimized 3D assets, vehicles, missions, or secure economy yet. Character models are primitive placeholders. Server state resets when server restarts.
