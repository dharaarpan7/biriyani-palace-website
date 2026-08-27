import './sections.css'

/**
 * The signature dish. The still frame is pulled straight from the
 * cinematic footage (a media-fragment poster of clip2) — no new imagery.
 */
export function Signature() {
  return (
    <section className="section section--signature" aria-labelledby="signature-title">
      <div className="signature__media">
        <video
          className="signature__still"
          src="/videos/clip2.mp4#t=1.5"
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          ref={(el) => {
            // Hold the extracted frame — this is a still, never a playing video.
            if (el) el.pause()
          }}
        />
      </div>
      <div className="signature__copy">
        <p className="eyebrow">THE SIGNATURE</p>
        <h2 className="section-title" id="signature-title">
          A sealed pot. A slow fire.<br />
          A table worth waiting for.
        </h2>
      </div>
    </section>
  )
}
