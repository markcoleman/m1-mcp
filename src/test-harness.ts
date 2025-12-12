import {
  handleGetAccountDetails,
  handleGetAccountTransactions,
  handleGetAllAccounts
} from "./tools.js";

function run() {
  const all = handleGetAllAccounts();
  console.log("get_all_accounts =>", JSON.stringify(all, null, 2));

  const firstId = all.accounts[0]?.id ?? "acct_001";
  console.log(
    "get_account_details =>",
    JSON.stringify(handleGetAccountDetails(firstId), null, 2)
  );

  console.log(
    "get_account_transactions =>",
    JSON.stringify(handleGetAccountTransactions(firstId), null, 2)
  );

  console.log(
    "get_account_details missing =>",
    JSON.stringify(handleGetAccountDetails("acct_missing"), null, 2)
  );
}

run();
