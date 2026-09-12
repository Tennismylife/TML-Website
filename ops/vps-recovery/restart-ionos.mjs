import { chromium } from 'playwright';
import crypto from 'node:crypto';

const required = ['IONOS_USER', 'IONOS_PASSWORD', 'WATCHDOG_HOST'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing required secret: ${key}`);
const user = process.env.IONOS_USER, password = process.env.IONOS_PASSWORD;
const serverMatch = process.env.IONOS_SERVER_MATCH || process.env.WATCHDOG_HOST;
const totpSecret = (process.env.IONOS_TOTP_SECRET || '').replace(/\s+/g, '').toUpperCase();
const dryRun = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

function base32Decode(s){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of s.replace(/=+$/,'')){const n=a.indexOf(c);if(n<0)throw new Error('Invalid IONOS_TOTP_SECRET');bits+=n.toString(2).padStart(5,'0')}const out=[];for(let i=0;i+8<=bits.length;i+=8)out.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(out)}
function totp(secret,offsetSteps=0){const key=base32Decode(secret),counter=Math.floor(Date.now()/1000/30)+offsetSteps,b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const h=crypto.createHmac('sha1',key).update(b).digest(),o=h[h.length-1]&15,n=(h.readUInt32BE(o)&0x7fffffff)%1000000;return String(n).padStart(6,'0')}
function secretFingerprint(secret){return crypto.createHash('sha256').update(secret).digest('hex').slice(0,12)}

const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({locale:'it-IT',timezoneId:'Europe/Rome'});
let page=await context.newPage(); page.setDefaultTimeout(12000);
async function firstVisible(locator){for(let i=0;i<await locator.count();i++)if(await locator.nth(i).isVisible().catch(()=>false))return locator.nth(i);return null}
async function clickText(patterns,target=page){for(const p of patterns){const loc=target.getByText(p,{exact:false});for(let i=0;i<await loc.count();i++){const el=loc.nth(i);if(await el.isVisible().catch(()=>false)){try{await el.click({timeout:5000});return true}catch{}}}}return false}
async function clickTextAcross(patterns){for(const f of page.frames()){if(await clickText(patterns,f))return true}return false}
async function firstTextAcross(text){for(const f of page.frames()){const el=await firstVisible(f.getByText(text,{exact:false}));if(el)return el}return null}
async function firstPatternAcross(patterns){for(const f of page.frames()){for(const p of patterns){const loc=f.getByText(p,{exact:true});const el=await firstVisible(loc);if(el)return el}}return null}
async function body(target=page){return (await target.locator('body').innerText().catch(()=>'' )).toLowerCase()}
async function safeDiag(target=page){const title=await target.title().catch(()=>''),url=target.url();let txt=(await target.locator('body').innerText().catch(()=>'' )).replaceAll(user,'***').replace(/\s+/g,' ').slice(0,1800);const inputs=await target.locator('input').evaluateAll(es=>es.map(e=>({type:e.type,name:e.name,id:e.id,autocomplete:e.autocomplete,placeholder:e.placeholder}))).catch(()=>[]);const buttons=await target.locator('button').allInnerTexts().catch(()=>[]);const links=await target.locator('a').evaluateAll(es=>es.slice(0,60).map(e=>({text:(e.innerText||'').trim().replace(/\s+/g,' ').slice(0,100),href:e.href}))).catch(()=>[]);console.log('LOGIN_DIAG url='+url);console.log('LOGIN_DIAG title='+title);console.log('LOGIN_DIAG inputs='+JSON.stringify(inputs));console.log('LOGIN_DIAG buttons='+JSON.stringify(buttons.slice(0,30)));console.log('LOGIN_DIAG links='+JSON.stringify(links));console.log('LOGIN_DIAG body='+txt);console.log('FRAME_DIAG '+JSON.stringify(target.frames().map(f=>f.url())))}
async function tryTotpWindow(target){
 if(!totpSecret)throw new Error('IONOS requested Authenticator code; add IONOS_TOTP_SECRET to GitHub Secrets');
 const candidates=[0,-1,1];
 for(const offset of candidates){
   const otp=await firstVisible(target.locator('input[autocomplete="one-time-code"],input[name="passcode"],input[inputmode="numeric"],input[type="tel"],input[name="token"]'));
   if(!otp)return true;
   console.log(`LOGIN_STEP TOTP window=${offset}`);
   await otp.fill(totp(totpSecret,offset));
   await otp.press('Enter');
   await target.waitForTimeout(1800);
   if(!/^login\.ionos\./i.test(new URL(target.url()).host))return true;
   const txt=await body(target);
   if(!/codice non valido|invalid code|ungâ”œâ•ltig|incorrect code|try again|prova con uno nuovo/i.test(txt))return true;
 }
 return false;
}
async function finishIonosLogin(target=page,timeoutMs=120000){
 const end=Date.now()+timeoutMs; let lastAction='';
 while(Date.now()<end){
   const url=target.url(); const host=new URL(url).host;
   if(/emailconfirmation/i.test(url)){await safeDiag(target);throw new Error('IONOS requested email confirmation instead of Authenticator')}
   if(!/^login\.ionos\./i.test(host)){
     if(/^auth\.ionos\./i.test(host)){await target.waitForTimeout(700);continue}
     console.log(`LOGIN_STEP completed host=${host}`);
     return;
   }
   const txt=await body(target);
   const otp=await firstVisible(target.locator('input[autocomplete="one-time-code"],input[name="passcode"],input[inputmode="numeric"],input[type="tel"],input[name="token"]'));
   if(otp && /authenticator|two[- ]factor|2fa|codice|verification|security code|bestâ”œÃ±tigungscode|6-digit/i.test(txt)){
     lastAction='TOTP';
     if(await tryTotpWindow(target)){await target.waitForTimeout(500);continue}
     await safeDiag(target);throw new Error('IONOS rejected current/previous/next TOTP window');
   }
   const pass=await firstVisible(target.locator('input[type="password"]'));
   if(pass){console.log('LOGIN_STEP password');await pass.fill(password);await pass.press('Enter');lastAction='password';await target.waitForTimeout(1800);continue}
   const username=await firstVisible(target.locator('input#username,input[name="identifier"],input[type="email"]'));
   if(username){console.log('LOGIN_STEP username');await username.fill(user);await username.press('Enter');lastAction='username';await target.waitForTimeout(1600);continue}
   await target.waitForTimeout(400);
 }
 await safeDiag(target);throw new Error(`IONOS login did not leave login host after ${lastAction || 'no recognized step'}`);
}
async function selectSoleServerRadio(){
 const radios=[];
 for(const f of page.frames()){
   const loc=f.locator('input[type="radio"][name="server"]');
   for(let i=0;i<await loc.count();i++)radios.push(loc.nth(i));
 }
 console.log(`NAV_DIAG server_radio_count=${radios.length}`);
 if(radios.length!==1)return false;
 await radios[0].evaluate(el=>el.click());
 return true;
}

try{
 if(totpSecret)console.log('TOTP secret fingerprint='+secretFingerprint(totpSecret));
 console.log('Opening IONOS Server & Cloud directly');
 const serverPortfolio='https://my.ionos.it/server-portfolio?skipIntcpts=true';
 await page.goto(serverPortfolio,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(900);
 await finishIonosLogin(page);
 await page.waitForTimeout(5000);
 if(/^login\.ionos\./i.test(new URL(page.url()).host)){await safeDiag(page);throw new Error(`Server & Cloud login returned to login host=${new URL(page.url()).host}`)}
 if(/^auth\.ionos\./i.test(new URL(page.url()).host)){
   const end=Date.now()+12000;while(Date.now()<end && /^auth\.ionos\./i.test(new URL(page.url()).host))await page.waitForTimeout(500);
 }
 const pages=context.pages();if(pages.length>1)page=pages[pages.length-1];page.setDefaultTimeout(12000);
 console.log(`Server & Cloud opened; current host=${new URL(page.url()).host}`);

 console.log('NAV_STEP servers list');
 let serversLink=null;
 const linkDeadline=Date.now()+20000;
 while(!serversLink && Date.now()<linkDeadline){
   for(const f of page.frames()){
     serversLink=await firstVisible(f.locator('a[href*="/panel/corevps/servers"]'));
     if(serversLink)break;
   }
   if(!serversLink)await page.waitForTimeout(500);
 }
 if(!serversLink){await safeDiag(page);throw new Error('Servers link not found after Cloud Panel load wait')}
 await serversLink.evaluate(el=>el.click());
 await page.waitForTimeout(4500);

 if(!(await selectSoleServerRadio())){await safeDiag(page);throw new Error('Target VPS could not be uniquely selected')}
 console.log('NAV_STEP selected sole VPS row');
 await page.waitForTimeout(1800);
 if(!(await body(page)).includes(serverMatch.toLowerCase())){await safeDiag(page);throw new Error(`Selected VPS did not verify target IP ${serverMatch}`)}
 console.log('NAV_STEP target VPS verified by IP');

 const restartCount=await page.locator('a,button').evaluateAll(es=>es.filter(el=>/^(riavvia|restart|reboot|neustart)$/i.test((el.textContent||'').trim())).length);
 console.log('NAV_STEP restart_dom_count='+restartCount);
 if(restartCount<1){await safeDiag(page);throw new Error('Restart action not found')}
 await page.locator('a,button').evaluateAll(es=>{const el=es.find(x=>/^(riavvia|restart|reboot|neustart)$/i.test((x.textContent||'').trim()));if(el)el.click();});
 console.log('NAV_STEP restart action opened');
 await page.waitForTimeout(900);
 const confirm=await firstPatternAcross([/^s.$/i,/^si$/i,/^yes$/i,/^ja$/i,/^confirm$/i,/^conferma$/i]);
 if(!confirm){await safeDiag(page);throw new Error('Restart confirmation dialog not detected')}
 if(dryRun){console.log('DRY RUN OK: reached Restart confirmation; no reboot sent.');}
 else{await confirm.click({timeout:5000});console.log('IONOS restart request submitted.')}
}finally{await browser.close()}
