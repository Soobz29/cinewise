import { GoogleGenAI, Type } from '@google/genai';
import { Recommendation } from '../types';

// Ensure you have set process.env.API_KEY or the app will fail gracefully
const apiKey = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey });

export const analyzeUserRequest = async (userPrompt: string, excludeTitles: string[] = []): Promise<Recommendation[]> => {
  if (!apiKey) {
    console.warn("No Gemini API Key provided. Returning mock data.");
    return mockRecommendations(userPrompt, excludeTitles);
  }

  try {
    const model = 'gemini-3-flash-preview';
    
    let promptText = `
        You are a movie and TV show recommendation engine. 
        Based on the user's input: "${userPrompt}", recommend 8-10 specific movies or TV series.
        If the user asks for a specific genre, mood, year, or actor, strictly follow those constraints.
        Diverse selection is good unless the user specified otherwise.
      `;

    if (excludeTitles.length > 0) {
        // We limit the exclude list to the last 30 to avoid hitting token limits if the user scrolls a lot
        const recentExcludes = excludeTitles.slice(-30).join(", ");
        promptText += `
        IMPORTANT: The user has already seen recommendations for: [${recentExcludes}]. 
        DO NOT recommend these exact titles again. Find fresh, alternative recommendations that still match the user's request.
        `;
    }
    
    const response = await ai.models.generateContent({
      model,
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Exact title of the movie or show" },
              media_type: { type: Type.STRING, enum: ["movie", "tv"] },
              year: { type: Type.NUMBER, description: "Release year (approximation is okay)" },
              reason: { type: Type.STRING, description: "A very short, punchy reason why this fits the request (max 10 words)" }
            },
            required: ["title", "media_type", "reason"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    
    const recommendations: Recommendation[] = JSON.parse(jsonText);
    return recommendations;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return mockRecommendations(userPrompt, excludeTitles);
  }
};

export const getMoodSuggestions = async (query: string): Promise<string[]> => {
  if (!apiKey || query.length < 3) return [];

  try {
    // We ask the model to interpret the user's partial intent and suggest full, searchable moods/themes
    const prompt = `
      The user is typing a search query for movies or TV shows: "${query}".
      Generate 6-8 distinct, evocative, and searchable mood/genre/theme phrases that refine their intent.
      
      Rules:
      1. Do NOT return specific movie titles.
      2. Return descriptive categories, specific sub-genres, or plot archetypes.
      3. Interpret complex intents (e.g., "Like Inception but..." -> "Mind-bending psychological sci-fi").
      4. Keep suggestions short (2-6 words).
      5. Aim for a mix of broad genres and specific vibes (e.g. "Space Opera" vs "Claustrophobic sci-fi horror").

      Examples:
      Input: "Inception but scarier" -> ["Psychological thrillers", "Mind-bending horror", "Surreal nightmare mystery", "Existential sci-fi horror"]
      Input: "Romantic comedies with time travel" -> ["Sci-fi romcoms", "Time-bending love stories", "Fantasy romance series", "Temporal paradox romance"]
      Input: "Stranger Things but darker" -> ["Supernatural thrillers", "Mystery horror series", "Teen suspense dramas", "Lovecraftian horror"]
      Input: "fast paced" -> ["High-octane action", "Adrenaline-fueled heists", "Intense survival thrillers"]
      
      Return ONLY a JSON array of strings.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    return JSON.parse(jsonText);
  } catch (error) {
    console.warn("Error getting mood suggestions:", error);
    return [];
  }
};

// Fallback if API key is missing or fails (ensures app is usable for UI demo)
const mockRecommendations = (prompt: string, exclude: string[]): Recommendation[] => {
  const allMocks: Recommendation[] = [
    { title: "Inception", media_type: "movie", year: 2010, reason: "Matches 'thriller' and mind-bending." },
    { title: "Breaking Bad", media_type: "tv", year: 2008, reason: "High rated crime drama." },
    { title: "The Grand Budapest Hotel", media_type: "movie", year: 2014, reason: "Quirky comedy style." },
    { title: "Arrival", media_type: "movie", year: 2016, reason: "Thoughtful sci-fi drama." },
    { title: "The Dark Knight", media_type: "movie", year: 2008, reason: "Dark superhero crime thriller." },
    { title: "Stranger Things", media_type: "tv", year: 2016, reason: "Nostalgic sci-fi horror." },
    { title: "Parasite", media_type: "movie", year: 2019, reason: "Social satire thriller." },
    { title: "The Office", media_type: "tv", year: 2005, reason: "Classic cringe comedy." }
  ];

  return allMocks.filter(m => !exclude.includes(m.title)).slice(0, 4);
};