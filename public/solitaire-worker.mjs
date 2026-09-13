import { solve } from "./solitaire-solver.mjs";
self.onmessage = ({ data }) => {
  const result = solve(data.board, data.target);
  self.postMessage({ id: data.id, ...result });
};
