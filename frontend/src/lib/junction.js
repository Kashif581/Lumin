// Tiny two-road junction simulation for the landing page hero.
// Cars arrive at random (same seed for every mode), queue at a red light and cross on green.
export const W = 480, C = 240, HALF = 36, STOP = C - HALF - 8
export const LEN = 26, GAP = 9, SPEED = 100
const RATE = { h: 0.15, v: 0.42 } // cars per second: heavier traffic comes from the north
const COLORS = ['#ffb224', '#7dd3fc', '#f9a8d4', '#bef264', '#c4b5fd', '#fda4af']

function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const waitingAt = (c) => c.f > 0 && c.f <= STOP + 1 && c.v < 12
const queueOf = (sim, axis) => sim.cars.filter((c) => c.axis === axis && waitingAt(c) && c.f > STOP - 150).length

export function step(sim, mode, dt) {
  for (const axis of ['h', 'v']) {
    sim.next[axis] -= dt
    if (sim.next[axis] > 0) continue
    const last = sim.cars.filter((c) => c.axis === axis).reduce((m, c) => Math.min(m, c.f), Infinity)
    if (last > LEN + GAP + 4) {
      sim.cars.push({ axis, f: 0, v: SPEED, wait: 0, color: COLORS[sim.id++ % COLORS.length] })
      sim.next[axis] = -Math.log(1 - sim.rand()) / RATE[axis]
    } else sim.next[axis] = 0.25
  }

  sim.since += dt
  if (sim.stage === 'green') {
    const other = sim.green === 'h' ? 'v' : 'h'
    const qg = queueOf(sim, sim.green), qo = queueOf(sim, other)
    const swap = mode === 'fixed'
      ? sim.since > 7
      : sim.since > 2.5 && ((qg === 0 && qo > 0) || (qo > qg + 1 && sim.since > 4) || sim.since > 16)
    if (swap) { sim.stage = 'amber'; sim.since = 0 }
  } else if (sim.stage === 'amber' && sim.since > 1.1) { sim.stage = 'clear'; sim.since = 0 }
  else if (sim.stage === 'clear' && sim.since > 1.2) { sim.green = sim.green === 'h' ? 'v' : 'h'; sim.stage = 'green'; sim.since = 0 }

  for (const axis of ['h', 'v']) {
    const go = sim.green === axis && sim.stage === 'green'
    const lane = sim.cars.filter((c) => c.axis === axis).sort((a, b) => b.f - a.f)
    lane.forEach((c, i) => {
      let limit = i ? lane[i - 1].f - LEN - GAP : Infinity
      if (!go && c.f <= STOP + 0.5) limit = Math.min(limit, STOP)
      const room = Math.max(0, Math.min(c.f + SPEED * dt, limit) - c.f)
      c.v += (room / dt - c.v) * Math.min(1, dt * 7)
      c.f = Math.min(c.f + c.v * dt, Math.max(limit, c.f))
      if (c.v < 10 && c.f > 0 && c.f <= STOP + 1) c.wait += dt
    })
  }
  sim.cars = sim.cars.filter((c) => {
    if (c.f <= W + LEN + 10) return true
    sim.wait += c.wait; sim.done++
    return false
  })
}

// A fresh run, already warmed up so the numbers on screen are meaningful from the first frame.
export function warm(mode, seconds = 40) {
  const sim = { rand: rng(11), cars: [], id: 0, next: { h: 0.5, v: 0.2 }, green: 'v', stage: 'green', since: 0, wait: 0, done: 0 }
  for (let i = 0; i < seconds * 30; i++) step(sim, mode, 1 / 30)
  return sim
}

export const stats = (sim) => ({
  waiting: sim.cars.filter(waitingAt).length,
  avgWait: sim.done ? sim.wait / sim.done : 0,
})

// 'r' | 'y' | 'g' for one road
export function lamp(sim, axis) {
  if (sim.green !== axis || sim.stage === 'clear') return 'r'
  return sim.stage === 'amber' ? 'y' : 'g'
}
