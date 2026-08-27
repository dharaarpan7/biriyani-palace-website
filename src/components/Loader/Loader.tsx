import './Loader.css'

interface LoaderProps {
  visible: boolean
}

/**
 * Premium loading state: minimal type + a thin brass line. It fades away
 * once the first cinematic material is ready — the visitor is never held
 * hostage for all five clips.
 */
export function Loader({ visible }: LoaderProps) {
  return (
    <div
      className={`loader${visible ? '' : ' is-done'}`}
      aria-hidden={!visible}
      role={visible ? 'status' : undefined}
    >
      <div className="loader__inner">
        <p className="loader__brand">BIRYANI PALACE</p>
        <span className="loader__line" aria-hidden="true" />
        <p className="loader__meta">PREPARING THE EXPERIENCE</p>
      </div>
    </div>
  )
}
