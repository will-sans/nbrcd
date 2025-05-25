import type { NextApiRequest, NextApiResponse } from 'next';
import { PostgrestError } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { createClient } from '@/utils/supabase/server';

// Read environment variables
const openaiApiKey = process.env.OPENAI_API_KEY;

// Validate environment variables
if (!openaiApiKey) {
  throw new Error(
    'Missing required environment variable. Ensure OPENAI_API_KEY is set.'
  );
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Interface for the response data
interface SimilaritySearchResult {
  id: number;
  question: string;
  learning: string;
  quote: string;
  category: string;
  book: string;
  chapter: string;
  similarity: number;
}

// Utility function to randomly select N items from an array
function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

// API handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { query } = req.body;

  // Validate input
  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return res.status(400).json({
      error:
        'Invalid or too short query. Please provide a query with at least 3 characters.',
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(req, res);

    // Step 1: Generate embedding for the user's query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query.trim(),
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Step 2: Perform similarity search using the search_questions function
    const { data: matches, error: searchError } = (await supabase.rpc(
      'search_questions',
      {
        query_embedding: queryEmbedding,
        match_count: 30, // Increased to fetch top 30 matches
      }
    )) as { data: SimilaritySearchResult[]; error: PostgrestError | null };

    if (searchError) {
      console.error('Error performing similarity search:', searchError);
      return res
        .status(500)
        .json({ error: 'Failed to perform similarity search.' });
    }

    if (!matches || matches.length === 0) {
      return res.status(404).json({ error: 'No matching questions found.' });
    }

    // Step 3: Randomly select 3 results from the top 30
    const selectedMatches = getRandomItems(matches, 3);

    // Step 4: Format the results
    const results: SimilaritySearchResult[] = selectedMatches.map((match) => ({
      id: match.id,
      question: match.question,
      learning: match.learning,
      quote: match.quote,
      category: match.category,
      book: match.book,
      chapter: match.chapter,
      similarity: match.similarity,
    }));

    // Step 5: Return the results
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Error in similarity search:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
