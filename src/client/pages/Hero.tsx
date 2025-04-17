import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from 'antd';
import styles from './Hero.module.css';

interface StoryItem {
  type: 'text' | 'choice' | 'label' | 'jump';
  content?: string;
  options?: { text: string; next: string }[];
  id?: string;
  to?: string;
  isEnd?: boolean;
}

const storyScript: StoryItem[] = [
  { type: 'text', content: '你正在尝试选择一个未来……' },
  { type: 'text', content: '一个专业。一份职业。' },
  { type: 'text', content: '也许还想找到那个你真正热爱的东西。' },
  { type: 'text', content: '但说实话...' },
  { type: 'text', content: '那个“完美”的选择，真的存在吗？🤔' },
  { type: 'text', content: '就像函数逼近它的极限，你可以无限接近…… 但也许永远无法真正 *到达* 那一点。' },
  { type: 'text', content: '那么，如果我们不再追逐那个不可能呢？' },
  { type: 'text', content: '如果我们不再寻找“最好”，而是专注于避免“最坏”呢？' },
  { type: 'text', content: '你知道“推荐算法”吗？就像抖音、B站用的那种。' },
  { type: 'choice', options: [
      { text: '大概知道', next: 'algo_known' },
      { text: '不太了解', next: 'algo_unknown' }
    ]
  },
  { type: 'label', id: 'algo_unknown' },
  { type: 'text', content: '没关系。简单说，它们会分析你看过什么、点过什么赞...' },
  { type: 'text', content: '然后不断给你推“猜你喜欢”的东西，让你一直刷下去。' },
  { type: 'text', content: '不一定懂你，但很懂怎么留住你。就像这个对话框，是不是也吸引你点下去了？😉' },
  { type: 'jump', to: 'algo_cont' },
  { type: 'label', id: 'algo_known' },
  { type: 'text', content: '很好。它们不总推荐你 *最爱* 的，但总能推荐些你 *愿意* 看下去的，对吧？' },
  { type: 'text', content: '它们很擅长提供“还行”的选择，同时避开你明显讨厌的东西。' },
  { type: 'label', id: 'algo_cont' },
  { type: 'text', content: 'TakeOne 就借鉴了这个思路，但用在了你的未来选择上。' },
  { type: 'text', content: '我们不问“你热爱什么？” —— 因为答案常常是“我不知道”。' },
  { type: 'text', content: '相反，我们会更关注...' },
  { type: 'text', content: '那些你 *绝对无法忍受* 的事情。' },
  { type: 'text', content: '比如，高强度加班 (996)，你能接受吗？' },
  { type: 'choice', options: [
      { text: '听起来很糟', next: 'pain_start' },
      { text: '完全不能接受！', next: 'pain_start' },
      { text: '为了目标可以忍', next: 'pain_start' }
    ]
  },
  { type: 'label', id: 'pain_start' },
  { type: 'text', content: '没错，每个专业背后都可能有这样的挑战。' },
  { type: 'text', content: '计算机可能高薪但也常伴随加班；' },
  { type: 'text', content: '心理学可能有趣但就业需要耐心；' },
  { type: 'text', content: '生物学可能探索神秘但也需长期投入...' },
  { type: 'text', content: '关键在于，哪些是*相对*更能接受，或者说，*最不反感*的？' },
  { type: 'text', content: 'TakeOne 的目的，就是帮你识别并避开那些你真正“踩不了”的坑。' },
  { type: 'text', content: '它引导你找到的，不一定是完美的梦想，但会是一个你觉得“还行”、“可以接受”的现实路径。' },
  { type: 'text', content: '一个在你“厌恶”底线之上的选择。' },
  { type: 'text', content: '准备好，开始这场“排除法”探索了吗？', isEnd: true }
];

type HeroProps = { skipIntro?: boolean };

const Hero: React.FC<HeroProps> = ({ skipIntro }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [waitingChoice, setWaitingChoice] = useState<boolean>(false);
  const [options, setOptions] = useState<{ text: string; next: string }[] | null>(null);
  const typingRef = useRef<number | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  const labelMap = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    storyScript.forEach((it, idx) => {
      if (it.type === 'label' && it.id) m[it.id] = idx;
    });
    return m;
  }, []);

  /**
   * 将打字效果集成到 lines 数组同一元素，实现逐字更新
   */
  const startTyping = (text: string, endFlag?: boolean) => {
    setIsTyping(true);
    // 新增空行占位
    setLines(prev => [...prev, '']);
    let idx = 0;
    const nextChar = () => {
      const ch = text[idx++];
      setLines(prev => {
        const arr = [...prev];
        arr[arr.length - 1] += ch;
        return arr;
      });
      const delay = /[，,。.!？！]/.test(ch) ? 400 : 50;
      if (idx < text.length) {
        typingRef.current = window.setTimeout(nextChar, delay);
      } else {
        setIsTyping(false);
        // 打字完成后触发结束选择
        if (endFlag) setWaitingChoice(true);
      }
    };
    nextChar();
  };

  const displayNext = (idxParam?: number) => {
    const idx = idxParam !== undefined ? idxParam : currentIndex;
    if (isTyping || waitingChoice || idx >= storyScript.length) return;
    const item = storyScript[idx];
    if (item.type === 'jump') {
      displayNext(labelMap[item.to!]!);
      return;
    }
    if (item.type === 'label') {
      displayNext(idx + 1);
      return;
    }
    if (item.type === 'choice') {
      setWaitingChoice(true);
      setOptions(item.options!);
      setCurrentIndex(idx + 1);
      return;
    }
    // 文本类型
    startTyping(item.content!, item.isEnd);
    setCurrentIndex(idx + 1);
  };

  const handleOption = (opt: { text: string; next: string }) => {
    setOptions(null);
    setWaitingChoice(false);
    displayNext(labelMap[opt.next]!);
  };

  useEffect(() => {
    displayNext();
    return () => clearTimeout(typingRef.current);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleClick = () => {
    if (isTyping || waitingChoice) return;
    displayNext();
  };

  return (
    <div className="relative flex flex-col items-center justify-start min-h-screen bg-[#e9eef2] select-none" onClick={handleClick}>
      {skipIntro && (
        <Button
          type="text"
          className={`absolute top-4 right-4 xl:top-30 xl:left-80 ${styles.skHeroSkip}`}
          onClick={() => navigate('/chat')}
        >
          <span className='m-3'>跳过介绍</span>
        </Button>
      )}
      <h1 className="mt-16 text-4xl font-bold text-[#219ebc] z-10">TakeOne</h1>
      <div ref={scrollRef} className="w-[95%] max-w-3xl max-h-[320px] bg-white/85 rounded-2xl mt-8 shadow-lg p-5 border-[1.5px] border-[#8ecae6] overflow-y-auto hero-scroll">
        <AnimatePresence initial={false} mode="popLayout">
          {lines.map((ln, i) => (
            <motion.div
              key={`line-${i}`}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-[#219ebc]/10 text-[#333] text-base rounded px-4 py-2 mb-2"
            >
              {ln}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {!skipIntro && !waitingChoice && !isTyping && (
        <div className="mt-2 text-sm text-[#219ebc] animate-pulse">点击继续...</div>
      )}
      {options && (
        <div className="mt-6 flex flex-col items-center gap-4">
          {options.map((opt, i) => (
            <Button key={i} className={styles.skHeroButton} onClick={() => handleOption(opt)}>
              {opt.text}
            </Button>
          ))}
        </div>
      )}
      {waitingChoice && !isTyping && !options && (
        <motion.div
          className="mt-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Button className={styles.skHeroButton} onClick={() => navigate('/chat')}>
            开始选择自己的未来...
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default Hero;
