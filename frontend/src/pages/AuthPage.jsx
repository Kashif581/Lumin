import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import Icon, { Logo } from '../components/Icon.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

function strength(pw) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(4, s)
}
const STRENGTH_LABELS = ['Too short', 'Weak', 'Okay', 'Good', 'Strong']

export default function AuthPage() {
  const { loading, hasAdmin, user, error: serverError, signUp, signIn } = useAuth()
  const navigate = useNavigate()
  const signingUp = !hasAdmin
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const score = useMemo(() => strength(form.password), [form.password])

  if (!loading && user) return <Navigate to="/app" replace />

  const emailOk = /\S+@\S+/.test(form.email)
  const ready = signingUp
    ? form.name.trim() && emailOk && form.password.length >= 8 && form.password === form.confirm
    : emailOk && form.password.length > 0
  const started = Object.values(form).some(Boolean)
  const failed = Boolean(error || serverError)
  const light = failed ? 'r' : ready ? 'g' : started ? 'y' : 'r'
  const status = failed ? 'Something needs fixing' : ready ? (signingUp ? 'Ready to create the account' : 'Ready to sign in') : started ? 'Keep going' : 'Waiting for your details'

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (signingUp) {
      if (form.password.length < 8) return setError('The password must have at least 8 characters.')
      if (form.password !== form.confirm) return setError('The two passwords do not match.')
    }
    setBusy(true)
    try {
      if (signingUp) await signUp({ name: form.name, email: form.email, password: form.password })
      else await signIn({ email: form.email, password: form.password })
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }


  return (
    <div className="au">
      <aside className={`au-side ${light}`}>
        <Link to="/" className="brand"><Logo /><span>Lumin</span></Link>
        <div className="au-side-body">
          <div className="au-signal" aria-hidden="true">
            {['r', 'y', 'g'].map((k) => <i key={k} className={`${k} ${light === k ? 'on' : ''}`} />)}
          </div>
          <p className="au-status" role="status">{status}</p>
          <h2>{signingUp ? 'Set up your dashboard.' : 'Welcome back.'}</h2>
          <p className="au-lead">{signingUp
            ? 'You are the first person here, so this account becomes the administrator.'
            : 'Sign in to compare fixed timing, Q-learning and DQN on your junction.'}</p>
          <ul className="au-points">
            <li><Icon name="check" size={15} /> Three controllers on one synced timeline</li>
            <li><Icon name="check" size={15} /> Live charts and plain-language insights</li>
            <li><Icon name="check" size={15} /> Everything stays on this computer</li>
          </ul>
        </div>
        <small>Built with SUMO, TraCI and React</small>
      </aside>

      <main className="au-main">
        <div className="au-top">
          <Link to="/" className="btn btn-line btn-sm"><Icon name="home" size={16} /> Home</Link>
          <ThemeToggle />
        </div>

        <form className="au-form" onSubmit={submit} noValidate>
          <div>
            <h1>{signingUp ? 'Create the admin account' : 'Sign in'}</h1>
            <p className="au-sub">{signingUp ? 'This only happens once.' : 'Use the email and password you signed up with.'}</p>
          </div>

          {failed && <div className="alert" role="alert"><Icon name="alert" size={16} /> {error || serverError}</div>}

          {signingUp && (
            <label className="au-field">
              <span>Full name</span>
              <input value={form.name} onChange={set('name')} autoComplete="name" placeholder="Your name" required autoFocus />
            </label>
          )}
          <label className="au-field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" required autoFocus={!signingUp} />
          </label>
          <label className="au-field">
            <span>Password</span>
            <div className="au-pw">
              <input type={show ? 'text' : 'password'} value={form.password} onChange={set('password')}
                autoComplete={signingUp ? 'new-password' : 'current-password'} placeholder={signingUp ? 'At least 8 characters' : 'Your password'} required />
              <button type="button" className="au-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          </label>
          {signingUp && (
            <>
              <div className="meter" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => <span key={i} className={i < score ? `on s${score}` : ''} />)}
                <em>{form.password ? STRENGTH_LABELS[score] : ''}</em>
              </div>
              <label className="au-field">
                <span>Confirm password</span>
                <input type={show ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" placeholder="Type it again" required />
              </label>
            </>
          )}

          <button className="btn btn-go btn-block btn-lg" type="submit" disabled={busy || loading}>
            {busy ? 'Please wait…' : signingUp ? 'Create account and continue' : 'Sign in'}
            {!busy && <Icon name="arrow" size={18} />}
          </button>
          {!signingUp && <p className="au-foot">Forgot the password? See the README: delete <code>data/users.json</code> and sign up again.</p>}
        </form>
      </main>
    </div>
  )
}
