import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabase";
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
    const chromePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
    const userDataDir = path.join(process.env.USERPROFILE || "", "AppData", "Local", "Google", "Chrome", "User Data");

    // Launch browser sekali untuk semua novel
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      userDataDir: userDataDir,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--profile-directory=Default",
      ],
      ignoreDefaultArgs: ["--disable-extensions"],
    });

    // Proses setiap novel secara berurutan
    for (const novelId of novelIds) {
      try {
        // Ambil data novel dari database
        const { data: novel, error: novelError } = await supabase
          .from("novel")
          .select("*")
          .eq("id", novelId)
          .single();

        if (novelError || !novel) {
          results.push({
            novelId,
            novelName: "Unknown",
            chaptersProcessed: 0,
            error: `Novel not found: ${novelError?.message || "Unknown error"}`,
          });
          continue;
        }

        let currentUrl = novel.last_url_translated || novel.start_url;
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

        // Proses chapter untuk novel ini
        while (processedChapters < chaptersToProcess) {
          const novelPage = await browser.newPage();
          await novelPage.goto(currentUrl, { waitUntil: "networkidle2" });

          // Extract chapter title
          const chapterTitle = await novelPage.evaluate(() => {
            const titleElement = document.querySelector(".chr-title");
            return titleElement ? titleElement.textContent?.trim() : "";
          });

          // Extract chapter content
          const text = await novelPage.evaluate(() => {
            const contentElement = document.querySelector("#chr-content");
            if (!contentElement) return "";

            const premiumElement = document.querySelector("#btn-buy-chapter");
            if (premiumElement) return "PREMIUM_CONTENT";

            const contentClone = contentElement.cloneNode(true) as HTMLElement;
            const adDivs = contentClone.querySelectorAll('div[id^="pf-"]');
            adDivs.forEach((div: Element) => div.remove());

            const emptyDivs = contentClone.querySelectorAll("div:empty");
            emptyDivs.forEach((div: Element) => div.remove());

            const unlockButtons = contentClone.querySelectorAll('.unlock-buttons');
            unlockButtons.forEach((div: Element) => div.remove());

            const paragraphs: string[] = [];
            const pElements = contentClone.querySelectorAll("p");
            pElements.forEach((p: Element) => {
              let text = p.textContent?.trim() || "";
              text = text.replace("@@novelbin@@", "");
              if (text) paragraphs.push(text);
            });

            return paragraphs.join("\n\n");
          });

          if (!text || text === "PREMIUM_CONTENT") {
            await novelPage.close();
            break;
          }

          // Find next chapter URL
          const nextChapterUrl = await novelPage.evaluate(() => {
            const nextButton = document.querySelector("#next_chap");
            return nextButton ? nextButton.getAttribute("href") : null;
          });

          // Extract chapter number
          let chapterNumber = processedChapters + 1;
          const chapterMatch = chapterTitle?.match(/chapter\s*(\d+)/i);
          if (chapterMatch && chapterMatch[1]) {
            chapterNumber = parseInt(chapterMatch[1], 10);
          }

          // Check if chapter exists
          const { data: existingChapter } = await supabase
            .from("novel_chapter")
            .select("id")
            .eq("novel", novel.id)
            .eq("chapter", chapterNumber)
            .maybeSingle();

          if (!existingChapter) {
            // Translate content using DeepL
            const deeplPage = await browser.newPage();
            await deeplPage.goto("https://www.deepl.com/en/translator", {
              waitUntil: "networkidle2",
            });

            await deeplPage.evaluate((text) => {
              const element = document.querySelector(".min-h-0 > div:nth-child(1)");
              if (element) {
                element.textContent = text;
              }
            }, text);

            await deeplPage.type(".min-h-0 > div:nth-child(1)", " ");
            await deeplPage.waitForSelector(".hidden > div:nth-child(4) .Icon");
            await deeplPage.click(".hidden > div:nth-child(4) .Icon");

            await deeplPage.waitForSelector('d-textarea[aria-labelledby="translation-target-heading"]', { timeout: 2000 });
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const translatedText = await deeplPage.evaluate(() => {
              const textElement = document.querySelector('d-textarea[aria-labelledby="translation-target-heading"]');
              return textElement ? (textElement as HTMLElement).innerText?.trim() || "" : "";
            });

            if (translatedText) {
              // Save translated chapter
              await supabase.from("novel_chapter").insert([
                {
                  novel: novel.id,
                  chapter: chapterNumber,
                  title: chapterTitle,
                  text: translatedText,
                },
              ]);
            }

            await deeplPage.close();
          }

          if (!nextChapterUrl) {
            await novelPage.close();
            break;
          }

          currentUrl = nextChapterUrl.startsWith("http")
            ? nextChapterUrl
            : new URL(nextChapterUrl, currentUrl).toString();

          await novelPage.close();
          processedChapters++;

          // Update last_url_translated
          await supabase
            .from("novel")
            .update({ last_url_translated: currentUrl })
            .eq("id", novel.id);

          // Add delay between chapters
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