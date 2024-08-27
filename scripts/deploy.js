const hre = require("hardhat");

async function main() {
  // Obtén la cuenta que está desplegando el contrato (el primer signer)
  const [deployer] = await hre.ethers.getSigners();

  // Despliega el contrato `Curios` pasando la dirección del desplegador como el propietario inicial
  const deployedContract = await hre.ethers.deployContract("Curios", [deployer.address]);

  // Espera a que el despliegue se complete
  await deployedContract.waitForDeployment();

  // Muestra la dirección del contrato desplegado
  console.log(`Curios contract deployed to ${deployedContract.target}`);
  console.log(`Contract deployed by: ${deployer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
