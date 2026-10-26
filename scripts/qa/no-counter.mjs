// Tests against a deployed site must not add passengers (Phase 7b). Against any URL other than localhost (or
// with QA_NO_COUNTER=1), every page these scripts open answers POST /api/passenger itself with a 403, so no
// request reaches the counter; the page hides the number, as for any refusal. The site has no bypass: this
// lives only in the test browsers. Usage: noCounter(browser) right after launching it.
export function noCounter(browser, target = process.argv[2] ?? "") {
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(target);
  if (local && !process.env.QA_NO_COUNTER) return browser;
  const refuse = (route) => route.fulfill({ status: 403, contentType: "application/json", body: '{"error":"forbidden"}' });
  const nc = browser.newContext.bind(browser);
  browser.newContext = async (o) => {
    const c = await nc(o);
    await c.route("**/api/passenger", refuse);
    return c;
  };
  const np = browser.newPage.bind(browser);
  browser.newPage = async (o) => {
    const p = await np(o);
    await p.route("**/api/passenger", refuse);
    return p;
  };
  return browser;
}
