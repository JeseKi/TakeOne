// RoundList.tsx
import React from 'react';
import { Spin } from 'antd';
import RoundCard from './RoundCard';
import { RoundResponse, ChoiceResponse, MajorChoice } from '../../Api';

interface RoundListProps {
  rounds: RoundResponse[];
  isLoading: boolean;
  latestChoices: [ChoiceResponse, ChoiceResponse] | null;
  onSelectChoice: (choice1: MajorChoice, choice2: MajorChoice) => void;
  activeRoundIndex?: number;
}

const RoundList: React.FC<RoundListProps> = ({ 
  rounds, 
  isLoading, 
  latestChoices, 
  onSelectChoice, 
  activeRoundIndex 
}) => {
  return (
    <div className="p-5 w-full max-w-[1000px] mx-auto">
      {rounds.map((round, index) => (
        <RoundCard
          key={index}
          round={round}
          isLatest={index === rounds.length - 1}
          isActive={activeRoundIndex === undefined ? index === rounds.length - 1 : index === activeRoundIndex}
          onSelectChoice={onSelectChoice}
          latestChoices={index === rounds.length - 1 ? latestChoices : null}
          isLoading={isLoading}
        />
      ))}
      
      {isLoading && (
        <div className="flex justify-center py-7">
          <Spin tip="加载中..." />
        </div>
      )}
    </div>
  );
};

export default RoundList;