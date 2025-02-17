import { Inject } from '@nestjs/common';

import { Register } from '~app-toolkit/decorators';
import { PositionFetcher } from '~position/position-fetcher.interface';
import { AppTokenPosition } from '~position/position.interface';
import { Network } from '~types/network.interface';

import { CURVE_DEFINITION } from '../curve.definition';
import { CurveFactoryPoolTokenHelper } from '../helpers/curve.factory-pool.token-helper';
import { CurveV1PoolTokenHelper } from '../helpers/curve.v1-pool.token-helper';
import { CurveV2PoolTokenHelper } from '../helpers/curve.v2-pool.token-helper';

import { CURVE_V1_POOL_DEFINITIONS, CURVE_V2_POOL_DEFINITIONS } from './curve.pool.definitions';

const appId = CURVE_DEFINITION.id;
const groupId = CURVE_DEFINITION.groups.pool.id;
const network = Network.ARBITRUM_MAINNET;

@Register.TokenPositionFetcher({ appId, groupId, network, options: { includeInTvl: true } })
export class ArbitrumCurvePoolTokenFetcher implements PositionFetcher<AppTokenPosition> {
  constructor(
    @Inject(CurveV1PoolTokenHelper)
    private readonly curveV1PoolTokenHelper: CurveV1PoolTokenHelper,
    @Inject(CurveV2PoolTokenHelper)
    private readonly curveV2PoolTokenHelper: CurveV2PoolTokenHelper,
    @Inject(CurveFactoryPoolTokenHelper)
    private readonly curveFactoryPoolTokenHelper: CurveFactoryPoolTokenHelper,
  ) {}

  async getPositions() {
    const [v1Pools] = await Promise.all([
      this.curveV1PoolTokenHelper.getTokens({
        network,
        appId,
        groupId,
        poolDefinitions: CURVE_V1_POOL_DEFINITIONS,
        statsUrl: 'https://stats.curve.fi/raw-stats-arbitrum/apys.json',
      }),
    ]);

    const [v2Pools, v2FactoryPools] = await Promise.all([
      this.curveV2PoolTokenHelper.getTokens({
        network,
        appId,
        groupId,
        poolDefinitions: CURVE_V2_POOL_DEFINITIONS,
        statsUrl: 'https://stats.curve.fi/raw-stats-arbitrum/apys.json',
        baseCurveTokens: v1Pools,
      }),
      this.curveFactoryPoolTokenHelper.getTokens({
        factoryAddress: '0xb17b674d9c5cb2e441f8e196a2f048a81355d031',
        network,
        appId,
        groupId,
        baseCurveTokens: v1Pools,
        skipVolume: true, // Arbitrum public RPC can't handle this
      }),
    ]);

    return [v1Pools, v2Pools, v2FactoryPools].flat();
  }
}
