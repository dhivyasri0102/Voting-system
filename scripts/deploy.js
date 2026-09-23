// scripts/deploy.js
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545');
  const adminKey = process.env.ADMIN_PRIVATE_KEY;
  if (!adminKey) {
    console.error('ADMIN_PRIVATE_KEY not set in .env');
    process.exit(1);
  }
  const wallet = new ethers.Wallet(adminKey, provider);
  console.log('Deploying Voting contract...');
  console.log('Admin:', wallet.address);

  const votingFactory = await ethers.getContractFactory('Voting', wallet);
  const voting = await votingFactory.deploy();
  await voting.waitForDeployment();
  const address = await voting.getAddress();
  console.log('Voting Contract:', address);

  // Write address to .env for frontend
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  const newLine = `VITE_VOTING_CONTRACT_ADDRESS=${address}\n`;
  if (!envContent.includes('VITE_VOTING_CONTRACT_ADDRESS')) {
    fs.appendFileSync(envPath, newLine);
  } else {
    // replace existing line
    const updated = envContent.replace(/VITE_VOTING_CONTRACT_ADDRESS=.*/g, newLine.trim());
    fs.writeFileSync(envPath, updated);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
