// Try visible verification checkboxes; image, audio and drag puzzles need a browser agent.
const PROMPT = /\bcaptcha\b|are you (?:a )?(?:person|human|robot)|(?:verify|confirm).{0,30}(?:human|not a robot)|(?:i.m|i am) (?:human|not a robot)|unusual traffic|security (?:check|verification)|press (?:and|&) hold|access denied/i;

function isChallengeFrame(url) {
  try {
    const { hostname, pathname } = new URL(url);
    return (((hostname === 'www.google.com' || hostname === 'www.recaptcha.net' || hostname === 'recaptcha.google.com') && pathname.includes('/recaptcha/')) ||
      hostname === 'hcaptcha.com' || hostname.endsWith('.hcaptcha.com') || hostname === 'challenges.cloudflare.com');
  } catch { return false; }
}

async function inspectCaptcha(page) {
  // An unreadable page may be navigating after verification. Don't call it cleared yet.
  const text = await page.innerText('body', { timeout: 2000 }).catch(() => null);
  let blocked = text === null || !text.trim() || PROMPT.test(text.slice(0, 1500)) || /\/(?:captcha|challenge|sorry)(?:[/.?]|$)/i.test(page.url());
  let checkbox = null;
  for (const frame of page.frames()) {
    const main = frame === page.mainFrame();
    if (!main && !isChallengeFrame(frame.url())) continue;
    try {
      if (!main && !await (await frame.frameElement()).isVisible()) continue;
      const boxes = main
        ? frame.getByRole('checkbox', { name: /(?:i.m|i am) not a robot|(?:verify|confirm).{0,30}human|i am human/i })
        : frame.getByRole('checkbox');
      let checked = false;
      for (const box of await boxes.all()) {
        if (!await box.isVisible()) continue;
        if (await box.isChecked()) checked = true;
        else { blocked = true; checkbox ||= box; }
      }
      // A visible challenge frame stays blocked until it disappears or reports success.
      if (!main && !checked) {
        const body = await frame.innerText('body', { timeout: 2000 });
        const widgetURL = new URL(frame.url());
        // Invisible-mode badges can remain on ordinary results pages without a challenge.
        const badge = /\/anchor$/.test(widgetURL.pathname) || /[?#&]frame=checkbox(?:&|$)/.test(widgetURL.href);
        if (PROMPT.test(body) || (!badge && !/^(?:success!?|verification (?:complete|successful)[.!]?)$/i.test(body.trim()))) blocked = true;
      }
    } catch {
      // Widgets can detach while navigating. Check again on the next poll.
      blocked = true;
    }
  }
  return { blocked, checkbox, text };
}

async function handleCaptcha(page, { headed = false, autoTimeoutMs = 15000, manualTimeoutMs = 180000, pollMs = 1000 } = {}) {
  let state = await inspectCaptcha(page);
  if (!state.blocked) return { detected: false, cleared: true, attempted: false };
  let attempted = false;
  const deadline = Date.now() + autoTimeoutMs;
  while (state.blocked && Date.now() < deadline) {
    if (state.checkbox && !attempted) {
      attempted = true;
      // Use the normal widget UI once. A click alone does not mean verification succeeded.
      await state.checkbox.click({ timeout: Math.min(3000, Math.max(1, deadline - Date.now())) }).catch(() => {});
    }
    await page.waitForTimeout(Math.min(pollMs, Math.max(0, deadline - Date.now())));
    state = await inspectCaptcha(page);
  }
  if (state.blocked && headed) {
    console.error(`CAPTCHA at ${new URL(page.url()).hostname} still needs attention. Solve it in the open browser; waiting up to 3 minutes.`);
    const manualDeadline = Date.now() + manualTimeoutMs;
    while (state.blocked && Date.now() < manualDeadline) {
      await page.waitForTimeout(Math.min(pollMs, Math.max(0, manualDeadline - Date.now())));
      state = await inspectCaptcha(page);
    }
  }
  return { detected: true, cleared: !state.blocked, attempted };
}

module.exports = { inspectCaptcha, handleCaptcha };
