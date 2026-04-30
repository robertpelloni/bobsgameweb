// Passenger-friendly entrypoint for DreamHost-style Node hosting.
//
// On hosts that expect an `app.js` startup file for the Node application,
// this file simply boots the existing Socket.io server implementation.
// The server itself listens on `process.env.PORT` when provided.

import './index.js';
