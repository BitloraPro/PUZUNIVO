import React from 'react';

export default function GameArtwork({ game = 'number', className = '' }) {
  const defs = (
    <defs>
      <linearGradient id={'glow-' + game} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#fff7b2" />
        <stop offset=".38" stopColor={game === 'line' ? '#26ffea' : game === 'slide' ? '#ffa84e' : game === 'memory' ? '#ff86f9' : '#3bfffa'} />
        <stop offset="1" stopColor={game === 'line' ? '#0073ee' : game === 'slide' ? '#ff345d' : game === 'memory' ? '#7133ff' : '#257bff'} />
      </linearGradient>
      <filter id={'shadow-' + game} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
    </defs>
  );
  const number = (
    <>
      <g transform="rotate(-14 80 74)">
        <rect x="17" y="43" width="50" height="65" rx="10" fill="#2c104b" opacity=".7" transform="translate(0 7)"/>
        <rect x="17" y="43" width="50" height="65" rx="10" fill="#ffd04c" stroke="#fff0a0" strokeWidth="3"/>
        <text x="42" y="89" fill="#963a05" fontSize="40" textAnchor="middle" fontWeight="1000">1</text>
      </g>
      <g transform="rotate(8 80 69)">
        <rect x="57" y="22" width="50" height="74" rx="11" fill="#16c8ff" stroke="#acfff9" strokeWidth="3"/>
        <text x="82" y="76" fill="#1345ad" fontSize="42" textAnchor="middle" fontWeight="1000">2</text>
      </g>
      <g transform="rotate(18 118 90)">
        <rect x="99" y="52" width="49" height="65" rx="11" fill="#fc599f" stroke="#ffbadc" strokeWidth="3"/>
        <text x="123" y="99" fill="#aa164c" fontSize="40" textAnchor="middle" fontWeight="1000">3</text>
      </g>
    </>
  );
  const line = (
    <>
      <g stroke="#83ffff" strokeWidth="5" strokeLinecap="round" opacity=".95">
        <path d="M33 25 L128 32 L80 87 L26 105 L134 112 L128 32 M80 87 L33 25"/>
      </g>
      {[[33,25],[128,32],[80,87],[26,105],[134,112]].map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="17" fill="#00fffb" opacity=".35" filter={'url(#shadow-line)'}/>
          <circle cx={x} cy={y} r="12" fill={i===2?'#df56ff':'#23eafe'} stroke="#b9fffd" strokeWidth="3"/>
          <circle cx={x-4} cy={y-4} r="4" fill="white" opacity=".9"/>
        </g>
      ))}
    </>
  );
  const slide = (
    <>
      {[[20,14,53,49,'#ffcd54'],[80,14,60,49,'#ffab48'],[20,70,49,51,'#f24772'],[76,70,61,51,'#19d4a4']].map(([x,y,w,h,fill],i)=>(
        <g key={i}>
          <rect x={x+2} y={y+7} width={w} height={h} rx="10" fill="#220c4e" opacity=".6"/>
          <rect x={x} y={y} width={w} height={h} rx="10" fill={fill} stroke="#fff3ae" strokeWidth="2"/>
          <rect x={x+6} y={y+6} width={w-12} height={h-15} rx="5" fill="white" opacity=".17"/>
        </g>
      ))}
    </>
  );
  const memory = (
    <>
      {[[23,19,'#eb5cf7'],[90,19,'#266bff'],[23,81,'#b941fa'],[90,81,'#14c8ff']].map(([x,y,fill],i)=>(
        <g key={i}>
          <rect x={x+4} y={y+8} width="48" height="48" rx="10" fill="#210c4c"/>
          <rect x={x} y={y} width="48" height="48" rx="10" fill={fill} stroke="#dcdeff" strokeWidth="2"/>
          <rect x={x+5} y={y+5} width="38" height="15" rx="7" fill="white" opacity=".33"/>
        </g>
      ))}
    </>
  );
  return (
    <svg className={'pz-artwork ' + className} viewBox="0 0 160 140" role="img" aria-label={game + ' game artwork'}>
      {defs}
      <circle cx="83" cy="74" r="58" fill={'url(#glow-' + game + ')'} opacity=".17" filter={'url(#shadow-' + game + ')'}/>
      <path d="M11 34 l6 -9 l6 9 l-6 9z M150 23 l4 -8 l4 8 l-4 8z M149 128 l4 -8 l4 8 l-4 8z" fill="#ffef82"/>
      {game === 'line' ? line : game === 'slide' ? slide : game === 'memory' ? memory : number}
    </svg>
  );
}
