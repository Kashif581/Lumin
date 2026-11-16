import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import Icon, { Logo } from '../components/Icon.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import HeroArt from '../components/HeroArt.jsx'

const CONTROLLERS = [
  { key: 'fixed', name: 'Fixed timing', text: 'The classic signal. The same cycle all day, whatever the traffic does.' },
  { key: 'ql', name: 'Q-learning', text: 'A table of learned values decides when to keep or switch the phase.' },
  { key: 'dqn', name: 'Deep Q-learning', text: 'A small neural network generalises across the queue patterns it has seen.' },
]

const FEATURES = [
  { icon: 'video', title: 'Side-by-side replay', text: 'All three controllers play in sync, so you can pause on the exact moment a queue starts to build.' },
  { icon: 'activity', title: 'Charts that follow the video', text: 'Queue length and reward are drawn as the video plays, and they keep up when you pause, scrub or change the speed.' },
  { icon: 'chart', title: 'Plain-language insights', text: 'Average and peak queues, congestion, throughput and signal timing, with findings written out for you.' },
  { icon: 'lock', title: 'Private, on your computer', text: 'Lumin reads the recordings from your own SUMO and TraCI runs. Nothing is uploaded, and the first person to sign up becomes the administrator.' },
]

const STEPS = [
  { lamp: 'r', title: 'Record', code: 'python traci9_record.py ql', text: 'Run each controller on the junction and save pictures and numbers.' },
  { lamp: 'y', title: 'Build', code: 'python build_dashboard.py', text: 'Turn the pictures into one video per controller.' },
  { lamp: 'g', title: 'Explore', code: 'python server.py', text: 'Open Lumin, compare the controllers and read the insights.' },
]

export default function Landing() {
  const { user, hasAdmin, loading } = useAuth()
  const cta = user ? { to: '/app', label: 'Open the dashboard' }
    : hasAdmin ? { to: '/auth', label: 'Sign in' }
      : { to: '/auth', label: 'Create the admin account' }

  return (
    <div className="lp">
      <header className="lp-nav">
        <Link to="/" className="brand"><Logo /><span>Lumin</span></Link>
        <nav className="lp-links" aria-label="Sections">
          <a href="#controllers">Controllers</a>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
        </nav>
        <div className="lp-actions">
          <ThemeToggle />
          {!loading && <Link to={cta.to} className="btn btn-go btn-sm">{user ? 'Dashboard' : hasAdmin ? 'Sign in' : 'Get started'}</Link>}
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <h1>
              <span>Three controllers.</span>
              <span>One junction.</span>
              <span>See who clears the queue.</span>
            </h1>
            <p className="lp-lead">Lumin plays back your SUMO simulations side by side: fixed timing, Q-learning and a deep Q-network on the same traffic. Compare queues, waits and throughput as the video runs.</p>
            <div className="lp-cta-row">
              {!loading && <Link to={cta.to} className="btn btn-go btn-lg">{cta.label} <Icon name="arrow" size={18} /></Link>}
              <a href="#how" className="btn btn-line btn-lg">See how it works</a>
            </div>
            {!loading && !hasAdmin && !user && (
              <p className="lp-hint"><Icon name="shield" size={15} /> First time here? You will create the administrator account.</p>
            )}
          </div>
          <HeroArt />
        </section>

        <section id="controllers" className="lp-sec">
          <div className="lp-head">
            <h2>Same junction, same traffic, same clock</h2>
            <p>Every controller gets an identical run, so any difference you see comes from the controller itself.</p>
          </div>
          <div className="lp-ctl">
            {CONTROLLERS.map((c) => (
              <article key={c.key} style={{ '--c': `var(--c-${c.key})` }}>
                <span className="lp-ctl-lamp" />
                <h3>{c.name}</h3>
                <p>{c.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="lp-sec lp-feat">
          <div className="lp-head">
            <h2>Everything you need to judge a signal controller</h2>
            <p>From the first frame of video to the last row of the results table.</p>
          </div>
          <ul>
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="lp-feat-icon"><Icon name={f.icon} size={20} /></span>
                <div><h3>{f.title}</h3><p>{f.text}</p></div>
              </li>
            ))}
          </ul>
        </section>

        <section id="how" className="lp-sec">
          <div className="lp-head">
            <h2>From simulation to insight in three steps</h2>
            <p>Three commands, run in order, take you from a SUMO run to a dashboard.</p>
          </div>
          <ol className="lp-rail">
            {STEPS.map((s) => (
              <li key={s.title}>
                <span className={`lp-rail-lamp ${s.lamp}`} aria-hidden="true" />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <code>{s.code}</code>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-sec">
          <div className="lp-end">
            <h2>Ready to see which controller wins?</h2>
            <p>Your recordings are waiting.</p>
            {!loading && <Link to={cta.to} className="btn btn-go btn-lg">{cta.label} <Icon name="arrow" size={18} /></Link>}
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <Link to="/" className="brand small"><Logo size={22} /><span>Lumin</span></Link>
        <span>Built with SUMO, TraCI and React. Runs entirely on your computer.</span>
      </footer>
    </div>
  )
}
