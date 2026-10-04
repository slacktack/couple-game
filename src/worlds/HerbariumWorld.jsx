import { motion, useTransform } from 'motion/react';
import './HerbariumWorld.css';

const petals = [
  { left: '3%', delay: '-8s', duration: '17s', color: '#c45d70' },
  { left: '8%', delay: '-2s', duration: '19s', color: '#e8c6a1' },
  { left: '93%', delay: '-12s', duration: '18s', color: '#b77a8d' },
  { left: '98%', delay: '-5s', duration: '16s', color: '#d8a85e' },
];

const dust = [
  [5, 15, 1.5], [12, 30, 1], [19, 8, 1.2], [84, 17, 1.1], [96, 26, 1.4],
  [7, 76, 1.2], [15, 91, 1], [89, 82, 1.4], [97, 68, 1], [78, 94, 1.1],
];

const arrive = (delay, y = 12) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function HerbariumWorld({ px, py, reduced = false }) {
  const farX = useTransform(px, value => value * 8);
  const midX = useTransform(px, value => value * 16);
  const nearX = useTransform(px, value => value * 25);
  const farY = useTransform(py, value => value * 5);
  const midY = useTransform(py, value => value * 10);

  return <div className={`w-herbarium-scene${reduced ? ' w-herbarium-is-reduced' : ''}`} aria-hidden="true">
    <motion.div className="w-herbarium-light-depth" style={{ x: farX, y: farY }} {...(!reduced ? arrive(0.02, 4) : {})}>
      <div className="w-herbarium-sun-wash" />
      <div className="w-herbarium-light-ray w-herbarium-ray-one" />
      <div className="w-herbarium-light-ray w-herbarium-ray-two" />
    </motion.div>

    <svg className="w-herbarium-botanical" viewBox="0 0 1000 1000" preserveAspectRatio="none" focusable="false">
      <motion.g style={{ x: farX, y: midY }}>
        <motion.g className="w-herbarium-arrival" {...(!reduced ? arrive(0.12, 16) : {})}>
          <g className="w-herbarium-leaf-sway w-herbarium-branch-top-left">
            <path className="w-herbarium-branch-line" d="M-28 68 C65 92 83 157 143 186 C174 201 199 226 214 267" />
            <path className="w-herbarium-leaf" d="M52 101 C7 66 2 39 5 20 C36 29 66 54 71 87 C91 54 117 44 141 45 C132 77 110 99 73 106Z" />
            <path className="w-herbarium-leaf" d="M104 145 C65 132 47 108 42 85 C74 86 99 102 115 131 C125 102 148 83 176 79 C172 109 151 136 116 146Z" />
            <path className="w-herbarium-leaf" d="M157 203 C134 171 136 146 145 125 C168 141 180 165 174 192 C197 173 221 171 243 180 C227 202 203 216 173 211Z" />
            <path className="w-herbarium-leaf w-herbarium-blossom" d="M34 72 C14 70 7 56 13 43 C-1 36 1 20 14 15 C14 0 29 -5 39 6 C53 -2 67 7 64 22 C78 31 73 47 60 52 C60 68 46 76 34 72Z" />
          </g>
        </motion.g>
      </motion.g>

      <motion.g style={{ x: nearX, y: farY }}>
        <motion.g className="w-herbarium-arrival" {...(!reduced ? arrive(0.28, 20) : {})}>
          <g className="w-herbarium-leaf-sway w-herbarium-branch-bottom-right">
            <path className="w-herbarium-branch-line" d="M1030 1040 C942 946 909 876 867 805 C839 759 815 706 805 650" />
            <path className="w-herbarium-leaf" d="M961 959 C1002 927 1004 895 993 871 C964 889 949 912 949 941 C930 914 902 904 876 911 C888 938 914 957 949 959Z" />
            <path className="w-herbarium-leaf" d="M908 876 C943 849 944 820 934 798 C908 813 895 835 896 860 C876 837 850 830 827 839 C839 864 862 881 894 880Z" />
            <path className="w-herbarium-leaf" d="M859 789 C887 753 881 725 866 706 C844 727 836 751 843 775 C818 757 792 756 772 769 C790 790 816 800 845 792Z" />
            <path className="w-herbarium-leaf w-herbarium-blossom" d="M970 914 C951 908 946 891 955 880 C946 867 954 853 969 853 C975 839 990 840 996 853 C1012 851 1020 864 1011 876 C1019 889 1009 902 996 901 C988 915 977 919 970 914Z" />
          </g>
        </motion.g>
      </motion.g>
    </svg>

    <motion.svg className="w-herbarium-dust-field" viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ x: midX }} focusable="false">
      {dust.map(([cx, cy, r], index) => <circle key={index} className="w-herbarium-dust" cx={cx * 10} cy={cy * 10} r={r * 1.7} style={{ animationDelay: `${index * -0.9}s` }} />)}
    </motion.svg>

    <motion.div className="w-herbarium-petal-depth" style={{ x: nearX }}>
      {petals.map((petal, index) => <motion.div key={index} className="w-herbarium-petal-anchor" style={{ left: petal.left, '--w-herbarium-fall-delay': petal.delay, '--w-herbarium-fall-duration': petal.duration }} {...(!reduced ? arrive(0.32 + index * 0.14, 18) : {})}>
        <svg className="w-herbarium-petal-flight" viewBox="0 0 24 34" focusable="false">
          <path d="M12 1 C20 8 23 15 20 22 C18 28 14 32 12 33 C9 30 5 25 4 19 C3 12 7 5 12 1Z" fill={petal.color} />
          <path d="M12 6 C12 13 12 21 12 29" fill="none" stroke="#76664c" strokeOpacity=".52" strokeWidth=".8" />
        </svg>
      </motion.div>)}
    </motion.div>
  </div>;
}
