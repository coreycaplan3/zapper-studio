import { Inject } from '@nestjs/common';

import { Register } from '~app-toolkit/decorators';
import { FRINGE_DEFINITION, FringeBorrowContractPositionHelper } from '~apps/fringe';
import { PositionFetcher } from '~position/position-fetcher.interface';
import { ContractPosition } from '~position/position.interface';
import { Network } from '~types/network.interface';

const appId = FRINGE_DEFINITION.id;
const groupId = FRINGE_DEFINITION.groups.borrow.id;
const network = Network.ETHEREUM_MAINNET;

@Register.ContractPositionFetcher({ appId, groupId, network, options: { includeInTvl: true } })
export class EthereumFringeBorrowContractPositionFetcher implements PositionFetcher<ContractPosition> {
  constructor(
    @Inject(FringeBorrowContractPositionHelper)
    private readonly fringedBorrowContractPositionHelper: FringeBorrowContractPositionHelper,
  ) {}

  async getPositions() {
    return this.fringedBorrowContractPositionHelper.getPositions({
      network,
      appId,
      groupId,
      supplyGroupId: FRINGE_DEFINITION.groups.supply.id,
    });
  }
}
