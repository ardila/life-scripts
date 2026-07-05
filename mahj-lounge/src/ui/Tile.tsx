// SVG mahjong tiles — ivory faces, suit-colored art, drawn by hand.
import { parseTile, TileId, tileLabel } from '../engine/tiles';

const SUIT_COLOR: Record<string, string> = {
  dot: '#3d6b8e',
  bam: '#3f7a4e',
  crak: '#b3402f',
};

// 3×3 pip layouts for dots and bams (grid cells 0–8).
const PIP_LAYOUT: number[][] = [
  [],
  [4],
  [0, 8],
  [0, 4, 8],
  [0, 2, 6, 8],
  [0, 2, 4, 6, 8],
  [0, 2, 3, 5, 6, 8],
  [0, 2, 3, 4, 5, 6, 8],
  [0, 1, 2, 3, 5, 6, 7, 8],
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
];

function gridXY(cell: number): [number, number] {
  return [15 + (cell % 3) * 15, 26 + Math.floor(cell / 3) * 15];
}

function Pips({ n, color }: { n: number; color: string }) {
  return (
    <>
      {PIP_LAYOUT[n].map((cell, i) => {
        const [x, y] = gridXY(cell);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={5.6} fill="none" stroke={color} strokeWidth={2.4} />
            <circle cx={x} cy={y} r={1.8} fill={color} />
          </g>
        );
      })}
    </>
  );
}

function Sticks({ n, color }: { n: number; color: string }) {
  if (n === 1) {
    // The lone bam — one tall stalk with leaf notches.
    return (
      <g stroke={color} strokeWidth={3} strokeLinecap="round">
        <line x1={30} y1={18} x2={30} y2={54} />
        <line x1={30} y1={26} x2={22} y2={21} />
        <line x1={30} y1={26} x2={38} y2={21} />
        <line x1={30} y1={42} x2={22} y2={37} />
        <line x1={30} y1={42} x2={38} y2={37} />
      </g>
    );
  }
  return (
    <>
      {PIP_LAYOUT[n].map((cell, i) => {
        const [x, y] = gridXY(cell);
        return (
          <g key={i} stroke={color} strokeWidth={3.2} strokeLinecap="round">
            <line x1={x} y1={y - 5.5} x2={x} y2={y + 5.5} />
            <line x1={x - 3} y1={y - 2} x2={x + 3} y2={y - 2} stroke="#faf3e3" strokeWidth={1.2} />
            <line x1={x - 3} y1={y + 2} x2={x + 3} y2={y + 2} stroke="#faf3e3" strokeWidth={1.2} />
          </g>
        );
      })}
    </>
  );
}

function TileArt({ id }: { id: TileId }) {
  const p = parseTile(id);
  switch (p.kind) {
    case 'num': {
      const color = SUIT_COLOR[p.suit!];
      return (
        <>
          <text x={30} y={17} textAnchor="middle" fontSize={13} fontWeight={700} fill={color} fontFamily="Fraunces, Georgia, serif">
            {p.n}
          </text>
          {p.suit === 'crak' ? (
            <text x={30} y={48} textAnchor="middle" fontSize={26} fill={color} fontFamily="serif">
              萬
            </text>
          ) : p.suit === 'dot' ? (
            <Pips n={p.n!} color={color} />
          ) : (
            <Sticks n={p.n!} color={color} />
          )}
        </>
      );
    }
    case 'wind':
      return (
        <>
          <text x={30} y={42} textAnchor="middle" fontSize={30} fontWeight={600} fill="#2f4a3c" fontFamily="Fraunces, Georgia, serif">
            {p.dir}
          </text>
          <text x={30} y={58} textAnchor="middle" fontSize={7} fontWeight={800} letterSpacing={1.5} fill="#9db4a0" fontFamily="Nunito Sans, sans-serif">
            WIND
          </text>
        </>
      );
    case 'dragon':
      if (p.color === 'soap')
        return (
          <>
            <rect x={16} y={18} width={28} height={34} rx={4} fill="none" stroke="#3d6b8e" strokeWidth={2.6} />
            <text x={30} y={62} textAnchor="middle" fontSize={7} fontWeight={800} letterSpacing={1.2} fill="#9db4a0" fontFamily="Nunito Sans, sans-serif">
              SOAP
            </text>
          </>
        );
      return (
        <text
          x={30}
          y={46}
          textAnchor="middle"
          fontSize={30}
          fill={p.color === 'red' ? '#b3402f' : '#3f7a4e'}
          fontFamily="serif"
        >
          {p.color === 'red' ? '中' : '發'}
        </text>
      );
    case 'flower':
      return (
        <g fill="#c96f4a">
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg} cx={30} cy={26} rx={5.5} ry={9} transform={`rotate(${deg} 30 35)`} opacity={0.85} />
          ))}
          <circle cx={30} cy={35} r={4.5} fill="#c9a227" />
        </g>
      );
    case 'joker':
      return (
        <>
          <path d="M20 40 l5 -12 5 8 5 -8 5 12 z" fill="#c9a227" stroke="#a8871f" strokeWidth={1.5} strokeLinejoin="round" />
          <circle cx={20} cy={27} r={2.5} fill="#c9a227" />
          <circle cx={30} cy={22} r={2.5} fill="#c9a227" />
          <circle cx={40} cy={27} r={2.5} fill="#c9a227" />
          <text x={30} y={57} textAnchor="middle" fontSize={8.5} fontWeight={800} letterSpacing={1.4} fill="#c96f4a" fontFamily="Nunito Sans, sans-serif">
            JOKER
          </text>
        </>
      );
  }
}

export function Tile({
  id,
  width = 44,
  faceDown = false,
}: {
  id?: TileId;
  width?: number;
  faceDown?: boolean;
}) {
  const height = (width * 76) / 60;
  return (
    <span className="tile-wrap" title={id && !faceDown ? tileLabel(id) : undefined}>
      <svg width={width} height={height} viewBox="0 0 60 76" role="img" aria-label={id && !faceDown ? tileLabel(id) : 'tile'}>
        {faceDown ? (
          <>
            <rect x={2} y={2} width={56} height={72} rx={9} fill="#44614f" stroke="#2f4a3c" strokeWidth={3} className="tile-face" />
            <rect x={12} y={14} width={36} height={48} rx={6} fill="none" stroke="#9db4a0" strokeWidth={2} opacity={0.55} />
          </>
        ) : (
          <>
            <rect x={2} y={2} width={56} height={72} rx={9} fill="#fffdf6" stroke="#ded4bd" strokeWidth={2.5} className="tile-face" />
            <rect x={2} y={62} width={56} height={12} rx={6} fill="#f0e8d5" opacity={0.7} />
            {id && <TileArt id={id} />}
          </>
        )}
      </svg>
    </span>
  );
}

export function TileButton({
  id,
  width = 52,
  selected = false,
  disabled = false,
  onClick,
}: {
  id: TileId;
  width?: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`tile-btn${selected ? ' selected' : ''}`}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
    >
      <Tile id={id} width={width} />
    </button>
  );
}
