const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async ()=>{
  const src = path.join(process.cwd(), 'public', 'blog img', 'Alcaraz AO 2026.png');
  const outDir = path.join(process.cwd(), 'public', 'blog', 'img');
  if(!fs.existsSync(src)){
    console.error('Source image not found:', src);
    process.exit(1);
  }
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const base = 'alcaraz-ao-2026-800';
  const jpgOut = path.join(outDir, base + '.jpg');
  const webpOut = path.join(outDir, base + '.webp');
  try{
    await sharp(src)
      .resize({ width: 800 })
      .jpeg({ quality: 70, mozjpeg: true })
      .toFile(jpgOut);
    console.log('Wrote', jpgOut);

    await sharp(src)
      .resize({ width: 800 })
      .webp({ quality: 70 })
      .toFile(webpOut);
    console.log('Wrote', webpOut);
  }catch(e){
    console.error('sharp error', e);
    process.exit(1);
  }
})();