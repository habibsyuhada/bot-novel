import { NextApiRequest, NextApiResponse } from "next";
// import { supabase } from "../../lib/supabase";
import { pool } from "../../lib/db";
import puppeteer from "puppeteer";
import path from "path";

type BatchProcessResponse = {
  success: boolean;
  message: string;
  data?: {
    processedNovels: number;
    results: {
      novelId: number;
      novelName: string;
      chaptersProcessed: number;
      error?: string;
    }[];
  };
  error?: string;
};

const translator = "quilbot"; // deepl, siderai, chatgpt, quilbot
const headless = true; // false munculin browser, true kagak
const waiting = false; // nunggu 10jt detik

type NovelRow = {
  id: number;
  name: string;
  last_url_translated: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BatchProcessResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      error: "Only POST requests are allowed",
    });
  }

  const { novelIds, maxChaptersPerNovel } = req.body;

  if (!novelIds || !Array.isArray(novelIds) || novelIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Missing or invalid novel IDs",
      error: "Please provide an array of novel IDs",
    });
  }

  const chaptersToProcess = maxChaptersPerNovel || parseInt(process.env.MAX_CHAPTERS || "100", 10);
  const results = [];

  try {
    // Path ke Chrome yang sudah terinstal
    // const chromePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
    // const userDataDir = path.join(process.env.USERPROFILE || "", "AppData", "Local", "Google", "Chrome", "User Data");
		// console.log(userDataDir);

		console.log('0000000')
    // Launch browser sekali untuk semua novel
    const browser = await puppeteer.launch({
      headless: headless,
			timeout: 0,
      // executablePath: chromePath,
      // userDataDir: userDataDir,
      userDataDir: "./my-user-data-puppeteer",
      args: [
				"--disable-infobars",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--profile-directory=Default",
      ],
      ignoreDefaultArgs: ["--disable-extensions"],
    });
		const novelPage = await browser.newPage();
		const translatorPage = await browser.newPage();

		// // Set a realistic user agent for a Chromium browser
		// await novelPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
		// 	'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
		
		// // Override browser properties to reduce detectable traits
		// await novelPage.evaluateOnNewDocument(() => {
		// 	Object.defineProperty(navigator, 'webdriver', { get: () => false });
		// 	// Randomize canvas fingerprinting to avoid detection
		// 	HTMLCanvasElement.prototype.toDataURL = function() {
		// 		return 'data:image/png;base64,randomized-value';
		// 	};
		// });

		// // Set a realistic user agent for a Chromium browser
		// await translatorPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
		// 	'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
		
		// // Override browser properties to reduce detectable traits
		// await translatorPage.evaluateOnNewDocument(() => {
		// 	Object.defineProperty(navigator, 'webdriver', { get: () => false });
		// 	// Randomize canvas fingerprinting to avoid detection
		// 	HTMLCanvasElement.prototype.toDataURL = function() {
		// 		return 'data:image/png;base64,randomized-value';
		// 	};
		// });

		if(waiting){
			await new Promise((resolve) => setTimeout(resolve, 10000000));
		}

		const reportRes = await pool.query<{ id: number; url: string }>(
      `select id, url
       from novel_chapter
       where report = 1
       order by id asc`
    );
    const novelChaptersReport = reportRes.rows;

		let isNovelReport = false;
    if (novelChaptersReport && novelChaptersReport.length > 0) {
      isNovelReport = true;
    }

    // Proses setiap novel secara berurutan
    for (const novelId of novelIds) {
      try {
        // Ambil data novel dari database
        const novelRes = await pool.query<NovelRow>(
          `select id, name, last_url_translated
           from novel
           where id = $1
           limit 1`,
          [novelId]
        );

        const novel = novelRes.rows[0];
        if (!novel) {
          results.push({
            novelId,
            novelName: "Unknown",
            chaptersProcessed: 0,
            error: "Novel not found",
          });
          continue;
        }

        let currentUrl = novel.last_url_translated;
				let saveUrl = novel.last_url_translated;
        if (!currentUrl) {
          results.push({
            novelId: novel.id,
            novelName: novel.name,
            chaptersProcessed: 0,
            error: "No valid URL found for novel",
          });
          continue;
        }

        let processedChapters = 0;
        let last_translate_text = '';

        // Proses chapter untuk novel ini
        while (processedChapters < chaptersToProcess) {
					currentUrl = currentUrl.replace("novelbin.com", "novelbin.me");
					currentUrl = currentUrl.replace("/novel-book/", "/b/");
					console.log(`Processing chapter ${processedChapters + 1}/${chaptersToProcess}: ${currentUrl}`);
					saveUrl = currentUrl;
		
					// Open novel page
					await novelPage.goto(currentUrl, {
						waitUntil: "networkidle2",
						timeout: 0,
					});
		
					// Extract chapter title
					const chapterTitle = await novelPage.evaluate(() => {
						const titleElement = document.querySelector(".chr-title");
						return titleElement ? titleElement.textContent?.trim() : "";
					});
		
					// Extract chapter content
					let text = await novelPage.evaluate(() => {
						const contentElement = document.querySelector("#chr-content");
		
						if (!contentElement) return "";
		
						// Check for premium content element
						const premiumElement = document.querySelector("#btn-buy-chapter");
						if (premiumElement) {
							return "PREMIUM_CONTENT";
						}
		
						// Clone the content element to avoid modifying the original
						const contentClone = contentElement.cloneNode(true) as HTMLElement;
		
						// Remove all advertisement divs (those with script tags or pubfuturetag)
						const adDivs = contentClone.querySelectorAll('div[id^="pf-"]');
						adDivs.forEach((div: Element) => div.remove());
		
						// Remove any empty divs
						const emptyDivs = contentClone.querySelectorAll("div:empty");
						emptyDivs.forEach((div: Element) => div.remove());
		
						// Remove unlock-buttons divs
						const unlockButtons = contentClone.querySelectorAll('.unlock-buttons');
						unlockButtons.forEach((div: Element) => div.remove());
		
						// Replace <p> tags with double newlines for proper paragraph separation
						const paragraphs: string[] = [];
						const pElements = contentClone.querySelectorAll("p");
						pElements.forEach((p: Element) => {
							let text = p.textContent?.trim() || "";
		
							// Remove the novelbin marker if present
							text = text.replace("@@novelbin@@", "");
		
							if (text) paragraphs.push(text);
						});
		
						// Get the chapter title if it exists
						const titleElement = contentClone.querySelector("h4");
						const title = titleElement ? titleElement.textContent?.trim() : "";
		
						// Combine title and paragraphs with proper spacing
						let finalContent = "";
						if (title) {
							finalContent = title + "\n\n";
						}
		
						finalContent += paragraphs.join("\n\n");
		
						return finalContent;
					});
		
					if (!text) {
						console.log("No content found on the page. Skipping chapter.");
						// await novelPage.close();
						break;
					}
		
					// Check if we hit premium content
					if (text === "PREMIUM_CONTENT") {
						console.log("Premium content detected. Stopping translation process.");
						results.push({
							novelId: novel.id,
							chaptersProcessed: processedChapters + 1,
							novelName: novel.name,
							error: "Premium content detected",
						});
						// await novelPage.close();
            break;
					}
		
					// Log the first 200 characters of the cleaned content for debugging
					// console.log('Cleaned content (first 200 chars):', text.substring(0, 200));
		
					// Find the next chapter link before closing the current page
					const nextChapterUrl = await novelPage.evaluate(() => {
						const nextButton = document.querySelector("#next_chap");
						return nextButton ? nextButton.getAttribute("href") : null;
					});
		
					if (!nextChapterUrl) {
						console.log("No next chapter link found. Ending process.");
						// await novelPage.close();
						break;
					}
		
					// Convert relative URL to absolute if needed
					currentUrl = nextChapterUrl.startsWith("http") ? nextChapterUrl : new URL(nextChapterUrl, currentUrl).toString();

		
					// Extract chapter number from title or URL if possible
					let chapterNumber = processedChapters + 1; // Default to the processed count

					// Try to extract chapter number from title
					// Supports:
					// "Chapter 123: Title"
					// "Chapter123: Title"
					// "Chapter: 123 Title"
					const chapterMatch = chapterTitle?.match(/chapter\s*:?\s*(\d+)/i);
					if (chapterMatch && chapterMatch[1]) {
						chapterNumber = parseInt(chapterMatch[1], 10);
					}
		
					// Check if this chapter already exists in the database
					const existsRes = await pool.query<{ id: number }>(
            `select id
             from novel_chapter
             where novel = $1 and chapter = $2
             limit 1`,
            [novelId, chapterNumber]
          );
          const existingChapter = existsRes.rows[0];
		
					if (existingChapter) {
						console.log(`Chapter ${chapterNumber} already exists in the database. Skipping.`);
						results.push({
							novelId: novel.id,
							chaptersProcessed: chapterNumber,
							novelName: novel.name,
							error: "Chapter already exists",
						});
						// await novelPage.close();
						continue;
					}

					if(text.substring(0, text.indexOf(' ')) != 'Chapter'){
						text = chapterTitle + "\n" + text
					}
		
					let translatedText = "";
					let tranlateFailed = false;
					let tranlateFailedReason = '';
					if(translator === "deepl"){
						const length_ori_text = text
							.replace(/"""/g, '') // Remove triple quotes
							.replace(/\n{2,}/g, "\n") // Replace 2 or more consecutive newlines with 1
							.replace(/^\n+|\n+$/g, "") // Remove leading and trailing newlines
							.split("\n")
							.map((line) => line.trim())
							.length // Remove empty lines
						// Open DeepL in a new tab
						await translatorPage.goto("https://www.deepl.com/en/translator", {
							waitUntil: "networkidle2",
							timeout: 0,
						});
			
						// Try to paste the text first, if it fails, fall back to typing
						try {
							await translatorPage.evaluate((text) => {
								const element = document.querySelector(".min-h-0 > div:nth-child(1)");
								if (element) {
									element.textContent = text;
								}
							}, text);
						} catch (error) {
							console.log("Paste failed, falling back to typing:", error);
							await translatorPage.type(".min-h-0 > div:nth-child(1)", text);
						}
						await translatorPage.type(".min-h-0 > div:nth-child(1)", " ");
			
						// await translatorPage.waitForSelector(".hidden > div:nth-child(4) .Icon");
						// await translatorPage.waitForSelector(".hidden > div:nth-child(4) .Icon", { timeout: 0 });
						// await translatorPage.click(".hidden > div:nth-child(4) .Icon");

						await new Promise((resolve) => setTimeout(resolve, 10000));
			
						// Wait for translation to complete
						// await translatorPage.waitForSelector('d-textarea[aria-labelledby="translation-target-heading"]', { timeout: 2000 });
			
						// Try to get translation up to 3 times if it's empty
						let attempts = 0;
						const maxAttempts = 15;
						let check_cleanedTranslatedText = ''
						let length_translate_text = 0
			
						while ((translatedText === "" || translatedText.includes("[...]") || check_cleanedTranslatedText == last_translate_text || length_translate_text != length_ori_text) && attempts < maxAttempts) {
							// Wait for 2 seconds before getting the translation
							await new Promise((resolve) => setTimeout(resolve, 2000));
			
							translatedText = await translatorPage.evaluate(() => {
								const textElement = document.querySelector('d-textarea[aria-labelledby="translation-target-heading"]');
								return textElement ? (textElement as HTMLElement).innerText?.trim() || "" : "";
							});
			
							attempts++;
							if ((translatedText === "" || translatedText.includes("[...]")) && attempts < maxAttempts) {
								console.log(`Translation attempt ${attempts} failed, trying again...`);
							}

							check_cleanedTranslatedText = translatedText
							.replace(/"""/g, '') // Remove triple quotes
							.replace(/\n{2,}/g, "\n") // Replace 2 or more consecutive newlines with 1
							.replace(/^\n+|\n+$/g, "") // Remove leading and trailing newlines
							.split("\n")
							.map((line) => line.trim())
							.filter((line) => line.length > 0) // Remove empty lines
							.join("\n");

							length_translate_text = check_cleanedTranslatedText.split("\n").length
							console.log("total line",  length_translate_text, length_ori_text)

							await translatorPage.type(".min-h-0 > div:nth-child(1)", " ");
						} 
			
						if (translatedText === "" || translatedText.includes("[...]")) {
							console.log("Translation failed. Skipping chapter.");
							// console.log("translatedText", translatedText);
							// console.log("text", text);
						}
					}
					else if(translator === "quilbot"){
						// const length_ori_text = text
						// 	.replace(/"""/g, '') // Remove triple quotes
						// 	.replace(/\n{2,}/g, "\n") // Replace 2 or more consecutive newlines with 1
						// 	.replace(/^\n+|\n+$/g, "") // Remove leading and trailing newlines
						// 	.split("\n")
						// 	.map((line) => line.trim())
						// 	.length // Remove empty lines
						// Open DeepL in a new tab
						await translatorPage.goto("https://quillbot.com/translate?sl=en-US&tl=id&tone=auto", {
							waitUntil: "networkidle2",
							timeout: 0,
						});
			
						// Try to paste the text first, if it fails, fall back to typing
						
						text = await text.replaceAll('"', '||||');

						try {
							await translatorPage.evaluate((text) => {
								const element = document.querySelector('[data-testid="tltr-input-editor"]');
								if (element) {
									element.textContent = text;
								}
							}, text);
						} catch (error) {
							console.log("Paste failed, falling back to typing:", error);
							await translatorPage.type('[data-testid="tltr-input-editor"]', text);
						}
						await translatorPage.type('[data-testid="tltr-input-editor"]', " ");
						// console.log("DONE TYPE")
						await translatorPage.waitForSelector('[data-testid="tltr-translate-button"]');
  					await translatorPage.click('[data-testid="tltr-translate-button"]');
						console.log("DONE CLICK BUTTON TRANSLATE")
						await new Promise((resolve) => setTimeout(resolve, 1000));
						await translatorPage.waitForSelector('[data-testid="tltr-translate-button"]:not([disabled])', {
							timeout: 300000
						});

						await translatorPage.waitForSelector('[data-testid="tltr-copy-button"]');
						await translatorPage.waitForSelector('#tltr-output', {
							timeout: 300000
						});

						let attempts = 0;
						const maxAttempts = 60;
						let firstWord = "";
						while ((translatedText === "" || firstWord != "Bab") && attempts <= maxAttempts) {

							if(attempts % 10 == 0){
								await translatorPage.waitForSelector('[data-testid="tltr-translate-button"]');
  							await translatorPage.click('[data-testid="tltr-translate-button"]');
								console.log("DONE CLICK BUTTON TRANSLATE")
							}

							// Wait for 2 seconds before getting the translation
							console.log(`Translation attempt ${attempts} times...`);
							if(translatedText === ""){
								console.log(`translatedText === ""`);
								if(attempts == maxAttempts){
									tranlateFailed = true;
									tranlateFailedReason = 'translatedText === ""';
								}
							}
							if(firstWord != "Bab"){
								console.log(`firstWord != "Bab"`);
								if(attempts == maxAttempts){
									tranlateFailed = true;
									tranlateFailedReason = 'firstWord === "Chapter"';
								}
							}
							await new Promise((resolve) => setTimeout(resolve, 2000));
			
							translatedText = await translatorPage.evaluate(() => {
								const textElement = document.querySelector('#tltr-output');

								return textElement ? (textElement as HTMLElement).innerText?.trim() || "" : "";
							});
							translatedText = await translatedText.replaceAll('||||', '"');
							firstWord = translatedText.substring(0, translatedText.indexOf(' '));
			
							attempts++;
						}
					}
					else if(translator === "chatgpt"){
						await translatorPage.goto("https://chatgpt.com/g/g-4VREEJVYf-indonesian-bahasa-english-translator", {
							waitUntil: "networkidle2",
							timeout: 0,
						});

						try {
							await translatorPage.evaluate((text) => {
								const element = document.querySelector("#prompt-textarea");
								if (element) {
									element.textContent = text;
								}
							}, text);
						} catch (error) {
							console.log("Paste failed, falling back to typing:", error);
							await translatorPage.type("#prompt-textarea", text);
						}
						await translatorPage.type("#prompt-textarea", " ");

						await new Promise((resolve) => setTimeout(resolve, 10000000));
					}
					else if(translator === "siderai"){
						// Open Merlin in a new tab
						// await translatorPage.goto("https://sider.ai/id/translator/text-translator", {
						// 	waitUntil: "networkidle2",
						// 	timeout: 0,
						// });
						// await translatorPage.click("div[data-node-key='9']");

						// await translatorPage.type(".editor-input", text, {delay: 0});
						// await translatorPage.click('.text-white.cursor-pointer.bg-\\[\\#8A57EA\\].select-none.flex.items-center.justify-center.py-\\[10px\\].px-\\[20px\\].rounded-full.gap-\\[8px\\].hover\\:bg-\\[\\#9668ec\\].active\\:bg-\\[\\#7c4ed3\\].transition-all');

						// await translatorPage.waitForSelector('.relative.w-full.flex.justify-between.items-center .cursor-pointer', {
						// 	visible: true,
						// 	timeout: 300000
						// });

						// translatedText = await translatorPage.evaluate(() => {
						// 	const textElement = document.querySelector('.translator-results-align');
						// 	return textElement ? (textElement as HTMLElement).innerText?.trim() || "" : "";
						// });

						await novelPage.evaluate((textToCopy) => {
							// Create a temporary textarea to copy text
							const textarea = document.createElement('textarea');
							textarea.value = textToCopy;
							document.body.appendChild(textarea);
							textarea.select();
							document.execCommand('copy');
							document.body.removeChild(textarea);
						}, text);


						const maxAttempts = 5; // Maksimal percobaan
						let attempt = 0;

						while (translatedText.length < 2000 && attempt < maxAttempts) {
							await translatorPage.goto("https://sider.ai/id/translator/text-translator", {
								waitUntil: "networkidle2",
								timeout: 0,
							});
							await translatorPage.click("div[data-node-key='9']");

							// await translatorPage.type(".editor-input", text, { delay: 0 });
							await translatorPage.click('.editor-input');
							await translatorPage.keyboard.down('Control');
							await translatorPage.keyboard.press('V');
							await translatorPage.keyboard.up('Control');


							// await translatorPage.click('.text-white.cursor-pointer.transition-all');
							// await translatorPage.evaluate((selector) => {
							// 	const element = document.querySelector(selector);
							// 	if (element) {
							// 		element.click();  // Klik langsung via JavaScript
							// 	}
							// }, 'div.text-white.cursor-pointer.transition-all');
							await translatorPage.click('div.text-white.cursor-pointer.transition-all', { 
								force: true,  // Mencoba klik tanpa menunggu kondisi tertentu
								delay: 100    // Tambahkan sedikit delay
							});

							await new Promise((resolve) => setTimeout(resolve, 60000));

							await translatorPage.waitForSelector('.relative.w-full.flex.justify-between.items-center .cursor-pointer', {
								visible: true,
								timeout: 480000000
							});

							await translatorPage.waitForSelector('.translator-results-align', {
								visible: true,
								timeout: 0
							});

							translatedText = await translatorPage.evaluate(() => {
								const textElement = document.querySelector('.translator-results-align');
								return textElement ? (textElement as HTMLElement).innerText?.trim() || "" : "";
							});

							attempt++;
							console.log("Ngulang Translate ke-"+attempt)
						}


					}
		
					// Clean up excessive newlines in the translated text
					const cleanedTranslatedText = translatedText
						.replace(/"""/g, '') // Remove triple quotes
						.replace(/\n{2,}/g, "\n") // Replace 2 or more consecutive newlines with 1
						.replace(/^\n+|\n+$/g, "") // Remove leading and trailing newlines
						.split("\n")
						.map((line) => line.trim())
						.filter((line) => line.length > 0) // Remove empty lines
						.join("\n");

					// await new Promise((resolve) => setTimeout(resolve, 10000000));
		
					// Option 1: Keep as is with single newlines
		
					// Option 2: Add paragraph spacing for better readability
					// Uncomment the line below to use this option
					// cleanedTranslatedText = cleanedTranslatedText.split('\n').join('\n\n');
		
					// Option 3: Format as a single paragraph with no newlines
					// Uncomment the line below to use this option
					// cleanedTranslatedText = cleanedTranslatedText.split('\n').join(' ');
		
					// console.log('Translated text (cleaned):', cleanedTranslatedText.substring(0, 200) + '...');
		
					// Skip if chapter already exists
					if (existingChapter) {
						console.log(`Chapter ${chapterNumber} already exists in the database. Skipping.`);
						results.push({
							novelId: novel.id,
							novelName: novel.name,
							chaptersProcessed: chapterNumber,
							error: "Chapter already exists",
						});
					} else {
						// Save to Supabase using the new schema
						if(tranlateFailed){
							console.error("translate Failed:", tranlateFailedReason);
							results.push({
								novelId: novel.id,
								novelName: novel.name,
								chaptersProcessed: chapterNumber,
								error: tranlateFailedReason,
							});
						}
						else {
							await pool.query(
								`insert into novel_chapter (novel, chapter, title, text, url)
								values ($1, $2, $3, $4, $5)`,
								[novelId, chapterNumber, chapterTitle || "", cleanedTranslatedText, saveUrl || ""]
							);

							last_translate_text = cleanedTranslatedText;
		
							console.log("Successfully saved chapter to Supabase");
							results.push({
								novelId: novel.id,
								novelName: novel.name,
								chaptersProcessed: chapterNumber,
							});
		
							// Update the last_url_translated in the novel table
							if(!currentUrl.includes("/null")){
								const date = new Date();
								const indonesiaTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

								// Mengonversi ke ISO 8601 dengan mengurangi selisih waktu UTC+7
								const utcDate = new Date(indonesiaTime.getTime() - (indonesiaTime.getTimezoneOffset() * 60000)).toISOString();


								// await pool.query(
								// 	`update novel
								// 	set last_url_translated = $1,
								// 			updated_date = $2
								// 	where id = $3`,
								// 	[saveUrl, utcDate, novelId]
								// );

								// console.log(`update novel set last_url_translated = $1 where id = $2`);
								// console.log(saveUrl);
								// console.log(novelId);

								await pool.query(
									`update novel
									set last_url_translated = $1
									where id = $2`,
									[saveUrl, novelId]
								);
							}
							else{
								console.log("No more chapters to process");
								console.log(currentUrl);
								break;
							}
							
						}
					}
		
					// Close both pages
		
					// Increment counter
					processedChapters++;
		
					// Add a small delay between chapters to avoid rate limiting
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}

        results.push({
          novelId: novel.id,
          novelName: novel.name,
          chaptersProcessed: processedChapters,
        });

      } catch (error) {
        results.push({
          novelId,
          novelName: "Unknown",
          chaptersProcessed: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

		// await novelPage.close();
		// await translatorPage.close();
    await browser.close();

    return res.status(200).json({
      success: true,
      message: "Batch processing completed",
      data: {
        processedNovels: results.length,
        results,
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error during batch processing",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
} 



//======================================================================
// const puppeteer = require('puppeteer'); // v23.0.0 or later

// (async () => {
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     const timeout = 5000;
//     page.setDefaultTimeout(timeout);

//     {
//         const targetPage = page;
//         await targetPage.setViewport({
//             width: 991,
//             height: 810
//         })
//     }
//     {
//         const targetPage = page;
//         await targetPage.goto('https://chatgpt.com/g/g-4VREEJVYf-indonesian-bahasa-english-translator/c/686e8fb8-1aa8-8004-871a-d5a0289b5ff8');
//     }
//     {
//         const targetPage = page;
//         await targetPage.goto('https://chatgpt.com/g/g-4VREEJVYf-indonesian-bahasa-english-translator');
//     }
//     {
//         const targetPage = page;
//         await puppeteer.Locator.race([
//             targetPage.locator('::-p-aria([role=\\"region\\"]) >>>> ::-p-aria([role=\\"paragraph\\"])'),
//             targetPage.locator('p'),
//             targetPage.locator('::-p-xpath(//*[@id=\\"prompt-textarea\\"]/p)'),
//             targetPage.locator(':scope >>> p')
//         ])
//             .setTimeout(timeout)
//             .click({
//               offset: {
//                 x: 158.17453002929688,
//                 y: 8.4197998046875,
//               },
//             });
//     }
//     {
//         const targetPage = page;
//         await puppeteer.Locator.race([
//             targetPage.locator('#prompt-textarea'),
//             targetPage.locator('::-p-xpath(//*[@id=\\"prompt-textarea\\"])'),
//             targetPage.locator(':scope >>> #prompt-textarea')
//         ])
//             .setTimeout(timeout)
//             .fill('HOW ARE YOU?');
//     }
//     {
//         const targetPage = page;
//         await targetPage.keyboard.up('/');
//     }
//     {
//         const targetPage = page;
//         await puppeteer.Locator.race([
//             targetPage.locator('::-p-aria(Kirim perintah) >>>> ::-p-aria([role=\\"image\\"])'),
//             targetPage.locator("[data-testid='send-button'] > svg"),
//             targetPage.locator('::-p-xpath(//*[@data-testid=\\"send-button\\"]/svg)'),
//             targetPage.locator(":scope >>> [data-testid='send-button'] > svg")
//         ])
//             .setTimeout(timeout)
//             .click({
//               offset: {
//                 x: 13.16033935546875,
//                 y: 14.4197998046875,
//               },
//             });
//     }
//     {
//         const targetPage = page;
//         await puppeteer.Locator.race([
//             targetPage.locator('div.-mb-\\(--composer-overlap-px\\) p'),
//             targetPage.locator('::-p-xpath(//*[@data-testid=\\"conversation-turn-2\\"]/div/div/div/div/div[1]/div/div/div/p)'),
//             targetPage.locator(':scope >>> div.-mb-\\(--composer-overlap-px\\) p')
//         ])
//             .setTimeout(timeout)
//             .click({
//               count: 2,
//               offset: {
//                 x: 85.15567016601562,
//                 y: 13.075469970703125,
//               },
//             });
//     }
//     {
//         const targetPage = page;
//         await targetPage.keyboard.down('Control');
//     }
//     {
//         const targetPage = page;
//         await targetPage.keyboard.down('c');
//     }
//     {
//         const targetPage = page;
//         await targetPage.keyboard.up('c');
//     }
//     {
//         const targetPage = page;
//         await targetPage.keyboard.up('Control');
//     }

//     await browser.close();

// })().catch(err => {
//     console.error(err);
//     process.exit(1);
// });
