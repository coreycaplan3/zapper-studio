import { Inject } from '@nestjs/common';

import { Register } from '~app-toolkit/decorators';
import { FRINGE_DEFINITION, FringeSupplyTokenHelper } from '~apps/fringe';
import { PositionFetcher } from '~position/position-fetcher.interface';
import { AppTokenPosition } from '~position/position.interface';
import { Network } from '~types/network.interface';

import { FringeContractFactory } from '../contracts';

const appId = FRINGE_DEFINITION.id;
const groupId = FRINGE_DEFINITION.groups.supply.id;
const network = Network.ETHEREUM_MAINNET;

@Register.TokenPositionFetcher({ appId, groupId, network, options: { includeInTvl: true } })
export class EthereumFringeSupplyTokenFetcher implements PositionFetcher<AppTokenPosition> {
  constructor(
    @Inject(FringeContractFactory) private readonly fringeContractFactory: FringeContractFactory,
    @Inject(FringeSupplyTokenHelper) private readonly fringeSupplyTokenHelper: FringeSupplyTokenHelper,
  ) {}

  async getPositions() {
    return this.fringeSupplyTokenHelper.getTokens({
      network,
      appId,
      groupId,
      plpAddress: '0x46558DA82Be1ae1955DE6d6146F8D2c1FE2f9C5E',
      getPlpContract: ({ address, network }) => this.fringeContractFactory.plp({ address, network }),
      getTokenContract: ({ address, network }) => this.fringeContractFactory.compoundCToken({ address, network }),
      getAllCollateralMarkets: async ({ contract }) => {
        const allMarkets = {};
        const projectTokensLength = await contract.projectTokensLength();
        for (let i = 0; i < projectTokensLength.toNumber(); i++) {
          const projectToken = await contract.projectTokens(i.toString());
          allMarkets[projectToken] = projectToken;
        }
        return Object.values(allMarkets);
      },
      getAllLendingMarkets: async ({ contract }) => {
        const allMarkets = {};
        const lendingTokensLength = await contract.lendingTokensLength();
        for (let i = 0; i < lendingTokensLength.toNumber(); i++) {
          const lendingToken = await contract.lendingTokens(i.toString());
          allMarkets[lendingToken] = (await contract.lendingTokenInfo(lendingToken)).bLendingToken;
        }
        return Object.values(allMarkets);
      },
      getExchangeRate: ({ contract, multicall }) => multicall.wrap(contract).exchangeRateCurrent(),
      getSupplyRate: ({ contract, multicall }) => multicall.wrap(contract).supplyRatePerBlock(),
      getBorrowRate: ({ contract, multicall }) => multicall.wrap(contract).borrowRatePerBlock(),
      getUnderlyingAddress: ({ contract, multicall }) => multicall.wrap(contract).underlying(),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getExchangeRateMantissa: ({ underlyingTokenDecimals }) => 18,
    });
  }
}
