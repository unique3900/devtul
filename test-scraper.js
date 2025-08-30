// Simple test script to verify scraping functionality
const testUrl = "https://example.com";

async function testScraper() {
  try {
    console.log("Testing scraper with:", testUrl);
    
    const response = await fetch("http://localhost:3000/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: testUrl }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("Scraping successful:", result);
    
  } catch (error) {
    console.error("Scraping failed:", error);
  }
}

// Run test if this script is executed directly
if (typeof window === 'undefined') {
  testScraper();
}
