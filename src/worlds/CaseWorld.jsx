import { motion, useTransform } from 'motion/react';
import './CaseWorld.css';

const rainStreaks = [
  { x: 2, y: 4, h: 8, speed: 4.6, delay: -1.1 },
  { x: 4.5, y: 28, h: 6, speed: 5.4, delay: -3.2 },
  { x: 6.8, y: 62, h: 10, speed: 4.1, delay: -2.5 },
  { x: 9, y: 11, h: 7, speed: 5.1, delay: -4.3 },
  { x: 11.5, y: 46, h: 9, speed: 4.8, delay: -1.9 },
  { x: 13.3, y: 78, h: 6, speed: 5.7, delay: -3.8 },
  { x: 15.5, y: 18, h: 8, speed: 4.4, delay: -2.8 },
  { x: 17.2, y: 55, h: 7, speed: 5.2, delay: -0.9 },
  { x: 19.4, y: 35, h: 10, speed: 4.9, delay: -4.7 },
  { x: 21.3, y: 69, h: 6, speed: 5.5, delay: -2.2 },
  { x: 23.5, y: 7, h: 8, speed: 4.3, delay: -3.5 },
  { x: 25, y: 40, h: 7, speed: 5.8, delay: -1.4 },
  { x: 1, y: 84, h: 8, speed: 5.1, delay: -4.1 },
  { x: 7.7, y: 91, h: 6, speed: 4.7, delay: -2.7 },
  { x: 16.4, y: 3, h: 9, speed: 5.6, delay: -0.7 },
  { x: 22, y: 88, h: 7, speed: 4.5, delay: -3.9 },
];

const motes = [
  { x: 5, y: 61, delay: '-1s' },
  { x: 17, y: 38, delay: '-3.2s' },
  { x: 88, y: 71, delay: '-5.4s' },
  { x: 94, y: 25, delay: '-2.1s' },
];

export default function CaseWorld({ px, py, reduced }) {
  const farX = useTransform(px, value => value * 5);
  const farY = useTransform(py, value => value * 3);
  const midX = useTransform(px, value => value * -8);
  const midY = useTransform(py, value => value * -5);
  const nearX = useTransform(px, value => value * 13);
  const nearY = useTransform(py, value => value * 8);
  const closeX = useTransform(px, value => value * 18);
  const closeY = useTransform(py, value => value * 11);

  return <div className={`w-case-world${reduced ? ' w-case-static' : ''}`}>
    <motion.div className="w-case-parallax w-case-parallax--far" style={{ x: farX, y: farY }}>
      <div className="w-case-entry w-case-entry--far">
        <div className="w-case-window-sheen" />
        <div className="w-case-rain" aria-hidden="true">
          {rainStreaks.map((streak, index) => <i className="w-case-drop" key={index} style={{
            left: `${streak.x}%`, top: `${streak.y}%`, height: `${streak.h}%`,
            animationDuration: `${streak.speed}s`, animationDelay: streak.delay,
          }} />)}
        </div>
        <div className="w-case-mist w-case-mist--left" />
        <div className="w-case-mist w-case-mist--right" />
        <div className="w-case-flash" />
      </div>
    </motion.div>

    <motion.div className="w-case-parallax w-case-parallax--mid" style={{ x: midX, y: midY }}>
      <div className="w-case-entry w-case-entry--mid">
        <svg className="w-case-thread w-case-thread--desktop" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <g className="w-case-thread-drift">
            <path d="M -8 910 C 38 881 91 892 132 904 S 214 905 274 940" />
            <circle cx="131" cy="903" r="3.2" />
            <circle cx="274" cy="940" r="2.8" />
          </g>
        </svg>
        <svg className="w-case-thread w-case-thread--portrait" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <g className="w-case-thread-drift">
            <path d="M 24 920 C 85 890 144 906 192 928 S 259 933 303 951" />
            <circle cx="192" cy="928" r="3.1" />
            <circle cx="303" cy="951" r="2.8" />
          </g>
        </svg>
      </div>
    </motion.div>

    <motion.div className="w-case-parallax w-case-parallax--near" style={{ x: nearX, y: nearY }}>
      <div className="w-case-entry w-case-entry--near">
        <div className="w-case-lamp-wash" />
        <div className="w-case-lamp-cone" />
      </div>
    </motion.div>

    <motion.div className="w-case-parallax w-case-parallax--close" style={{ x: closeX, y: closeY }}>
      <div className="w-case-entry w-case-entry--close">
        {motes.map((mote, index) => <i className="w-case-mote" key={index} style={{
          left: `${mote.x}%`, top: `${mote.y}%`, animationDelay: mote.delay,
        }} />)}
      </div>
    </motion.div>
  </div>;
}
