import { motion, useTransform } from 'motion/react';
import './MazeWorld.css';

const fireflies = [
  { x: '8%', y: '30%', delay: '0s', duration: '6.8s' },
  { x: '91%', y: '25%', delay: '.35s', duration: '7.6s' },
  { x: '84%', y: '72%', delay: '.7s', duration: '6.2s' },
  { x: '12%', y: '84%', delay: '.2s', duration: '8.1s' },
  { x: '22%', y: '13%', delay: '.85s', duration: '7.1s' },
  { x: '79%', y: '15%', delay: '.5s', duration: '8.4s' },
  { x: '53%', y: '91%', delay: '1s', duration: '7.3s' },
  { x: '96%', y: '51%', delay: '.1s', duration: '6.6s' },
];

export default function MazeWorld({ px, py, reduced = false }) {
  const farX = useTransform(px, value => value * -5);
  const farY = useTransform(py, value => value * -3);
  const midX = useTransform(px, value => value * -10);
  const midY = useTransform(py, value => value * -6);
  const nearX = useTransform(px, value => value * -16);
  const nearY = useTransform(py, value => value * -10);

  const parallax = (x, y) => reduced ? undefined : { x, y };

  return <div className="w-maze-world" data-reduced={reduced}>
    <div className="w-maze-vignette" />
    <motion.div className="w-maze-depth w-maze-enter w-maze-enter--far" style={parallax(farX, farY)}>
      <div className="w-maze-fog w-maze-fog--far" />
    </motion.div>
    <motion.div className="w-maze-depth w-maze-enter w-maze-enter--mid" style={parallax(midX, midY)}>
      <div className="w-maze-fog w-maze-fog--mid" />
    </motion.div>
    <motion.div className="w-maze-depth w-maze-enter w-maze-enter--near" style={parallax(nearX, nearY)}>
      <div className="w-maze-fog w-maze-fog--near" />
    </motion.div>

    <motion.div className="w-maze-ivy w-maze-ivy--left w-maze-enter w-maze-enter--ivy-left" style={parallax(nearX, nearY)}>
      <svg className="w-maze-ivy-art w-maze-ivy-art--left" viewBox="0 0 240 620" fill="none" aria-hidden="true">
        <path d="M4 0C65 100 12 172 82 242s2 136 76 194-8 124 76 184" stroke="#66834d" strokeWidth="8" strokeLinecap="round" />
        <path d="M40 116c-30-3-44-31-35-58 29 1 48 22 35 58Zm45 121c-29-4-43-31-32-58 29 1 47 23 32 58Zm69 120c-28-4-43-31-31-57 28 2 46 22 31 57Zm50 125c-28-4-42-32-30-57 28 2 46 22 30 57Z" fill="#38583d" stroke="#80975d" strokeWidth="3" />
        <path d="M22 156c27-21 52-21 69 1-13 27-41 35-69-1Zm44 117c27-21 52-21 69 2-13 26-41 34-69-2Zm67 119c27-21 52-20 69 2-13 26-41 34-69-2Zm48 121c27-21 53-20 69 2-14 27-42 34-69-2Z" fill="#526d43" stroke="#8da265" strokeWidth="3" />
      </svg>
    </motion.div>
    <motion.div className="w-maze-ivy w-maze-ivy--right w-maze-enter w-maze-enter--ivy-right" style={parallax(nearX, nearY)}>
      <svg className="w-maze-ivy-art w-maze-ivy-art--right" viewBox="0 0 220 580" fill="none" aria-hidden="true">
        <path d="M214 0C158 94 218 164 146 236s-7 135-75 194 2 111-66 150" stroke="#66834d" strokeWidth="7" strokeLinecap="round" />
        <path d="M171 102c29-4 43-29 33-55-27 2-45 22-33 55Zm-43 129c28-4 42-29 30-55-28 2-45 22-30 55Zm-67 113c28-5 41-30 29-55-27 2-43 23-29 55Zm-39 116c27-4 40-30 28-54-26 1-43 22-28 54Z" fill="#38583d" stroke="#80975d" strokeWidth="3" />
        <path d="M189 150c-27-20-51-18-66 3 14 25 42 31 66-3Zm-39 121c-27-19-51-18-66 4 14 24 42 30 66-4Zm-65 116c-27-20-51-18-66 4 14 25 42 31 66-4Zm-38 114c-26-19-50-17-65 4 14 25 42 31 65-4Z" fill="#526d43" stroke="#8da265" strokeWidth="3" />
      </svg>
    </motion.div>

    <motion.div className="w-maze-lantern w-maze-enter w-maze-enter--lantern" style={parallax(nearX, nearY)}>
      <div className="w-maze-lantern-halo" />
      <svg className="w-maze-lantern-art" viewBox="0 0 120 236" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="w-maze-iron" x1="24" y1="12" x2="94" y2="210" gradientUnits="userSpaceOnUse"><stop stopColor="#8b8060" /><stop offset=".5" stopColor="#292f28" /><stop offset="1" stopColor="#121a17" /></linearGradient>
          <radialGradient id="w-maze-glow" cx="0" cy="0" r="1" gradientTransform="matrix(0 69 -31 0 60 126)" gradientUnits="userSpaceOnUse"><stop stopColor="#fff0ae" /><stop offset=".32" stopColor="#f6bd55" /><stop offset="1" stopColor="#b85b21" stopOpacity=".2" /></radialGradient>
        </defs>
        <path d="M43 13c0-13 34-13 34 0v9H43v-9Z" stroke="url(#w-maze-iron)" strokeWidth="6" />
        <path d="M36 23c0-31 48-31 48 0" stroke="#68654d" strokeWidth="5" strokeLinecap="round" />
        <path d="m34 28-9 17 6 12-6 12 8 12-4 7 5 5h52l5-5-4-7 8-12-6-12 6-12-9-17H34Z" fill="url(#w-maze-iron)" stroke="#827653" strokeWidth="3" />
        <path d="M36 55h48l8 52-10 70H38l-10-70 8-52Z" fill="#14201b" stroke="#726b4c" strokeWidth="4" />
        <path d="M42 60h36l7 45-8 66H43l-8-66 7-45Z" fill="url(#w-maze-glow)" opacity=".94" />
        <path d="M34 54 45 178m41-124L74 178M27 106h66M31 164h58" stroke="#6c654a" strokeWidth="4" />
        <path d="m32 177 8 14h40l8-14-6 18 9 7H28l9-7-5-18Z" fill="url(#w-maze-iron)" stroke="#766e4e" strokeWidth="3" />
        <path d="M57 155c-15-17 7-24 1-39 20 17 15 30 5 39h-6Z" fill="#fff0b0" />
        <path d="M60 155c-8-10 4-15 2-23 11 10 7 18 2 23h-4Z" fill="#ffad45" />
        <path d="M60 202v17" stroke="#827653" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </motion.div>

    <div className="w-maze-firefly-field">
      {fireflies.map((fly, index) => <span className="w-maze-firefly-enter" key={index} style={{ left: fly.x, top: fly.y, '--entry-delay': fly.delay }}>
        <i className="w-maze-firefly" style={{ '--fly-delay': fly.delay, '--fly-duration': fly.duration }} />
      </span>)}
    </div>
    <div className="w-maze-ground-haze" />
  </div>;
}
