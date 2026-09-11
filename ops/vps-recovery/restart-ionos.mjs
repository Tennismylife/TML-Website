import { chromium } from 'playwright';
import crypto from 'node:crypto';

const required = ['IONOS_USER', 'IONOS_PASSWORD', 'WATCHDOG_HOST'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing required secret: ${key}`);

const user = process.env.IONOS_USER;
const password = process.env.IONOS_PASSWORD;
const serverMatch = process.env.IONOS_SERVER_MATCH || process.env.WATCHDOG_HOST;
const totpSecret = (process.env.IONOS_TOTP_SECRET || '').replace(/\s+/g, '').toUpperCase();
const dryRun = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

function base32Decode(s) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of s.replace(/=+$/,'')) bits += alphabet.indexOf(c).toString(2).padStart(5,'0');
  const out=[]; for(let i=0;i+8<=bits.length;i+=8) out.push(parseInt(bits.slice(i,i+8),2));
  return Buffer.from(out);
}
function totp(secret) {
  const key=base32Decode(secret), counter=Math.floor(Date.now()/1000/30);
  const b=Buffer.alloc(8); b.writeBigUInt64BE(BigInt(counter));
  const h=crypto.createHmac('sha1',key).update(b).digest(); const o=h[h.length-1]&15;
  const n=(h.readUInt32BE(o)&0x7fffffff)%1000000; return String(n).padStart(6,'0');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Europe/Rome' });
const page = await context.newPage();
page.setDefaultTimeout(20000);

async function firstVisible(locator) {
  for (let i=0;i<await locator.count();i++) if (await locator.nth(i).isVisible().catch(()=>false)) return locator.nth(i);
  return null;
}
async function clickText(patterns) {
  for (const p of patterns) { const el=await firstVisible(page.getByText(p,{exact:false})); if(el){ try{await el.click(); return true;}catch{} } }
  return false;
}
async function text(){ return (await page.locator('body').innerText().catch(()=>'' )).toLowerCase(); }

try {
  console.log('Opening IONOS Cloud Panel');
  await page.goto('https://cloudpanel.ionos.com/login', { waitUntil:'domcontentloaded', timeout:45000 });
  const u=await firstVisible(page.locator('input[type="text"],input[type="email"],input:not([type])'));
  if(!u) throw new Error('IONOS username field not found');
  await u.fill(user);
  let p=await firstVisible(page.locator('input[type="password"]'));
  if(!p){ await u.press('Enter'); await page.waitForTimeout(1200); p=await firstVisible(page.locator('input[type="password"]')); }
  if(!p) throw new Error('IONOS password field not found');
  await p.fill(password); if(!(await clickText([/log\s*in/i,/sign\s*in/i,/anmelden/i,/accedi/i]))) await p.press('Enter');
  await page.waitForTimeout(2500);

  let body=await text();
  if(/verification code|authenticator|two[- ]factor|2fa|codice di verifica|security code/.test(body)) {
    if(!totpSecret) throw new Error('IONOS requested 2FA; add IONOS_TOTP_SECRET to GitHub Secrets');
    const code=totp(totpSecret);
    const otp=await firstVisible(page.locator('input[autocomplete="one-time-code"],input[inputmode="numeric"],input[type="tel"],input[type="text"]'));
    if(!otp) throw new Error('IONOS 2FA field not found');
    await otp.fill(code); if(!(await clickText([/continue/i,/verify/i,/confirm/i,/bestätigen/i,/conferma/i]))) await otp.press('Enter');
    await page.waitForTimeout(2500); body=await text();
  }
  if(/invalid|incorrect|wrong password|login failed|anmeldung fehlgeschlagen|credenziali.*non valide/.test(body)) throw new Error('IONOS Cloud Panel login failed');

  console.log('Login accepted; locating server by configured match');
  let server=await firstVisible(page.getByText(serverMatch,{exact:false}));
  if(!server){ await clickText([/^servers$/i,/^server$/i]); await page.waitForTimeout(1500); server=await firstVisible(page.getByText(serverMatch,{exact:false})); }
  if(!server) throw new Error(`Target server not found using match: ${serverMatch}`);
  await server.click(); await page.waitForTimeout(1200);
  if(!(await clickText([/^actions$/i,/^aktionen$/i,/^azioni$/i]))) throw new Error('Actions menu not found');
  if(!(await clickText([/^restart$/i,/^reboot$/i,/^riavvia/i,/^neustart/i]))) throw new Error('Restart action not found');
  await page.waitForTimeout(700);
  if(dryRun) console.log('DRY RUN OK: reached Restart confirmation; no reboot sent.');
  else {
    if(!(await clickText([/^yes$/i,/^ja$/i,/^sì$/i,/^si$/i,/^confirm$/i,/^conferma$/i]))) throw new Error('Restart confirmation not found');
    console.log('IONOS restart request submitted.');
  }
} finally { await browser.close(); }
