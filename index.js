const puppeteer = require('puppeteer');
const chalk = require('chalk');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Jakarta');
const { exec } = require('node:child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cron = require('node-cron');
const os = require('os')

const folderPath = 'C:\\Program Files\\OpenVPN\\config';
const ovpnPath = '"C:\\Program Files\\OpenVPN\\bin\\openvpn-gui.exe"';
const chromeUserPath = `${os.homedir()}\\AppData\\Local\\Google\\Chrome\\User Data`;
let scheduledTask;

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

const changeCronSchedule = (minute) => {
    const currentMinute = moment().format('mm')
    let schedule

    if (currentMinute > minute) {
        schedule = minute
    } else {
        schedule = Math.abs(minute - currentMinute)
    }

    if (schedule === currentMinute) {
        schedule = parseInt(currentMinute / 2)
    }

    console.log(chalk.cyan(`\n<=============================[Rest until minute ${schedule} in o'clock]=============================>`))

    if (scheduledTask) {
        scheduledTask.stop();
    }

    scheduledTask = cron.schedule(`${schedule} * * * *`, () => {
        main();
    });
};

async function killApps() {
    exec('taskkill /F /IM chrome.exe');
    exec('taskkill /F /IM openvpn-gui.exe');
    exec('taskkill /F /IM openvpn.exe');

    const rest = (Math.random() * (30 - 15) + 15) * 1000
    prettyConsole(chalk.green(`Take rest for ${Math.floor(rest / 1000)} second\n`))

    return rest
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
            prettyConsole(chalk.red(`Profile ${x} ${message} Show So Take Long Time`))
            checkElement = true
            return false
        }
    }
}


async function main() {
    console.log(chalk.cyan(`\n<==================================[${moment().format('HH:mm:ss DD-MM-YYYY')}]==================================>`))

    const minute = Math.floor(Math.random() * (15 - 1 + 1)) + 1
    const ovpnConfig = await ovpnReadConfig(folderPath)

    mainLoop: for (let x = 0; x <= 21; x++) {

        const ip = await checkIp()
        prettyConsole(chalk.magenta(`Current IP : ${ip}`))

        // exec(`${ovpnPath} --command connect ${ovpnConfig[x]}`);

        // Wait for VPN connection to be established
        await new Promise(resolve => setTimeout(resolve, 5000));

        let isVpn = false;
        let vpn, browser, isContinue

        // while (!isVpn) {
        //     vpn = await checkIp();
        //     if (vpn !== ip) {
        //         isVpn = true;
        //         prettyConsole(chalk.green(`VPN connected successfully!, IP : ${vpn}`));
        //     }

        //     await new Promise(resolve => setTimeout(resolve, 5000));
        // }

        // if (isVpn) {
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
                const rest = await killApps()
                await sleep(rest)
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
                const rest = await killApps()
                await sleep(rest)
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
                const rest = await killApps()
                await sleep(rest)
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
                const rest = await killApps()
                await sleep(rest)
                continue mainLoop
            }

            await sleep(3000)

            const iframe = await iframeElementHandle.contentFrame();

            // Click Claim Now
            const claimNow = async () => {
                await iframe.waitForSelector('#section-home > div > div > div.block-claim.flex.flex-row.relative.z-0 > div.item-1 > div._item-1_2 > div.ml-auto.mt-3 > button');
                await iframe.evaluate(() => {
                    document.querySelector('#section-home > div > div > div.block-claim.flex.flex-row.relative.z-0 > div.item-1 > div._item-1_2 > div.ml-auto.mt-3 > button').click();
                });
            }

            isContinue = await checkCommand(claimNow, x, 'Click Claim Now')

            if (!isContinue) {
                const rest = await killApps()
                await sleep(rest)
                continue mainLoop
            }

            let balance

            // Check Balance
            const checkBalance = async (x) => {
                await iframe.waitForSelector('#section-transaction > div.block-data.h-full > div > div.flex.item-bl-1.flex-row.items-center > div.left.relative > p');
                balance = await iframe.evaluate(() => {
                    const element = document.querySelector('#section-transaction > div.block-data.h-full > div > div.flex.item-bl-1.flex-row.items-center > div.left.relative > p');
                    return parseFloat(element.textContent)
                });
            }

            isContinue = await checkCommand(checkBalance, x, 'Check Balance')

            if (!isContinue) {
                const rest = await killApps()
                await sleep(rest)
                continue mainLoop
            }

            prettyConsole(chalk.green(`Balance\t:${balance}%`))

            let speed

            // Check Speed
            const checkSpeed = async (x) => {
                await iframe.waitForSelector('#section-transaction > div.direction-tab.flex.flex-col.items-center.gap-6.pt-4 > div.menu-block > div > div.menu_2.relative > div.menu_title.flex.flex-row.justify-between.items-center.absolute > div > span.time');
                speed = await iframe.evaluate(() => {
                    const element = document.querySelector('#section-transaction > div.direction-tab.flex.flex-col.items-center.gap-6.pt-4 > div.menu-block > div > div.menu_2.relative > div.menu_title.flex.flex-row.justify-between.items-center.absolute > div > span.time');
                    return parseFloat(element.textContent)
                });
            }

            isContinue = await checkCommand(checkSpeed, x, 'Check Speed')

            if (!isContinue) {
                const rest = await killApps()
                await sleep(rest)
                continue mainLoop
            }

            prettyConsole(chalk.green(`Speed\t:${speed}%`))

            let claim = false

            // Check Claim Button
            try {
                await iframe.waitForSelector('#section-transaction > div.block-data.h-full > div > div.overlay.relative > div > div > div > div.flex.flex-row.items-center.item-2.mt-2.mb-3 > div > div');
                claim = true
            } catch (error) {
                let claimTime

                // Check Claim Time
                const checkClaimTime = async (x) => {
                    await iframe.waitForSelector('#section-transaction > div.direction-tab.flex.flex-col.items-center.gap-6.pt-4 > div.menu-block > div > div.menu_1.relative > div.menu_title.flex.flex-row.justify-between.items-center.absolute > div > span.time');
                    claimTime = await iframe.evaluate(() => {
                        const element = document.querySelector('#section-transaction > div.direction-tab.flex.flex-col.items-center.gap-6.pt-4 > div.menu-block > div > div.menu_1.relative > div.menu_title.flex.flex-row.justify-between.items-center.absolute > div > span.time');
                        return parseFloat(element.textContent)
                    });
                }
    
                isContinue = await checkCommand(checkClaimTime, x, 'Check Claim Time')
    
                if (!isContinue) {
                    const rest = await killApps()
                    await sleep(rest)
                    continue mainLoop
                }
    
                prettyConsole(chalk.green(`Claim Time\t:${claimTime}%`))
            }

            if (claim) {
                let claimed = false
                let reclaim = 0

                do {
                    // Click Claim Button
                    const claimWaveButton = async () => {
                        await iframe.evaluate(() => {
                            document.querySelector('#section-transaction > div.block-data.h-full > div > div.overlay.relative > div > div > div > div.flex.flex-row.items-center.item-2.mt-2.mb-3 > div > div').click();
                        });
                    }

                    isContinue = await checkCommand(claimWaveButton, x, 'Claim Wave')

                    if (!isContinue) {
                        const rest = await killApps()
                        await sleep(rest)
                        continue mainLoop
                    }

                    prettyConsole(chalk.green(`Claiming Wave......`))

                    let checkClaim

                    // Check Status Claim
                    do {
                        try {
                            await iframe.waitForSelector('#section-transaction > div.block-data.h-full > div > div.overlay.relative > div > div > div > div.ml-2.flex.flex-row.items-center.item.mt-2.mb-3 > span');
                            claimed = true;
                        } catch (error) {
                            prettyConsole(chalk.green(`Still Claiming Wave......`))
                            checkClaim++
                        }
                    } while (checkClaim < 3 && !claimed)

                    // Tweaking
                    if (checkClaim === 3) {
                        prettyConsole(chalk.green(`Claiming Wave Failed!, Tweaking`))

                        // Click Back
                        const clickBack = async () => {
                            await page.waitForSelector('.popup-close');
                            await page.click('.popup-close');
                        }

                        isContinue = await checkCommand(clickBack, x, 'Click Back')

                        if (!isContinue) {
                            const rest = await killApps()
                            await sleep(rest)
                            continue mainLoop
                        }

                        isContinue = await checkCommand(claimNow, x, 'Click Claim Now')

                        if (!isContinue) {
                            const rest = await killApps()
                            await sleep(rest)
                            continue mainLoop
                        }

                        reclaim++
                    }
                } while (!claimed && reclaim < 3)

                if (claimed) {
                    prettyConsole(chalk.green("Successfully Claim Wave"))
                } else {
                    prettyConsole(chalk.green("Claiming And Tweaking Failed!"))
                }
            }

            const rest = await killApps()
            await sleep(rest)
            continue mainLoop


            // // Click Boost
            // const clickBoost = async (x) => {
            //     await iframe.waitForSelector('#root > div > div > div:nth-child(3) > div > div:nth-child(4) > div > div:nth-child(3)');
            //     account = await iframe.evaluate(() => {
            //         document.querySelector('#root > div > div > div:nth-child(3) > div > div:nth-child(4) > div > div:nth-child(3)').click();
            //     })
            // }

            // isContinue = await checkElement(clickBoost, x, 'Click Boost')

            // if (!isContinue) {
            //     await browser.close()
            //     exec(`${ovpnPath} --command disconnect ${ovpnConfig[x]}`);
            //     const rest = (Math.random() * (30 - 15) + 15) * 1000
            //     prettyConsole(chalk.green(`VPN Disconnect, Take rest for ${Math.floor(rest / 1000)} second\n`))
            //     await sleep(rest)
            //     continue mainLoop
            // }

            // await upgradeSpeed(iframe, balance, x)

            // await upgradeStorage(iframe, balance, x)
        // }
    }

    changeCronSchedule(minute);
}

(async () => {
    await main()
})()