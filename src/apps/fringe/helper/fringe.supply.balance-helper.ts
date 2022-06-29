import { Inject, Injectable } from '@nestjs/common';
import { BigNumberish } from 'ethers';

import { drillBalance } from '~app-toolkit';
import { APP_TOOLKIT, IAppToolkit } from '~app-toolkit/app-toolkit.interface';
import { EthersMulticall as Multicall } from '~multicall/multicall.ethers';
import { Network } from '~types/network.interface';

import { CompoundCToken } from '../contracts';

import { FringeSupplyTokenDataProps } from './fringe.supply.token-helper';

type FringeSupplyBalanceHelperParams<T> = {
  address: string;
  network: Network;
  appId: string;
  groupId: string;
  getTokenContract: (opts: { address: string; network: Network }) => T;
  getBalanceRaw: (opts: { contract: T; multicall: Multicall; address: string }) => Promise<BigNumberish>;
};

@Injectable()
export class FringeSupplyBalanceHelper {
  constructor(@Inject(APP_TOOLKIT) private readonly appToolkit: IAppToolkit) {}

  async getBalances<T = CompoundCToken>({
    address,
    network,
    appId,
    groupId,
    getTokenContract,
    getBalanceRaw,
  }: FringeSupplyBalanceHelperParams<T>) {
    const multicall = this.appToolkit.getMulticall(network);

    const supplyTokens = await this.appToolkit.getAppTokenPositions<FringeSupplyTokenDataProps>({
      appId,
      groupIds: [groupId],
      network,
    });
    console.log(
      'supplyTokens',
      supplyTokens.map(token => token.address),
    );

    return await Promise.all(
      supplyTokens.map(async supplyToken => {
        const supplyTokenContract = getTokenContract({ address: supplyToken.address, network });
        const balanceRaw = await getBalanceRaw({ contract: supplyTokenContract, multicall, address });
        return drillBalance(supplyToken, balanceRaw.toString());
      }),
    );
  }
}
