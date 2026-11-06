import { LayoutMetrics, VisualCoordinates } from "./types";

export function getLayoutMetrics(width: number, height: number): LayoutMetrics {
  const w = width;
  const h = height;

  // Profiles on the left takes ~12.5%
  const profileW = w * 0.125;
  const profileX = Math.max(20, w * 0.015);

  // Decks on the right takes ~9.5%
  const deckW = w * 0.095;
  const deckX = w * 0.89;

  // Center layout horizontal space
  const centerStartX = w * 0.155;
  const centerEndX = w * 0.875;
  const centerW = centerEndX - centerStartX;

  // 3. MAX CARD HEIGHT & AGGRESSIVE FIELD EXPANSION: Limit the maximum height of the card elements using viewport height,
  // scaling up to 22% of height to aggressively absorb the newly freed vertical space.
  let cardH = h * 0.22; 
  let cardW = cardH / 1.4; // standard aspect ratio close to 2/3 (which is 1.4 - 1.5)

  // Horizontal spacing boundaries
  const minSpacingBench = centerW / 7;
  if (cardW > minSpacingBench * 0.94) {
    cardW = minSpacingBench * 0.94;
    cardH = cardW * 1.4;
  }

  // 2. FLUID BATTLEFIELD GAP: Ensure the layout container holding the 4 lanes dynamically shrinks its gap spacing based on height.
  // We distribute the remaining height h - 4 * cardH into 5 gaps.
  const gap = (h - 4 * cardH) / 5;

  // 4 lanes split vertically
  const p2BenchY = gap;
  const p2ActiveY = 2 * gap + cardH;
  const p1ActiveY = 3 * gap + 2 * cardH;
  const p1BenchY = 4 * gap + 3 * cardH;

  // Scale profiles and decks to align beautifully with the dynamic card heights
  const profileH = cardH * 1.1;
  const deckH = cardH * 1.1;

  const benchSpacing = centerW / 7;
  const activeSpacing = centerW / 5;

  // Center alignments
  const benchStartX = centerStartX + (centerW - (benchSpacing * 6 + cardW)) / 2;
  const activeStartX = centerStartX + (centerW - (activeSpacing * 4 + cardW)) / 2;

  return {
    w, h,
    cardW, cardH,
    profileW, profileH, profileX,
    deckW, deckH, deckX,
    p2BenchY, p2ActiveY, p1ActiveY, p1BenchY,
    benchStartX, benchSpacing,
    activeStartX, activeSpacing
  };
}

export function getVisualCoordinates(
  width: number,
  height: number,
  playerId: 'P1' | 'P2',
  zone: 'bench' | 'active' | 'deck' | 'graveyard',
  slotIndex: number
): VisualCoordinates {
  const m = getLayoutMetrics(width, height);

  if (zone === 'deck') {
    return { x: m.deckX, y: playerId === 'P1' ? m.p1BenchY : m.p2BenchY, w: m.cardW, h: m.cardH };
  }
  if (zone === 'graveyard') {
    return { x: m.deckX, y: playerId === 'P1' ? m.p1ActiveY : m.p2ActiveY, w: m.cardW, h: m.cardH };
  }

  if (zone === 'bench') {
    return {
      x: m.benchStartX + slotIndex * m.benchSpacing,
      y: playerId === 'P1' ? m.p1BenchY : m.p2BenchY,
      w: m.cardW,
      h: m.cardH
    };
  }

  if (zone === 'active') {
    return {
      x: m.activeStartX + slotIndex * m.activeSpacing,
      y: playerId === 'P1' ? m.p1ActiveY : m.p2ActiveY,
      w: m.cardW,
      h: m.cardH
    };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}
