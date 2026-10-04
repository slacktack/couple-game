import { motion, useTransform } from 'motion/react';
import './NightTrainWorld.css';

const arrive = (reduced, delay, distance = 12) => ({
  initial: reduced ? false : { opacity: 0, y: distance },
  animate: { opacity: 1, y: 0 },
  transition: reduced ? { duration: 0 } : { duration: 0.8, delay, ease: [0.22, 0.8, 0.25, 1] },
});

export default function NightTrainWorld({ px, py, reduced }) {
  const farX = useTransform(px, value => value * -5);
  const farY = useTransform(py, value => value * -3);
  const nearX = useTransform(px, value => value * -11);
  const nearY = useTransform(py, value => value * -6);

  return <div className={`w-train-world${reduced ? ' w-train-reduced' : ''}`} aria-hidden="true">
    <motion.div className="w-train-rock" animate={reduced ? { rotate: 0 } : { rotate: [0, 0.12, 0, -0.1, 0] }} transition={reduced ? { duration: 0 } : { duration: 8, ease: 'easeInOut', repeat: Infinity }}>
      <motion.div className="w-train-arrival w-train-arrival-glow" {...arrive(reduced, 0)}>
        <motion.div className="w-train-parallax w-train-glow-field" style={{ x: farX, y: farY }}>
          <span className="w-train-lamp-halo w-train-lamp-halo-left" />
          <span className="w-train-lamp-halo w-train-lamp-halo-right" />
          <span className="w-train-brass-glint w-train-brass-glint-left" />
          <span className="w-train-brass-glint w-train-brass-glint-right" />
        </motion.div>
      </motion.div>

      <motion.div className="w-train-arrival w-train-arrival-distant" {...arrive(reduced, 0.2, 16)}>
        <motion.div className="w-train-parallax w-train-distant-lights" style={{ x: farX, y: farY }}>
          <svg viewBox="0 0 1200 240" preserveAspectRatio="none">
            <g fill="currentColor">
              <circle cx="24" cy="156" r="2" /><circle cx="72" cy="129" r="1.5" />
              <circle cx="118" cy="174" r="2.2" /><circle cx="184" cy="143" r="1.5" />
              <circle cx="242" cy="187" r="1.5" /><circle cx="956" cy="162" r="2" />
              <circle cx="1012" cy="126" r="1.5" /><circle cx="1060" cy="176" r="2.2" />
              <circle cx="1132" cy="146" r="1.5" /><circle cx="1170" cy="188" r="2" />
            </g>
          </svg>
        </motion.div>
      </motion.div>

      <motion.div className="w-train-arrival w-train-arrival-streaks" {...arrive(reduced, 0.4, 10)}>
        <motion.div className="w-train-parallax w-train-streak-field" style={{ x: nearX, y: nearY }}>
          <span className="w-train-streak w-train-streak-a" />
          <span className="w-train-streak w-train-streak-b" />
          <span className="w-train-streak w-train-streak-c" />
          <span className="w-train-streak w-train-streak-d" />
          <span className="w-train-streak w-train-streak-e" />
          <span className="w-train-streak w-train-streak-f" />
          <span className="w-train-streak w-train-streak-g" />
          <span className="w-train-streak w-train-streak-h" />
        </motion.div>
      </motion.div>

      <motion.div className="w-train-arrival w-train-arrival-steam" {...arrive(reduced, 0.62, 18)}>
        <motion.div className="w-train-parallax w-train-steam-field" style={{ x: nearX, y: nearY }}>
          <span className="w-train-steam-puff w-train-steam-puff-left" />
          <span className="w-train-steam-puff w-train-steam-puff-mid" />
          <span className="w-train-steam-puff w-train-steam-puff-right" />
        </motion.div>
      </motion.div>
    </motion.div>
  </div>;
}
