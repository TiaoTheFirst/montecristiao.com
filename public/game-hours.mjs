const leisure = new Set(["午餐后小坐", "午后闲暇", "会客与看画", "晚间社交"]);
// Pure itinerary lookup, including travel minutes. Never uses preview overrides.
export function invitationWindows(date, manor) {
  const windows = [];
  let start = null;
  for (let minute = 0; minute <= 1440; minute++) {
    const allowed =
      minute < 1440 &&
      invitationStatus({ ready: true, count: manor.state(date, minute) })
        .allowed;
    if (allowed && start === null) start = minute;
    if (!allowed && start !== null) {
      windows.push({ start, end: minute });
      start = null;
    }
  }
  return windows;
}
export function invitationStatus(world) {
  if (!world?.ready || world.count?.unknown)
    return { allowed: false, message: "正在确认伯爵的行踪，暂不能邀请。" };
  if (world.preview)
    return {
      allowed: false,
      message: "当前正在预览时间。恢复实时后，才能邀请伯爵。",
    };
  const c = world.count;
  if (c.room === "bedroom")
    return {
      allowed: false,
      message: "伯爵已经休息。可以读来访对话、看看近况，或在客厅独自摆棋。",
    };
  if (c.moving)
    return { allowed: false, message: "伯爵正在途中，等他安顿下来再邀请。" };
  if (c.room === "salon" && leisure.has(c.text))
    return { allowed: true, message: "伯爵正在大客厅闲坐，可以邀请他玩一局。" };
  return {
    allowed: false,
    message: "伯爵此刻有别的安排。等他在大客厅闲坐时，再邀请他玩牌。",
  };
}
