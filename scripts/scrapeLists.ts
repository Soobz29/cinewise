/**
 * SCRAIPNG SCRIPT FOR MDBLIST & LETTERBOXD
 * 
 * Instructions:
 * 1. Ensure Node.js is installed.
 * 2. Run `npm install axios cheerio`
 * 3. Execute with `ts-node scripts/scrapeLists.ts`
 * 
 * Note: This script demonstrates how to extract movie titles and years from list URLs.
 * In a real production backend, you would save these to a database (Postgres/Mongo).
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

interface ScrapedMovie {
    title: string;
    year: string;
    source: string;
}

const MDBLIST_URL = 'https://mdblist.com/lists/jahsias/top-100-movies-of-all-time'; // Example URL
const LETTERBOXD_URL = 'https://letterboxd.com/dave/list/official-top-250-narrative-feature-films/'; // Example URL

async function scrapeMdblist(url: string): Promise<ScrapedMovie[]> {
    console.log(`Scraping MDblist: ${url}`);
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(data);
        const movies: ScrapedMovie[] = [];

        // Note: Selectors depend on the specific site structure and may change over time
        $('.item').each((_, element) => {
            const title = $(element).find('.title').text().trim();
            const year = $(element).find('.year').text().trim().replace(/[()]/g, '');
            if (title) {
                movies.push({ title, year, source: 'MDblist' });
            }
        });
        
        return movies;
    } catch (error) {
        console.error("Error scraping MDblist:", error);
        return [];
    }
}

async function scrapeLetterboxd(url: string): Promise<ScrapedMovie[]> {
    console.log(`Scraping Letterboxd: ${url}`);
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(data);
        const movies: ScrapedMovie[] = [];

        $('.poster-container').each((_, element) => {
            const img = $(element).find('img');
            const title = img.attr('alt');
            // Letterboxd doesn't always show year in the list view DOM easily without parsing further,
            // but usually it's in the film metadata if we visit the link. 
            // For this scraper, we just grab title.
            if (title) {
                movies.push({ title, year: '', source: 'Letterboxd' });
            }
        });

        return movies;
    } catch (error) {
        console.error("Error scraping Letterboxd:", error);
        return [];
    }
}

async function main() {
    const mdblistMovies = await scrapeMdblist(MDBLIST_URL);
    const letterboxdMovies = await scrapeLetterboxd(LETTERBOXD_URL);

    const allMovies = [...mdblistMovies, ...letterboxdMovies];
    
    const outputPath = path.resolve('scraped_movies.json');
    await fs.writeFile(outputPath, JSON.stringify(allMovies, null, 2));
    
    console.log(`Successfully scraped ${allMovies.length} movies.`);
    console.log(`Data saved to ${outputPath}`);
}

main();