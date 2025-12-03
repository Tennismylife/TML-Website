npx prisma migrate reset --force
npx prisma generate
npm run build
npx prisma db push --force-reset
npm start