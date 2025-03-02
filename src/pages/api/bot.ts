import { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';
import path from 'path';
import { supabase } from '../../lib/supabase';

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

  // Get URL and novel ID from query parameters
  const { url, maxChapters, novelId } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing or invalid URL parameter', 
      error: 'Please provide a valid novel URL' 
    });
  }

  if (!novelId || typeof novelId !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing or invalid Novel ID parameter', 
      error: 'Please provide a valid novel ID' 
    });
  }

  // Convert novelId to number
  const novelIdNum = parseInt(novelId, 10);
  if (isNaN(novelIdNum)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid Novel ID', 
      error: 'Novel ID must be a number' 
    });
  }

  // Verify that the novel ID exists in the database
  const { data: novelData, error: novelError } = await supabase
    .from('novel')
    .select('id')
    .eq('id', novelIdNum)
    .single();

  if (novelError || !novelData) {
    return res.status(404).json({ 
      success: false, 
      message: 'Novel not found', 
      error: 'The provided novel ID does not exist in the database' 
    });
  }

  // Set the maximum number of chapters to process
  const chaptersToProcess = maxChapters ? parseInt(maxChapters as string, 10) : 
                           parseInt(process.env.MAX_CHAPTERS || '100', 10);
  
  try {
    // Path ke Chrome yang sudah terinstal (sesuai dengan lokasi Chrome di komputer pengguna)
    const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
    
    // Path ke profil pengguna Chrome (sesuaikan dengan profil Anda)
    // Biasanya di: C:\Users\[YourUsername]\AppData\Local\Google\Chrome\User Data
    const userDataDir = path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Google', 'Chrome', 'User Data');

    // Launch browser dengan menggunakan Chrome yang sudah terinstal
    const browser = await puppeteer.launch({
      // headless: false,
      executablePath: chromePath,
      userDataDir: userDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--profile-directory=Default' // Gunakan profil default, bisa diganti dengan nama profil lain jika perlu
      ],
      ignoreDefaultArgs: ['--disable-extensions'], // Jangan nonaktifkan ekstensi
    });

    let currentUrl = url;
    let processedChapters = 0;
    const results = [];

    // Process chapters in a loop
    while (processedChapters < chaptersToProcess) {
      console.log(`Processing chapter ${processedChapters + 1}/${chaptersToProcess}: ${currentUrl}`);
      
      // Open novel page
      const novelPage = await browser.newPage();
      await novelPage.goto(currentUrl, {  
			waitUntil: 'networkidle2',  
		});  
		
      // Extract chapter title
      const chapterTitle = await novelPage.evaluate(() => {
        const titleElement = document.querySelector('.chr-title');
        return titleElement ? titleElement.textContent?.trim() : '';
      });
      
      // Extract chapter content
      const text = await novelPage.evaluate(() => {  
				const contentElement = document.querySelector('#chr-content');  
        
        if (!contentElement) return '';
        
        // Clone the content element to avoid modifying the original
        const contentClone = contentElement.cloneNode(true) as HTMLElement;
        
        // Remove all advertisement divs (those with script tags or pubfuturetag)
        const adDivs = contentClone.querySelectorAll('div[id^="pf-"]');
        adDivs.forEach((div: Element) => div.remove());
        
        // Remove any empty divs
        const emptyDivs = contentClone.querySelectorAll('div:empty');
        emptyDivs.forEach((div: Element) => div.remove());
        
        // Replace <p> tags with double newlines for proper paragraph separation
        const paragraphs: string[] = [];
        const pElements = contentClone.querySelectorAll('p');
        pElements.forEach((p: Element) => {
          let text = p.textContent?.trim() || '';
          
          // Remove the novelbin marker if present
          text = text.replace('@@novelbin@@', '');
          
          if (text) paragraphs.push(text);
        });
        
        // Get the chapter title if it exists
        const titleElement = contentClone.querySelector('h4');
        const title = titleElement ? titleElement.textContent?.trim() : '';
        
        // Combine title and paragraphs with proper spacing
        let finalContent = '';
        if (title) {
          finalContent = title + '\n\n';
        }
        
        finalContent += paragraphs.join('\n\n');
        
        return finalContent;
      });
      
      if (!text) {
        console.log('No content found on the page. Skipping chapter.');
        break;
      }
      
      // Log the first 200 characters of the cleaned content for debugging
      // console.log('Cleaned content (first 200 chars):', text.substring(0, 200));
      
      // Find the next chapter link before closing the current page
      const nextChapterUrl = await novelPage.evaluate(() => {
        const nextButton = document.querySelector('#next_chap');
        return nextButton ? nextButton.getAttribute('href') : null;
      });
      
      if (!nextChapterUrl) {
        console.log('No next chapter link found. Ending process.');
        await novelPage.close();
        break;
      }
      
      // Convert relative URL to absolute if needed
      currentUrl = nextChapterUrl.startsWith('http') ? 
                  nextChapterUrl : 
                  new URL(nextChapterUrl, currentUrl).toString();
      
      // Open DeepL in a new tab
      const deeplPage = await browser.newPage();
      await deeplPage.goto('https://www.deepl.com/en/translator', {  
				waitUntil: 'networkidle2',  
		});  

		// Try to paste the text first, if it fails, fall back to typing
		try {
        await deeplPage.evaluate((text) => {
				const element = document.querySelector('.min-h-0 > div:nth-child(1)');
				if (element) {
					element.textContent = text;
				}
			}, text);
		} catch (error) {
			console.log('Paste failed, falling back to typing:', error);
        await deeplPage.type('.min-h-0 > div:nth-child(1)', text);
		}
      await deeplPage.type('.min-h-0 > div:nth-child(1)', " ");

      await deeplPage.waitForSelector('.hidden > div:nth-child(4) .Icon');
      await deeplPage.click('.hidden > div:nth-child(4) .Icon');
  	
  	// Wait for translation to complete
      await deeplPage.waitForSelector('d-textarea[aria-labelledby="translation-target-heading"]', { timeout: 10000 });
      
      // Wait for 2 seconds before getting the translation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get the translated text
      const translatedText = await deeplPage.evaluate(() => {
        const textElement = document.querySelector('d-textarea[aria-labelledby="translation-target-heading"]');
        return textElement ? (textElement as HTMLElement).innerText?.trim() || '' : '';
      });

      // Clean up excessive newlines in the translated text
      let cleanedTranslatedText = translatedText
        .replace(/\n{2,}/g, '\n') // Replace 2 or more consecutive newlines with 1
        .replace(/^\n+|\n+$/g, '') // Remove leading and trailing newlines
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0) // Remove empty lines
        .join('\n');
      
      // Option 1: Keep as is with single newlines
      
      // Option 2: Add paragraph spacing for better readability
      // Uncomment the line below to use this option
      // cleanedTranslatedText = cleanedTranslatedText.split('\n').join('\n\n');
      
      // Option 3: Format as a single paragraph with no newlines
      // Uncomment the line below to use this option
      // cleanedTranslatedText = cleanedTranslatedText.split('\n').join(' ');
      
      // console.log('Translated text (cleaned):', cleanedTranslatedText.substring(0, 200) + '...');

      // Extract chapter number from title or URL if possible
      let chapterNumber = processedChapters + 1; // Default to the processed count
      
      // Try to extract chapter number from title (e.g., "Chapter 123: Title")
      const chapterMatch = chapterTitle?.match(/chapter\s+(\d+)/i);
      if (chapterMatch && chapterMatch[1]) {
        chapterNumber = parseInt(chapterMatch[1], 10);
      }

      // Check if this chapter already exists in the database
      const { data: existingChapter, error: checkError } = await supabase
        .from('novel_chapter')
        .select('id')
        .eq('novel', novelIdNum)
        .eq('chapter', chapterNumber)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing chapter:', checkError);
      }

      // Skip if chapter already exists
      if (existingChapter) {
        console.log(`Chapter ${chapterNumber} already exists in the database. Skipping.`);
        results.push({
          chapter: chapterNumber,
          title: chapterTitle,
          url: novelPage.url(),
          saved: false,
          skipped: true
        });
      } else {
        // Save to Supabase using the new schema
        const { error } = await supabase
          .from('novel_chapter')
          .insert([
            { 
              novel: novelIdNum,
              chapter: chapterNumber,
              title: chapterTitle,
              text: cleanedTranslatedText
            }
          ]);

        if (error) {
          console.error('Error saving to Supabase:', error);
          results.push({
            chapter: chapterNumber,
            title: chapterTitle,
            url: novelPage.url(),
            saved: false,
            error: error.message
          });
        } else {
          console.log('Successfully saved chapter to Supabase');
          results.push({
            chapter: chapterNumber,
            title: chapterTitle,
            url: novelPage.url(),
            saved: true
          });
        }
      }

      // Close both pages
      await novelPage.close();
      await deeplPage.close();
      
      // Increment counter
      processedChapters++;
      
      // Add a small delay between chapters to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await browser.close();

		return res.status(200).json({
			success: true,
      message: `Successfully processed ${processedChapters} chapters`,
			data: {
        processedChapters,
        results
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