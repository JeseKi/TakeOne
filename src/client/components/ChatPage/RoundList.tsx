// RoundList.tsx
import React, { useEffect, useRef, useState } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import RoundCard from './RoundCard';
import { RoundResponse, ChoiceResponse } from '../../Api';
import { motion, AnimatePresence } from 'framer-motion';

interface RoundListProps {
  rounds: RoundResponse[];
  isLoading: boolean;
  latestChoices: [ChoiceResponse, ChoiceResponse] | null;
  onSelectChoice: (selectedChoice: ChoiceResponse, otherChoice: ChoiceResponse) => Promise<void>;
  activeRoundIndex?: number;
  isSessionFinished?: boolean;
}

const RoundList: React.FC<RoundListProps> = ({ 
  rounds, 
  isLoading, 
  latestChoices, 
  onSelectChoice, 
  activeRoundIndex,
  isSessionFinished
}) => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  useEffect(() => {
    // 当会话结束或报告出现时，不对 RoundCard 进行高亮滚动
    if (isSessionFinished) return;
    const idx = activeRoundIndex === undefined ? rounds.length - 1 : activeRoundIndex;
    const el = cardRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightIndex(idx);
      setTimeout(() => setHighlightIndex(null), 1000);
    }
  }, [activeRoundIndex, isLoading, isSessionFinished]);

  return (
    <div className="p-5 w-full max-w-[1000px] mx-auto">
      <AnimatePresence>
        {rounds.map((round, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            ref={el => { cardRefs.current[index] = el; }}
            style={{
              boxShadow: highlightIndex === index ? '0 0 10px #219ebc' : undefined,
              transition: 'box-shadow 0.3s',
            }}
          >
            <RoundCard
              round={round}
              roundIsActive={activeRoundIndex === undefined ? index === rounds.length - 1 : index === activeRoundIndex}
              onSelectChoice={onSelectChoice}
              latestChoices={index === rounds.length - 1 ? latestChoices : null}
              isLoading={isLoading}
              isSessionFinished={isSessionFinished}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      {isLoading && (
        <div className="flex justify-center py-7">
          <LoadingOutlined className='text-lg lg:text-2xl 2xl:text-4xl' style={{color: '#219ebc'}}/>
        </div>
      )}
    </div>
  );
};

export default RoundList;