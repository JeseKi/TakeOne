// RoundList.tsx
import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import RoundCard from './RoundCard';
import { RoundResponse, ChoiceResponse } from '../../Api';

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
  return (
    <div className="p-5 w-full max-w-[1000px] mx-auto">
      {rounds.map((round, index) => (
        <RoundCard
          key={index}
          round={round}
          roundIsActive={activeRoundIndex === undefined ? index === rounds.length - 1 : index === activeRoundIndex}
          onSelectChoice={onSelectChoice}
          latestChoices={index === rounds.length - 1 ? latestChoices : null}
          isLoading={isLoading}
          isSessionFinished={isSessionFinished}
        />
      ))}
      
      {isLoading && (
        <div className="flex justify-center py-7">
          <LoadingOutlined className='text-lg lg:text-2xl 2xl:text-4xl' style={{color: '#219ebc'}}/>
        </div>
      )}
    </div>
  );
};

export default RoundList;