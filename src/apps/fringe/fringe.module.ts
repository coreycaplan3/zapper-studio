import { Register } from '~app-toolkit/decorators';
import { AbstractApp } from '~app/app.dynamic-module';

import { FringeContractFactory } from './contracts';
import { EthereumFringeBalanceFetcher } from './ethereum/fringe.balance-fetcher';
import { EthereumFringeBorrowContractPositionFetcher } from './ethereum/fringe.borrow.contract-position-fetcher';
import { EthereumFringeSupplyTokenFetcher } from './ethereum/fringe.supply.token-fetcher';
import { FringeAppDefinition, FRINGE_DEFINITION } from './fringe.definition';
import { FringeBorrowBalanceHelper } from './helper/fringe.borrow.balance-helper';
import { FringeBorrowContractPositionHelper } from './helper/fringe.borrow.contract-position-helper';
import { FringeClaimableBalanceHelper } from './helper/fringe.claimable.balance-helper';
import { FringeLendingMetaHelper } from './helper/fringe.lending.meta-helper';
import { FringeSupplyBalanceHelper } from './helper/fringe.supply.balance-helper';
import { FringeSupplyTokenHelper } from './helper/fringe.supply.token-helper';

@Register.AppModule({
  appId: FRINGE_DEFINITION.id,
  providers: [
    FringeAppDefinition,
    FringeContractFactory,
    EthereumFringeBalanceFetcher,
    EthereumFringeSupplyTokenFetcher,
    EthereumFringeBorrowContractPositionFetcher,
    // Helpers
    FringeClaimableBalanceHelper,
    FringeLendingMetaHelper,
    FringeSupplyTokenHelper,
    FringeSupplyBalanceHelper,
    FringeBorrowContractPositionHelper,
    FringeBorrowBalanceHelper,
    FringeContractFactory,
  ],
  exports: [
    FringeClaimableBalanceHelper,
    FringeLendingMetaHelper,
    FringeSupplyTokenHelper,
    FringeSupplyBalanceHelper,
    FringeBorrowContractPositionHelper,
    FringeBorrowBalanceHelper,
    FringeContractFactory,
  ],
})
export class FringeAppModule extends AbstractApp() {}
