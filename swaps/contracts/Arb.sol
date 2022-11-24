//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

import {Ownable} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/Ownable.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {SafeMath} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/SafeMath.sol";

interface IUniswapV2Router {
  function getAmountsOut(uint256 amountIn, address[] memory path) external view returns (uint256[] memory amounts);
  function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts);
}

interface IUniswapV2Pair {
  function token0() external view returns (address);
  function token1() external view returns (address);
  function swap(uint256 amount0Out,	uint256 amount1Out,	address to,	bytes calldata data) external;
}

contract Arb is Ownable {

	using SafeMath for uint256;

	function swap(address router, address _tokenIn, address _tokenOut, uint256 _amount) internal {
		IERC20(_tokenIn).approve(router, _amount);
		address[] memory path;
		path = new address[](2);
		path[0] = _tokenIn;
		path[1] = _tokenOut;
		uint deadline = block.timestamp + 300;
		IUniswapV2Router(router).swapExactTokensForTokens(_amount, 1, path, address(this), deadline);
	}

	function getAmountOutMin(address router, address _tokenIn, address _tokenOut, uint256 _amount) public view returns (uint256) {
		address[] memory path;
		address WETH = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
		path = new address[](3);
		path[0] = _tokenIn;
		path[1] = WETH;
		path[2] = _tokenOut;
		uint256[] memory amountOutMins = IUniswapV2Router(router).getAmountsOut(_amount, path);
		return amountOutMins[path.length -1];
	}

	function estimateDualDexTrade(address _router1, address _router2, address _token1, address _token2, uint256 _amount) external view returns (uint256) {
		uint256 amtBack1 = getAmountOutMin(_router1, _token1, _token2, _amount);
		uint256 amtBack2 = getAmountOutMin(_router2, _token2, _token1, amtBack1);
		return amtBack2;
	}
	
	function dualDexTrade(address _router1, address _router2, address _token1, address _token2, uint256 _amount) internal onlyOwner {
		uint startBalance = IERC20(_token1).balanceOf(address(this)); // token1 start balance
		uint token2InitialBalance = IERC20(_token2).balanceOf(address(this)); // token2 start balance
		swap(_router1, _token1, _token2, _amount); // swap token1 for token2 for specified amount

		uint token2Balance = IERC20(_token2).balanceOf(address(this)); // token2 balance after swap
		uint tradeableAmount = token2Balance.sub(token2InitialBalance); // amount of token2 that can be traded
		swap(_router2, _token2, _token1, tradeableAmount); // swap token2 for token1 for tradeable amount

		uint endBalance = IERC20(_token1).balanceOf(address(this)); // token1 end balance
		require(endBalance > startBalance, "Trade Reverted, No Profit Made"); 
	}

	function estimateTriDexTrade(address _router1, address _router2, address _router3, address _token1, address _token2, address _token3, uint256 _amount) external view returns (uint256) {
		uint amtBack1 = getAmountOutMin(_router1, _token1, _token2, _amount);
		uint amtBack2 = getAmountOutMin(_router2, _token2, _token3, amtBack1);
		uint amtBack3 = getAmountOutMin(_router3, _token3, _token1, amtBack2);
		return amtBack3;
	}

	function triDexTrade(address _router1, address _router2, address _router3, address _token1, address _token2, address _token3, uint256 _amount) internal onlyOwner {
		uint startBalance = IERC20(_token1).balanceOf(address(this)); // token1 start balance
		uint token2InitialBalance = IERC20(_token2).balanceOf(address(this)); // token2 start balance
		uint token3InitialBalance = IERC20(_token3).balanceOf(address(this)); // token3 start balance
	
		swap(_router1, _token1, _token2, _amount); // swap token1 for token2 for specified amount

		uint token2Balance = IERC20(_token2).balanceOf(address(this)); // token2 balance after swap
		uint tradeableAmount = token2Balance.sub(token2InitialBalance); // amount of token2 that can be traded
		swap(_router2, _token3, _token2, tradeableAmount); // swap token2 for token3 for tradeable amount

		uint token3Balance = IERC20(_token3).balanceOf(address(this)); // token3 balance after swap
		uint tradeableAmountLast = token3Balance.sub(token3InitialBalance); // amount of token3 that can be traded
		swap(_router3, _token3, _token1, tradeableAmountLast); // swap token3 for token1 for tradeable amount

		uint endBalance = IERC20(_token1).balanceOf(address(this)); // token1 end balance
		require(endBalance > startBalance, "Trade Reverted, No Profit Made"); 
	}
}
