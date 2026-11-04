globalThis.window = {
  addEventListener: () => {},
  location: { search: '', hash: '', pathname: '', hostname: 'localhost' }
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => []
};

const { cleanStudentName, formatMatrixStudentName } = await import('../js/api.js');

const list = [
  "Test",
  "Abdul Basit",
  "Abdul Qoyyim Hanif Dahuri",
  "Adinda Karunia Farela",
  "Alfina Damayanti",
  "Ayya Sofyandi Mzeth",
  "Cinta Laura",
  "Havvina Soleha",
  "Isnantika Salsabila",
  "Lalu Arman Maulana",
  "Lalu Nune Mubarak",
  "Lalu Yuda Handika Prawira",
  "Muhamad Alifurrahman",
  "Muhammad Afyani Farobi",
  "Muhammad Ariwil Asrori",
  "Baiq Nurul",
  "Baiq Sintia Dewi Pertiwi",
  "Riska Fetrosia",
  "Sari Hikmah",
  "Wildian Yusroni"
];

console.log("=== TESTING formatMatrixStudentName ===");
let allFit = true;
list.forEach(name => {
  const formatted = formatMatrixStudentName(name, 19);
  const fits = formatted.length <= 20;
  if (!fits) allFit = false;
  console.log(`Original: "${name}" (${name.length} chars) -> Formatted: "${formatted}" (${formatted.length} chars) | Fits: ${fits}`);
});

if (!allFit) {
  console.error("FAIL: Some names exceed threshold!");
  process.exit(1);
} else {
  console.log("\nSUCCESS: All student names formatted and fit properly!");
}
