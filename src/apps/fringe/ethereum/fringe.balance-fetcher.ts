import { Inject } from '@nestjs/common';

import { Register } from '~app-toolkit/decorators';
import { presentBalanceFetcherResponse } from '~app-toolkit/helpers/presentation/balance-fetcher-response.present';
import { FRINGE_DEFINITION } from '~apps/fringe';
import { FringeBorrowBalanceHelper } from '~apps/fringe';
import { FringeClaimableBalanceHelper } from '~apps/fringe';
import { FringeLendingMetaHelper } from '~apps/fringe';
import { FringeSupplyBalanceHelper } from '~apps/fringe';
import { BalanceFetcher } from '~balance/balance-fetcher.interface';
import { Network } from '~types/network.interface';

import { FringeContractFactory } from '../contracts';

const appId = FRINGE_DEFINITION.id;
const network = Network.ETHEREUM_MAINNET;

@Register.BalanceFetcher(appId, network)
export class EthereumFringeBalanceFetcher implements BalanceFetcher {
  constructor(
    @Inject(FringeBorrowBalanceHelper)
    private readonly fringeBorrowBalanceHelper: FringeBorrowBalanceHelper,
    @Inject(FringeSupplyBalanceHelper)
    private readonly fringeSupplyBalanceHelper: FringeSupplyBalanceHelper,
    @Inject(FringeClaimableBalanceHelper)
    private readonly fringeClaimableBalanceHelper: FringeClaimableBalanceHelper,
    @Inject(FringeLendingMetaHelper)
    private readonly fringeLendingMetaHelper: FringeLendingMetaHelper,
    @Inject(FringeContractFactory)
    private readonly compoundContractFactory: FringeContractFactory,
  ) {}

  async getSupplyBalances(address: string) {
    return this.fringeSupplyBalanceHelper.getBalances({
      address,
      appId,
      groupId: FRINGE_DEFINITION.groups.supply.id,
      network,
      getTokenContract: ({ address, network }) => this.compoundContractFactory.compoundCToken({ address, network }),
      getBalanceRaw: ({ contract, address, multicall }) => multicall.wrap(contract).balanceOf(address),
    });
  }

  async getBorrowBalances(address: string) {
    return this.fringeBorrowBalanceHelper.getBalances({
      address,
      appId,
      groupId: FRINGE_DEFINITION.groups.borrow.id,
      network,
      getTokenContract: ({ address, network }) => this.compoundContractFactory.compoundCToken({ address, network }),
      getBorrowBalanceRaw: ({ contract, address, multicall }) => multicall.wrap(contract).borrowBalanceCurrent(address),
    });
  }

  async getClaimableBalances(address: string) {
    return this.fringeClaimableBalanceHelper.getBalances({
      address,
      appId,
      groupId: FRINGE_DEFINITION.groups.claimable.id,
      network,
      rewardTokenAddress: '0xC9fE6E1C76210bE83DC1B5b20ec7FD010B0b1D15',
      plpAddress: '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b',
    });
  }

  async getBalances(address: string) {
    const [supplyBalances, borrowBalances, claimableBalances] = await Promise.all([
      this.getSupplyBalances(address),
      this.getBorrowBalances(address),
      this.getClaimableBalances(address),
    ]);

    const meta = this.fringeLendingMetaHelper.getMeta({ balances: [...supplyBalances, ...borrowBalances] });
    const claimableProduct = { label: 'Claimable', assets: claimableBalances };
    const lendingProduct = { label: 'Lending', assets: [...supplyBalances, ...borrowBalances], meta };

    return presentBalanceFetcherResponse([lendingProduct, claimableProduct]);
  }
}
