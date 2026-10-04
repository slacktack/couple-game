import { motion, useTransform } from 'motion/react';
import './ProtocolWorld.css';

const dust = [
  { x: 3, y: 34, size: 2, drift: -23, duration: 15, delay: -4 },
  { x: 8, y: 58, size: 2, drift: -29, duration: 18, delay: -12 },
  { x: 14, y: 22, size: 3, drift: -20, duration: 17, delay: -7 },
  { x: 19, y: 78, size: 2, drift: -25, duration: 21, delay: -15 },
  { x: 27, y: 9, size: 2, drift: -19, duration: 18, delay: -8 },
  { x: 75, y: 16, size: 2, drift: -22, duration: 20, delay: -11 },
  { x: 83, y: 72, size: 3, drift: -28, duration: 16, delay: -5 },
  { x: 91, y: 35, size: 2, drift: -21, duration: 19, delay: -17 },
  { x: 97, y: 59, size: 2, drift: -26, duration: 22, delay: -9 },
  { x: 88, y: 89, size: 2, drift: -19, duration: 17, delay: -13 },
  { x: 5, y: 88, size: 2, drift: -24, duration: 20, delay: -3 },
  { x: 22, y: 94, size: 2, drift: -18, duration: 18, delay: -10 },
];

function arrival(reduced, delay, offset = 12) {
  return {
    initial: reduced ? false : { opacity: 0, y: offset },
    animate: { opacity: 1, y: 0 },
    transition: reduced ? { duration: 0 } : { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
  };
}

function Postmark({ side }) {
  return <svg className={`w-protocol-postmark w-protocol-postmark-${side}`} viewBox="0 0 132 132" aria-hidden="true">
    <path className="w-protocol-stamp-paper" d="M12 8h108v116H12z" />
    <path className="w-protocol-stamp-edge" d="M18 15h96v102H18z" />
    <circle className="w-protocol-stamp-orbit" cx="66" cy="66" r="28" />
    <path className="w-protocol-stamp-flower" d="M66 40c8 9 8 14 0 20-8-6-8-11 0-20Zm26 26c-9 8-14 8-20 0 6-8 11-8 20 0ZM66 92c-8-9-8-14 0-20 8 6 8 11 0 20ZM40 66c9-8 14-8 20 0-6 8-11 8-20 0Z" />
    <circle className="w-protocol-stamp-center" cx="66" cy="66" r="5" />
  </svg>;
}

export default function ProtocolWorld({ px, py, reduced = false }) {
  const farX = useTransform(px, value => value * -5);
  const farY = useTransform(py, value => value * -4);
  const midX = useTransform(px, value => value * -10);
  const midY = useTransform(py, value => value * -7);
  const nearX = useTransform(px, value => value * -15);
  const nearY = useTransform(py, value => value * -10);

  return <div className={`w-protocol-layer${reduced ? ' w-protocol-is-static' : ''}`} aria-hidden="true">
    <motion.div className="w-protocol-depth w-protocol-depth-far" style={{ x: farX, y: farY }} {...arrival(reduced, 0.06, 8)}>
      <span className="w-protocol-window-wash w-protocol-window-wash-left" />
      <span className="w-protocol-window-wash w-protocol-window-wash-right" />
      <div className="w-protocol-dust-field">
        {dust.map((mote, index) => <i className="w-protocol-mote" key={index} style={{
          left: `${mote.x}%`, top: `${mote.y}%`, '--mote-size': `${mote.size}px`, '--mote-drift': `${mote.drift}px`, '--mote-duration': `${mote.duration}s`, '--mote-delay': `${mote.delay}s`,
        }} />)}
      </div>
    </motion.div>

    <motion.div className="w-protocol-depth w-protocol-depth-mid" style={{ x: midX, y: midY }} {...arrival(reduced, 0.24, 10)}>
      <svg className="w-protocol-flight-route" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
        <path className="w-protocol-route-shadow" d="M34 177C175 54 278 92 400 121s190 88 309 26 163-75 257-32" />
        <path className="w-protocol-route-line" d="M34 177C175 54 278 92 400 121s190 88 309 26 163-75 257-32" />
        <circle className="w-protocol-route-pin" cx="34" cy="177" r="8" />
        <circle className="w-protocol-route-pin-core" cx="34" cy="177" r="2.5" />
        <circle className="w-protocol-route-pin" cx="966" cy="115" r="8" />
        <circle className="w-protocol-route-pin-core" cx="966" cy="115" r="2.5" />
      </svg>
      <motion.div className="w-protocol-plane" initial={reduced ? false : { opacity: 0, x: '-4vw', y: 0 }}
        animate={reduced ? { opacity: 0.78, x: 0, y: 0 } : { opacity: 0.78, x: ['-4vw', '12vw', '35vw', '65vw', '91vw'], y: [0, '-8vh', '-3.2vh', '-1vh', '-3vh'] }}
        transition={reduced ? { duration: 0 } : {
          opacity: { duration: 0.6, delay: 0.62, ease: 'easeOut' },
          x: { duration: 29, delay: 1.1, repeat: Infinity, ease: 'linear' },
          y: { duration: 29, delay: 1.1, repeat: Infinity, ease: 'linear' },
        }}>
        <svg viewBox="0 0 42 34" aria-hidden="true">
          <path d="M3 16 38 3 25 31l-6-11L3 16Z" />
          <path d="m19 20 19-17" />
        </svg>
      </motion.div>
    </motion.div>

    <motion.div className="w-protocol-depth w-protocol-depth-near" style={{ x: nearX, y: nearY }} {...arrival(reduced, 0.48, 14)}>
      <motion.div className="w-protocol-stamp-arrival w-protocol-stamp-arrival-left" {...arrival(reduced, 0.7, -14)}>
        <Postmark side="left" />
      </motion.div>
      <motion.div className="w-protocol-stamp-arrival w-protocol-stamp-arrival-right" {...arrival(reduced, 0.86, 14)}>
        <Postmark side="right" />
      </motion.div>
      <span className="w-protocol-seal-glimmer w-protocol-seal-glimmer-left" />
      <span className="w-protocol-seal-glimmer w-protocol-seal-glimmer-right" />
    </motion.div>
  </div>;
}
