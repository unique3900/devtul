#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up AI-Powered Accessibility Scanner...\n');

// Install Node.js dependencies
console.log('📦 Installing Node.js dependencies...');
try {
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  console.log('✅ Node.js dependencies installed successfully!\n');
} catch (error) {
  console.error('❌ Failed to install Node.js dependencies');
  process.exit(1);
}

// Install Python dependencies
console.log('🐍 Installing Python dependencies...');
try {
  execSync('python -m pip install google-generativeai beautifulsoup4 lxml requests', { stdio: 'inherit' });
  console.log('✅ Python dependencies installed successfully!\n');
} catch (error) {
  console.warn('⚠️  Python dependencies installation failed. You may need to install them manually:');
  console.warn('   cd python_agent && pip install -r requirements.txt\n');
}

// Create necessary directories
console.log('📁 Creating necessary directories...');
const dirs = ['downloads', 'screenshots'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   Created: ${dir}/`);
  }
});

// Create .env.local if it doesn't exist
if (!fs.existsSync('.env.local')) {
  console.log('🔑 Creating environment file...');
  fs.writeFileSync('.env.local', `# AI-Powered Accessibility Scanner Environment Variables
GEMINI_API_KEY=AIzaSyCH5kpJdB_4cFbCbCkUzLKDhS2C6HHIxyg
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
`);
  console.log('   Created: .env.local');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📖 Next steps:');
console.log('   1. Run: npm run dev');
console.log('   2. Open: http://localhost:3000');
console.log('   3. Try the demo at: http://localhost:3000/demo');
console.log('   4. Explore playground at: http://localhost:3000/playground');
console.log('\n🔧 Features available:');
console.log('   • Advanced website scraping with Puppeteer');
console.log('   • WCAG 2.1 A/AA/AAA compliance analysis');
console.log('   • AI-powered accessibility fixes');
console.log('   • Before/after comparison with magic slider');
console.log('   • Interactive playground with templates');
console.log('   • Python RAG agent for optimized processing');
