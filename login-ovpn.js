const puppeteer = require('puppeteer');
const chalk = require('chalk');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Jakarta');
const { exec } = require('node:child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const os = require('os')

const folderPath = 'C:\\Program Files\\OpenVPN\\config';
const ovpnPath = '"C:\\Program Files\\OpenVPN\\bin\\openvpn-gui.exe"';
const chromeUserPath = `${os.homedir()}\\AppData\\Local\\Google\\Chrome\\User Data`;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function prettyConsole(text) {
    console.log(`[${moment().format('HH:mm:ss')}] ` + text)
}

async function checkIp() {
    try {
        const response = await fetch(`https://freeipapi.com/api/json`);
        const data = await response.json();
        return data.ipAddress;
    } catch (error) {
        prettyConsole(chalk.red('Error fetching IP details:', error));
        return error;
    }
}

async function ovpnReadConfig(folderPath) {
    try {
        const config = fs.readdirSync(folderPath)
            .filter(file => path.extname(file) === '.ovpn')
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/), 10);
                const numB = parseInt(b.match(/\d+/), 10);

                return numA - numB;
            });

        return config;
    } catch (error) {
        prettyConsole(chalk.red('Error :', error));
    }
}

async function rest() {
    const rest = (Math.random() * (30 - 15) + 15) * 1000
    prettyConsole(chalk.green(`Take rest for ${Math.floor(rest / 1000)} second\n`))
    await sleep(rest)
}

async function killApps() {
    exec('taskkill /F /IM chrome.exe');
    exec('taskkill /F /IM openvpn-gui.exe');
    exec('taskkill /F /IM openvpn.exe');
}

async function checkCommand(element, profile, message) {
    let checkElement = false
    let trycheckElement = 0

    while (checkElement === false) {
        if (trycheckElement <= 3) {
            try {
                await element(profile)
                checkElement = true
                return checkElement
            } catch (error) {
                prettyConsole(chalk.yellow(`Still Fetch ${message}`))
                trycheckElement++
            }
        } else {
            prettyConsole(chalk.red(`Profile ${profile} ${message} Show So Take Long Time`))
            checkElement = true
            return false
        }
    }
}

(async () => {
    console.log(chalk.cyan(`\n<==================================[${moment().format('HH:mm:ss DD-MM-YYYY')}]==================================>`))

    if (!fs.existsSync(`createLog.txt`)) {
        fs.writeFileSync(`createLog.txt`, '');
    }

    await killApps()

    const ovpnConfig = await ovpnReadConfig(folderPath)

    mainLoop: for (let x = 0; x <= 21; x++) {

        const ip = await checkIp()
        prettyConsole(chalk.magenta(`Current IP : ${ip}`))

        exec(`${ovpnPath} --command connect ${ovpnConfig[x]}`);

        // Wait for VPN connection to be established
        await new Promise(resolve => setTimeout(resolve, 5000));

        let isVpn = false;
        let vpn, browser, isContinue, isBrowser

        while (!isVpn) {
            vpn = await checkIp();
            if (vpn !== ip) {
                isVpn = true;
                prettyConsole(chalk.green(`VPN connected successfully!, IP : ${vpn}`));
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        if (isVpn) {
            // Connect Browser
            const connectBrowser = async () => {
                let launchOptions = {
                    headless: false,
                    args: [
                        `--user-data-dir=${chromeUserPath}`,
                        x === 0 ? '--profile-directory=Default' : `--profile-directory=Profile ${x}`
                    ]
                };

                browser = await puppeteer.launch(launchOptions)

                const browserConnected = await browser.isConnected()

                if (browserConnected) {
                    isBrowser = true;
                } else {
                    prettyConsole(chalk.red(`Try Hard To Launch Browser!, Switch Next Profile`))
                }
            }

            await checkCommand(connectBrowser, x, "connectBrowser")

            await sleep(3000)

            prettyConsole(chalk.green(`Profile\t:${x}`))

            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(0);

            // Goto Link
            const gotoLink = async () => {
                await page.goto('https://web.telegram.org/k/#@waveonsuibot', { waitUntil: ['networkidle2', 'domcontentloaded'] });
            }

            isContinue = await checkCommand(gotoLink, x, 'gotoLink')

            if (!isContinue) {
                await killApps()
                await rest()
                continue mainLoop
            }

            await sleep(3000)

            // Click Open Wallet
            const openWallet = async () => {
                await page.waitForSelector('a.anchor-url[href="https://t.me/waveonsuibot/walletapp"]')
                await sleep(3000)
                await page.click('a.anchor-url[href="https://t.me/waveonsuibot/walletapp"]')
            }

            isContinue = await checkCommand(openWallet, x, 'Click Open Wallet')

            if (!isContinue) {
                await killApps()
                await rest()
                continue mainLoop
            }

            await sleep(3000)

            // Click Button Launch
            const buttonLaunch = async (x) => {
                await page.waitForSelector('body > div.popup.popup-peer.popup-confirmation.active > div > div.popup-buttons > button:nth-child(1)')
                await sleep(3000)
                await page.click('body > div.popup.popup-peer.popup-confirmation.active > div > div.popup-buttons > button:nth-child(1)')
            }

            isContinue = await checkCommand(buttonLaunch, x, 'Click Button Launch')

            if (!isContinue) {
                await killApps()
                await rest()
                continue mainLoop
            }

            await sleep(3000)

            // Handle iframe
            const iframeSelector = '.payment-verification';
            let iframeElementHandle
            const handleFrame = async () => {
                await page.waitForSelector(iframeSelector)
                iframeElementHandle = await page.$(iframeSelector);
            }

            isContinue = await checkCommand(handleFrame, x, 'Handle iframe')

            if (!isContinue) {
                await killApps()
                await rest()
                continue mainLoop
            }

            await sleep(3000)

            const iframe = await iframeElementHandle.contentFrame();

            // Click Login Account
            const createAccount = async () => {
                await iframe.waitForSelector('button.text-white.btn-login');
                await iframe.evaluate(() => {
                    document.querySelector('button.text-white.btn-login').click();
                });
            }

            isContinue = await checkCommand(createAccount, x, 'Click Create Account')

            if (!isContinue) {
                await killApps()
                await rest()
                continue mainLoop
            }

            // Typing Phrase
            try {
                await iframe.waitForSelector('#section-login > div > div:nth-child(4) > label > textarea');
                await iframe.focus('#section-login > div > div:nth-child(4) > label > textarea');
                await page.keyboard.type(phrase[x]);
            } catch (error) {
                prettyConsole(`Typing Phrase Error: ${error.message}`)
                const rest = await killApps()
                await sleep(rest)
                continue mainLoop
            }

            await sleep(3000)

            // Click Continue
            const clickContinue = async () => {
                await iframe.waitForSelector('#section-login > div > div.w-full.mt-auto > button');
                await iframe.evaluate(() => {
                    document.querySelector('#section-login > div > div.w-full.mt-auto > button').click();
                });
            }

            isContinue = await checkCommand(clickContinue, x, 'Click Continue')

            if (!isContinue) {
                await killApps()
                await rest()
                continue mainLoop
            }

            await sleep(3000)

            // Check Login
            const checkLogin = async () => {
                await iframe.waitForSelector('#section-home > div > div > div.block-claim.flex.flex-row.relative.z-0 > div.item-1 > div._item-1_2 > div.ml-auto.mt-3 > button');
            }

            isContinue = await checkCommand(checkLogin, x, 'Check Login')

            if (isContinue) {
                prettyConsole(chalk.green(`Login Wave Wallet Successfully`))
            }

            await sleep(3000)

            await killApps()
            await rest()
            continue mainLoop
        }
    }
})()