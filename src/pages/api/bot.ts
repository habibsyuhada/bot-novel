import { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';
import path from 'path';

type PuppeteerResponse = {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PuppeteerResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed', error: 'Only GET requests are allowed' });
  }

  try {

    // Path ke Chrome yang sudah terinstal (sesuai dengan lokasi Chrome di komputer pengguna)
    const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
    
    // Path ke profil pengguna Chrome (sesuaikan dengan profil Anda)
    // Biasanya di: C:\Users\[YourUsername]\AppData\Local\Google\Chrome\User Data
    const userDataDir = path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Google', 'Chrome', 'User Data');

    // Launch browser dengan menggunakan Chrome yang sudah terinstal
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: chromePath,
      userDataDir: userDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--profile-directory=Default' // Gunakan profil default, bisa diganti dengan nama profil lain jika perlu
      ],
      ignoreDefaultArgs: ['--disable-extensions'], // Jangan nonaktifkan ekstensi
    });

    const page = await browser.newPage();
    
    await page.goto('https://novelbin.com/b/complete-martial-arts-attributes/chapter754-moons-in-the-sea-3', {  
			waitUntil: 'networkidle2',  
		});  
		
		const text = await page.evaluate(() => {  
				const contentElement = document.querySelector('#chr-content');  
				return contentElement ? contentElement.innerText : '';  
		});  
		
		await page.goto('https://www.deepl.com/en/translator', {  
				waitUntil: 'networkidle2',  
		});  

		// Try to paste the text first, if it fails, fall back to typing
		try {
			await page.evaluate((text) => {
				const element = document.querySelector('.min-h-0 > div:nth-child(1)');
				if (element) {
					element.textContent = text;
				}
			}, text);
		} catch (error) {
			console.log('Paste failed, falling back to typing:', error);
			await page.type('.min-h-0 > div:nth-child(1)', text);
		}
		await page.type('.min-h-0 > div:nth-child(1)', " ");

    await page.waitForSelector('.hidden > div:nth-child(4) .Icon');
  	await page.click('.hidden > div:nth-child(4) .Icon');
  	
  	// Wait for translation to complete
  	await page.waitForSelector('div[contenteditable="true"][role="textbox"][lang="id-ID"]', { timeout: 10000 });
  	
  	// Get the translation target heading
  	// Wait for 2 seconds before getting the target heading
  	await new Promise(resolve => setTimeout(resolve, 2000));
  	const targetHeading = await page.evaluate(() => {
  	  const headingElement = document.querySelector('d-textarea[aria-labelledby="translation-target-heading"]');
  	  return headingElement ? headingElement.innerText || '' : '';
  	});

		return res.status(200).json({
			success: true,
			message: 'Success',
			data: {
				targetLanguage: targetHeading
			}
		});

  } catch (error) {
    console.error('Puppeteer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error running Puppeteer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 