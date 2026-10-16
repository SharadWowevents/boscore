const bcrypt = require("bcrypt");

async function main() {
  const commonPassword = "Wowos@2026";
  const hash = await bcrypt.hash(commonPassword, 10);

  console.log("Password:", commonPassword);
  console.log("Bcrypt hash:", hash);
}

main()