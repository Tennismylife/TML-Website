import { chromium } from 'playwright';
import crypto from 'node:crypto';

const required=['IONOS_USER','IONOS_PASSWORD','WATCHDOG_HOST'];
for(const key of required)if(!process.env[key])throw new Error(`Missing required secret: ${key}`);
const user=process.env.IONOS_USER,password=process.env.IONOS_PASSWORD;
const serverMatch=process.env.IONOS_SERVER_MATCH||process.env.WATCHDOG_HOST;
const totpSecret=(process.env.IONOS_TOTP_SECRET||'').replace(/\s+/g,'').toUpperCase();
const dryRun=String(process.env.DRY_RUN||'').toLowerCase()==='true';
const serverId='2e38e81b-5e38-4c6a-a0e3-e0c0e809ac99';

function base32Decode(s){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of s.replace(/=+$/,'')){const n=a.indexOf(c);if(n<0)throw new Error('Invalid IONOS_TOTP_SECRET');bits+=n.toString(2).padStart(5,'0')}const out=[];for(let i=0;i+8<=bits.length;i+=8)out.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(out)}
function totp(secret,offset=0){const key=base32Decode(secret),counter=Math.floor(Date.now()/1000/30)+offset,b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const h=crypto.createHmac('sha1',key).update(b).digest(),o=h[h.length-1]&15,n=(h.readUInt32BE(o)&0x7fffffff)%1000000;return String(n).padStart(6,'0')}

const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({locale:'it-IT',timezoneId:'Europe/Rome'});
let page=await context.newPage();page.setDefaultTimeout(12000);
async function firstVisible(locator){for(let i=0;i<await locator.count();i++)if(await locator.nth(i).isVisible().catch(()=>false))return locator.nth(i);return null}
async function clickText(patterns,target=page){for(const p of patterns){const loc=target.getByText(p,{exact:true});for(let i=0;i<await loc.count();i++){const el=loc.nth(i);if(await el.isVisible().catch(()=>false)){try{await el.click({timeout:5000});return true}catch{}}}}return false}
async function clickTextAcross(patterns){for(const f of page.frames())if(await clickText(patterns,f))return true;return false}
async function firstPatternAcross(patterns){for(const f of page.frames())for(const p of patterns){const el=await firstVisible(f.getByText(p,{exact:true}));if(el)return el}return null}
async function body(target=page){return(await target.locator('body').innerText().catch(()=>'' )).toLowerCase()}
async function safeDiag(target=page){let txt=(await target.locator('body').innerText().catch(()=>'' )).replaceAll(user,'***').replace(/\s+/g,' ').slice(0,1600);const buttons=await target.locator('button').allInnerTexts().catch(()=>[]);const links=await target.locator('a').allInnerTexts().catch(()=>[]);console.log('DIAG url='+target.url());console.log('DIAG buttons='+JSON.stringify(buttons.slice(0,30)));console.log('DIAG links='+JSON.stringify(links.slice(0,60)));console.log('DIAG body='+txt)}
async function tryTotp(target){
 if(!totpSecret)throw new Error('IONOS requested Authenticator code; IONOS_TOTP_SECRET missing');
 for(const offset of [0,-1,1]){
   const otp=await firstVisible(target.locator('input[autocomplete="one-time-code"],input[name="passcode"],input[inputmode="numeric"],input[type="tel"],input[name="token"]'));
   if(!otp)return true;
   console.log(`LOGIN_STEP TOTP window=${offset}`);await otp.fill(totp(totpSecret,offset));await otp.press('Enter');await target.waitForTimeout(1800);
   if(!/^login\.ionos\./i.test(new URL(target.url()).host))return true;
   if(!/codice non valido|invalid code|ungültig|incorrect code|try again|prova con uno nuovo/i.test(await body(target)))return true;
 }
 return false;
}
async function finishLogin(target,timeoutMs=120000){
 const end=Date.now()+timeoutMs;
 while(Date.now()<end){
   const url=target.url(),host=new URL(url).host;
   if(/emailconfirmation/i.test(url)){await safeDiag(target);throw new Error('IONOS requested email confirmation')}
   if(!/^login\.ionos\./i.test(host)){if(/^auth\.ionos\./i.test(host)){await target.waitForTimeout(700);continue}console.log(`LOGIN_STEP completed host=${host}`);return}
   const txt=await body(target);
   const otp=await firstVisible(target.locator('input[autocomplete="one-time-code"],input[name="passcode"],input[inputmode="numeric"],input[type="tel"],input[name="token"]'));
   if(otp&&/authenticator|two[- ]factor|2fa|codice|verification|security code|bestätigungscode|6-digit/i.test(txt)){if(await tryTotp(target)){await target.waitForTimeout(500);continue}throw new Error('IONOS rejected TOTP')}
   const pass=await firstVisible(target.locator('input[type="password"]'));
   if(pass){console.log('LOGIN_STEP password');await pass.fill(password);await pass.press('Enter');await target.waitForTimeout(1800);continue}
   const username=await firstVisible(target.locator('input#username,input[name="identifier"],input[type="email"]'));
   if(username){console.log('LOGIN_STEP username');await username.fill(user);await username.press('Enter');await target.waitForTimeout(1600);continue}
   await target.waitForTimeout(400);
 }
 await safeDiag(target);throw new Error('IONOS login timeout');
}

try{
 console.log('Opening IONOS Server & Cloud');
 await page.goto('https://my.ionos.it/server-portfolio?skipIntcpts=true',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(900);await finishLogin(page);await page.waitForTimeout(3500);
 if(/^login\.ionos\./i.test(new URL(page.url()).host))throw new Error('IONOS login returned to login host');
 const pages=context.pages();if(pages.length>1)page=pages[pages.length-1];page.setDefaultTimeout(12000);

 console.log('NAV_STEP opening known VPS detail');
 await page.goto(`https://cloudpanel.ionos.it/panel/corevps/servers/${serverId}`,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(4500);
 const detailText=await body(page);
 if(!detailText.includes(serverMatch.toLowerCase())){await safeDiag(page);throw new Error(`Known VPS detail did not verify target IP ${serverMatch}`)}
 console.log('NAV_STEP target VPS verified by IP');

 const restartPatterns=[/^riavvia$/i,/^restart$/i,/^reboot$/i,/^neustart$/i];
 let restartClicked=await clickTextAcross(restartPatterns);
 if(!restartClicked&&await clickTextAcross([/^azioni$/i,/^actions$/i,/^aktionen$/i])){await page.waitForTimeout(500);restartClicked=await clickTextAcross(restartPatterns)}
 if(!restartClicked){await safeDiag(page);throw new Error('Restart action not found')}
 console.log('NAV_STEP restart action opened');await page.waitForTimeout(900);
 const confirm=await firstPatternAcross([/^sì$/i,/^si$/i,/^yes$/i,/^ja$/i,/^confirm$/i,/^conferma$/i]);
 if(!confirm){await safeDiag(page);throw new Error('Restart confirmation dialog not detected')}
 if(dryRun)console.log('DRY RUN OK: reached Restart confirmation; no reboot sent.');
 else{await confirm.click({timeout:5000});console.log('IONOS restart request submitted.')}
}finally{await browser.close()}
