import { motion, useTransform } from 'motion/react';
import './MusicBoxWorld.css';

const dust = [
  { x: 5, y: 35, size: 2, lift: 34, duration: 15, delay: -4 },
  { x: 12, y: 68, size: 3, lift: 42, duration: 19, delay: -12 },
  { x: 18, y: 18, size: 2, lift: 28, duration: 17, delay: -7 },
  { x: 25, y: 85, size: 2, lift: 38, duration: 20, delay: -15 },
  { x: 76, y: 28, size: 2, lift: 32, duration: 18, delay: -9 },
  { x: 83, y: 70, size: 3, lift: 44, duration: 16, delay: -5 },
  { x: 91, y: 37, size: 2, lift: 30, duration: 21, delay: -17 },
  { x: 96, y: 86, size: 2, lift: 36, duration: 18, delay: -11 },
  { x: 8, y: 91, size: 2, lift: 31, duration: 22, delay: -8 },
  { x: 31, y: 12, size: 2, lift: 26, duration: 17, delay: -13 },
  { x: 70, y: 90, size: 2, lift: 35, duration: 19, delay: -3 },
  { x: 88, y: 12, size: 2, lift: 29, duration: 16, delay: -10 },
];

const notes = [
  { left: '7%', top: '46%', size: 22, delay: -5 },
  { right: '8%', top: '57%', size: 19, delay: -11 },
  { left: '17%', bottom: '14%', size: 16, delay: -8 },
];

function gearOutline(teeth, root = 88, tip = 108) {
  const step = (Math.PI * 2) / teeth;
  const shape = [
    [-0.5, root], [-0.36, root], [-0.34, tip], [-0.17, tip],
    [0.17, tip], [0.34, tip], [0.36, root], [0.5, root],
  ];
  const points = Array.from({ length: teeth }, (_, index) => shape.map(([fraction, radius]) => {
    const angle = (index + fraction) * step - Math.PI / 2;
    return `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;
  }).join(' L')).join(' L');
  return `M${points} Z`;
}

function Gear({ teeth }) {
  return <svg viewBox="-120 -120 240 240" aria-hidden="true">
    <path d={gearOutline(teeth)} className="w-musicbox-gear-metal" />
    <circle r="76" className="w-musicbox-gear-ring" />
    <g className="w-musicbox-gear-spokes">
      {Array.from({ length: 8 }, (_, index) => <line key={index} x1="0" y1="-28" x2="0" y2="-69" transform={`rotate(${index * 45})`} />)}
    </g>
    <circle r="27" className="w-musicbox-gear-hub" />
    <circle r="7" className="w-musicbox-gear-pin" />
  </svg>;
}

function MusicNote() {
  return <svg viewBox="0 0 48 64" aria-hidden="true">
    <path d="M27 10v36.5c0 5.1-4.4 8.5-10.2 8.5C10.8 55 7 52.1 7 48.4c0-4.5 4.8-8.4 10.8-8.4 2 0 3.8.4 5.2 1.1V17l19-5v33c0 5.1-4.4 8.5-10.2 8.5-6 0-9.8-2.9-9.8-6.6 0-4.5 4.8-8.4 10.8-8.4 2 0 3.8.4 5.2 1.1V20l-19 5V10Z" />
  </svg>;
}

function entrance(reduced, delay, offset = 12) {
  return {
    initial: reduced ? false : { opacity: 0, y: offset },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : 0.9, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] },
  };
}

export default function MusicBoxWorld({ px, py, reduced = false }) {
  const farX = useTransform(px, value => value * -15);
  const farY = useTransform(py, value => value * -10);
  const midX = useTransform(px, value => value * -9);
  const midY = useTransform(py, value => value * -7);
  const nearX = useTransform(px, value => value * -5);
  const nearY = useTransform(py, value => value * -4);

  return <div className={`w-musicbox-layer${reduced ? ' w-musicbox-is-static' : ''}`}>
    <motion.div className="w-musicbox-parallax" style={{ x: farX, y: farY }}>
      <motion.div className="w-musicbox-entry w-musicbox-gear-entry" {...entrance(reduced, 0.08, -18)}>
        <div className="w-musicbox-gear-system">
          <div className="w-musicbox-gear-large"><Gear teeth={12} /></div>
          <div className="w-musicbox-gear-small"><Gear teeth={6} /></div>
        </div>
      </motion.div>
    </motion.div>

    <motion.div className="w-musicbox-parallax" style={{ x: midX, y: midY }}>
      <motion.div className="w-musicbox-entry w-musicbox-lamp-entry" {...entrance(reduced, 0.28, -10)}>
        <div className="w-musicbox-lamp-glow" />
      </motion.div>
      <motion.div className="w-musicbox-entry w-musicbox-pendulum-entry" {...entrance(reduced, 0.48, -22)}>
        <div className="w-musicbox-pendulum"><span /></div>
      </motion.div>
    </motion.div>

    <motion.div className="w-musicbox-parallax" style={{ x: nearX, y: nearY }}>
      <motion.div className="w-musicbox-entry w-musicbox-note-entry" {...entrance(reduced, 0.68, 14)}>
        {notes.map(({ size, delay, ...position }, index) => <div className="w-musicbox-note" key={index} style={{ ...position, '--note-size': `${size}px`, '--note-delay': `${delay}s` }}><MusicNote /></div>)}
      </motion.div>
      <motion.div className="w-musicbox-entry w-musicbox-dust-entry" {...entrance(reduced, 0.88, 8)}>
        {dust.map((mote, index) => <i className="w-musicbox-dust" key={index} style={{ left: `${mote.x}%`, top: `${mote.y}%`, '--dust-size': `${mote.size}px`, '--dust-lift': `-${mote.lift}px`, '--dust-duration': `${mote.duration}s`, '--dust-delay': `${mote.delay}s` }} />)}
      </motion.div>
    </motion.div>
  </div>;
}
