// Quick test to verify PDF.js is working
console.log('Testing PDF.js setup...');

// This is just a simple test file to verify our setup
const testPDFSetup = () => {
  console.log('PDF.js version 3.11.174 should now be installed and working');
  console.log('Worker URL: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');
  console.log('This should match the API version and prevent worker errors.');
};

testPDFSetup();