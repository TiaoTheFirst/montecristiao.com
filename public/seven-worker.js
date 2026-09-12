import { analyze, sample } from "./seven-ai.mjs";
self.onmessage = ({ data }) => {
  try {
    const analysis = analyze(data.view, data.mode);
    const random = () =>
      crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    self.postMessage({
      id: data.id,
      analysis,
      bid: analysis.cards[sample(analysis.policy, random)],
    });
  } catch {
    self.postMessage({ id: data.id, error: true });
  }
};
