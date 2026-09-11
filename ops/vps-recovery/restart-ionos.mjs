import { chromium } from 'playwright';
import crypto from 'node:crypto';

const required = ['IONOS_USER', 'IONOS_PASSWORD', 'WATCHDOG_HOST'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing required secret: ${key}`);
const user = process.env.IONOS_USER, password = process.env.IONOS_PASSWORD;
const serverMatch = process.env.IONOS_SERVER_MATCH || process.env.WATCHDOG_HOST;
const totpSecret = (process.env.IONOS_TOTP_SECRET || '').replace(/\s+/g, '').toUpperCase();
const dryRun = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

function base32Decode(s){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of s.replace(/=+$/,'')){const n=a.indexOf(c);if(n<0)throw new Error('Invalid IONOS_TOTP_SECRET');bits+=n.toString(2).padStart(5,'0')}const out=[];for(let i=0;i+8<=bits.length;i+=8)out.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(out)}
function totp(secret){const key=base32Decode(secret),counter=Math.floor(Date.now()/1000/30),b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const h=crypto.createHmac('sha1',key).update(b).digest(),o=h[h.length-1]&15,n=(h.readUInt32BE(o)&0x7fffffff)%1000000;return String(n).padStart(6,'0')}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:'en-US',timezoneId:'Europe/Rome'});
let page=await context.newPage(); page.setDefaultTimeout(20000);
async function firstVisible(locator){for(let i=0;i<await locator.count();i++)if(await locator.nth(i).isVisible().catch(()=>false))return locator.nth(i);return null}
async function clickText(patterns,target=page){for(const p of patterns){const loc=target.getByText(p,{exact:false});for(let i=0;i<await loc.count();i++){const el=loc.nth(i);if(await el.isVisible().catch(()=>false)){try{await el.click();return true}catch{}}}}return false}
async function clickSubmit(target=page){const el=await firstVisible(target.locator('button[type="submit"],input[type="submit"]'));if(!el)return false;try{await el.click();return true}catch{return false}}
async function body(target=page){return (await target.locator('body').innerText().catch(()=>'' )).toLowerCase()}
async function waitForPassword(target=page,ms=6000){const end=Date.now()+ms;while(Date.now()<end){const p=await firstVisible(target.locator('input[type="password"]'));if(p)return p;for(const f of target.frames()){const q=await firstVisible(f.locator('input[type="password"]')).catch(()=>null);if(q)return q}await target.waitForTimeout(350)}return null}
async function safeDiag(target=page){const title=await target.title().catch(()=>''),url=target.url();let txt=(await target.locator('body').innerText().catch(()=>'' )).replaceAll(user,'***').replace(/\s+/g,' ').slice(0,1000);const inputs=await target.locator('input').evaluateAll(es=>es.map(e=>({type:e.type,name:e.name,id:e.id,autocomplete:e.autocomplete,placeholder:e.placeholder}))).catch(()=>[]);const buttons=await target.locator('button').allInnerTexts().catch(()=>[]);console.log('LOGIN_DIAG url='+url);console.log('LOGIN_DIAG title='+title);console.log('LOGIN_DIAG inputs='+JSON.stringify(inputs));console.log('LOGIN_DIAG buttons='+JSON.stringify(buttons.slice(0,15)));console.log('LOGIN_DIAG body='+txt)}
async function fillTotpIfNeeded(target=page){const t=await body(target);const otp=await firstVisible(target.locator('input[autocomplete="one-time-code"],input[name="passcode"],input[inputmode="numeric"],input[type="tel"]'));if(!otp && !/authenticator|two[- ]factor|2fa|codice di verifica|security code|bestätigungscode|6-digit code/.test(t))return false;if(!totpSecret)throw new Error('IONOS requested Authenticator code; add IONOS_TOTP_SECRET to GitHub Secrets');if(!otp)throw new Error('IONOS Authenticator field not found');await otp.fill(totp(totpSecret));if(!(await clickSubmit(target))&&!(await clickText([/^next$/i,/^continue$/i,/^verify$/i,/^confirm$/i,/^bestätigen$/i,/^conferma$/i],target)))await otp.press('Enter');await target.waitForTimeout(2500);return true}

try{
 console.log('Opening normal IONOS account login');
 await page.goto('https://login.ionos.com/',{waitUntil:'domcontentloaded',timeout:45000});
 const u=await firstVisible(page.locator('input[type="text"],input[type="email"],input:not([type])')); if(!u)throw new Error('IONOS account username field not found');
 await u.fill(user);
 if(!(await clickSubmit(page))&&!(await clickText([/^next$/i,/^continue$/i,/^weiter$/i,/^avanti$/i])))await u.press('Enter');
 await page.waitForTimeout(1200);

 // IONOS may request TOTP before the password on a new GitHub runner.
 await fillTotpIfNeeded(page);
 let p=await waitForPassword(page,5000);
 if(p){
   await p.fill(password);
   if(!(await clickSubmit(page))&&!(await clickText([/^next$/i,/^log\s*in$/i,/^sign\s*in$/i,/^anmelden$/i,/^accedi$/i])))await p.press('Enter');
   await page.waitForTimeout(2200);
   await fillTotpIfNeeded(page);
 }
 await page.waitForTimeout(1800);
 let t=await body(page);
 if(/invalid|incorrect|wrong password|login failed|anmeldung fehlgeschlagen|credenziali.*non valide/.test(t)){await safeDiag(page);throw new Error('IONOS account login failed')}
 if(/emailconfirmation/.test(page.url())){await safeDiag(page);throw new Error('IONOS still requested email confirmation instead of Authenticator')}
 if(/\/totp/.test(page.url()) || await firstVisible(page.locator('input[name="passcode"],input[autocomplete="one-time-code"]'))){await safeDiag(page);throw new Error('IONOS Authenticator step was not completed')}
 console.log(`IONOS account login accepted; current host=${new URL(page.url()).host}`);

 console.log('Opening Server & Cloud from IONOS account');
 let opened=await clickText([/server\s*&\s*cloud/i,/servers\s*&\s*cloud/i]);
 if(!opened){await clickText([/^menu$/i,/menu/i]);await page.waitForTimeout(700);opened=await clickText([/server\s*&\s*cloud/i,/servers\s*&\s*cloud/i])}
 if(!opened){await page.goto('https://my.ionos.com/',{waitUntil:'domcontentloaded',timeout:45000}).catch(()=>{});await page.waitForTimeout(1800);opened=await clickText([/server\s*&\s*cloud/i,/servers\s*&\s*cloud/i]);if(!opened){await clickText([/^menu$/i,/menu/i]);await page.waitForTimeout(500);opened=await clickText([/server\s*&\s*cloud/i,/servers\s*&\s*cloud/i])}}
 if(!opened){await safeDiag(page);throw new Error(`Server & Cloud entry not found after account login; host=${new URL(page.url()).host}`)}
 await page.waitForTimeout(5000);const pages=context.pages();if(pages.length>1)page=pages[pages.length-1];page.setDefaultTimeout(20000);console.log(`Server & Cloud opened; current host=${new URL(page.url()).host}`);

 let server=await firstVisible(page.getByText(serverMatch,{exact:false}));
 if(!server){await clickText([/^servers$/i,/^server$/i,/infrastructure/i],page);await page.waitForTimeout(1800);server=await firstVisible(page.getByText(serverMatch,{exact:false}))}
 if(!server){await safeDiag(page);throw new Error(`Target server not found using IP match ${serverMatch}; host=${new URL(page.url()).host}`)}
 await server.click();await page.waitForTimeout(1200);
 if(!(await clickText([/^actions$/i,/^aktionen$/i,/^azioni$/i],page)))throw new Error('Actions menu not found');
 if(!(await clickText([/^restart$/i,/^reboot$/i,/^riavvia/i,/^neustart/i],page)))throw new Error('Restart action not found');
 await page.waitForTimeout(700);
 if(dryRun)console.log('DRY RUN OK: reached Restart confirmation; no reboot sent.');
 else{if(!(await clickText([/^yes$/i,/^ja$/i,/^sì$/i,/^si$/i,/^confirm$/i,/^conferma$/i],page)))throw new Error('Restart confirmation not found');console.log('IONOS restart request submitted.')}
}finally{await browser.close()}
