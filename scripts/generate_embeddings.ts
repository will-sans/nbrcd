import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Read environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
  throw new Error(
    'Missing required environment variables. Ensure SUPABASE_URL, SUPABASE_KEY, and OPENAI_API_KEY are set in .env.local.'
  );
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Utility function to delay execution (for rate limiting)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to generate embeddings with retry logic
async function generateEmbeddingWithRetry(
  text: string,
  retries = 3,
  delayMs = 1000
): Promise<number[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return embeddingResponse.data[0].embedding;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(
          `Failed to generate embedding after ${retries} attempts: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      console.warn(`Attempt ${attempt} failed. Retrying after ${delayMs}ms...`);
      await delay(delayMs);
    }
  }
  throw new Error('Unexpected error: Retry loop completed without returning.');
}

// Function to generate embeddings for the questions table in batches
async function generateEmbeddings(batchSize = 10) {
  try {
    // Step 1: Fetch all rows from the questions table where embedding is null
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select('id, question, learning, category')
      .is('embedding', null); // Only fetch rows that need embeddings

    if (fetchError) {
      throw new Error(`Error fetching questions: ${fetchError.message}`);
    }

    console.log(`Fetched ${questions.length} questions needing embeddings.`);

    if (questions.length === 0) {
      console.log('No questions need embeddings. Exiting.');
      return;
    }

    // Step 2: Process questions in batches
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(questions.length / batchSize)}...`
      );

      // Generate embeddings for the batch
      const updatePromises = batch.map(async (question) => {
        try {
          // Concatenate question, learning, and category into a single string
          const textToEmbed = `${question.question} ${question.learning} ${question.category}`;

          // Generate embedding with retry logic
          const embedding = await generateEmbeddingWithRetry(textToEmbed);

          // Update the embedding column in the questions table
          const { error: updateError } = await supabase
            .from('questions')
            .update({ embedding })
            .eq('id', question.id);

          if (updateError) {
            console.error(
              `Error updating embedding for question ID ${question.id}: ${updateError.message}`
            );
            return {
              id: question.id,
              success: false,
              error: updateError.message,
            };
          }

          console.log(
            `Successfully updated embedding for question ID ${question.id}`
          );
          return { id: question.id, success: true };
        } catch (error) {
          console.error(
            `Error processing question ID ${question.id}: ${error instanceof Error ? error.message : String(error)}`
          );
          return {
            id: question.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      // Wait for all updates in the batch to complete
      const results = await Promise.all(updatePromises);
      const failed = results.filter((result) => !result.success);

      if (failed.length > 0) {
        console.warn(
          `Failed to update embeddings for ${failed.length} questions in this batch:`
        );
        failed.forEach((fail) =>
          console.warn(`- ID ${fail.id}: ${fail.error}`)
        );
      }

      // Delay between batches to avoid rate limiting
      if (i + batchSize < questions.length) {
        console.log('Pausing for 1 second to avoid rate limiting...');
        await delay(1000);
      }
    }

    console.log('Embedding generation completed successfully.');
  } catch (error) {
    console.error(
      'Error generating embeddings:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Run the function with a batch size of 10
generateEmbeddings(10);
