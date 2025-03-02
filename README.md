# Novel Translation Bot

A web application that automates the process of translating novel chapters from English to Indonesian using DeepL and storing the results in Supabase.

## Features

- Accepts a novel URL as input (currently optimized for NovelBin)
- Automatically extracts chapter content
- Translates content from English to Indonesian using DeepL
- Saves translated content to Supabase
- Automatically navigates to the next chapter and repeats the process
- Configurable number of chapters to process
- Skips chapters that already exist in the database

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- Google Chrome installed on your system

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   MAX_CHAPTERS=100
   ```
4. Create the required tables in your Supabase project with the following structure:
   ```sql
   -- Novel table
   CREATE TABLE public.novel (
     id serial4 NOT NULL,
     "name" varchar NULL,
     author varchar NULL,
     genre varchar NULL,
     status int4 NULL,
     publishers varchar NULL,
     tag text NULL,
     "year" int4 NULL,
     CONSTRAINT novel_pkey PRIMARY KEY (id)
   );

   -- Novel chapter table
   CREATE TABLE public.novel_chapter (
     id serial4 NOT NULL,
     novel int4 NULL,
     chapter int4 NULL,
     title varchar NULL,
     "text" text NULL,
     CONSTRAINT novel_chapter_pkey PRIMARY KEY (id),
     CONSTRAINT novel_chapter_novel_fkey FOREIGN KEY (novel) REFERENCES public.novel(id)
   );
   ```

## Usage

1. First, manually add a novel entry to the `novel` table in your Supabase project and note the ID
2. Start the development server:
   ```
   npm run dev
   ```
3. Open your browser and navigate to `http://localhost:3000`
4. Enter the Novel ID from your database
5. Enter the URL of the novel chapter you want to start translating
6. Set the maximum number of chapters to process
7. Click "Start Translation"
8. The application will open Chrome, navigate to the novel page, extract content, translate it using DeepL, and save it to Supabase
9. The process will continue automatically until all chapters are processed or the maximum number is reached

## Configuration

- You can adjust the Chrome path in `src/pages/api/bot.ts` if your Chrome installation is in a different location
- The user data directory is set to the default Chrome profile location, but you can change it if needed

## Notes

- The application uses Puppeteer to control Chrome
- The translation is done using DeepL's web interface
- The application is designed to work with NovelBin, but can be adapted for other novel sites by modifying the selectors
- The application will automatically find and click the "Next Chapter" button to navigate to the next chapter
- You must first manually create a novel entry in the `novel` table before using this tool to add chapters
- The application will skip chapters that already exist in the database to avoid duplicates

## Troubleshooting

- If the application fails to extract content, check if the selectors in the code match the structure of the novel site
- If the translation fails, check if DeepL's interface has changed and update the selectors accordingly
- If the application fails to save to Supabase, check your Supabase credentials and table structure
- If you get a "Novel not found" error, make sure you've created an entry in the `novel` table with the ID you're providing
