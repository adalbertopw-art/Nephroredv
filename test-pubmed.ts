
import { fetchPubMedArticles } from './services/pubmedService.js';

async function test() {
  try {
    console.log("Starting test...");
    const result = await fetchPubMedArticles('chronic kidney disease', 'original', undefined, 1, 0, false);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Test error:", err);
  }
}

test();
