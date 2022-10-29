/**
 * @param {puppeteer.Browser} browser
 * @param {{url: string, options: LHCI.CollectCommand.Options}} context
 */
module.exports = async (browser, context) => {
  // launch browser for LHCI
  const page = await browser.newPage();
  await page.goto(context.url);

  const buttonHandle = await page.evaluateHandle(`(async () => {
    console.log('get signin button');
    const signinButton = document.querySelector('lineup-app').shadowRoot.querySelector('button.signin-btn');
    return signinButton;
  })()`);
  await buttonHandle.click();
  // TODO: Is this wait needed to let promises resolve, or does the sign in actually need the time.
  await page.waitForTimeout(1000);

  // close session for next run
  await page.close();
};
