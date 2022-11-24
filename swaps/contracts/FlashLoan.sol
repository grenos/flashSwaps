// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {SafeMath} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/SafeMath.sol";
import "./Arb.sol";

contract FlashLoan is FlashLoanSimpleReceiverBase, Arb {

    using SafeMath for uint256;

    constructor(address _addressProvider) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) {
    }

    /**
     * @notice Executes an operation after receiving the flash-borrowed asset
     * @dev Ensure that the contract can return the debt + premium, e.g., has enough funds to repay and has approved the Pool to pull the total amount
     * @param asset The address of the flash-borrowed asset
     * @param amount The amount of the flash-borrowed asset
     * @param premium The fee of the flash-borrowed asset
     * @param initiator The address of the flashloan initiator
     * @param params The byte-encoded params passed when initiating the flashloan
     * @return True if the execution of the operation succeeds, false otherwise
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "This function can only be called by the Aave Pool");
        require(amount <= IERC20(asset).balanceOf(address(this)), "Invalid balance for the contract");
        require(IERC20(asset).balanceOf(address(this)) > 0, "Zero balance in contract");

        // Your Arb logic goes here.
        (address[] memory _swappingPair, address[] memory _routesPair) = abi.decode(params, (address[], address[]));

        if (_swappingPair.length == 3 && _routesPair.length == 3) {
            triDexTrade(_routesPair[0], _routesPair[1], _routesPair[2], _swappingPair[0], _swappingPair[1], _swappingPair[2], amount);
        } else {
            dualDexTrade(_routesPair[0], _routesPair[1], _swappingPair[0], _swappingPair[1], amount);
        }

        // Make sure to have this call at the end
        uint256 amountOwed = amount.add(premium);
        require(IERC20(asset).balanceOf(address(this)) >= amountOwed, "Not enough amount to return loan");
        require(IERC20(asset).approve(address(POOL), amountOwed), "approve failed");
        return true;
    }


    function requestFlashLoan(address _asset, uint256 _amount, address[] calldata _routesPair, address[] calldata _swappingPair) public onlyOwner {
        require(address(POOL) != address(0), "POOL does not exist!");

        address receiverAddress = address(this);
        address asset = _asset;
        uint256 amount = _amount;
        bytes memory params = abi.encode(_swappingPair, _routesPair);
        uint16 referralCode = 0;

        /**
         * @notice Allows smartcontracts to access the liquidity of the pool within one transaction,
         * as long as the amount taken plus a fee is returned.
         * @dev IMPORTANT There are security concerns for developers of flashloan receiver contracts that must be kept
         * into consideration. For further details please visit https://developers.aave.com
         * @param receiverAddress The address of the contract receiving the funds, implementing IFlashLoanSimpleReceiver interface
         * @param asset The address of the asset being flash-borrowed
         * @param amount The amount of the asset being flash-borrowed
         * @param params Variadic packed params to pass to the receiver as extra information
         * @param referralCode The code used to register the integrator originating the operation, for potential rewards.
         *   0 if the action is executed directly by the user, without any middle-man
         **/
        POOL.flashLoanSimple(receiverAddress, asset, amount, params, referralCode);
    }


    function getTokenBalance (address _tokenContractAddress) external view returns (uint256) {
		uint balance = IERC20(_tokenContractAddress).balanceOf(address(this));
		return balance;
	}
	
	function recoverEth() external onlyOwner {
		payable(msg.sender).transfer(address(this).balance);
	}

	function recoverTokens(address tokenAddress) external onlyOwner {
		IERC20 token = IERC20(tokenAddress);
		token.transfer(msg.sender, token.balanceOf(address(this)));
	}

	receive() external payable {}
}