// Accept only facts from the round that has already been revealed.
export function expressionAfterRound({
  revealed,
  playerBid,
  botBid,
  pot,
  playerScore,
  botScore,
  previousLead = 0,
  final = false,
}) {
  if (!revealed) return "rest";
  if (final && playerScore > botScore) return "smile";
  if (
    playerBid > botBid &&
    (pot >= 5 || (previousLead <= 0 && playerScore > botScore))
  )
    return "attentive";
  if (botBid > playerBid && pot >= 5) return "smile";
  return "rest";
}
