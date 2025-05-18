// scripts/generate-embeddings.js
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
  console.error(
    'Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY'
  );
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: openaiApiKey });

async function generateEmbeddings() {
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question')
    .is('embedding', null); // Only fetch rows where embedding is null

  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }

  if (!questions || questions.length === 0) {
    console.log('No questions found with null embeddings.');
    return;
  }

  console.log(`Found ${questions.length} questions to process.`);

  for (const question of questions) {
    console.log(`Generating embedding for question ${question.id}...`);
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: question.question,
      });
      const embedding = embeddingResponse.data[0].embedding;

      const { error: updateError } = await supabase
        .from('questions')
        .update({ embedding })
        .eq('id', question.id);

      if (updateError) {
        console.error(
          `Error updating embedding for question ${question.id}:`,
          updateError
        );
      } else {
        console.log(`Updated embedding for question ${question.id}`);
      }
    } catch (error) {
      console.error(
        `Error generating embedding for question ${question.id}:`,
        error
      );
    }
  }

  console.log('Embedding generation completed.');
}

generateEmbeddings().catch((error) => {
  console.error('Error in generateEmbeddings:', error);
  process.exit(1);
});
