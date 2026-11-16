import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Bars, Donut, GroupedColumns, Legend, LineChart, StackedBars } from '../components/Charts.jsx'
import { ErrorBox, Loading, NoRecordings } from '../components/EmptyState.jsx'
import { buildInsights, statsToCsv } from '../lib/insights.js'
import { clock, colorOf, downloadText, int, num, reductionPct } from '../lib/format.js'

const HIST_LABELS = ['0–2', '3–5', '6–8', '9–11', '12–14', '15+']

export default function Analytics() {
  const { loading, error, data } = useOutletContext()
  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!data || !data.runs.length) return <NoRecordings />
  return <Report data={data} />
}

function Report({ data }) {
  const runs = data.runs
  const base = runs.find((r) => r.key === 'fixed')
  const secPerFrame = data.frameEvery * data.stepLength
  const insights = useMemo(() => buildInsights(data), [data])
  const [hidden, setHidden] = useState([])

  const ranked = [...runs].sort((a, b) => a.stats.avgQueue - b.stats.avgQueue)
  const best = ranked[0]
  const bestFlow = [...runs].sort((a, b) => b.stats.throughput - a.stats.throughput)[0]
  const calmest = [...runs].sort((a, b) => a.stats.congestedPct - b.stats.congestedPct)[0]
  const bestReward = [...runs].sort((a, b) => b.stats.finalReward - a.stats.finalReward)[0]
  const improvement = base && best.key !== 'fixed' ? reductionPct(best.stats.avgQueue, base.stats.avgQueue) : null

  const note = (r, key, lowerIsBetter = true) => {
    if (!base || r.key === 'fixed') return {}
    const pct = lowerIsBetter ? reductionPct(r.stats[key], base.stats[key]) : -reductionPct(r.stats[key], base.stats[key])
    if (!Number.isFinite(pct) || Math.abs(pct) < 0.05) return {}
    return { note: `${pct > 0 ? '−' : '+'}${num(Math.abs(pct), 0)}%`, noteTone: pct > 0 ? 'good' : 'bad' }
  }

  // Hide or show a controller on the time charts (at least one stays visible).
  const toggle = (key) => setHidden((h) => (h.includes(key) ? h.filter((k) => k !== key) : runs.length - h.length > 1 ? [...h, key] : h))
  const shown = runs.filter((r) => !hidden.includes(r.key))

  const windowLabels = (i) => `${i * 100}s`
  const maxWindows = Math.max(...runs.map((r) => r.stats.windows.length))
  const phaseRows = runs.map((r) => ({
    label: r.name,
    segments: [
      { key: 'A', label: 'Road A green', value: r.stats.phaseShare.A_green, color: 'var(--green)' },
      { key: 'B', label: 'Road B green', value: r.stats.phaseShare.B_green, color: 'var(--accent)' },
      { key: 'Y', label: 'Yellow', value: r.stats.phaseShare.yellow, color: 'var(--yellow)' },
      { key: 'R', label: 'All red', value: r.stats.phaseShare.all_red, color: 'var(--red)' },
    ],
  }))

  const d = data.demand
  const exportCsv = () => downloadText('traffic-results.csv', statsToCsv(data))
  const nav = [['overview', 'Overview'], ['over-time', 'Over time'], ['signals', 'Signals'], d && ['demand', 'Demand'], ['numbers', 'All numbers']].filter(Boolean)
  const lead = insights.slice(0, 3)
  const more = insights.slice(3)
  const finding = (it, i) => (
    <li key={i} className={`insight ${it.tone}`}>
      <span className="insight-icon"><Icon name={it.icon} size={18} /></span>
      <div><strong>{it.title}</strong><p>{it.text}</p></div>
    </li>
  )
  const chips = (
    <div className="chips" role="group" aria-label="Show or hide controllers">
      {runs.map((r) => (
        <button key={r.key} type="button" className="chip" aria-pressed={!hidden.includes(r.key)} onClick={() => toggle(r.key)}>
          <i style={{ background: colorOf(r.key) }} />{r.name}
        </button>
      ))}
    </div>
  )

  return (
    <div className="analytics">
      <div className="an-bar">
        <nav className="an-nav" aria-label="Sections on this page">
          {nav.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}><Icon name="download" size={16} /> Download results (CSV)</button>
      </div>

      <section id="overview" className="an-sec">
        <div className="verdict card" style={{ '--accent-c': colorOf(best.key) }}>
          <div className="verdict-copy">
            <h2>
              <span data-testid="best-name">{best.name}</span>{' '}
              {improvement === null
                ? `held the average queue to ${num(best.stats.avgQueue)} vehicles`
                : <>cut the average queue by <b className={improvement >= 0 ? 'good' : 'bad'} data-testid="improvement">{improvement >= 0 ? '−' : '+'}{num(Math.abs(improvement), 0)}%</b></>}
            </h2>
            <p>
              {improvement !== null
                ? `Fixed timing averaged ${num(base.stats.avgQueue)} vehicles waiting at the stop lines. Shorter queues mean less time spent waiting.`
                : base && runs.length > 1
                  ? 'The learned controllers did not beat the baseline in this run. They probably need more training.'
                  : 'Record the other controllers to see a comparison.'}
            </p>
          </div>
          <div className="verdict-bars">
            <p className="muted small">Average vehicles at the stop lines. Lower is better.</p>
            <Bars items={ranked.map((r) => ({ label: r.name, value: r.stats.avgQueue, color: colorOf(r.key), ...note(r, 'avgQueue') }))} format={(v) => num(v)} />
          </div>
        </div>

        <div className="an-strip card" aria-label="Headline numbers">
          <div><span>Most vehicles finished</span><b>{int(bestFlow.stats.throughput)}</b><small>{bestFlow.name}</small></div>
          <div><span>Least time congested</span><b>{num(calmest.stats.congestedPct)}%</b><small>with 10+ vehicles at the stop lines ({calmest.name})</small></div>
          <div><span>Highest final reward</span><b>{int(bestReward.stats.finalReward)}</b><small>{bestReward.name}</small></div>
        </div>

        <div className="card insights">
          <header className="card-head"><div><h2>Key findings</h2><p className="muted small">Written from the numbers in your recordings</p></div></header>
          <ul className="insight-list">{lead.map(finding)}</ul>
          {more.length > 0 && (
            <details className="more">
              <summary>{more.length} more findings</summary>
              <ul className="insight-list">{more.map(finding)}</ul>
            </details>
          )}
        </div>
      </section>

      <section id="over-time" className="an-sec">
        <article className="card">
          <header className="card-head">
            <div><h2>Queue over time</h2><p className="muted small">Average vehicles at the stop lines in every 100 s of simulated time. Hover to compare, or hide a controller.</p></div>
            {chips}
          </header>
          <LineChart height={300} xCount={maxWindows} xLabel={windowLabels} area
            ariaLabel="Average queue in each 100 second window"
            series={shown.map((r) => ({ key: r.key, label: r.name, color: colorOf(r.key), data: r.stats.windows, width: 2.6 }))} />
        </article>
        <div className="grid-2">
          <article className="card">
            <header className="card-head"><div><h2>Time spent congested</h2><p className="muted small">Share of the run with 10 or more vehicles at the stop lines.</p></div></header>
            <Bars items={runs.map((r) => ({ label: r.name, value: r.stats.congestedPct, color: colorOf(r.key), ...note(r, 'congestedPct') }))} format={(v) => num(v)} suffix="%" max={100} />
          </article>
          <article className="card">
            <header className="card-head"><div><h2>How long were the queues?</h2><p className="muted small">Share of the run spent in each queue size.</p></div></header>
            <GroupedColumns labels={HIST_LABELS} series={runs.map((r) => ({ key: r.key, label: r.name, color: colorOf(r.key), values: r.stats.hist }))} />
          </article>
        </div>
      </section>

      <section id="signals" className="an-sec">
        <div className="grid-2">
          <article className="card">
            <header className="card-head"><div><h2>Where the green time went</h2><p className="muted small">Share of the run in each signal state.</p></div></header>
            <StackedBars rows={phaseRows} format={(v) => `${num(v, 0)}%`} />
            <Legend items={[{ label: 'Road A green', color: 'var(--green)' }, { label: 'Road B green', color: 'var(--accent)' }, { label: 'Yellow', color: 'var(--yellow)' }, { label: 'All red', color: 'var(--red)' }]} />
          </article>
          <article className="card">
            <header className="card-head"><div><h2>Signal behaviour</h2><p className="muted small">How often the controller changed the light.</p></div></header>
            <Bars items={runs.map((r) => ({ label: r.name, value: r.stats.avgGreen, color: colorOf(r.key) }))} format={(v) => num(v)} suffix=" s" />
            <p className="muted small bars-caption">Average green time per phase</p>
            <Bars items={runs.map((r) => ({ label: r.name, value: r.stats.switches, color: colorOf(r.key) }))} format={(v) => int(v)} suffix=" switches" />
            <p className="muted small bars-caption">Number of times the agent switched the phase{base ? ' (fixed timing switches by its own program)' : ''}</p>
          </article>
        </div>
        <article className="card">
          <header className="card-head">
            <div><h2>Vehicles that finished their trip</h2><p className="muted small">Running total over the run.</p></div>
            {chips}
          </header>
          <LineChart height={240} xCount={Math.min(...runs.map((r) => r.arrived.length))} xLabel={(i) => clock(i * secPerFrame)}
            ariaLabel="Vehicles finished over time"
            series={shown.map((r) => ({ key: r.key, label: r.name, color: colorOf(r.key), data: r.arrived, width: 2.4 }))} />
        </article>
      </section>

      {d && (
        <section id="demand" className="an-sec">
          <div className="grid-2">
            <article className="card">
              <header className="card-head"><div><h2>Demand by approach</h2><p className="muted small">Vehicles per hour entering from each direction.</p></div></header>
              <Bars items={d.approaches.map((a) => ({ label: `${a.id} (road ${a.road})`, value: a.vehPerHour, color: a.road === 'A' ? 'var(--primary)' : 'var(--accent)' }))} format={(v) => int(v)} suffix=" veh/h" />
            </article>
            <article className="card">
              <header className="card-head"><div><h2>What drivers do at the junction</h2><p className="muted small">Share of all movements.</p></div></header>
              <Donut centerTop={int(d.total)} centerBottom="veh/h in total"
                segments={[
                  { label: 'Straight on', value: d.turns.straight, color: 'var(--primary)' },
                  { label: 'Turn right', value: d.turns.right, color: 'var(--accent)' },
                  { label: 'Turn left', value: d.turns.left, color: 'var(--yellow)' },
                ]} />
            </article>
          </div>
        </section>
      )}

      <section id="numbers" className="an-sec">
        <article className="card">
          <header className="card-head"><div><h2>All the numbers</h2><p className="muted small">Best value in each row is highlighted.</p></div></header>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Measure</th>{runs.map((r) => (<th key={r.key}><span className="dot" style={{ background: colorOf(r.key) }} />{r.name}</th>))}</tr></thead>
              <tbody>
                {[
                  ['Average queue (vehicles)', 'avgQueue', true, 2],
                  ['Peak queue', 'peakQueue', true, 0],
                  ['95th percentile queue', 'p95Queue', true, 0],
                  ['Time congested (%)', 'congestedPct', true, 1],
                  ['Stopped share (%)', 'stoppedShare', true, 0],
                  ['Vehicles finished', 'throughput', false, 0],
                  ['Final reward', 'finalReward', false, 0],
                  ['Agent phase switches', 'switches', null, 0],
                  ['Average green (s)', 'avgGreen', null, 1],
                ].map(([label, key, lower, digits]) => {
                  const vals = runs.map((r) => r.stats[key])
                  const target = lower === null ? null : lower ? Math.min(...vals) : Math.max(...vals)
                  return (
                    <tr key={key}>
                      <th scope="row">{label}</th>
                      {runs.map((r) => (<td key={r.key} className={target !== null && r.stats[key] === target && runs.length > 1 ? 'best' : ''}>{num(r.stats[key], digits)}</td>))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="muted small table-foot">Reward is minus the number of vehicles at the stop lines, added up at every step.{bestReward ? ` Best final reward: ${bestReward.name}.` : ''}</p>
        </article>
      </section>
    </div>
  )
}
