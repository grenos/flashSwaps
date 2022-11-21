# TODO

## Trade.js

-   [] Find a way to understand the error when a route is not available and remove routes from local variable if they're not active.
-   [x] Calculate aave loan fee and add it to the calculation before doing the actual trade.
-   [x] Determine if actual calculation for `profitTarget` works correctly.
-   [x] Fix `dualTrade` to use ethers/truffle and call the right contract method (`requestFlashLoan`)
-   [] Setup wallet with tokens
-   [] Deploy contracts in Mainet Polygon
-   [] Test 1 token swaps with 0 bps to better uderstand gas fees.
-   [] Gradually up the token ammount to get more accurate gas fees.

# Comments

## Basis Points

        /*
            One basis point is equal to 1/100th of 1%, or 0.01%.
            In decimal form, one basis point appears as 0.0001 (0.01/100).
            Basis points (BPS) are used to show the change in the value or rate of a financial instrument,
            such as 1% change equals a change of 100 basis points and 0.01% change equals one basis point.

            1. "Using 1 as initial basis points and 300 as initial trade asset we will make trades that return more than 300.03"
            2. "Using 10 as initial basis points and 300 as initial trade asset we will make trades that return more than 300.3"
            3. "Using 100 as initial basis points and 300 as initial trade asset we will make trades that return more than 303"
        */
