import { chromium } from "playwright";
import nodemailer from "nodemailer";

const URL =
  "https://lra-boeblingen.saas.smartcjm.com/m/Strassenverkehrsamt/extern/calendar/?uid=005020d0-b1d9-4f3c-8eb6-4022d0fbd760&wsid=84712d2e-b551-47a0-8ca3-538f0829b1f5&lang=de";

const SERVICE_TEXT = "Führerscheinstelle allgemein";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"]
});

try {
  const page = await browser.newPage();

  await page.goto(URL, {
    waitUntil: "networkidle",
    timeout: 60000
  });

  // -----------------------------
  // 1. Select service + increment
  // -----------------------------
  
  // wait for service list to actually appear (not just network idle)
  await page.waitForSelector(".service_selector", { timeout: 30000 });
  const serviceContainer = page
    .locator(".service_selector")
    .filter({ hasText: SERVICE_TEXT });

  await serviceContainer.waitFor({ timeout: 15000 });

  // click "+" button (increment only)
  await serviceContainer
    .locator('span.counterButton[onclick*="changecap(1"]')
    .click();

  // small wait for UI update
  await page.waitForTimeout(1000);

  // -----------------------------
  // 2. Click "Weiter"
  // -----------------------------
  await page.locator("#forward-service").click();

  // wait for next step to load
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // -----------------------------
  // 3. Check availability text
  // -----------------------------
  const holder = page.locator("#appointment_holder");
  await holder.waitFor({ timeout: 15000 });

  const text = (await holder.innerText()).toLowerCase();

  const noAppointmentPatterns = [
    "aktuell sind alle verfügbaren termine ausgebucht"
  ];

  const noAppointments = noAppointmentPatterns.some((p) =>
    text.includes(p)
  );

  if (noAppointments) {
    console.log("No appointments available.");
  } else {
    await sendEmail();
  }
} finally {
  await browser.close();
}

// -----------------------------
// Email
// -----------------------------
async function sendEmail() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_SENDER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_SENDER,
    to: process.env.NOTIFICATION_EMAIL_ADDRESS,
    subject: "🚨 Führerscheintermine in Böblingen jetzt verfügbar",
    html: `
      <p>Die Seite zeigt freie Termine an.</p>
      <p><a href="${URL}">Hier ist die Seite</a></p>
    `
  });
}