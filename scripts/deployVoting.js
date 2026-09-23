import hre from "hardhat";

async function main() {

    const { ethers } = await hre.network.connect();

    const Voting = await ethers.getContractFactory("Voting");

    const voting = await Voting.deploy();

    await voting.waitForDeployment();

    const address = await voting.getAddress();

    console.log("Voting contract deployed to:");
    console.log(address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});