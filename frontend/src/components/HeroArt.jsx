import { useEffect, useRef, useState } from 'react'
import { C, HALF, LEN, STOP, W, lamp, stats, step, warm } from '../lib/junction.js'

const MODES = [
  { key: 'fixed', label: 'Fixed timing' },
  { key: 'learned', label: 'Learned timing' },
]
const CAR_W = 13

// Top-down car facing east (right). Origin is the rear-left corner; the vertical road rotates it to face south.
function Car({ color, braking, transform }) {
  return (
    <g transform={transform}>
      <rect x="1" y="1.8" width={LEN} height={CAR_W} rx="5" fill="#000" opacity=".28" />
      <g fill="#0a0d14">
        <rect x={LEN * 0.16} y="-1" width="6" height="2.6" rx="1" /><rect x={LEN * 0.62} y="-1" width="6" height="2.6" rx="1" />
        <rect x={LEN * 0.16} y={CAR_W - 1.6} width="6" height="2.6" rx="1" /><rect x={LEN * 0.62} y={CAR_W - 1.6} width="6" height="2.6" rx="1" />
      </g>
      <rect width={LEN} height={CAR_W} rx="5" fill={color} />
      <path d={`M${LEN * 0.3} 1.6h${LEN * 0.4}q3 0 3 3v${CAR_W - 9.2}q0 3-3 3h-${LEN * 0.4}q-2.4 0-2.4-2.4v-${CAR_W - 9.8}q0-2.4 2.4-2.4z`} fill="#0b1426" opacity=".9" />
      <rect x={LEN * 0.4} y="3" width={LEN * 0.24} height={CAR_W - 6} rx="2" fill={color} />
      <rect x={LEN * 0.4} y="3" width={LEN * 0.24} height={CAR_W - 6} rx="2" fill="#fff" opacity=".2" />
      <path d={`M${LEN * 0.74} 1.8q1.8 2 0 ${CAR_W - 3.6}`} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth=".8" />
      <circle cx={LEN - 1.4} cy="2.7" r="1.4" fill="#fff7cf" /><circle cx={LEN - 1.4} cy={CAR_W - 2.7} r="1.4" fill="#fff7cf" />
      <rect x=".4" y="1.6" width="1.6" height="3" rx=".7" fill="#ff3b3b" opacity={braking ? 1 : 0.55} />
      <rect x=".4" y={CAR_W - 4.6} width="1.6" height="3" rx=".7" fill="#ff3b3b" opacity={braking ? 1 : 0.55} />
    </g>
  )
}

const LAMPS = [['r', '#ff5a5f'], ['y', '#ffb224'], ['g', '#3be29d']]

function Head({ x, y, state }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-10" y="-29" width="20" height="58" rx="10" className="jx-head" />
      {LAMPS.map(([k, col], i) => (
        <g key={k} transform={`translate(0 ${-18 + i * 18})`}>
          {state === k && <circle r="15" fill={col} opacity=".45" filter="url(#jx-blur)" />}
          <circle r="5.5" fill={col} opacity={state === k ? 1 : 0.13} />
        </g>
      ))}
    </g>
  )
}

// A live junction: the visitor flips between fixed and learned timing and watches the queue change.
export default function HeroArt() {
  const [mode, setMode] = useState('learned')
  const [, repaint] = useState(0)
  const sim = useRef(null)
  if (!sim.current) sim.current = warm(mode)

  useEffect(() => {
    sim.current = warm(mode)
    repaint((n) => n + 1)
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    let raf, last = performance.now()
    const loop = (now) => {
      step(sim.current, mode, Math.min(0.05, (now - last) / 1000))
      last = now
      repaint((n) => (n + 1) % 1e9)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [mode])

  const s = sim.current
  const { waiting, avgWait } = stats(s)
  const lane = HALF / 2

  return (
    <div className="jx">
      <svg viewBox={`0 0 ${W} ${W}`} className="jx-svg" role="img"
        aria-label="Animated top-down view of a junction where cars queue at traffic lights">
        <defs>
          <filter id="jx-blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" /></filter>
          <clipPath id="jx-clip"><rect width={W} height={W} rx="28" /></clipPath>
        </defs>
        <g clipPath="url(#jx-clip)">
          <rect width={W} height={W} className="jx-ground" />
          <rect x="0" y={C - HALF} width={W} height={HALF * 2} className="jx-road" />
          <rect x={C - HALF} y="0" width={HALF * 2} height={W} className="jx-road" />
          <path className="jx-dash" d={`M0 ${C}H${STOP}M${C + HALF + 8} ${C}H${W}M${C} 0V${STOP}M${C} ${C + HALF + 8}V${W}`} />
          <path className="jx-stop" d={`M${STOP} ${C}V${C + HALF}M${C - HALF} ${STOP}H${C}`} />
          {s.cars.map((c, i) => c.axis === 'h'
            ? <Car key={i} color={c.color} braking={c.v < 40} transform={`translate(${c.f - LEN} ${C + lane - CAR_W / 2})`} />
            : <Car key={i} color={c.color} braking={c.v < 40} transform={`translate(${C - lane + CAR_W / 2} ${c.f - LEN}) rotate(90)`} />)}
          <Head x={C - HALF - 24} y={STOP - 36} state={lamp(s, 'v')} />
          <Head x={STOP - 36} y={C + HALF + 24} state={lamp(s, 'h')} />
        </g>
      </svg>

      <div className="jx-bar">
        <div className="jx-modes" role="group" aria-label="Signal controller">
          {MODES.map((m) => (
            <button key={m.key} type="button" aria-pressed={mode === m.key} onClick={() => setMode(m.key)}>{m.label}</button>
          ))}
        </div>
        <dl className="jx-stats">
          <div><dt>Waiting now</dt><dd>{waiting}</dd></div>
          <div><dt>Average wait</dt><dd>{avgWait.toFixed(1)} s</dd></div>
        </dl>
      </div>
      <p className="jx-note">An illustration with heavier traffic from the north. Your own numbers come from your SUMO recordings.</p>
    </div>
  )
}
