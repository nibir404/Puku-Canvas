interface MarqueeProps {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * Renders the dashed selection rectangle while the user is drag-selecting.
 */
export function Marquee({ startX, startY, currentX, currentY }: MarqueeProps) {
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  return (
    <rect
      className="marquee-rect"
      x={x}
      y={y}
      width={width}
      height={height}
      pointerEvents="none"
    />
  );
}
