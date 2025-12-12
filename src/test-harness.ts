import {
  handleGetAccountDetails,
  handleGetAccountTransactions,
  handleGetAllAccounts
} from "./tools.js";

async function run() {
  const all = await handleGetAllAccounts();
  console.log("get_all_accounts =>", JSON.stringify(all, null, 2));

  const firstId = all.accounts[0]?.id ?? "acct_001";
  console.log(
    "get_account_details =>",
    JSON.stringify(await handleGetAccountDetails(firstId), null, 2)
  );

  console.log(
    "get_account_transactions =>",
    JSON.stringify(await handleGetAccountTransactions(firstId), null, 2)
  );

  console.log(
    "get_account_details missing =>",
    JSON.stringify(await handleGetAccountDetails("acct_missing"), null, 2)
  );
}

run();
