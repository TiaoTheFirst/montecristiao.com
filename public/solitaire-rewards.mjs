import { allPuzzles, replay, won } from "./solitaire-puzzles.mjs";
import { invitationStatus } from "./game-hours.mjs";
export const rewardKey = "manor-solitaire-keepsakes-v1";
export function recognition(records, world, room) {
  const valid = cleanRecords(records);
  if (room !== "salon" || !valid.length || !invitationStatus(world).allowed)
    return null;
  return themes(valid).size >= 3
    ? {
        speaker: "伯爵",
        direction: "他把视线从纪念章移回棋桌，笑了一下。",
        text: "三种棋路都试过了？那张指定落点的，您是先定最后一步，还是走到中途才折回来？",
        choices: [
          { label: "我先想了最后一步。", action: "keepsake-backward" },
          { label: "我是走到中途才折回来的。", action: "keepsake-return" },
          { label: "下次带棋谱来聊。", action: "close" },
        ],
      }
    : {
        speaker: "伯爵",
        direction: "他看了一眼您带来的棋谱卡，微微点头。",
        text: "只留一枚了。哪一步让您停下来想得最久？先留着棋谱，下次摆出来给我看。",
        choices: [{ label: "我把棋谱收好，下次再来。", action: "close" }],
      };
}
export function cleanRecords(value) {
  if (!Array.isArray(value)) return [];
  return allPuzzles.flatMap((p) => {
    const records = value.filter(
      (r) => r?.id === p.id && typeof r.assisted === "boolean",
    );
    return records.length
      ? [{ id: p.id, assisted: records.every((r) => r.assisted) }]
      : [];
  });
}
export function award(records, puzzle, trace, assisted) {
  const trusted = allPuzzles.find((p) => p.id === puzzle.id);
  if (!trusted) return cleanRecords(records);
  const end = replay(trusted.start, trace);
  if (!end || !won(end, trusted.target)) return cleanRecords(records);
  return cleanRecords([
    ...cleanRecords(records),
    { id: trusted.id, assisted: !!assisted },
  ]);
}
export function themes(records) {
  return new Set(
    cleanRecords(records)
      .map((r) => allPuzzles.find((p) => p.id === r.id).theme)
      .filter((t) => t !== "全盘"),
  );
}
export function keepsakeSVG(id, trace, assisted) {
  const puzzle = allPuzzles.find((p) => p.id === id);
  const end = puzzle && replay(puzzle.start, trace);
  if (!end || !won(end, puzzle.target)) return null;
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  const text = (x, y, size, value, extra = "") =>
    `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${escape(value)}</text>`;
  const coordinate = (i) => `${Math.floor(i / 7) + 1}行${(i % 7) + 1}列`;
  const route = trace
    .map(([from, to], i) =>
      text(
        i < 16 ? 62 : 374,
        465 + (i % 16) * 24,
        15,
        `${i + 1}. ${coordinate(from)} → ${coordinate(to)}`,
      ),
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="980" viewBox="0 0 720 980"><rect width="720" height="980" fill="#dfd1ae"/><rect x="26" y="26" width="668" height="928" rx="4" fill="none" stroke="#8e7445"/><g fill="#352d20" font-family="Noto Serif SC,Songti SC,serif"><circle cx="360" cy="99" r="38" fill="none" stroke="#967239"/>${text(360, 115, 46, "M", 'text-anchor="middle" font-style="italic"')}${text(360, 188, 19, "蒙特克里斯条府", 'text-anchor="middle"')}${text(360, 249, 40, "一子留桌", 'text-anchor="middle"')}${text(360, 294, 24, puzzle.title, 'text-anchor="middle"')}${text(360, 336, 17, `${puzzle.theme} · ${trace.length} 次跳跃 · ${assisted ? "借助过提示" : "独立完成"}`, 'text-anchor="middle"')}${text(360, 373, 17, `最后一枚：${coordinate([...end][0])}`, 'text-anchor="middle"')}<path d="M62 406H658" stroke="#967239"/>${text(62, 436, 18, "这一局的棋路")}${route}<path d="M62 870H658" stroke="#967239"/>${text(360, 907, 16, "棋谱请带走。下次再来，可以从这一局谈起。", 'text-anchor="middle"')}${text(360, 937, 12, "本机游玩纪念 · 不作为线上竞赛凭证", 'text-anchor="middle"')}</g></svg>`;
}
