/**
 * Recommended AC capacity for an Indian room.
 *
 * Starts from the rule of thumb Indian retailers and manufacturers publish
 * (up to 120 sq ft: 1 ton; 120–180: 1.5 ton; 180–250: 2 ton, which is
 * about 100 BTU/h per sq ft at a 9–10 ft ceiling) and adjusts for the things that
 * push a room over: a top floor or west-facing sun, a high ceiling, more
 * people than two, and a kitchen. Rounded up to a size Voltas sells.
 */
export type RoomInput = {
  areaSqft: number;
  ceiling: "standard" | "high";
  topFloor: boolean;
  sunny: boolean;
  people: number;
  kitchen: boolean;
};

const SIZES = [0.75, 1, 1.5, 2, 2.5] as const;

export function recommendTonnage(room: RoomInput): { tons: number; btu: number } {
  let btu = room.areaSqft * 100;
  if (room.ceiling === "high") btu *= 1.15;
  if (room.topFloor) btu *= 1.12;
  if (room.sunny) btu *= 1.1;
  btu += Math.max(0, room.people - 2) * 600;
  if (room.kitchen) btu += 4000;
  const tons = btu / 12000;
  const size = SIZES.find((s) => s >= tons - 0.1) ?? SIZES[SIZES.length - 1];
  return { tons: size, btu: Math.round(btu) };
}

export function tonLabel(tons: number): string {
  return `${tons} Ton`;
}
