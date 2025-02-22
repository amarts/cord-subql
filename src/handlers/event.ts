import { SubstrateEvent } from "@subql/types";
import { Dispatcher } from "./utils/dispatcher";
import { ensureBlock } from "./block";
import { Event } from "../types/models";
import { getKVData } from "./utils";
import { ensureExtrinsic } from "./extrinsic";
import { DispatchedEventData } from "./types";
// import { updateCrossedKSM } from './summary'

const dispatch = new Dispatcher<DispatchedEventData>();

/*
dispatch.batchRegist([
  // currencies
  // { key: 'currencies-BalanceUpdated', handler: updateBalanceByUpdate },
  // { key: 'currencies-Deposited', handler: updateBalanceByDeposit },
  // { key: 'currencies-Withdrawn', handler: updateBalanceByWithdrawn },
  // { key: 'currencies-Transferred', handler: updateBalanceByTransferred },
  // { key: 'currencies-Withdrawn', handler: updateCrossedKSM },
  // { key: 'currencies-Transferred', handler: updateCrossedKSM },

  // nft
  { key: "nft-TransferredToken", handler: createNFTTransferHistory },
  { key: "nft-BurnedToken", handler: createNFTBurnedHistory },
  { key: "nft-BurnedTokenWithRemark", handler: createNFTBurnedWithRemarkHistory },

  // loan
  { key: "loans-PositionUpdated", handler: createPositionUpdatedHistory },
  { key: "loans-PositionUpdated", handler: updateLoanPosition },
  { key: "loans-ConfiscateCollateralAndDebit", handler: createConfiscateCollateralAndDebitHistory },
  { key: "loans-transferLoan", handler: createTransferLoanHistory },

  // // all cdp params config update
  { key: "cdpEngine-InterestRatePerSecUpdated", handler: handleInterestRatePerSecUpdated, },
  { key: "cdpEngine-LiquidationRatioUpdated", handler: handleLiquidationRatioUpdated, },
  { key: "cdpEngine-LiquidationPenaltyUpdated", handler: handleLiquidationPenaltyUpdated, },
  { key: "cdpEngine-RequiredCollateralRatioUpdated", handler: handleRequiredCollateralRatioUpdated, },
  { key: "cdpEngine-MaximumTotalDebitValueUpdated", handler: handleMaximumTotalDebitValueUpdated, },
  { key: "cdpEngine-GlobalInterestRatePerSecUpdated", handler: handleGlobalInterestRatePerSecUpdated, },
  { key: "cdpEngine-LiquidateUnsafeCDP", handler: createLiquidateUnsafeCDPHistory },
  { key: "cdpEngine-LiquidateUnsafeCDP", handler: updateLoanPositionByLiquidate },
  { key: "honzon-CloseLoanHasDebitByDex", handler: handleCloseLoanHasDebitByDex},

  // // dex
  { key: "dex-ProvisioningToEnabled", handler: createDexPool },
  { key: "dex-AddLiquidity", handler: updatePoolByAddLiquidity },
  { key: "dex-RemoveLiquidity", handler: updatePoolByRemoveLiquidity },
  { key: "dex-Swap", handler: updatePoolBySwap },

  // // provision
  { key: "dex-ListProvision", handler: createProvision },
  { key: "dex-ProvisioningToEnabled", handler: updateProvisionByEnable },
  { key: "dex-AddProvision", handler: updateUserProvision },

  // // incentive
  { key: "incentives-DepositDexShare", handler: createDepositDexShareHistory },
  { key: "incentives-WithdrawDexShare", handler: createWithdrawDexShareHistory },
  { key: "incentives-PayoutRewards", handler: createClaimRewards },
  { key: "incentives-ClaimRewards", handler: createClaimRewards },

  // homa lite
  { key: 'homaLite-Minted', handler: createHomaLiteMintHistory },
  { key: 'homaLite-RedeemRequestCancelled', handler: createHomaLiteRedeemCancelHistory },
  { key: 'homaLite-RedeemRequested', handler: createHomaLiteRedeemRequestHistory },
  { key: 'homaLite-Redeemed', handler: createHomaLiteRedeemedHistory },

  // homa
  { key: 'homa-Minted', handler: handleHomaMinted },
  { key: 'homa-RequestedRedeem', handler: handleHomaRequestedRedeem},
  { key: 'homa-RequestedCancelled', handler: handleHomaRequestedCancelled},
  { key: 'homa-RedeemedByFastMatch', handler: handleHomaRedeemedByFastMatch},
  { key: 'homa-RedeemedByUnbond', handler: handleHomaRedeemedByUnbond },

  // { key: "stakingPool-MintLiquid", handler: createMintLiquidHistory },
  // { key: "stakingPool-RedeemByUnbond", handler: createRedeemByUnbondHistory },
  // { key: "stakingPool-RedeemByFreeUnbonded", handler: createRedeemByFreeUnbonded },
  // { key: "stakingPool-RedeemByClaimUnbonding", handler: createRedeemByClaimUnbonding },
]);
*/

dispatch.batchRegist([
  // stream
  //{ key: 'strean-Anchored', handler: theFunctionToCall },
]);

export async function ensureEvent(event: SubstrateEvent) {
  const block = await ensureBlock(event.block);
  if (!block) {
      return null;
  }
  const idx = event.idx;
  const recordId = `${block.number}-${idx}`;

  let data = await Event.get(recordId);

  if (!data) {
    data = new Event(recordId);
    data.index = idx;
    data.blockId = block.id;
    data.blockNumber = block.number;
    data.timestamp = block.timestamp;
  }

  return data;
}

export async function createEvent(event: SubstrateEvent) {
  const data = await ensureEvent(event);
  if (!data)
      return;
  const section = event.event.section;
  const method = event.event.method;
  const eventData = getKVData(event.event.data);

  if (section === 'system' && method === 'ExtrinsicSuccess')
     return;

  data.section = section;
  data.method = method;
  data.data = eventData;

  const extrinsic = await (event.extrinsic
    ? ensureExtrinsic(event.extrinsic)
    : undefined);

  if (extrinsic) {
    data.extrinsicId = extrinsic.id;
  }

// TODO: once we have separate handling of different events based on section and method, uncomment below
/*
  await dispatch.dispatch(`${section}-${data.method}`, {
    event: data,
    rawEvent: event,
  });
*/
  await data.save();

  return data;
}
