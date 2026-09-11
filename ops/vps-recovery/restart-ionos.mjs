import { chromium } from 'playwright';

const required = ['IONOS_CP_USER', 'IONOS_CP_PASSWORD', 'IONOS_SERVER_LABEL'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required secret: ${key}`);
}

const user = process.env.IONOS_CP_USER;
const password = process.env.IONOS_CP_PASSWORD;
const serverLabel = process.env.IONOS_SERVER_LABEL;
const dryRun = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Europe/Rome' });
const page = await context.newPage();
page.setDefaultTimeout(20000);

async function firstVisible(locator) {
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const item = locator.nth(i);
    if (await item.isVisible().catch(() => false)) return item;
  }
  return null;
}

async function clickText(patterns) {
  for (const pattern of patterns) {
    const item = await firstVisible(page.getByText(pattern, { exact: false }));
    if (item) {
      try { await item.click(); return true; } catch {}
    }
  }
  return false;
}

async function bodyText() {
  return (await page.locator('body').innerText().catch(() => '')).toLowerCase();
}

try {
  console.log('Opening IONOS Cloud Panel login');
  await page.goto('https://cloudpanel.ionos.com/login.php', { waitUntil: 'domcontentloaded', timeout: 45000 });

  const userInput = await firstVisible(page.locator('input[type="text"], input[type="email"], input:not([type])'));
  if (!userInput) throw new Error('IONOS username field not found.');
  await userInput.fill(user);

  let passInput = await firstVisible(page.locator('input[type="password"]'));
  if (!passInput) {
    const nextClicked = await clickText([/^next$/i, /^continue$/i, /^weiter$/i, /^continua$/i, /^suivant$/i, /^continuar$/i]);
    if (!nextClicked) await userInput.press('Enter');
    await page.waitForTimeout(1200);
    passInput = await firstVisible(page.locator('input[type="password"]'));
  }
  if (!passInput) throw new Error('IONOS password field not found.');
  await passInput.fill(password);

  const loginClicked = await clickText([/log\s*in/i, /sign\s*in/i, /anmelden/i, /accedi/i, /connexion/i, /iniciar/i]);
  if (!loginClicked) await passInput.press('Enter');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(2500);

  const loginBody = await bodyText();
  if (/two[- ]factor|2fa|verification code|authenticator|bestätigungscode|codice di verifica|security code/.test(loginBody)) {
    throw new Error('Cloud Panel login requires an interactive second factor. Use a dedicated restricted Cloud Panel user without 2FA.');
  }
  if (/invalid|incorrect|wrong password|login failed|anmeldung fehlgeschlagen|credenziali.*non valide/.test(loginBody)) {
    throw new Error('IONOS Cloud Panel login failed.');
  }

  console.log('Cloud Panel login accepted; locating target server');
  let server = await firstVisible(page.getByText(serverLabel, { exact: false }));
  if (!server) {
    await clickText([/^servers$/i, /^server$/i, /^servidores$/i]);
    await page.waitForTimeout(1500);
    server = await firstVisible(page.getByText(serverLabel, { exact: false }));
  }
  if (!server) throw new Error('Target server label not found in Cloud Panel.');
  await server.click();
  await page.waitForTimeout(1200);

  const actionsOk = await clickText([/^actions$/i, /^aktionen$/i, /^azioni$/i, /^acciones$/i]);
  if (!actionsOk) throw new Error('Actions menu not found for target server.');

  const restartOk = await clickText([/^restart$/i, /^reboot$/i, /^riavvia/i, /^neustart/i, /^reiniciar/i, /^redémarrer/i]);
  if (!restartOk) throw new Error('Restart action not found.');
  await page.waitForTimeout(700);

  if (dryRun) {
    console.log('DRY RUN: login, server selection and Restart action succeeded; restart confirmation was NOT clicked.');
  } else {
    const hardware = await firstVisible(page.getByText(/hardware/i, { exact: false }));
    if (hardware) {
      try { await hardware.click(); console.log('Hardware restart selected'); } catch {}
    }
    const confirmed = await clickText([/^yes$/i, /^ja$/i, /^sì$/i, /^si$/i, /^oui$/i, /^sí$/i, /^confirm$/i, /^conferma$/i]);
    if (!confirmed) throw new Error('Restart confirmation button not found.');
    await page.waitForTimeout(1500);
    console.log('IONOS restart request submitted.');
  }
} finally {
  await browser.close();
}
