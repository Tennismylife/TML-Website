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
  const sizes = [400];
  try{
    for(const w of sizes){
      const base = `alcaraz-ao-2026-${w}`;
      const jpgOut = path.join(outDir, base + '.jpg');
      const webpOut = path.join(outDir, base + '.webp');
      await sharp(src)
        .resize({ width: w })
        .jpeg({ quality: 60, mozjpeg: true })
        .toFile(jpgOut);
      console.log('Wrote', jpgOut);

      await sharp(src)
        .resize({ width: w })
        .webp({ quality: 60 })
        .toFile(webpOut);
      console.log('Wrote', webpOut);
    }
  }catch(e){
    console.error('sharp error', e);
    process.exit(1);
  }
})();