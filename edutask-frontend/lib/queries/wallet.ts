export async function fetchWallet() {
  const [walletRes, txRes] = await Promise.all([
    fetch('/api/wallet'),
    fetch('/api/wallet/transactions?limit=50'),
  ])
  const walletJson = await walletRes.json()
  const txJson = await txRes.json()
  return {
    wallet: walletJson.success ? walletJson.data : null,
    transactions: txJson.success ? (txJson.data ?? []) : [],
  }
}
