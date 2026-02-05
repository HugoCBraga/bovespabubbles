# Backend BubbleBovespa

## Configuração da chave da API

1. Copie o arquivo `.env.example` para `.env`:
   
   ```sh
   cp .env.example .env
   ```

2. Preencha o valor de `BRAPI_TOKEN` com sua chave da brapi.dev.

3. O arquivo `.env` está no `.gitignore` e não será enviado ao GitHub.

## Segurança
- Nunca compartilhe sua chave da API publicamente.
- Gere uma nova chave na brapi.dev se a anterior foi exposta.
