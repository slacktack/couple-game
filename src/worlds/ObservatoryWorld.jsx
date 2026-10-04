import { motion, useTransform } from 'motion/react';
import './ObservatoryWorld.css';

const distantStars = [
  [4, 12, 1.4], [8, 28, 1], [15, 7, 1.2], [25, 17, 1], [33, 5, 1.1],
  [43, 11, 1], [58, 8, 1.3], [69, 19, 1], [78, 6, 1.2], [86, 25, 1],
  [95, 9, 1.3], [5, 73, 1], [13, 91, 1.2], [27, 96, 1], [62, 94, 1.1],
  [75, 86, 1], [92, 76, 1.2], [98, 92, 1],
];

const nearbyStars = [
  [3, 43, 1.8], [11, 57, 1.5], [19, 34, 1.7], [28, 8, 1.6], [39, 20, 1.4],
  [56, 3, 1.8], [73, 11, 1.6], [89, 5, 1.5], [97, 34, 1.8], [7, 83, 1.6],
  [21, 98, 1.8], [84, 94, 1.5], [95, 67, 1.7],
];

function StarField({ points, reduced }) {
  return points.map(([left, top, size], index) => {
    const twinkle = !reduced && index % 3 === 0;
    return <i
      key={`${left}-${top}`}
      className={`w-observatory-star${twinkle ? ' w-observatory-star-twinkle' : ''}`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        '--w-observatory-star-size': `${size}px`,
        '--w-observatory-star-delay': `${(index % 5) * -0.8}s`,
      }}
    />;
  });
}

function arrival(reduced, delay) {
  return {
    initial: reduced ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduced ? 0 : 0.78,
      delay: reduced ? 0 : delay,
      ease: [0.22, 1, 0.36, 1],
    },
  };
}

export default function ObservatoryWorld({ px, py, reduced = false }) {
  const farX = useTransform(px, value => value * 4);
  const farY = useTransform(py, value => value * 3);
  const midX = useTransform(px, value => value * 9);
  const midY = useTransform(py, value => value * 6);
  const nearX = useTransform(px, value => value * 15);
  const nearY = useTransform(py, value => value * 10);

  return <div className={`w-observatory-scene${reduced ? ' w-observatory-static' : ''}`}>
    <div className="w-observatory-edge-glow" />

    <motion.div className="w-observatory-depth" style={{ x: farX, y: farY }}>
      <motion.div className="w-observatory-stars w-observatory-stars-distant" {...arrival(reduced, 0)}>
        <StarField points={distantStars} reduced={reduced} />
      </motion.div>
    </motion.div>

    <motion.div className="w-observatory-depth" style={{ x: midX, y: midY }}>
      <motion.svg className="w-observatory-constellation" viewBox="0 0 360 180" fill="none" {...arrival(reduced, 0.14)}>
        <path d="M15 122 62 94 98 116 142 69 184 86" />
        <path d="M237 30 274 52 304 24 344 42" />
        <circle cx="15" cy="122" r="2.4" /><circle cx="62" cy="94" r="2.1" />
        <circle cx="98" cy="116" r="1.8" /><circle cx="142" cy="69" r="2.6" />
        <circle cx="184" cy="86" r="1.8" /><circle cx="237" cy="30" r="2.3" />
        <circle cx="274" cy="52" r="1.8" /><circle cx="304" cy="24" r="2.5" />
        <circle cx="344" cy="42" r="1.8" />
      </motion.svg>
      <motion.div className="w-observatory-orbit-trace" {...arrival(reduced, 0.28)}>
        <svg viewBox="0 0 310 180" fill="none" aria-hidden="true">
          <path d="M-40 145C42 32 191 11 341 93" />
          <path d="M-12 170C67 67 202 51 314 117" />
          <circle cx="102" cy="73" r="2" /><circle cx="261" cy="75" r="2.5" />
        </svg>
      </motion.div>
    </motion.div>

    <motion.div className="w-observatory-depth" style={{ x: nearX, y: nearY }}>
      <motion.div className="w-observatory-dome-shaft" {...arrival(reduced, 0.3)} />
      <motion.div className="w-observatory-astrolabe" {...arrival(reduced, 0.48)}>
        <svg viewBox="0 0 280 280" fill="none" aria-hidden="true">
          <g className="w-observatory-astrolabe-outer">
            <circle cx="140" cy="140" r="121" />
            <circle cx="140" cy="140" r="111" />
            <path d="M140 8v21m0 222v21M8 140h21m222 0h21M46.6 46.6l15 15m156.8 156.8 15 15m0-186.8-15 15M61.6 218.4l-15 15" />
            <path d="M140 19v9m0 225v9M19 140h9m225 0h9M54.4 54.4l6.4 6.4m158.4 158.4 6.4 6.4m0-171.2-6.4 6.4M60.8 219.2l-6.4 6.4" />
          </g>
          <g className="w-observatory-astrolabe-inner">
            <ellipse cx="140" cy="140" rx="54" ry="103" />
            <ellipse cx="140" cy="140" rx="103" ry="54" />
            <circle cx="140" cy="140" r="68" />
            <path d="m140 86 15 54-15 54-15-54 15-54Z" />
          </g>
          <circle className="w-observatory-astrolabe-star" cx="140" cy="140" r="5" />
        </svg>
      </motion.div>
      <motion.div className="w-observatory-stars w-observatory-stars-near" {...arrival(reduced, 0.64)}>
        <StarField points={nearbyStars} reduced={reduced} />
      </motion.div>
    </motion.div>

    <motion.div className="w-observatory-comet-entry" {...arrival(reduced, 0.72)}>
      {!reduced && <i className="w-observatory-comet" />}
    </motion.div>
  </div>;
}
