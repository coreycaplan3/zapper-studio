import { Inject, Injectable } from '@nestjs/common';
import { BigNumber, BigNumberish } from 'ethers';
import _ from 'lodash';

import { APP_TOOLKIT, IAppToolkit } from '~app-toolkit/app-toolkit.interface';
import { ETH_ADDR_ALIAS, ZERO_ADDRESS } from '~app-toolkit/constants/address';
import { BLOCKS_PER_DAY } from '~app-toolkit/constants/blocks';
import {
  buildDollarDisplayItem,
  buildPercentageDisplayItem,
} from '~app-toolkit/helpers/presentation/display-item.present';
import { getTokenImg } from '~app-toolkit/helpers/presentation/image.present';
import { EthersMulticall as Multicall } from '~multicall/multicall.ethers';
import { ContractType } from '~position/contract.interface';
import { BalanceDisplayMode } from '~position/display.interface';
import { AppTokenPosition, ExchangeableAppTokenDataProps, Token } from '~position/position.interface';
import { AppGroupsDefinition } from '~position/position.service';
import { BaseToken } from '~position/token.interface';
import { Network } from '~types/network.interface';

import { IFringePrimaryIndexToken, FringeContractFactory, CompoundCToken } from '../contracts';

export type FringeSupplyTokenDataProps = ExchangeableAppTokenDataProps & {
  supplyApy: number;
  borrowApy: number;
  liquidity: number;
  marketName?: string;
  plpAddress: string;
};

type FringeSupplyTokenHelperParams<T = IFringePrimaryIndexToken, V = CompoundCToken> = {
  network: Network;
  appId: string;
  groupId: string;
  dependencies?: AppGroupsDefinition[];
  allTokens?: (BaseToken | AppTokenPosition)[];
  plpAddress: string;
  marketName?: string;
  getPlpContract: (opts: { address: string; network: Network }) => T;
  getTokenContract: (opts: { address: string; network: Network }) => V;
  getAllCollateralMarkets: (opts: { contract: T; multicall: Multicall }) => string[] | Promise<string[]>;
  getAllLendingMarkets: (opts: { contract: T; multicall: Multicall }) => string[] | Promise<string[]>;
  getExchangeRate: (opts: { contract: V; multicall: Multicall }) => Promise<BigNumberish>;
  getSupplyRate: (opts: { contract: V; multicall: Multicall }) => Promise<BigNumberish>;
  getBorrowRate: (opts: { contract: V; multicall: Multicall }) => Promise<BigNumberish>;
  getSupplyRateLabel?: () => string;
  getUnderlyingAddress: (opts: { contract: V; multicall: Multicall }) => Promise<string>;
  getExchangeRateMantissa: (opts: { tokenDecimals: number; underlyingTokenDecimals: number }) => number;
  getDisplayLabel?: (opts: { contract: V; multicall: Multicall; underlyingToken: Token }) => Promise<string>;
  getDenormalizedRate?: (opts: { rate: BigNumberish; blocksPerDay: number; decimals: number }) => number;
  exchangeable?: boolean;
};

@Injectable()
export class FringeSupplyTokenHelper {
  constructor(
    @Inject(FringeContractFactory) private readonly contractFactory: FringeContractFactory,
    @Inject(APP_TOOLKIT) private readonly appToolkit: IAppToolkit,
  ) {}

  async getTokens<T = IFringePrimaryIndexToken, V = CompoundCToken>({
    plpAddress,
    marketName,
    network,
    appId,
    groupId,
    exchangeable = false,
    dependencies = [],
    allTokens = [],
    getPlpContract,
    getTokenContract,
    getAllCollateralMarkets,
    getAllLendingMarkets,
    getExchangeRate,
    getSupplyRate,
    getBorrowRate,
    getSupplyRateLabel = () => 'APY',
    getUnderlyingAddress,
    getExchangeRateMantissa,
    getDisplayLabel,
    getDenormalizedRate = ({ blocksPerDay, rate }) =>
      Math.pow(1 + (blocksPerDay * Number(rate)) / Number(1e18), 365) - 1,
  }: FringeSupplyTokenHelperParams<T, V>) {
    const multicall = this.appToolkit.getMulticall(network);

    if (!allTokens.length) {
      const baseTokens = await this.appToolkit.getBaseTokenPrices(network);
      const appTokens = await this.appToolkit.getAppTokenPositions(...dependencies);
      allTokens.push(...appTokens, ...baseTokens);
    }

    const plpContract = getPlpContract({ network, address: plpAddress });
    const lendingTokenAddressesRaw = await getAllLendingMarkets({ contract: plpContract, multicall });
    const lendingTokens = lendingTokenAddressesRaw.map(async marketTokenAddressRaw =>
      this.mapTokenDataToSupplyTokenHelper(marketTokenAddressRaw, true, multicall, {
        plpAddress,
        marketName,
        network,
        appId,
        groupId,
        exchangeable,
        dependencies,
        allTokens,
        getPlpContract,
        getTokenContract,
        getAllCollateralMarkets,
        getAllLendingMarkets,
        getExchangeRate,
        getSupplyRate,
        getBorrowRate,
        getSupplyRateLabel,
        getUnderlyingAddress,
        getExchangeRateMantissa,
        getDisplayLabel,
        getDenormalizedRate,
      }),
    );

    const collateralTokenAddressesRaw = await getAllCollateralMarkets({ contract: plpContract, multicall });
    const collateralTokens = collateralTokenAddressesRaw.map(async marketTokenAddressRaw =>
      this.mapTokenDataToSupplyTokenHelper(marketTokenAddressRaw, false, multicall, {
        plpAddress,
        marketName,
        network,
        appId,
        groupId,
        exchangeable,
        dependencies,
        allTokens,
        getPlpContract,
        getTokenContract,
        getAllCollateralMarkets,
        getAllLendingMarkets,
        getExchangeRate,
        getSupplyRate,
        getBorrowRate,
        getSupplyRateLabel,
        getUnderlyingAddress,
        getExchangeRateMantissa,
        getDisplayLabel,
        getDenormalizedRate,
      }),
    );

    const tokens = await Promise.all([lendingTokens, collateralTokens].flat());
    return _.compact(tokens);
  }

  async mapTokenDataToSupplyTokenHelper<T = IFringePrimaryIndexToken, V = CompoundCToken>(
    marketTokenAddressRaw: string,
    isCToken: boolean,
    multicall: Multicall,
    {
      plpAddress,
      marketName,
      network,
      appId,
      groupId,
      exchangeable = false,
      allTokens = [],
      getTokenContract,
      getExchangeRate,
      getSupplyRate,
      getBorrowRate,
      getSupplyRateLabel = () => 'APY',
      getUnderlyingAddress,
      getExchangeRateMantissa,
      getDisplayLabel,
      getDenormalizedRate = ({ blocksPerDay, rate }) =>
        Math.pow(1 + (blocksPerDay * Number(rate)) / Number(1e18), 365) - 1,
    }: FringeSupplyTokenHelperParams<T, V>,
  ) {
    const address = marketTokenAddressRaw.toLowerCase();
    const erc20TokenContract = this.contractFactory.erc20({ address, network });
    const contract = getTokenContract({ address, network });

    const underlyingAddress = isCToken
      ? await getUnderlyingAddress({ contract, multicall })
          .then(t => t.toLowerCase().replace(ETH_ADDR_ALIAS, ZERO_ADDRESS))
          .catch(() => ZERO_ADDRESS)
      : address;

    const underlyingToken = allTokens.find(v => v.address === underlyingAddress);
    if (!underlyingToken) return null;

    const ONE = BigNumber.from('1000000000000000000');

    const [symbol, decimals, supplyRaw, rateRaw, supplyRateRaw, borrowRateRaw] = await Promise.all([
      multicall.wrap(erc20TokenContract).symbol(),
      multicall.wrap(erc20TokenContract).decimals(),
      isCToken
        ? multicall.wrap(erc20TokenContract).totalSupply()
        : multicall.wrap(erc20TokenContract).balanceOf(plpAddress),
      isCToken ? getExchangeRate({ contract, multicall }) : Promise.resolve(ONE),
      isCToken ? getSupplyRate({ contract, multicall }).catch(() => 0) : Promise.resolve(ONE),
      isCToken ? getBorrowRate({ contract, multicall }).catch(() => 0) : Promise.resolve(ONE),
    ]);

    // Data Props
    const type = ContractType.APP_TOKEN;
    const supply = Number(supplyRaw) / 10 ** decimals;
    const underlyingTokenDecimals = underlyingToken.decimals;
    const mantissa = getExchangeRateMantissa({ tokenDecimals: decimals, underlyingTokenDecimals });
    const pricePerShare = Number(rateRaw) / 10 ** mantissa;
    const price = pricePerShare * underlyingToken.price;
    const liquidity = price * supply;
    const tokens = [underlyingToken];
    const blocksPerDay = BLOCKS_PER_DAY[network];
    const supplyApy = isCToken
      ? getDenormalizedRate({
          blocksPerDay,
          rate: supplyRateRaw,
          decimals: underlyingToken.decimals,
        })
      : 0;
    const borrowApy = isCToken
      ? getDenormalizedRate({
          blocksPerDay,
          rate: borrowRateRaw,
          decimals: underlyingToken.decimals,
        })
      : 0;

    // Display Props
    const label = getDisplayLabel
      ? await getDisplayLabel({ contract, multicall, underlyingToken })
      : underlyingToken.symbol;
    const secondaryLabel = buildDollarDisplayItem(underlyingToken.price);
    const tertiaryLabel = `${(supplyApy * 100).toFixed(3)}% APY`;
    const images = [getTokenImg(underlyingToken.address, network)];
    const balanceDisplayMode = BalanceDisplayMode.UNDERLYING;
    const statsItems = [
      { label: getSupplyRateLabel(), value: buildPercentageDisplayItem(supplyApy * 100) },
      { label: 'Liquidity', value: buildDollarDisplayItem(liquidity) },
    ];

    const token: AppTokenPosition<FringeSupplyTokenDataProps> = {
      type,
      address,
      network,
      appId,
      groupId,
      symbol,
      decimals,
      supply,
      price,
      pricePerShare,
      tokens,

      dataProps: {
        marketName,
        supplyApy,
        borrowApy,
        liquidity,
        plpAddress,
        exchangeable,
      },

      displayProps: {
        label,
        secondaryLabel,
        tertiaryLabel,
        images,
        statsItems,
        balanceDisplayMode,
      },
    };

    return token;
  }
}
