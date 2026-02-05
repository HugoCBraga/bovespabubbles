# BubbleBovespa

Visualização interativa dos maiores papéis da B3 em formato de bolhas, com dados reais e atualização automática/manual.

## Funcionalidades
- Backend Fastify integrado à brapi.dev para dados reais das ações brasileiras
- Frontend React com visualização D3.js Canvas das bolhas
- Logos dos tickers nas bolhas
- Cores e glow conforme variação
- Botão de atualização manual com UX profissional (tooltip, countdown)
- Atualização automática dos dados

## Requisitos
- Node.js 18+
- Chave de API da brapi.dev (crie uma conta gratuita)

## Instalação
1. Clone o repositório:
	```sh
	git clone https://github.com/HugoCBraga/bovespabubbles.git
	cd bovespabubbles
	```
2. Configure a chave da API:
	- Vá para `backend/`
	- Copie `.env.example` para `.env` e preencha sua chave:
	  ```sh
	  cp backend/.env.example backend/.env
	  # Edite backend/.env e insira sua BRAPI_TOKEN
	  ```
3. Instale as dependências:
	```sh
	cd backend && npm install
	cd ../frontend && npm install
	```

## Como rodar
1. Inicie o backend:
	```sh
	cd backend
	npm start
	# O backend roda em http://localhost:3001
	```
2. Inicie o frontend:
	```sh
	cd frontend
	npm start
	# O frontend roda em http://localhost:3000
	```

## Segurança
- Nunca compartilhe sua chave da API publicamente.
- O arquivo `backend/.env` está no `.gitignore` e não será enviado ao GitHub.

## Estrutura do Projeto
- `backend/`: Servidor Fastify, integração com brapi.dev
- `frontend/`: Aplicação React, visualização das bolhas

## Observações
- Para dados reais, é obrigatório configurar a chave da brapi.dev.
- O projeto foi desenvolvido para fins educacionais e de visualização.

---

Dúvidas ou sugestões? Abra uma issue no GitHub!
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