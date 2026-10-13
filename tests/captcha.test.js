// Offline tests: model widget state changes without contacting flight or CAPTCHA services.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { inspectCaptcha, handleCaptcha } = require('../skills/cheap-flight-finder/scripts/captcha');

const RECAPTCHA = 'https://www.google.com/recaptcha/api2/anchor?k=test';
const IMAGE_CHALLENGE = 'https://www.google.com/recaptcha/api2/bframe?k=test';
const FAST = { autoTimeoutMs: 25, manualTimeoutMs: 25, pollMs: 1 };

function fixture({ text = 'Flights: $250. Protected by reCAPTCHA.', url = 'https://flights.example/search', widgets = [], boxes = [] } = {}) {
  const state = { text, url, clicks: 0, waits: 0, onWait: () => {} };
  function frame(widget, main = false) {
    return {
      url: () => main ? state.url : widget.url,
      frameElement: async () => ({ isVisible: async () => widget.visible !== false }),
      innerText: async () => {
        if (widget.detached) throw new Error('Frame detached');
        return widget.text || '';
      },
      getByRole: (_, { name } = {}) => ({
        all: async () => (widget.boxes || []).filter(box => !name || name.test(box.name)).map(box => ({
          isVisible: async () => box.visible !== false,
          isChecked: async () => !!box.checked,
          click: async () => { state.clicks++; await box.onClick?.(state); },
        })),
      }),
    };
  }
  const main = frame({ boxes }, true);
  const frames = [main, ...widgets.map(widget => frame(widget))];
  state.page = {
    url: () => state.url,
    innerText: async () => {
      if (state.text === null) throw new Error('Navigation in progress');
      return state.text;
    },
    frames: () => frames,
    mainFrame: () => main,
    waitForTimeout: async ms => {
      state.waits++;
      state.onWait();
      await new Promise(resolve => setTimeout(resolve, ms));
    },
  };
  return state;
}

test('normal results, an unrelated checkbox and hidden widgets are left alone', async () => {
  const state = fixture({
    boxes: [{ name: 'Add travel insurance' }],
    widgets: [{ url: RECAPTCHA, visible: false, boxes: [{}] }],
  });
  assert.deepEqual(await handleCaptcha(state.page, FAST), { detected: false, cleared: true, attempted: false });
  assert.equal(state.clicks, 0);
  assert.equal(state.waits, 0);
});

test('visible passive CAPTCHA badges do not block normal flight results', async () => {
  const state = fixture({ widgets: [
    { url: `${RECAPTCHA}&size=invisible`, text: 'Privacy - Terms' },
    { url: 'https://newassets.hcaptcha.com/captcha/v1/test#frame=checkbox&size=invisible', text: 'Privacy - Terms' },
  ] });
  assert.equal((await handleCaptcha(state.page, FAST)).detected, false);
  assert.equal(state.clicks, 0);
});

test('a reCAPTCHA checkbox can clear automatically without leaving the search session', async () => {
  const box = { onClick: () => { box.checked = true; } };
  const state = fixture({ widgets: [{ url: RECAPTCHA, boxes: [box] }] });
  assert.deepEqual(await handleCaptcha(state.page, FAST), { detected: true, cleared: true, attempted: true });
  assert.equal(state.clicks, 1);
  assert.equal(state.url, 'https://flights.example/search');
});

test('a named verification checkbox on the page is attempted', async () => {
  const box = { name: 'Verify you are human', onClick: state => { box.checked = true; state.text = 'Flights: $250'; } };
  const state = fixture({ text: 'Verify you are human', boxes: [box] });
  assert.equal((await handleCaptcha(state.page, FAST)).cleared, true);
  assert.equal(state.clicks, 1);
});

test('a successful checkbox click followed by an image puzzle remains blocked', async () => {
  const puzzle = { url: IMAGE_CHALLENGE, visible: false, text: 'Select all images with buses' };
  const box = { onClick: () => { box.checked = true; puzzle.visible = true; } };
  const state = fixture({ widgets: [{ url: RECAPTCHA, boxes: [box] }, puzzle] });
  assert.deepEqual(await handleCaptcha(state.page, FAST), { detected: true, cleared: false, attempted: true });
  assert.equal(state.clicks, 1);
});

test('an unresponsive checkbox is clicked only once', async () => {
  const state = fixture({ widgets: [{ url: RECAPTCHA, boxes: [{}] }] });
  assert.equal((await handleCaptcha(state.page, FAST)).cleared, false);
  assert.equal(state.clicks, 1);
});

test('a failed click preserves blocked status instead of failing the search', async () => {
  const box = { onClick: () => { throw new Error('Not actionable'); } };
  const state = fixture({ widgets: [{ url: RECAPTCHA, boxes: [box] }] });
  assert.deepEqual(await handleCaptcha(state.page, FAST), { detected: true, cleared: false, attempted: true });
  assert.equal(state.clicks, 1);
});

test('unsupported challenges time out without random clicks', async () => {
  const state = fixture({ text: 'Press and hold to continue' });
  assert.deepEqual(await handleCaptcha(state.page, FAST), { detected: true, cleared: false, attempted: false });
  assert.equal(state.clicks, 0);
});

test('headed mode resumes after the user clears an unresolved challenge', async t => {
  const messages = [];
  t.mock.method(console, 'error', message => messages.push(message));
  const state = fixture({ text: 'Press and hold to continue' });
  state.onWait = () => { state.text = 'Flights: $250'; };
  const result = await handleCaptcha(state.page, { ...FAST, autoTimeoutMs: 0, headed: true });
  assert.deepEqual(result, { detected: true, cleared: true, attempted: false });
  assert.equal(messages.length, 1);
});

test('headed mode also has a finite timeout', async t => {
  t.mock.method(console, 'error', () => {});
  const state = fixture({ text: 'Press and hold to continue' });
  const result = await handleCaptcha(state.page, { ...FAST, autoTimeoutMs: 0, headed: true });
  assert.equal(result.cleared, false);
});

test('visible hCaptcha and Cloudflare challenges are detected inside frames', async () => {
  for (const url of ['https://newassets.hcaptcha.com/captcha/v1/test', 'https://challenges.cloudflare.com/cdn-cgi/challenge-platform/test']) {
    const widget = { url, text: 'Loading challenge' };
    const state = fixture({ widgets: [widget] });
    assert.equal((await inspectCaptcha(state.page)).blocked, true);
    widget.text = 'Success!';
    assert.equal((await inspectCaptcha(state.page)).blocked, false);
  }
});

test('a detached challenge frame and an unreadable or blank page are not treated as solved', async () => {
  const detached = fixture({ widgets: [{ url: IMAGE_CHALLENGE, detached: true }] });
  assert.equal((await inspectCaptcha(detached.page)).blocked, true);
  for (const text of [null, '', '   ']) {
    assert.equal((await inspectCaptcha(fixture({ text }).page)).blocked, true);
  }
});

test('an unrelated iframe cannot opt into checkbox clicks through its URL', async () => {
  const state = fixture({ widgets: [{ url: 'https://hcaptcha.com.example/recaptcha/', boxes: [{}] }] });
  assert.equal((await handleCaptcha(state.page, FAST)).detected, false);
  assert.equal(state.clicks, 0);
});
