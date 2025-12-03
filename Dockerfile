# Usa un'immagine Node ufficiale
FROM node:18-alpine

# Installa OpenSSL e altre dipendenze necessarie
RUN apk add --no-cache openssl bash curl

# Crea e imposta la directory di lavoro
WORKDIR /app

# Copia package.json e installa le dipendenze
COPY package*.json ./
RUN npm install

# Copia il resto dei file
COPY . .

# Genera il client Prisma
RUN npx prisma generate

# Espone la porta Next.js
EXPOSE 3000

# Avvio del dev server
CMD ["npm", "run", "dev"]
