import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { LineChart } from '../components/Charts.jsx'
import { ErrorBox, Loading, NoRecordings } from '../components/EmptyState.jsx'
import { PHASE_COLORS, PHASE_NAMES, clock, colorOf, int, movingAverage, num, prefixMean, short } from '../lib/format.js'

const SPEED = 0.5 // every video plays at half speed, automatically, in a loop
const TABS = [
  { key: 'queueSm', label: 'Vehicles at stop lines', hint: '20 s average' },
  { key: 'haltSm', label: 'Stopped vehicles', hint: '20 s average' },
  { key: 'cum', label: 'Cumulative reward', hint: 'higher is better' },
  { key: 'arrived', label: 'Vehicles finished', hint: 'trip completed' },
]

export default function Dashboard() {
  const { loading, error, data } = useOutletContext()
  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!data || !data.runs.length) return <NoRecordings />
  return <Player data={data} />
}

function Player({ data }) {
  const fps = data.fps
  const secPerFrame = data.frameEvery * data.stepLength
  const smooth = Math.max(1, Math.round(20 / secPerFrame))

  // Per-run series prepared once
  const runs = useMemo(() => data.runs.map((r) => ({
    ...r,
    queueSm: movingAverage(r.queue, smooth),
    haltSm: movingAverage(r.halting, smooth),
    avgQ: prefixMean(r.queue),
  })), [data, smooth])

  const nFrames = useMemo(() => Math.min(...runs.map((r) => r.queue.length)), [runs])
  const duration = nFrames / fps
  const hasVideo = runs.some((r) => r.video)

  const [idx, setIdx] = useState(0)
  const [tab, setTab] = useState('queueSm')
  const [ratio, setRatio] = useState(null) // the videos' own width / height, so the card matches their shape
  const tRef = useRef(0)
  const waitingRef = useRef(false)
  const waitStartRef = useRef(0)
  const videos = useRef({})

  const allVideos = useCallback(() => Object.values(videos.current).filter(Boolean), [])

  useEffect(() => { allVideos().forEach((v) => { v.playbackRate = SPEED }) }, [allVideos])

  // Back to 0:00 and keep playing: used when the run reaches its end.
  const restart = useCallback((vs) => {
    tRef.current = 0
    vs.forEach((v) => {
      try { v.currentTime = 0 } catch { /* not ready */ }
      v.playbackRate = SPEED
      const p = v.play(); if (p && p.catch) p.catch(() => {})
    })
  }, [])

  // The clock: the first video is the master; the others follow it. Without videos a timer is used.
  useEffect(() => {
    let raf
    let last = performance.now()
    const resume = (vs) => vs.forEach((v) => { v.currentTime = tRef.current; v.playbackRate = SPEED; const p = v.play(); if (p && p.catch) p.catch(() => {}) })
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      {
        const vs = allVideos().filter((v) => v.getAttribute('src') && !v.error)
        if (vs.length) {
          // Barrier: if ANY video is still loading, pause ALL of them, and start them again together.
          // The spinner only appears if the wait is longer than a moment, so the loop restart stays smooth.
          const allReady = vs.every((v) => (v.readyState === undefined ? 4 : v.readyState) >= 3)
          if (!allReady) {
            if (!waitingRef.current) { waitingRef.current = true; waitStartRef.current = now; vs.forEach((v) => v.pause()) }
          } else if (waitingRef.current) {
            waitingRef.current = false
            resume(vs)
          } else {
            tRef.current = vs[0].currentTime
            for (let i = 1; i < vs.length; i++) {
              if (Math.abs(vs[i].currentTime - tRef.current) > 0.25) vs[i].currentTime = tRef.current
            }
            // Loop: when the run ends (or any video ends first), start everything again from the beginning
            if (tRef.current >= duration - 0.06 || vs.some((v) => v.ended)) restart(vs)
            else vs.forEach((v) => { if (v.paused) { v.playbackRate = SPEED; const p = v.play(); if (p && p.catch) p.catch(() => {}) } }) // autoplay: start anything that is not running
          }
        } else {
          tRef.current += dt * SPEED
          if (tRef.current >= duration - 0.06) tRef.current = 0
        }
      }
      const i = Math.max(0, Math.min(nFrames - 1, Math.floor(tRef.current * fps)))
      setIdx((p) => (p === i ? p : i))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [duration, nFrames, fps, allVideos, restart])

  // Shared y range so the three small charts are comparable
  const ranges = useMemo(() => ({ queue: Math.max(...runs.map((r) => Math.max(...r.queue))) }), [runs])

  // Live ranking by "average so far"
  const ranking = useMemo(() => [...runs].sort((a, b) => a.avgQ[idx] - b.avgQ[idx]).map((r) => r.key), [runs, idx])
  const worstAvg = Math.max(...runs.map((r) => r.avgQ[idx]), 0.001)

  const tabSeries = runs.map((r) => ({
    key: r.key, label: r.name, color: colorOf(r.key), data: r[tab], width: 2.4,
  }))
  const tabMeta = TABS.find((t) => t.key === tab)
  const xLabel = (i) => clock(i * secPerFrame)

  return (
    <div className="dash">
      <section className="runs-grid">
        {runs.map((r) => {
          const rank = ranking.indexOf(r.key) + 1
          const phase = r.phase[idx]
          return (
            <article className="run-card card" key={r.key} style={{ '--accent-c': colorOf(r.key) }} data-testid={`run-${r.key}`}>
              <header className="run-head">
                <h2><span className="dot" />{r.name}</h2>
                {runs.length > 1 && idx > 0 && (
                  <span className={`rank ${rank === 1 ? 'first' : ''}`}>{rank === 1 ? 'Shortest queue so far' : `#${rank} so far`}</span>
                )}
              </header>

              <div className="video-wrap" style={ratio ? { aspectRatio: ratio } : undefined}>
                {r.video ? (
                  <video ref={(el) => { videos.current[r.key] = el }} src={r.video} muted playsInline preload="auto" onLoadedMetadata={(e) => { const v = e.currentTarget; v.playbackRate = SPEED; if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight) }} aria-label={`${r.name} simulation video`} />
                ) : (
                  <div className="video-missing"><Icon name="video" size={26} /><p>No video yet</p><code>python build_dashboard.py</code></div>
                )}
                <div className="signal-badge" title="Current signal state">
                  <i style={{ background: PHASE_COLORS[phase] }} />{PHASE_NAMES[phase]}
                </div>
              </div>

              <div className="kpis">
                <div className="kpi" title="Vehicles at the stop lines right now"><span>Now</span><b data-testid={`q-${r.key}`}>{r.queue[idx]}</b></div>
                <div className="kpi" title="Average vehicles at the stop lines so far"><span>Average</span><b data-testid={`avg-${r.key}`}>{num(r.avgQ[idx])}</b></div>
                <div className="kpi" title={`Cumulative reward: ${int(r.cum[idx])}`}><span>Reward</span><b data-testid={`cum-${r.key}`} data-value={Math.round(r.cum[idx])}>{short(r.cum[idx])}</b></div>
                <div className="kpi" title="Vehicles that finished their trip"><span>Trips</span><b>{int(r.arrived[idx])}</b></div>
              </div>

              <div className="mini">
                <div className="mini-title">Vehicles at the stop lines</div>
                <LineChart height={118} idx={idx} xCount={nFrames} xLabel={xLabel} yMin={0} yMax={ranges.queue}
                  ariaLabel={`${r.name}: vehicles at the stop lines over time`}
                  series={[
                    { key: 'raw', label: 'Now', color: colorOf(r.key), data: r.queue, width: 1.2, opacity: 0.35, hideDot: true },
                    { key: 'avg', label: '20 s average', color: colorOf(r.key), data: r.queueSm, width: 2.4 },
                  ]} />
              </div>
            </article>
          )
        })}
      </section>

      <section className="h2h">
        <article className="card h2h-chart">
          <header className="h2h-head">
            <div>
              <h2>Head to head</h2>
              <p className="muted small">{tabMeta.label} · {tabMeta.hint}</p>
            </div>
            <div className="segmented wrap" role="tablist" aria-label="Chart metric">
              {TABS.map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''}
                  onClick={() => setTab(t.key)}>{t.label}</button>
              ))}
            </div>
          </header>
          <LineChart height={280} idx={idx} xCount={nFrames} xLabel={xLabel} series={tabSeries} fromZero={tab !== 'cum'}
            ariaLabel="All controllers compared over time" />
          <div className="legend">
            {runs.map((r) => (<span key={r.key}><i style={{ background: colorOf(r.key) }} />{r.name}</span>))}
          </div>
        </article>

        <article className="card leader">
          <h2>Leaderboard</h2>
          <p className="muted small">Average vehicles at the stop lines so far. Lower is better.</p>
          <ol>
            {ranking.map((key, pos) => {
              const r = runs.find((x) => x.key === key)
              return (
                <li key={key} className={pos === 0 && idx > 0 ? 'is-first' : ''}>
                  <span className="pos">{pos + 1}</span>
                  <div className="leader-body">
                    <div className="leader-row"><strong>{r.name}</strong><b>{num(r.avgQ[idx])}</b></div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.avgQ[idx] / worstAvg) * 100}%`, background: colorOf(key) }} /></div>
                  </div>
                </li>
              )
            })}
          </ol>
          {!hasVideo && <p className="note"><Icon name="info" size={14} /> No videos were found, so a timer drives the charts. Run <code>python build_dashboard.py</code>.</p>}
        </article>
      </section>
    </div>
  )
}
