# Bubble Bovespa

A web application inspired by cryptobubbles.net, visualizing B3 (Brazilian Stock Exchange) stocks as interactive bubbles.

## Features

- Real-time stock data from Yahoo Finance
- Bubble size based on market capitalization
- Color coding based on price change percentage
- Interactive tooltips
- Auto-refresh every 60 seconds

## Tech Stack

- **Backend**: Node.js, TypeScript, Fastify, yahoo-finance2
- **Frontend**: React, TypeScript, D3.js, HTML Canvas

## Setup

### Backend

1. Navigate to `backend/` directory
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Start: `npm start` (production) or `npm run dev` (development)

### Frontend

1. Navigate to `frontend/` directory
2. Install dependencies: `npm install`
3. Start: `npm start`

The frontend will proxy API requests to the backend running on port 3001.

## API

- `GET /stocks`: Returns an array of stock data

## License

MIT