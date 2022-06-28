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
      plpAddress: '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b',
      getPlpContract: ({ address, network }) => this.fringeContractFactory.plp({ address, network }),
      getTokenContract: ({ address, network }) => this.fringeContractFactory.compoundCToken({ address, network }),
      getAllMarkets: async ({ contract, multicall }) => {
        const allMarkets = {};
        const lendingTokensLength = await multicall.wrap(contract).lendingTokensLength();
        for (let i = 0; i < lendingTokensLength.toNumber(); i++) {
          const lendingToken = await multicall.wrap(contract).lendingTokens(i.toString());
          allMarkets[lendingToken] = lendingToken;
        }
        const projectTokensLength = await multicall.wrap(contract).projectTokensLength();
        for (let i = 0; i < projectTokensLength.toNumber(); i++) {
          const projectToken = await multicall.wrap(contract).projectTokens(i.toString());
          allMarkets[projectToken] = projectToken;
        }
        return Object.keys(allMarkets);
      },
      getExchangeRate: ({ contract, multicall }) => multicall.wrap(contract).exchangeRateCurrent(),
      getSupplyRate: ({ contract, multicall }) => multicall.wrap(contract).supplyRatePerBlock(),
      getBorrowRate: ({ contract, multicall }) => multicall.wrap(contract).borrowRatePerBlock(),
      getUnderlyingAddress: ({ contract, multicall }) => multicall.wrap(contract).underlying(),
      getExchangeRateMantissa: ({ underlyingTokenDecimals }) => underlyingTokenDecimals + 10,
    });
  }
}
